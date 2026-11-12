'use strict';








var RW = 280, RH = 180, RGY = 158, RPX = 52;
var RG = 1500, RJ1 = 480, RJ2 = 420, RJCUT = 290;
var R_T1 = 48, R_T2 = 92, R_RAMP = .4;
var R_BUF = .14, R_COY = .1;
var R_T0 = 7 * 60 + 40, R_RATE = 70 / 72, R_DUE = 9 * 60;
var R_VAL = { coin: 40, cash: 200, bonus: 600 };
var R_SLOTS = [['alley'], ['bus', 'subway', 'bike'], ['bridge', 'market', 'park'], ['short', 'avenue', 'under'], ['lobby']];
var R_ASK = ['', '뭐 타고 갈까?', '어디로 지나갈까?', '회사가 코앞! 어느 길로?'];


var RMAP = {
  alley:  { nm: '집 앞 골목', emo: '🏠', len: 1700, spd: 170, obs: ['cone', 'trash', 'cat', 'bag', 'pigeon'], pc: ['#b5523b', '#7d3a2c'], foe: ['blob', 'mail'],
    rule: '몸풀기! 누르면 점프, 길게 누르면 더 높이. 적은 머리를 밟아요.' },
  bus:    { nm: '버스', emo: '🚌', len: 2000, ceil: 100, spd: 160, obs: ['bag', 'person', 'papers'], coin: 1.4, inn: 1, pc: ['#9aa0a6', '#5a5d63'], foe: ['blob', 'ghost'],
    tip: '연타로 버스 잡기 · 급정거 버티기', rule: '떠나는 버스부터 잡고, 급정거 경고가 뜨면 꾹 눌러 손잡이를 잡아요.', mini: [['chase', 's'], ['brake', .22], ['brake', .42]] },
  subway: { nm: '지하철', emo: '🚇', len: 2000, spd: 185, obs: ['person', 'bag', 'papers'], inn: 1, ceil: 64, pc: ['#b9c0c9', '#7e848c'], foe: ['ghost', 'blob'],
    tip: '연타로 밀고 타기 · 천장 낮음', rule: '승강장을 달리다 문 닫히기 전에 연타로 밀고 타요! 천장이 낮아서 2층까지만.', mini: [['board', .17]] },
  bike:   { nm: '따릉이', emo: '🚲', len: 2300, spd: 215, obs: ['cone', 'pigeon', 'puddle', 'cat'], bike: 1, pc: ['#36b5a5', '#25806f'], foe: ['mail'],
    tip: '제일 빠름 · 오르막 페달 박자', rule: '제일 빠르지만 2단 점프가 없어요. 경사로를 밟으면 붕! 오르막에선 박자 맞춰 페달.', mini: [['pedal', .45]] },
  bridge: { nm: '한강 다리', emo: '🌉', len: 1900, spd: 175, obs: ['puddle', 'pigeon', 'cone', 'scooter'], float: .68, pc: ['#8796ab', '#5f6f84'], foe: ['mail', 'ghost'],
    tip: '몸이 둥실 · 돌풍 버티기', rule: '강바람에 몸이 둥실 떠요. 높이 뜬 돈을 노리고, 돌풍이 오면 꾹 눌러 버텨요.', mini: [['wind', .2]] },
  market: { nm: '전통시장', emo: '🍢', len: 1900, spd: 165, obs: ['bag', 'cat', 'trash', 'papers'], coin: 1.3, bouncy: 1, pc: ['#e8412c', '#a8281b'], foe: ['blob', 'mail'],
    tip: '차양 트램펄린 · 떡꼬치 낚아채기', rule: '줄무늬 차양을 밟으면 통통 튀어요. 시식 코너에선 타이밍 맞춰 떡꼬치를 낚아채요.', mini: [['snack', .45]] },
  park:   { nm: '공원', emo: '🌳', len: 1900, spd: 175, obs: ['pigeon', 'puddle', 'scooter'], hop: 1, pc: ['#8a5a32', '#5e3c20'], foe: [],
    tip: '적 없음 · 야바위 카드', rule: '적은 없지만 강아지가 깡충깡충! 야바위 아저씨가 길을 막으면 ★카드를 맞혀야 지나가요.', mini: [['shell', .42]] },
  short:  { nm: '지름길 골목', emo: '🐈', len: 1700, spd: 180, obs: ['trash', 'cat', 'pigeon', 'bag', 'puddle'], dense: 1, dim: 1, kill2: 1, pc: ['#6b6f74', '#3e3530'], foe: ['ghost', 'blob'],
    tip: '어둡고 짧음 · 적 처치 2배', rule: '불 꺼진 골목이라 조로 주변만 보여요. 짧아서 시간을 벌고, 적을 밟으면 돈 2배!' },
  avenue: { nm: '큰길', emo: '🏙', len: 2100, spd: 175, obs: ['scooter', 'cone', 'person', 'papers', 'aboard'], coin: 1.4, car: 1, pc: ['#8f96a3', '#5f646b'], foe: ['mail', 'blob'],
    tip: '돈 많음 · 신호등 꾹 멈추기', rule: '돈은 많지만 배달 오토바이가 쌩쌩. 횡단보도에선 빨간불에 꾹 눌러 멈추고, 초록불에 떼서 건너요.', mini: [['light', .45]] },
  under:  { nm: '지하상가', emo: '🛍', len: 1900, ceil: 100, spd: 175, obs: ['person', 'bag', 'papers', 'cone'], inn: 1, belt: 1, pc: ['#c4cbd4', '#8a8f98'], foe: ['ghost', 'blob'],
    tip: '무빙워크 쭉 · 세일 매대 연타', rule: '무빙워크에 올라타면 쭉 빨라져요. 끝에서 세일 매대를 연타로 털어요!', mini: [['sale', .8]] },
  lobby:  { nm: '회사 로비', emo: '🏢', len: 1700, ceil: 100, spd: 160, obs: ['papers', 'person'], inn: 1, pc: ['#c9c1b1', '#9b917f'], foe: ['blob', 'ghost'],
    rule: '정문을 지나 리셉션에서 사원증을 타이밍 맞춰 찍고, 닫히는 엘리베이터에 연타로 타요!', mini: [['badge', .45], ['elev', .88]] }
};
var R_VX = { moto: -150, cat: -35, scooter: -110, person: -22, dog: -60, blob: -40, ghost: -50, mail: -100, car: -170 };
var R_FOE = { blob: '서류 괴물', ghost: '야근 유령', mail: '스팸 메일' };

var R_WX = { sun: ['맑음', '☀️', 3], rain: ['비', '☔', 2], snow: ['눈', '❄️', 1.5], wind: ['강풍', '🍃', 1.5], fog: ['안개', '🌫', 1], dust: ['미세먼지', '😷', 1] };


var RSPR = {
  coin: [ICON.coin[0], ICON.coin[1]],
  cash: [ICON.money[0], ICON.money[1]],
  bonus: [ICON.chest[0], ICON.chest[1]],
  coffee: [['.s.s.', 's.s..', 'WWWWW', 'WbbbW', 'WbbbW', 'WbbbW', '.WWW.'], { W: '#f6f6f2', b: '#7a4a24', s: '#cfcfc8' }],
  box: [['KKKKKKKKK', 'KYYYYYYYK', 'KYYKKKYYK', 'KYYYYKYYK', 'KYYYKKYYK', 'KYYYKYYYK', 'KYYYYYYYK', 'KYYYKYYYK', 'KKKKKKKKK'], { Y: '#ffcf3d', K: '#8a5a1c' }],
  bag: [['...kkkk...', '..k....k..', 'BBBBBBBBBB', 'BbbbbbbbbB', 'BbbbYbbbbB', 'BbbbbbbbbB', 'BbbbbbbbbB', 'BBBBBBBBBB'], { B: '#6b3f22', b: '#8a5a32', k: '#2b2b2b', Y: '#ffcf3d' }],
  cone: [['....O....', '...OOO...', '...OOO...', '..OWWWO..', '..OWWWO..', '..OOOOO..', '.OOOOOOO.', '.OWWWWWO.', '.OWWWWWO.', 'OOOOOOOOO', 'KKKKKKKKK'], { O: '#ff7a1a', W: '#f6f6f2', K: '#3a3f4a' }],
  papers: [['..WWWWWWWW...', '..WzzzzzzW...', '.WWWWWWWWWW..', '.WzzzzzzzzW..', 'WWWWWWWWWWWW.', 'WzzzzzzzzzzW.', 'WWWWWWWWWWWWW', 'WzzzzRzzzzzzW', 'WWWWWWWWWWWWW', 'WzzzzzzzzzzzW', 'WWWWWWWWWWWWW'], { W: '#f6f6f2', z: '#c9ced6', R: '#e8412c' }],
  trash: [['.GGGGGGGGG.', 'GGGGGGGGGGG', '.ggggggggg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.gGgGgGgGg.', '.ggggggggg.'], { G: '#3f9a4a', g: '#2a6b33' }],
  cat: [['k..k..........', 'kkkk.........k', 'kykk........k.', 'kkkk.kkkkkkkk.', '.kkkkkkkkkkkk.', '..kkkkkkkkkk..', '..k.k....k.k..', '..k.k....k.k..'], { k: '#3a3a3a', y: '#ffcf3d' }],
  dog: [['bb............', 'bbbb.........b', 'bkbbb.......b.', 'bbbbbbbbbbbbb.', 'Pbbbbbbbbbbbb.', '..bbbbbbbbbb..', '..b.b....b.b..', '..b.b....b.b..'], { b: '#c98a4a', k: '#1b1b22', P: '#ff8fc7' }],
  pigeon: [['...ww......', '.Ywkw......', '..wwwwwwww.', '...gwwwwwww', '....ggggg..'], { w: '#b8bec8', k: '#1b1b22', Y: '#ffb02e', g: '#6f7a8c' }],
  puddle: [['..LLLLLLLLLLLLLL..', 'LLLWLLLLLLLLWLLLLL', '..LLLLLLLLLLLLLL..'], { L: '#5fa8e8', W: '#d6eeff' }],
  scooter: [['.........KK.', '.........K..', '.........K..', '.........K..', '.........K..', '.........K..', 'GGGGGGGGGG..', '.KK.....KK..'], { K: '#2b2f3a', G: '#36b5a5' }],
  gate: [['KKKKKK......', 'KmGGmK......', 'KmmmmK......', 'KmmmmK......', 'KmmmmKRRRRRR', 'KmmmmKRRRRRR', 'KmmmmK......', 'KmmmmK......', 'KmmmmK......', 'KmmmmK......', 'KmmmmK......', 'KmmmmK......', 'KKKKKK......'], { K: '#3a3f4a', m: '#9aa3b0', G: '#3f9a4a', R: '#e8412c' }],
  bike: [['.......GG......', '..........G....', '...GGGGGGGG....', '..G....G...G...', '.KKK..G...KKK..', 'K...K.G..K...K.', 'K.......GK...K.', 'K...K....K...K.', '.KKK......KKK..'], { G: '#36b5a5', K: '#2b2f3a' }],

  ghost: [['...VVVVV...', '..VVVVVVV..', '.VVWWVWWVV.', '.VVWKVWKVV.', '.VVVVVVVVV.', '.VVVNNNVVV.', '.VVVVVVVVV.', '.VVVVVVVVV.', '.VV.VV.VV..'], { V: '#9b7ad6', W: '#ffffff', K: '#1b1b22', N: '#5a3a8a' }],
  mail: [['ZZ..........ZZ', '.ZWWWWWWWWWWZ.', '..WRWWWWWWRW..', '..WWRWWWWRWW..', '..WWWRRRRWWW..', '..WWWWWWWWWW..', '..WWWWWWWWWW..'], { W: '#f6f6f2', R: '#e8412c', Z: '#c9ced6' }],
  blob: [['..WWWWWWWW..', '.WzzzzzzzzW.', '.WWWWWWWWWW.', '.WKKWWWWKKW.', '.WWWWWWWWWW.', '.WzzzzzzzzW.', '.WKKKKKKKKW.', '.WWKWKWKWWW.', '.WWWWWWWWWW.', '..W......W..', '.WW......WW.'], { W: '#f6f6f2', z: '#c9ced6', K: '#c0392b' }]
};
ICON.bus = [['gggggggggg', 'gLLgLLgLLg', 'gLLgLLgLLg', 'gggggggggg', 'wggggggggw', '.kk....kk.'], { g: '#3f9a4a', L: '#bfe6ff', w: '#ffe27a', k: '#2b2b2b' }];

ICON.rclock = [['R.....R', '.RRRRR.', 'RWWKWWR', 'RWWKWWR', 'RWWKKWR', 'RWWWWWR', '.RRRRR.', 'R.....R'], { R: '#e8412c', W: '#f6f6f2', K: '#1b1d18' }];
ICON.rsun = [['Y..Y..Y', '.YYYYY.', '.YOOOY.', 'YYOOOYY', '.YOOOY.', '.YYYYY.', 'Y..Y..Y'], { Y: '#ffcf3d', O: '#ff9a1f' }];
ICON.rrain = [['..BBB..', '.BbBbB.', 'BBbBbBB', 'B..K..B', '...K...', '...K...', '..KK...'], { B: '#3f6fb5', b: '#9fd3ff', K: '#8a8f98' }];
ICON.rsnow = [['W..W..W', '.W.W.W.', '..WCW..', 'WWCCCWW', '..WCW..', '.W.W.W.', 'W..W..W'], { W: '#9fd3ff', C: '#ffffff' }];
ICON.rwind = [['..CCC..', '.....C.', 'CCCCC..', '.......', 'LLLLLLL', '.......', 'CCCC...'], { C: '#36b5a5', L: '#e0a020' }];
ICON.rfog = [['..WWW..', '.WWWWW.', 'WWWWWWW', '.......', 'GGGGGGG', '.......', '.GGGGG.'], { W: '#e3e7ec', G: '#aab2bc' }];
ICON.rdust = [['.SSSSS.', 'SKSSSKS', 'SSSSSSS', 'WWWWWWW', 'WGWGWGW', 'WWWWWWW', '.SSSSS.'], { S: '#f2c79a', K: '#1b1d18', W: '#f6f6f2', G: '#c9ced6' }];
ICON.rdown = [['..AAA..', '..AAA..', '..AAA..', 'AAAAAAA', '.AAAAA.', '..AAA..', '...A...'], { A: '#f6f6f2' }];
ICON.rpause = [['AA.AA', 'AA.AA', 'AA.AA', 'AA.AA', 'AA.AA', 'AA.AA'], { A: '#f6f6f2' }];
ICON.rsub = [['.GGGGG.', 'GLLGLLG', 'GLLGLLG', 'GGGGGGG', 'GYGGGYG', '.GGGGG.', '.K...K.'], { G: '#36b5a5', L: '#bfe6ff', Y: '#ffe27a', K: '#2b2b2b' }];
ICON.rbridge = [['..K...K..', '.KbK.KbK.', 'K.b.K.b.K', 'GGGGGGGGG', '.G.....G.', 'LLLLLLLLL'], { K: '#5f6f84', b: '#8796ab', G: '#8796ab', L: '#5fa8e8' }];
ICON.rtree = [['..ggg..', '.gGGGg.', 'gGGGGGg', 'gGGGGGg', '.gGGGg.', '...T...', '...T...'], { g: '#56b04a', G: '#3f9a4a', T: '#7a5a3a' }];
ICON.rbld = [['.BBBBB.', '.BLBLB.', '.BBBBB.', '.BLBLB.', '.BBBBB.', '.BLBLB.', '.BBDBB.'], { B: '#8f96a3', L: '#ffe27a', D: '#3a3f4a' }];
var R_ICO = { alley: 'house', bus: 'bus', subway: 'rsub', bike: 'rbike', bridge: 'rbridge', market: 'rtteok', park: 'rtree', short: 'rcat', avenue: 'rcar', under: 'rsbag', lobby: 'rbld' };
var RIMG = null;
RSPR.car = [['......RRRRRRRRR.....', '.....RLLLRLLLLLR....', '....RLLLLRLLLLLLR...', 'RRRRRRRRRRRRRRRRRRRR', 'YRRRRRRRRRRRRRRRRRWR', 'RRRRRRRRRRRRRRRRRRRR', '.KKK..........KKK...', 'K.g.K........K.g.K..', '.KKK..........KKK...'], { R: '#3f6fb5', L: '#bfe6ff', Y: '#ffe27a', W: '#e8412c', K: '#1b1d18', g: '#9aa0a6' }];

RSPR.carF = [['...KKKKKKKK...', '..KLLLLLLLLK..', '.KLLLLLLLLLLK.', 'RRRRRRRRRRRRRR', 'RYYRRRKKRRRYYR', 'RRRRRRRRRRRRRR', 'KKK........KKK'], { R: '#3f6fb5', L: '#bfe6ff', Y: '#ffe27a', K: '#1b1d18' }];
RSPR.carB = [['...KKKKKKKK...', '..KLLLLLLLLK..', '.KLLLLLLLLLLK.', 'WWWWWWWWWWWWWW', 'WEEWWWKKWWWEEW', 'WWWWWWWWWWWWWW', 'KKK........KKK'], { W: '#e8e4da', L: '#8fb7d6', E: '#e8412c', K: '#1b1d18' }];

RSPR.moto = [['..........KK..', '.YYYY......K..', '.YKKY......K..', '.YYYYRRRRRRK..', '..RRRRRRRRRRR.', '.KKK......KKK.', 'K.g.K....K.g.K', '.KKK......KKK.'], { Y: '#ffcf3d', K: '#1b1d18', R: '#e8412c', g: '#9aa0a6' }];
RSPR.moto[0] = RSPR.moto[0].map(function (r) { return r.split('').reverse().join(''); });
RSPR.aboard = [['.KKKKKKKK.', '.KWWWWWWK.', '.KWRRRRWK.', '.KWWWWWWK.', '.KWBBBWWK.', '.KWWWWWWK.', '.KWBBWWWK.', '.KKKKKKKK.', 'K........K', 'K........K'], { K: '#3a3f4a', W: '#f6f6f2', R: '#e8412c', B: '#3f6fb5' }];
RSPR.ramp = [['..........YY', '........YYKK', '......YYKKKK', '....YYKKKKKK', '..YYKKKKKKKK', 'YYKKKKKKKKKK'], { Y: '#ffcf3d', K: '#8a5a32' }];
RSPR.tteok = [['..K..', '.RRR.', '.RRR.', '.RRR.', '.RRR.', '..k..', '..k..', '..k..'], { R: '#e8412c', K: '#ffcf3d', k: '#b98a5a' }];
RSPR.hang = [['KKKKKKKKKKKKKK', 'KYYYYYYYYYYYYK', 'KYRRRYYYYRRRYK', 'KYYYYYYYYYYYYK', 'KKKKKKKKKKKKKK'], { K: '#1b1d18', Y: '#ffe27a', R: '#e8412c' }];
RSPR.sbag = [['..k..k..', '.k....k.', 'PPPPPPPP', 'PWWWWWWP', 'PWRRRRWP', 'PWWWWWWP', 'PPPPPPPP'], { P: '#ff8fc7', W: '#ffffff', R: '#e8412c', k: '#2b2b2b' }];
ICON.rbike = RSPR.bike; ICON.rtteok = RSPR.tteok; ICON.rcat = RSPR.cat; ICON.rcar = RSPR.carF; ICON.rsbag = RSPR.sbag;


(function () {
  var st = document.createElement('style');
  st.textContent = '.rn{max-width:760px;margin:12px auto 0;position:relative;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    'html.rn-play,html.rn-play body{touch-action:none;overscroll-behavior:none}html.rn-play #p-run{touch-action:none}' +
    '.rn-hud{display:flex;gap:8px;align-items:center;font-family:var(--display);font-weight:800;font-size:14px;margin-bottom:6px}' +
    '.rn-hud .ck{background:var(--ink);color:var(--bg);border-radius:8px;padding:3px 8px;font-variant-numeric:tabular-nums}.rn-hud .ck.late{background:var(--truth);color:#fff}' +
    '.rn-hud .ck.warn{animation:rnBl .5s steps(2) infinite}@keyframes rnBl{50%{background:var(--truth);color:#fff}}' +
    '.rn-hud .mo{font-variant-numeric:tabular-nums}.rn-hud .cb{color:var(--truth);font-variant-numeric:tabular-nums}.rn-hud .sg{margin-left:auto;color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    '.rn-pips{display:flex;gap:4px;margin-bottom:6px}.rn-pips i{flex:1;height:6px;border-radius:3px;background:var(--line2)}.rn-pips i.on{background:var(--ink)}' +
    '.rn-pips i.cur{background:linear-gradient(90deg,var(--ink) var(--p),var(--line2) var(--p))}' +
    '.rn-cv{position:relative;border:2px solid var(--ink);border-radius:12px;overflow:hidden;background:#0d0f0a;touch-action:none;cursor:pointer}' +
    '.rn-cv canvas{display:block;width:100%;height:auto;aspect-ratio:280/180;image-rendering:pixelated;image-rendering:crisp-edges}' +
    '.rn-bn{position:absolute;left:50%;top:10%;transform:translateX(-50%);background:rgba(13,15,10,.84);color:#fff;font-weight:800;padding:6px 14px;border-radius:999px;font-size:clamp(12px,2.4vw,17px);white-space:nowrap;pointer-events:none;max-width:94%;overflow:hidden;text-overflow:ellipsis}' +
    '.rn-bn.big{top:34%;font-size:clamp(28px,8vw,56px);padding:4px 26px;font-family:var(--display)}' +

    '.rn-fk{position:absolute;left:6px;right:6px;top:6px;display:grid;grid-template-columns:1fr 1fr;gap:5px;pointer-events:none}' +
    '.rn-fk b{display:grid;gap:1px;background:rgba(13,15,10,.66);color:#fff;font-size:clamp(12px,2.6vw,16px);padding:4px 9px;border-radius:10px;opacity:.7;line-height:1.25}' +
    '.rn-fk b small{font-size:clamp(10px,2vw,12px);font-weight:700;opacity:.85}' +
    '.rn-fk b.on{background:var(--px-arc-acc,#c6ff3d);color:#0d0f0a;opacity:1;box-shadow:0 0 0 2px #0d0f0a}' +
    '.rn-fk:not([hidden])~.rn-bn{top:34%}' +

    '.rn-tc{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:4px;padding:10px 14px;text-align:center;color:#fff;pointer-events:none}' +
    '.rn-tc .e{font-size:clamp(34px,9vw,60px);line-height:1}.rn-tc .t{font-family:var(--display);font-weight:900;font-size:clamp(20px,5vw,34px);letter-spacing:-.02em}' +
    '.rn-tc .k{font-size:clamp(11px,2.2vw,13px);font-weight:800;color:#0d0f0a;background:var(--px-arc-acc,#c6ff3d);border-radius:999px;padding:1px 10px}' +
    '.rn-tc .r{font-size:clamp(13px,2.8vw,17px);font-weight:700;max-width:30em;line-height:1.45}.rn-tc .s{font-size:12px;opacity:.7}' +

    '.rn-mg{position:absolute;left:8px;right:8px;bottom:8px;display:grid;gap:4px;justify-items:center;pointer-events:none;color:#fff;text-align:center}' +
    '.rn-mg .h{font-family:var(--display);font-weight:900;font-size:clamp(15px,3.6vw,22px);background:rgba(13,15,10,.78);border-radius:999px;padding:2px 14px}' +
    '.rn-mg .g{width:min(100%,360px);height:12px;border-radius:6px;background:rgba(13,15,10,.7);box-shadow:0 0 0 2px #0d0f0a;overflow:hidden}.rn-mg .g i{display:block;height:100%;width:0;background:var(--px-arc-acc,#c6ff3d)}' +
    '.rn-mg .g.hot i{background:#ffcf3d}.rn-mg.go .h{animation:rnPu .25s ease-out}@keyframes rnPu{from{transform:scale(1.25)}}' +
    '.rn-ov{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:10px;background:rgba(13,15,10,.6);padding:10px;cursor:default}' +
    '.rn-ov .q{color:#fff;font-weight:800;text-align:center;font-size:clamp(14px,2.6vw,18px);margin:0}' +

    '.rn-pad{display:none;grid-template-columns:auto 1fr;gap:8px;margin-top:8px}' +
    '.rn-pad .dn{min-height:64px;min-width:84px;border:2px solid var(--ink);border-radius:14px;background:var(--card);color:var(--ink);font-weight:900;font-size:15px;touch-action:none}' +
    '.rn-pad .jp{min-height:64px;border:2px solid var(--ink);border-radius:14px;background:var(--acc);color:var(--acc-ink);font-weight:900;font-size:17px;display:grid;place-items:center;touch-action:none}' +
    '.rn-pad .jp.on{transform:translateY(2px);box-shadow:inset 0 3px 0 rgba(0,0,0,.2)}' +
    '@media (pointer:coarse){.rn-pad{display:grid}}' +
    '.rn-help{font-size:12px;color:var(--muted);margin:6px 0 0;text-align:center}.rn-route{font-size:22px;letter-spacing:.1em}' +
    '.rn-log{list-style:none;margin:0;padding:0;font-size:13px;color:var(--soft);display:grid;gap:2px}' +
    '.rn-maps{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;padding:0;list-style:none;margin:4px 0 8px}.rn-maps li{font-size:13px;line-height:1.45}' +

    '.rn-tc .v{font-size:clamp(11px,2.3vw,13px);font-weight:800;background:rgba(255,255,255,.16);border-radius:8px;padding:2px 10px;font-variant-numeric:tabular-nums}' +
    '.rn-miss{border:2px solid var(--ink);border-radius:12px;padding:8px 12px;background:var(--card)}' +
    '.rn-pad .jp.mg{background:#ffcf3d;color:#0d0f0a}' +
    '.rn-bn.lo{top:auto;bottom:10%}' +

    '.rn-hud .ico,.rn-pad .dn .ico{display:inline-block}.rn-hud .ico{vertical-align:-3px;margin-right:4px}.rn-hud .sg .ico{margin:0 1px}.rn-hud [hidden]{display:none}.rn-pad .dn .ico{vertical-align:-3px;margin-right:4px}' +
    '.rn-hud .tb{display:flex;gap:6px;flex:none}.rn-hud .tb button{min-width:40px;height:30px;padding:0 8px;border:2px solid var(--ink);border-radius:8px;background:var(--ink);color:var(--bg);font:inherit;font-size:12px;font-weight:800;display:inline-grid;place-items:center;cursor:pointer;pointer-events:auto;touch-action:manipulation}' +
    '.rn-hud .tb .ico{margin:0;vertical-align:0}' +


    '.rn.xt{width:100vw;max-width:none;margin:0 0 0 calc(50% - 50vw)}.rn.xt .rn-cv{border-left:0;border-right:0;border-radius:0}' +
    '.rn.xt .rn-cv canvas{position:absolute;left:0;top:0;width:100%;height:100%;aspect-ratio:auto}' +
    '.rn.xt .rn-hud{position:absolute;left:0;right:0;top:2px;z-index:4;margin:0;padding:6px 8px 0;flex-wrap:wrap;gap:4px 6px;pointer-events:none;font-size:13px}' +
    '.rn.xt .rn-hud::after{content:"";flex-basis:100%;order:8}' +
    '.rn.xt .rn-hud>span:not(.tb){background:rgba(13,15,10,.62);color:#fff;border-radius:8px;padding:3px 8px}.rn.xt .rn-hud .cb{color:#ffcf3d;order:9}.rn.xt .rn-hud .ck.late{background:var(--truth)}' +
    '.rn.xt .rn-hud .sg{order:9;margin:0;font-size:12px;max-width:100%}.rn.xt .rn-hud .tb{margin-left:auto}' +
    '.rn.xt .rn-hud .tb button{background:rgba(13,15,10,.62);color:#fff;border-color:rgba(255,255,255,.55);height:32px}' +
    '.rn.xt .rn-pips{display:none}' +
    '.rn.xt .rn-fk{top:72px}.rn.xt .rn-bn{top:calc(var(--xt) + 8px)}.rn.xt .rn-fk:not([hidden])~.rn-bn{top:calc(var(--xt) + 60px)}.rn.xt .rn-bn.big{top:calc(var(--xt) + 60px)}.rn.xt .rn-bn.lo{top:auto;bottom:calc(var(--xb) + 10px)}' +
    '.rn.xt .rn-mg{bottom:78px}' +
    '.rn.xt .rn-pad{display:block;position:absolute;left:0;right:0;top:calc(var(--xh) - 74px);height:72px;margin:0;z-index:4;pointer-events:none}' +
    '.rn.xt .rn-pad .dn{position:absolute;left:8px;bottom:8px;width:100px;min-width:0;height:60px;min-height:0;padding:0;pointer-events:auto;background:rgba(13,15,10,.62);color:#fff;border-color:rgba(255,255,255,.6);font-size:14px}' +
    '.rn.xt .rn-pad .jp{position:absolute;left:116px;right:8px;bottom:8px;height:60px;min-height:0;background:rgba(13,15,10,.34);color:#fff;border:2px dashed rgba(255,255,255,.45);font-size:14px}' +
    '.rn.xt .rn-pad .jp.on{transform:none;box-shadow:none;background:rgba(198,255,61,.5);color:#0d0f0a}' +
    '.rn.xt .rn-pad .jp.mg{background:#ffcf3d;color:#0d0f0a;border:2px solid #0d0f0a;font-size:20px}' +
    '.rn.xt .rn-help{padding:0 12px}' +

    '@media (orientation:landscape) and (max-height:540px){.rn{max-width:calc((100vh - 142px) * 280 / 180)}}' +
    '@media (orientation:landscape) and (max-height:540px) and (pointer:coarse){.rn{max-width:calc((100vh - 142px) * 280 / 180 + 108px);display:grid;grid-template-columns:minmax(0,1fr) 100px;column-gap:8px}.rn-hud,.rn-pips,.rn-help{grid-column:1 / -1}.rn-cv{grid-column:1}.rn-pad{grid-column:2;grid-template-columns:1fr;grid-template-rows:1fr auto;margin-top:0}.rn-pad .dn{min-width:0;min-height:56px}.rn-pad .jp{order:-1;font-size:15px;text-align:center;padding:4px}}';
  document.head.appendChild(st);
}());


function rPad(rows) { var w = Math.max.apply(null, rows.map(function (r) { return r.length; })); return rows.map(function (r) { return r + new Array(w - r.length + 1).join('.'); }); }
function rCv(rows, pal) {
  var c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; pal = PX.pal2(pal); PX.paint(c.getContext('2d'), rows, pal, 0, 0, 1);
  if (PX.HR) { var h = document.createElement('canvas'); h.width = c.width * 2; h.height = c.height * 2; PX.paintHR(h.getContext('2d'), rows, pal, 0, 0, 2); c.hr = h; }
  return c;
}

function rHR(c) {
  if (c.__hr) return; c.__hr = 1; var d0 = c.drawImage;
  c.drawImage = function (im, a, b, w, h, e, f, g, i) {
    if (!im || !im.hr) return d0.apply(c, arguments);
    if (arguments.length === 3) return d0.call(c, im.hr, a, b, im.width, im.height);
    if (arguments.length === 5) return d0.call(c, im.hr, a, b, w, h);
    return d0.call(c, im.hr, a * 2, b * 2, w * 2, h * 2, e, f, g, i);
  };
}



var R_BIG = { coffee: 1, box: 1 };
function rX2(rows) { var o = []; rows.forEach(function (r) { var d = r.replace(/./g, function (ch) { return ch + ch; }); o.push(d, d); }); return o; }

var R_PPL = [
  [{ base: 'f', hair: 'long', fit: 'semi', col: 'pink', face: 'oval' }, { h: '#3b2618', i: '#28190f', j: '#5a3b26', n: '#1f130b' }],
  [{ base: 'm', hair: 'buzz', fit: 'suit', col: 'navy', face: 'square', acc: 'glasses' }, { h: '#8d8f94', i: '#6a6c70', j: '#b4b6ba', n: '#55575b', s: '#e9bf96', f: '#d29e78' }],
  [{ base: 'f', hair: 'bob', fit: 'dress', col: 'wine', face: 'round' }, { h: '#7a3b1e', i: '#5a2a14', j: '#9a5530', n: '#45200f', s: '#f9dcc0', f: '#e8b996' }],
  [{ base: 'm', hair: 'curly', fit: 'semi', col: 'olive', face: 'round' }, { h: '#2a2a2a', i: '#1a1a1a', j: '#444444', n: '#111111', s: '#d9a57c', f: '#bf8a62' }]
];
function rImgs(D, r) {
  var rk = myRank(), pal = zPal(rk, 'normal', {});
  var I = {
    run: zRunFrames(zRows(rk, 'normal', {})).map(function (f) { return rCv(PX.outline(f), pal); }),
    stand: rCv(PX.outline(zRows(rk, 'normal', {})), pal),
    jump: rCv(PX.outline(zRows(rk, 'happy', {})), zPal(rk, 'happy', {})),
    hit: rCv(PX.outline(zRows(rk, 'shock', {})), zPal(rk, 'shock', {})),
    boss: rCv(PX.outline(zRows(4, 'normal', { plain: 1 })), zPal(4, 'normal', { plain: 1 })),
    obj: {}, ppl: [], bld: []
  };
  for (var k in RSPR) I.obj[k] = rCv(PX.outline(rPad(R_BIG[k] ? rX2(RSPR[k][0]) : RSPR[k][0])), RSPR[k][1]);
  R_PPL.forEach(function (q, p) { var o = { look: q[0] }, pl = zPal(p, 'normal', o); for (var k in q[1]) pl[k] = q[1][k]; I.ppl.push(rCv(PX.outline(zRows(p, 'normal', o)), pl)); });
  var L = POOL.slice();
  for (var b = 0; b < 14 && L.length; b++) { var c = L.splice(Math.floor(r() * L.length), 1)[0]; I.bld.push(rCv(bldRows(c), bldPal(c))); }
  I.dest = rCv(bldRows(D), bldPal(D)); I.destCol = GRP_COL[D.grp] || GRP_COL['기타·서비스'];
  if (D.lg) { I.logo = new Image(); I.logo.src = D.lg; }
  return I;
}
function rPickW(r, W) { var s = 0, k; for (k in W) s += W[k][2]; var x = r() * s; for (k in W) { x -= W[k][2]; if (x < 0) return k; } return k; }

function runPlan(seed) {
  var r = PC.rng('runplan|' + seed), L = POOL.filter(function (c) { return c.lg && c.m >= 1000 && (TODAY < '2026-11-10' || c.n.length <= 8); });
  if (!L.length) L = POOL;
  var slots = R_SLOTS.map(function (s) { var p = s.length < 3 ? s : PC.shuffleR(r, s).slice(0, 2); return R_UNDER[p[0]] ? [p[1], p[0]] : p; });
  return { dest: L[Math.floor(r() * L.length)], wx: rPickW(r, R_WX), slots: slots };
}
function rSpd(M, seg, f) { return M.spd * (1 + R_RAMP * (seg + (f || 0)) / R_SLOTS.length); }




var R_OVH = .8;
var R_ZONE = { brake: 320, wind: 820, light: 1100, pedal: 450 };

var R_HILL = { up: 240, top: 50, dn: 150, ht: 40 };
function runHill0(R) { var a = null; (R.ev || []).forEach(function (E) { if (E.k === 'mini' && E.m === 'pedal') a = E.at + 14; }); return a; }
function runHillH(R, w) {
  if (!RMAP[R.key] || !RMAP[R.key].bike) return 0; var x0 = runHill0(R); if (x0 == null) return 0;
  var H = R_HILL, u = w - x0; if (u <= 0) return 0;
  if (u < H.up) return H.ht * u / H.up; u -= H.up; if (u < H.top) return H.ht; u -= H.top; return u < H.dn ? H.ht * (1 - u / H.dn) : 0;
}
function runHillSl(R) { return (runHillH(R, R.dist + 21) - runHillH(R, R.dist + 13)) / 8; }
function rGen(key, R, seg) {
  var M = RMAP[key], r = PC.rng('run|' + R.seed + '|' + key), L = [], x = 300, cm = M.coin || 1;
  var fork = R.slots[seg + 1] && R.slots[seg + 1].length > 1, end = fork ? M.len - 760 : M.len - 200;
  var obs = M.obs.concat(!M.inn && R.wx === 'rain' ? ['puddle', 'puddle'] : []);
  var add = function (k, at, y) { var vx = R_VX[k] || 0, v = rSpd(M, seg, at / M.len); var o = { k: k, x: at - vx * at / v, y: y || 0, by: y || 0, vx: vx, p: k === 'person' ? Math.floor(r() * 4) : 0 }; L.push(o); return o; };
  var plat = function (at, w, y) { L.push({ k: 'plat', x: at, w: w, y: y, b: M.bouncy ? 1 : 0 }); };
  var row = function (at, n, y) { for (var i = 0; i < n; i++) add('coin', at + i * 13, y); };
  var arc = function (at, b) { for (var i = -2; i <= 2; i++) add('coin', at + i * 13, (b || 0) + 14 + 34 * (1 - i * i / 6)); };
  var ev = (M.mini || []).map(function (m) { var at = m[1] === 's' ? 40 : Math.round(M.len * m[1]); if (fork && m[1] !== 's' && R_MINI[m[0]].fr && TODAY >= '2026-11-10') at = Math.min(at, M.len - 790 - 400); return { at: at, k: 'mini', m: m[0] }; });
  var zones = ev.map(function (e) { return [e.at - 80, e.at + (R_ZONE[e.m] || 200)]; });
  var gap = function () { return (M.dense ? 140 : 160) + r() * 90; };
  var hiY = M.float ? [4, 56, 104] : M.ceil ? [4, 4, 52] : [4, 4, 56];
  while (x < end) {
    if (zones.some(function (z) { return x > z[0] && x < z[1]; })) { x += 40; continue; }
    var p = r(), k = obs[Math.floor(r() * obs.length)];
    if (p < .24) {
      var w = 150 + Math.floor(r() * 170); plat(x, w, R_T1); row(x + 14, Math.floor((w - 20) / 26), M.bouncy ? R_T1 + 62 : R_T1 + 4);
      if (!M.bouncy && r() < .45) add('blob', x + w * .7, R_T1).vx = 0;
      var top3 = !M.ceil && !M.bouncy && r() < .4;
      if (!top3 && (!M.ceil || M.ceil >= 100) && !M.bouncy && r() < R_OVH) add(M.inn ? 'hang' : 'pigeon', x + w * .45, R_T1 + 40);
      if (top3) { var w2 = 70 + Math.floor(r() * 50); plat(x + w * .35, w2, R_T2); add(r() < .5 ? 'cash' : 'bonus', x + w * .35 + w2 / 2 - 4, R_T2 + 6); }
      if (r() < .6) add(k === 'pigeon' ? 'cone' : k, x + w * .5);
      x += w + 110;
    } else if (p < .5) {
      if (M.bike && r() < .4) { add('ramp', x); arc(x + 90, 62); x += 260; continue; }
      if (M.car && r() < .35) { add('moto', x); if (r() < .6) arc(x + 10, 8); x += gap() + 40; continue; }
      if (k === 'pigeon') { add('pigeon', x, 44); row(x - 26, 5, 4); }
      else { add(k, x); if (r() < .6 * cm) arc(x + 6, M.float ? 30 : 0); }
      x += gap();
    } else if (p < .7) {
      var f = M.foe.length ? M.foe[Math.floor(r() * M.foe.length)] : 'dog';
      add(f, x, f === 'ghost' ? 22 : f === 'mail' ? 26 : 0); if (r() < .5) row(x + 40, 4, 4);
      x += gap();
    } else if (p < .86) {
      if (M.belt && r() < .55) { var bw = 240 + Math.floor(r() * 120); L.push({ k: 'belt', x: x, w: bw }); row(x + 20, Math.floor(bw / 30), 4); x += bw + 90; continue; }
      var rn = r() < .5 ? 5 : 7, ry = hiY[Math.floor(r() * 3)]; row(x, rn, ry);
      if (ry === 4 && r() < R_OVH) add(M.inn ? 'hang' : 'pigeon', x + rn * 6 - 6, M.inn ? 40 : 42);
      x += 110 + r() * 60;
    }
    else { var q = r(); add(q < .35 ? 'cash' : q < .6 ? 'coffee' : q < .8 ? 'box' : 'bonus', x, q < .35 ? 26 : q < .6 ? 20 : q < .8 ? 28 : M.ceil ? 50 : 66); x += 130 + r() * 60; }
  }
  if (fork) {
    var fx = M.len - 560;
    L.push({ k: 'sign', x: fx - 230, up: R.slots[seg + 1][0], dn: R.slots[seg + 1][1] });
    plat(fx, 640, R_T1); row(fx + 20, 18, M.bouncy ? R_T1 + 62 : R_T1 + 4);
    var f0 = M.foe[0] || 'dog';
    add(obs[0] === 'pigeon' ? 'cone' : obs[0], fx + 170); add(f0, fx + 340, f0 === 'ghost' ? 22 : f0 === 'mail' ? 26 : 0); row(fx + 230, 4, 4);
    ev.push({ at: fx - 440, k: 'fork' });
  }

  var pool = Object.keys(R_EV).filter(function (k) { var E = R_EV[k]; return !(E.out && M.inn) && !(E.inn && !M.inn) && !(E.not && E.not.indexOf(key) >= 0); });
  var at = Math.round(M.len * (.2 + r() * .35)), fz = fork ? [[M.len - 1000 - 250, M.len]] : [];
  for (var t = 0; t < 6 && zones.concat(fz).some(function (z) { return at > z[0] - 200 && at < z[1] + 100; }); t++) at = Math.round(M.len * (.15 + r() * .5));
  ev.push({ at: at, k: PC.shuffleR(r, pool)[0] });
  L.sort(function (a, b) { return a.x - b.x; });
  return { objs: L, ev: ev };
}

function rSpawn(R, k, ahead, y, o) { var x = { k: k, x: R.dist + ahead, y: o && o.fall ? 150 : y, by: y, ty: y, vx: (o && o.vx) || 0, p: Math.floor(RR() * 4) }; R.objs.push(x); return x; }
function rClear(R, a, b) { R.objs.forEach(function (o) { var d = o.x - R.dist; if (!o.done && !R_VAL[o.k] && o.k !== 'plat' && o.k !== 'sign' && d > a && d < b) o.done = 1; }); }
var R_EV = {
  money:  { msg: '💸 하늘에서 연봉이 쏟아져요!', go: function (R) { for (var i = 0; i < 12; i++) rSpawn(R, i % 4 ? 'coin' : 'cash', RW + i * 26, 6 + RR() * 58, { fall: 1 }); } },
  magnet: { msg: '🧲 연봉 자석! 6초 동안 돈이 따라와요', go: function (R) { R.magnet = 6; rClear(R, RW - 40, RW + 300); for (var i = 0; i < 10; i++) rSpawn(R, 'coin', RW + 20 + i * 22, 10 + (i % 3) * 22); } },
  wind:   { msg: '🌪 돌풍! 6초 동안 몸이 가벼워요', out: 1, go: function (R) { R.lowg = 6; for (var i = 0; i < 6; i++) rSpawn(R, 'coin', RW + 40 + i * 24, 80 + (i % 2) * 10); } },
  boss:   { msg: '😱 부장님이 뒤에서 쫓아와요! 7초 버티기', go: function (R) { R.chase = 7; R.chHit = 0; } },
  fever:  { msg: '🔥 피버 타임! 6초 동안 돈 2배', go: function (R) { R.fever = 6; for (var i = 0; i < 8; i++) rSpawn(R, 'coin', RW + i * 15, 4); } },
  box:    { msg: '🎁 수상한 상자 발견!', go: function (R) { rClear(R, RW - 20, RW + 120); rSpawn(R, 'box', RW + 40, 26); } },
  stock:  { msg: '', go: function (R) {
    var c = POOL[Math.floor(RR() * POOL.length)], up = RR() < .6, d = Math.max(50, Math.round(R.money * (.08 + RR() * .12) / 10) * 10);
    if (!up) d = Math.min(d, R.money); R.money += up ? d : -d; R.log.push((up ? '📈 ' : '📉 ') + c.n + ' 주가 ' + (up ? '급등 +' : '급락 −') + man(d) + '만원');
    runBanner((up ? '📈 ' : '📉 ') + c.n + ' 주가 ' + (up ? '급등! +' : '급락… −') + man(d) + '만원', 2200); sfx(up ? 'combo' : 'wrong'); } },
  treat:  { msg: '☕ 동기가 커피를 쐈어요!', go: function (R) { for (var i = 0; i < 3; i++) rSpawn(R, 'coffee', RW + 30 + i * 120, 18); } },
  dark:   { msg: '💡 정전! 앞이 잘 안 보여요', inn: 1, not: ['lobby'], go: function (R) { R.dark = 5; } },
  dogs:   { msg: '🐕 산책하는 강아지 떼!', out: 1, go: function (R) { rClear(R, RW - 40, RW + 520); rSpawn(R, 'dog', RW + 80, 0, { vx: -60 }); rSpawn(R, 'dog', RW + 300, 0, { vx: -60 }); } },
  warp:   { msg: '🛵 동네 형 오토바이 얻어 탐! ⏰ −2분', out: 1, go: function (R) { var nx = 1e9; (R.ev || []).forEach(function (E) { if (E.k === 'mini' && !E.done && E.at > R.dist) nx = Math.min(nx, E.at); }); R.nudge = (R.nudge || 0) + Math.max(0, Math.min(420, nx - R.dist - 120)); R.inv = Math.max(R.inv, .9); R.pen -= 2; rClear(R, -60, 620); } }
};

function runEndPick(R) {
  if (R.endEv != null) return;
  var mr = function (k) { var x = R.mres.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : -1; }, badge = mr('badge'), elev = mr('elev');
  var ok = R_END.map(function (E, i) { return i === 6 ? 0 : i === 1 ? badge === 0 : i === 3 ? elev === 0 : 1; });
  var L = R_END.map(function (E, i) { return i; }).filter(function (i) { return ok[i]; }), ei = L[Math.floor(RR() * L.length)], E = R_END[ei];
  R.endEv = ei; R.money += E[1]; R.pen += E[2];
}
var R_END = [['🤝 엘리베이터에서 대표님과 단둘이 · 눈도장', 500, 0], ['🪪 사원증을 집에 두고 옴… 경비실 들렀다 감', 0, 3], ['🎂 로비에서 깜짝 생일 파티', 300, 0],
  ['🛗 엘리베이터 만원 · 다음 거 탐', 0, 1], ['📞 헤드헌터 전화: "이직 생각 있으세요?" 몸값 확인', 200, 0], ['☕ 팀장님이 엘리베이터에서 커피 사 줌', 100, 0],
  ['🏠 알고 보니 오늘 재택이었다… 그래도 출근 도장 쾅', 0, 0], ['📅 회의실 예약 성공! 오늘 하루 순탄', 150, 0]];


function rr(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function ih(i, s) { var x = (i * 374761393 + s * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) % 1000 / 1000; }
function tile(cam, f, P, fn) { var off = cam * f, i = Math.floor(off / P); for (var x = -(off - i * P); x < RW; x += P, i++) fn(x, i); }
function clipWin(c, cam, P, x0, y0, w, h, inner) {
  c.save(); c.beginPath(); tile(cam, 1, P, function (x) { c.rect(Math.round(x + x0), y0, w, h); }); c.clip(); inner(); c.restore();
}
function bldAt(c, i, x, y) { var n = RIMG.bld.length, b = RIMG.bld[((i % n) + n) % n]; c.drawImage(b, Math.round(x), y - b.height); }
var RBG = {
  alley: function (c, cam) {
    rr(c, '#c4e2ff', 0, 0, RW, 56); rr(c, '#e4f2ff', 0, 56, RW, 54); rr(c, '#fff4c2', 214, 20, 16, 12); rr(c, '#fff4c2', 216, 18, 12, 16);
    tile(cam, .3, 52, function (x, i) { var h = 30 + ih(i, 1) * 26, col = ['#e9c9a8', '#d9b8a0', '#c9d3c0', '#e2d1b8'][Math.floor(ih(i, 2) * 4)];
      rr(c, col, x, 110 - h, 44, h); rr(c, ['#b5523b', '#4f6f93', '#7a5a3a'][Math.floor(ih(i, 3) * 3)], x - 2, 104 - h, 48, 6);
      rr(c, ih(i, 4) < .6 ? '#fff3b0' : '#8a94a6', x + 8, 116 - h, 8, 8); rr(c, ih(i, 5) < .5 ? '#fff3b0' : '#8a94a6', x + 28, 116 - h, 8, 8); });
    tile(cam, .6, 96, function (x, i) {
      if (ih(i, 6) < .3) { rr(c, '#cdbfae', x, 98, 96, RGY - 98); rr(c, '#b3a492', x, 95, 96, 4); rr(c, '#e9e4da', x + 6, 80, 68, RGY - 80); rr(c, '#2f7a3a', x + 8, 82, 64, 10); rr(c, '#ffffff', x + 14, 86, 22, 3); rr(c, '#c6ff3d', x + 52, 85, 14, 4); rr(c, '#bfe6ff', x + 10, 96, 60, RGY - 96); rr(c, '#9fd3ff', x + 40, 96, 2, RGY - 96); rr(c, 'rgba(255,255,255,.45)', x + 12, 98, 3, RGY - 100); }
      else { rr(c, '#cdbfae', x, 98, 96, RGY - 98); rr(c, '#b3a492', x, 95, 96, 4); for (var k = 0; k < 7; k++) rr(c, '#bfb09f', x, 106 + k * 8, 96, 1); }
      rr(c, '#5a5d63', x + 82, 66, 3, RGY - 66); rr(c, '#ffe27a', x + 78, 63, 11, 4); });
    rr(c, '#6d6f73', 0, RGY, RW, RH - RGY); rr(c, '#a9abaf', 0, RGY, RW, 3);
    tile(cam, 1, 40, function (x) { rr(c, '#e9e9e9', x, RGY + 12, 18, 2); });
  },
  bus: function (c, cam, t) {
    if (!RUN.onBus) return rBusStop(c, cam, t);
    rr(c, '#efe6d2', 0, 0, RW, RGY);
    clipWin(c, cam, 70, 6, 22, 58, 66, function () {
      rr(c, '#bfe3ff', 0, 22, RW, 40); rr(c, '#dff1ff', 0, 62, RW, 26);
      tile(cam, 2.4, 44, function (x, i) { bldAt(c, i, x, 88); });
      tile(cam, 3.2, 60, function (x, i) { if (ih(i, 7) < .5) { rr(c, '#4f9a4a', x, 70, 14, 12); rr(c, '#7a5a3a', x + 6, 82, 2, 6); } });
    });
    tile(cam, 1, 70, function (x) { rr(c, '#c8bba0', x, 18, 70, 4); rr(c, '#b3a68b', x, 88, 70, 5); rr(c, '#c8bba0', x, 18, 6, 75); });
    rr(c, '#9aa0a6', 0, 9, RW, 2);
    tile(cam, 1, 28, function (x) { rr(c, '#9aa0a6', x + 12, 11, 1, 6); rr(c, '#ffcf3d', x + 10, 17, 5, 1); rr(c, '#ffcf3d', x + 10, 21, 5, 1); rr(c, '#ffcf3d', x + 10, 17, 1, 5); rr(c, '#ffcf3d', x + 14, 17, 1, 5); });
    tile(cam, 1, 70, function (x) { rr(c, '#3f6fb5', x + 10, 100, 50, 24); rr(c, '#2f5a96', x + 8, 122, 54, 8); rr(c, '#5a5d63', x + 14, 130, 3, RGY - 130); rr(c, '#5a5d63', x + 53, 130, 3, RGY - 130); });
    tile(cam, 1, 140, function (x) { rr(c, '#ffcf3d', x + 40, 11, 3, RGY - 11); rr(c, '#e8412c', x + 39, 72, 5, 4); });
    rr(c, '#4f5359', 0, RGY, RW, RH - RGY); tile(cam, 1, 8, function (x) { rr(c, '#5f646b', x, RGY + 4, 4, RH - RGY - 4); });
  },
  subway: function (c, cam, t) {
    if (!RUN.inTrain) return rPlatform(c, cam, t);
    rr(c, '#e3e7ec', 0, 0, RW, RGY);
    clipWin(c, cam, 110, 14, 24, 78, 54, function () {
      rr(c, '#1a2030', 0, 24, RW, 54);
      tile(cam + t * 400, 1, 46, function (x, i) { rr(c, '#ffe27a', x, 34 + Math.floor(ih(i, 8) * 3) * 14, 24, 2); });
    });
    tile(cam, 1, 110, function (x) { rr(c, '#b9c0c9', x + 12, 22, 82, 2); rr(c, '#b9c0c9', x + 12, 78, 82, 2); });
    rr(c, '#36b5a5', 0, 88, RW, 4); rr(c, '#9aa0a6', 0, 9, RW, 2);
    tile(cam, 1, 26, function (x) { rr(c, '#9aa0a6', x + 12, 11, 1, 6); rr(c, '#f6f6f2', x + 10, 17, 5, 5); rr(c, '#e3e7ec', x + 11, 18, 3, 3); });
    tile(cam, 1, 330, function (x) { rr(c, '#c4cbd4', x + 140, 16, 50, RGY - 16); rr(c, '#a6aeb8', x + 164, 16, 2, RGY - 16); rr(c, '#1a2030', x + 146, 30, 14, 30); rr(c, '#1a2030', x + 172, 30, 14, 30); });
    tile(cam, 1, 110, function (x) { rr(c, '#3f8f7a', x + 2, 104, 104, 20); rr(c, '#2f6f5f', x, 122, 108, 8); });
    rr(c, '#9aa0a8', 0, RGY, RW, RH - RGY); rr(c, '#ffcf3d', 0, RGY, RW, 2);
  },
  bike: function (c, cam) {
    rr(c, '#bfe3ff', 0, 0, RW, 70); rr(c, '#dff1ff', 0, 70, RW, 30);
    tile(cam, .15, 30, function (x, i) { var h = 10 + ih(i, 30) * 30; rr(c, '#a9bccf', x, 100 - h, 26, h); });
    rr(c, '#4f8fd0', 0, 100, RW, 26); tile(cam, .5, 34, function (x, i) { rr(c, '#bfe3ff', x + ih(i, 31) * 20, 106 + (i % 3) * 6, 7, 1); });
    var SN = rSnow(); rr(c, SN ? '#e9f0f3' : '#7fbf5a', 0, 126, RW, 18); tile(cam, .9, 70, function (x, i) { if (ih(i, 32) < .6) { rr(c, SN ? '#4f7a5a' : '#3f9a4a', x + 10, 112, 16, 18); if (SN) rr(c, '#f4f8fb', x + 10, 110, 16, 4); rr(c, '#7a5a3a', x + 17, 130, 2, 8); } });
    rr(c, '#c95a4a', 0, RGY - 14, RW, 14); rr(c, '#b14a3c', 0, RGY - 14, RW, 2);
    rr(c, '#6d6f73', 0, RGY, RW, RH - RGY); tile(cam, 1, 36, function (x) { rr(c, '#f2f2f2', x, RGY + 10, 16, 2); });
    tile(cam, 1, 300, function (x) { rr(c, '#f2f2f2', x + 20, RGY - 10, 12, 6); rr(c, '#c95a4a', x + 23, RGY - 8, 6, 2); });
  },
  bridge: function (c, cam, t) {
    rr(c, '#a8d8ff', 0, 0, RW, 40); rr(c, '#c4e4ff', 0, 40, RW, 40); rr(c, '#e0f0ff', 0, 80, RW, 22);
    tile(cam, .12, 26, function (x, i) { var h = 14 + ih(i, 9) * 36; rr(c, '#9fb4c8', x, 102 - h, 22, h); if (i % 23 === 5) { rr(c, '#9fb4c8', x + 9, 102 - h - 22, 4, 22); rr(c, '#9fb4c8', x + 6, 102 - h - 26, 10, 5); } });
    rr(c, '#3f7fbf', 0, 102, RW, RGY - 116);
    tile(cam, .5, 30, function (x, i) { rr(c, (Math.floor(t * 3) + i) % 3 ? '#9fd3ff' : '#d6eeff', x + ih(i, 10) * 20, 108 + (i % 4) * 8, 6, 1); });
    tile(cam, .75, 120, function (x) { rr(c, '#8796ab', x, 68, 4, RGY - 82); rr(c, '#8796ab', x, 68, 120, 3); rr(c, '#8796ab', x + 60, 68, 2, RGY - 82); });
    rr(c, '#d0d4da', 0, RGY - 14, RW, 3); tile(cam, 1, 14, function (x) { rr(c, '#a6abb3', x, RGY - 14, 2, 14); });
    rr(c, '#7d8088', 0, RGY, RW, RH - RGY); tile(cam, 1, 48, function (x) { rr(c, '#ffcf3d', x, RGY + 11, 24, 2); });
  },
  market: function (c, cam) {
    rr(c, '#f3e2c4', 0, 0, RW, RGY); rr(c, '#d9c7a8', 0, 0, RW, 10);
    tile(cam, .4, 30, function (x, i) { rr(c, ['#ffcf3d', '#e8412c', '#ffffff'][i % 3], x, 4, 30, 3); });
    tile(cam, .8, 84, function (x, i) {
      var a = ['#e8412c', '#3f6fb5', '#3f9a4a', '#ff9a1f'][Math.floor(ih(i, 33) * 4)];
      for (var k = 0; k < 7; k++) rr(c, k % 2 ? '#ffffff' : a, x + k * 12, 30, 12, 12);
      rr(c, '#8a6a4a', x + 2, 42, 2, RGY - 60); rr(c, '#8a6a4a', x + 80, 42, 2, RGY - 60);
      rr(c, '#b98a5a', x + 4, RGY - 34, 78, 6); rr(c, '#8a5a32', x + 4, RGY - 28, 78, 12);
      var g = ['#e8412c', '#ffcf3d', '#3f9a4a', '#ff9a1f', '#c06bd6'];
      for (var j = 0; j < 6; j++) rr(c, g[(i + j) % 5], x + 8 + j * 12, RGY - 40, 8, 6);
      rr(c, '#1b1d18', x + 26, 50, 34, 10); rr(c, '#ffe27a', x + 30, 53, 26, 4);
    });
    rr(c, '#a89a86', 0, RGY, RW, RH - RGY); tile(cam, 1, 20, function (x) { rr(c, '#968873', x, RGY, 1, RH - RGY); });
  },
  park: function (c, cam, t) {
    var SN = rSnow();
    rr(c, '#cdeeff', 0, 0, RW, 80); rr(c, '#e6f7ff', 0, 80, RW, 20);
    tile(cam, .25, 40, function (x, i) { var h = 26 + ih(i, 34) * 20; rr(c, SN ? '#b9cbc4' : '#7fbf6a', x, 100 - h, 36, h); rr(c, SN ? '#f4f8fb' : '#6aa85a', x + 6, 100 - h - 6, 24, 6); });
    rr(c, SN ? '#e9f0f3' : '#8fd06a', 0, 100, RW, RGY - 100);
    tile(cam, .7, 110, function (x, i) {
      rr(c, '#7a5a3a', x + 20, RGY - 44, 5, 36); rr(c, SN ? '#4f7a5a' : '#3f9a4a', x + 6, RGY - 72, 34, 30); rr(c, SN ? '#f4f8fb' : '#56b04a', x + 12, RGY - 78, 22, 8); if (SN) rr(c, '#f4f8fb', x + 6, RGY - 72, 34, 4);
      if (ih(i, 35) < .4) { rr(c, '#8a5a32', x + 60, RGY - 22, 30, 4); rr(c, '#8a5a32', x + 60, RGY - 30, 30, 3); rr(c, '#3a3f4a', x + 62, RGY - 18, 2, 10); rr(c, '#3a3f4a', x + 86, RGY - 18, 2, 10); }
      else if (ih(i, 36) < .3) { rr(c, '#b9c0c9', x + 58, RGY - 16, 34, 8); if (SN) rr(c, '#dff1ff', x + 60, RGY - 18, 30, 3); else rr(c, '#9fd3ff', x + 72, RGY - 30 - Math.abs(Math.sin(t * 4 + i)) * 6, 6, 14); }
    });
    rr(c, '#e0c99a', 0, RGY, RW, RH - RGY); tile(cam, 1, 26, function (x, i) { rr(c, '#cdb585', x + ih(i, 37) * 20, RGY + 6 + (i % 3) * 5, 3, 2); });
  },
  short: function (c, cam) {
    rr(c, '#c4e2ff', 0, 0, RW, 24);
    tile(cam, .8, 64, function (x, i) {
      rr(c, ih(i, 11) < .5 ? '#a5553c' : '#94493a', x, 18, 64, RGY - 18);
      for (var k = 0; k < 23; k++) rr(c, '#7d3a2c', x, 24 + k * 6, 64, 1);
      rr(c, '#6b6f74', x + 52, 18, 3, RGY - 18);
      if (ih(i, 12) < .5) { rr(c, '#d7dbe0', x + 10, 58, 18, 13); rr(c, '#9aa0a6', x + 13, 61, 12, 1); rr(c, '#9aa0a6', x + 13, 65, 12, 1); }
      if (ih(i, 13) < .35) { rr(c, '#2b2f3a', x + 30, 40, 2, 10); rr(c, ['#ff9bd3', '#ffe27a', '#9fd3ff'][i % 3], x + 22, 50, 18, 12); }
    });
    rr(c, '#5b4f48', 0, RGY, RW, RH - RGY); tile(cam, 1, 200, function (x) { rr(c, '#3e3530', x, RGY + 8, 16, 4); });
  },
  avenue: function (c, cam) {
    rr(c, '#cfe9ff', 0, 0, RW, 70); rr(c, '#e2f2ff', 0, 70, RW, 64);
    tile(cam, .35, 46, function (x, i) { bldAt(c, i, x, RGY - 22); });
    rr(c, '#5d6066', 0, RGY - 24, RW, 16); rr(c, '#f2f2f2', 0, RGY - 17, RW, 1);
    var CR = RIMG.obj.car, tt = RUN ? RUN.t : 0; [[0, 230, 0], [1, -150, 1]].forEach(function (q) { var x = ((q[0] * 190 - tt * q[1] - cam * .9) % 420 + 420) % 420 - 60; c.save(); if (q[2]) { c.translate(Math.round(x) + CR.width, 0); c.scale(-1, 1); c.drawImage(CR, 0, RGY - 9 - CR.height); } else c.drawImage(CR, Math.round(x), RGY - 18 - CR.height + 6); c.restore(); });
    var dx = RMAP.avenue.len + 30 - cam + RPX, D = RIMG.dest;
    if (dx < RW + 10) rDestBld(c, Math.round(dx) + D.width * 2, RGY - 8, D.height * 2);
    var SN = rSnow(); tile(cam, .9, 90, function (x) { rr(c, '#7a5a3a', x + 30, RGY - 30, 4, 22); rr(c, SN ? '#4f7a5a' : '#4f9a4a', x + 20, RGY - 52, 24, 22); rr(c, SN ? '#f4f8fb' : '#5fb05a', x + 24, RGY - 56, 16, 6); if (SN) rr(c, '#f4f8fb', x + 20, RGY - 52, 24, 3); });
    rr(c, '#b5b0a5', 0, RGY - 8, RW, 8); rr(c, '#d8d2c6', 0, RGY, RW, RH - RGY); tile(cam, 1, 16, function (x) { rr(c, '#c4bdb0', x, RGY, 1, RH - RGY); });
  },
  under: function (c, cam) {
    rr(c, '#d9dde3', 0, 0, RW, RGY); rr(c, '#bfc5cd', 0, 0, RW, 14);
    tile(cam, 1, 40, function (x) { rr(c, '#fff8d8', x + 10, 4, 20, 4); });
    tile(cam, .8, 100, function (x, i) {
      var a = ['#ff9bd3', '#9fd3ff', '#ffe27a', '#b8f0a0', '#d9b8ff'][Math.floor(ih(i, 38) * 5)];
      rr(c, '#2b2f3a', x + 4, 22, 92, 12); rr(c, a, x + 10, 25, 40, 6);
      rr(c, '#fffdf4', x + 4, 34, 92, RGY - 50); rr(c, a, x + 8, 40, 84, 3);
      for (var j = 0; j < 4; j++) { rr(c, a, x + 12 + j * 20, 54, 12, 16); rr(c, '#8a8f98', x + 12 + j * 20, 70, 12, 2); }
      rr(c, '#8a8f98', x + 4, RGY - 16, 92, 2); rr(c, '#a6aeb8', x + 2, 22, 2, RGY - 38);
    });
    rr(c, '#c9ccd2', 0, RGY, RW, RH - RGY); tile(cam, 1, 22, function (x, i) { rr(c, i % 2 ? '#b9bdc4' : '#d6d9de', x, RGY, 22, RH - RGY); });
  },
  lobby: function (c, cam) {
    var gx = Math.round(R_GATE - cam + RPX), bx = Math.round(R_BADGE() - cam + RPX), ex = Math.round(R_ELEV() - cam + RPX);
    if (gx > -30) {
      rr(c, '#cfe9ff', 0, 0, RW, RGY); tile(cam, .3, 46, function (x, i) { bldAt(c, i, x, RGY - 26); });
      rDestBld(c, gx + 30, RGY, RGY - 6);
      rr(c, '#c9c3b6', 0, RGY, RW, RH - RGY); tile(cam, 1, 24, function (x) { rr(c, '#b8b1a3', x, RGY, 1, RH - RGY); });
      tile(cam, .95, 110, function (x, i) { if (x > gx - 40) return; rr(c, '#7a5a3a', x + 30, RGY - 26, 4, 26); rr(c, rSnow() ? '#4f7a5a' : '#4f9a4a', x + 20, RGY - 46, 24, 22); if (rSnow()) rr(c, '#f4f8fb', x + 20, RGY - 49, 24, 5); });
    }
    c.save(); c.beginPath(); c.rect(Math.max(0, gx + 20), 0, RW, RH); c.clip();
    rr(c, '#f0ede6', 0, 0, RW, RGY);
    tile(cam, .5, 60, function (x) { rr(c, '#cfe3ef', x + 4, 10, 52, 84); rr(c, '#b9cfdc', x + 4, 50, 52, 1); });
    tile(cam, .5, 240, function (x) {
      rr(c, RIMG.destCol, x + 58, 14, 94, 30); rr(c, '#ffffff', x + 62, 18, 86, 22);
      var L = RIMG.logo; if (L && L.complete && L.naturalWidth) { var h = 18, w = Math.min(80, L.naturalWidth * h / L.naturalHeight); c.drawImage(L, Math.round(x + 105 - w / 2), 20, Math.round(w), h); }
      else { c.font = 'bold 11px sans-serif'; c.fillStyle = '#1b1d18'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(RUN.dest.n, x + 105, 29.5, 80); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; }
    });
    tile(cam, .8, 150, function (x) { rr(c, '#c0602b', x + 20, RGY - 16, 12, 16); rr(c, '#3f9a4a', x + 16, RGY - 34, 20, 18); rr(c, '#2a6b33', x + 24, RGY - 38, 4, 6); });
    if (bx > -160 && bx < RW + 200) {
      rr(c, '#2b2f3a', bx + 168, RGY - 98, 76, 14); c.font = 'bold 8px sans-serif'; c.fillStyle = '#ffffff'; c.fillText('안내 RECEPTION', bx + 174, RGY - 88);
      var Q = RIMG.ppl[2 % RIMG.ppl.length]; c.drawImage(Q, bx + 192, RGY - 30 - Q.height + 12);
      rr(c, '#6b5236', bx + 170, RGY - 30, 74, 30); rr(c, '#9b7652', bx + 168, RGY - 32, 78, 4); rr(c, '#c6ff3d', bx + 172, RGY - 24, 70, 2);
      [bx + 76, bx + 162].forEach(function (gxx, gi) { rGuard(c, gxx, RGY, gi); });
    }
    if (ex > -120 && ex < RW + 200) [ex - 96, ex + 96].forEach(function (x) {
      rr(c, '#8f96a3', x, RGY - 74, 88, 74); rr(c, '#c4cbd4', x + 4, RGY - 70, 80, 70); rr(c, '#8f96a3', x + 43, RGY - 70, 2, 70); rr(c, '#1b1d18', x + 30, RGY - 82, 28, 8); rr(c, '#ff9b3d', x + 40, RGY - 80, 8, 4);
    });
    rr(c, '#ddd6c8', 0, RGY, RW, RH - RGY); rr(c, '#c9c1b1', 0, RGY + 10, RW, 1); tile(cam, 1, 24, function (x) { rr(c, '#c9c1b1', x, RGY, 1, RH - RGY); });
    c.restore();
    if (gx > -40 && gx < RW + 40) {
      rr(c, '#2b2f3a', gx - 6, RGY - 100, 8, 100); rr(c, '#2b2f3a', gx + 22, RGY - 100, 8, 100); rr(c, '#2b2f3a', gx - 10, RGY - 108, 44, 10);
      rr(c, RIMG.destCol, gx - 8, RGY - 106, 40, 6);
      [gx - 13, gx + 31].forEach(function (dx) { rr(c, '#2b2f3a', dx, RGY - 80, 6, 80); rr(c, '#bfe6ff', dx + 1, RGY - 78, 4, 76); rr(c, '#ffffff', dx + 1, RGY - 78, 1, 76); rr(c, '#9aa0a6', dx + 2, RGY - 44, 2, 6); });
      c.font = 'bold 7px sans-serif'; c.fillStyle = '#ffffff'; c.fillText('정문', gx + 3, RGY - 101);
    }
  }
};

var R_GATE = 420;
function R_BADGE() { return Math.round(RMAP.lobby.len * RMAP.lobby.mini[0][1]); }
function R_ELEV() { return Math.round(RMAP.lobby.len * RMAP.lobby.mini[1][1]) + 94; }

function rDestBld(c, rx, by, h) {
  var D = RIMG.dest, k = h / D.height, w = Math.round(D.width * k), x = Math.round(rx - w);
  c.drawImage(D, x, Math.round(by - h), w, Math.round(h));
  var pw = Math.min(w - 6, 70), px = Math.round(x + (w - pw) / 2), py = Math.round(by - h + Math.max(4, h * .08));
  rr(c, '#1b1d18', px - 1, py - 1, pw + 2, 16); rr(c, '#ffffff', px, py, pw, 14); rr(c, RIMG.destCol, px, py + 12, pw, 2);
  var L = RIMG.logo; if (L && L.complete && L.naturalWidth) { var lh = 10, lw = Math.min(pw - 4, L.naturalWidth * lh / L.naturalHeight); c.drawImage(L, Math.round(px + (pw - lw) / 2), py + 1, Math.round(lw), lh); }
  else { c.font = 'bold 7px sans-serif'; c.fillStyle = '#1b1d18'; c.textAlign = 'center'; c.fillText(RUN.dest.n.slice(0, 8), px + pw / 2, py + 9); c.textAlign = 'left'; }
}
function rSnow() { return RUN && RUN.wx === 'snow'; }
function rGuard(c, x, gy, i) {
  rr(c, '#1b1d18', x - 1, gy - 41, 16, 41); rr(c, '#2c3e66', x, gy - 28, 14, 18); rr(c, '#3b3f4a', x + 1, gy - 10, 12, 9); rr(c, '#1b1d18', x, gy - 2, 14, 2);
  rr(c, '#f2c9a0', x + 2, gy - 37, 10, 9); rr(c, '#1b1d18', x + 4, gy - 34, 2, 2); rr(c, '#1b1d18', x + 8, gy - 34, 2, 2);
  rr(c, '#2c3e66', x + 1, gy - 41, 12, 4); rr(c, '#1b1d18', x - 1, gy - 37, 16, 1); rr(c, '#ffcf3d', x + 6, gy - 40, 2, 2);
  rr(c, '#ffcf3d', x + 9, gy - 25, 3, 2); rr(c, '#1b1d18', x + (i ? 0 : 12), gy - 24, 2, 6);
}

function rBusStop(c, cam) {
  rr(c, '#cfe9ff', 0, 0, RW, 90); rr(c, '#e2f2ff', 0, 90, RW, 40);
  tile(cam, .3, 46, function (x, i) { bldAt(c, i, x, RGY - 26); });
  rr(c, '#a9abaf', 0, RGY - 28, RW, 2); rr(c, '#6d6f73', 0, RGY - 26, RW, 18); tile(cam, .8, 28, function (x) { rr(c, '#e9e9e9', x, RGY - 18, 12, 2); });
  var cx2 = Math.round(((RUN ? RUN.el : 0) * 70 + cam * .2) % (RW + 160)) - 80; [[cx2, '#3f6fb5'], [(cx2 + 210) % (RW + 160) - 80, '#e8e4da']].forEach(function (v) { var vx = RW - v[0] - 40; rr(c, '#1b1d18', vx - 1, RGY - 25, 38, 13); rr(c, v[1], vx, RGY - 24, 36, 10); rr(c, '#bfe6ff', vx + 8, RGY - 23, 18, 4); rr(c, '#2b2b2b', vx + 5, RGY - 14, 6, 4); rr(c, '#2b2b2b', vx + 25, RGY - 14, 6, 4); });
  tile(cam, 1, 520, function (x) { rr(c, '#2b2f3a', x + 20, RGY - 76, 96, 6); rr(c, 'rgba(191,230,255,.5)', x + 26, RGY - 70, 84, 40); rr(c, '#5a5d63', x + 22, RGY - 70, 3, 70); rr(c, '#5a5d63', x + 111, RGY - 70, 3, 70);
    rr(c, '#3f9a4a', x + 124, RGY - 88, 22, 14); c.font = 'bold 8px sans-serif'; c.fillStyle = '#fff'; c.fillText('BUS', x + 127, RGY - 78); rr(c, '#5a5d63', x + 134, RGY - 74, 2, 74); rr(c, '#8a6a4a', x + 34, RGY - 22, 60, 4); });
  rr(c, '#b5b0a5', 0, RGY - 8, RW, 8); rr(c, '#d8d2c6', 0, RGY, RW, RH - RGY); tile(cam, 1, 16, function (x) { rr(c, '#c4bdb0', x, RGY, 1, RH - RGY); });
}

function rPlatform(c, cam, t) {
  rr(c, '#dfe4e9', 0, 0, RW, RGY); for (var y = 60; y < RGY; y += 12) rr(c, '#d2d8de', 0, y, RW, 1);
  rr(c, '#aab2bc', 0, 0, RW, RGY - RMAP.subway.ceil - 40); rr(c, '#7e848c', 0, RGY - RMAP.subway.ceil - 42, RW, 2);
  tile(cam, 1, 60, function (x) { rr(c, '#fff8d8', x + 20, RGY - RMAP.subway.ceil - 46, 22, 3); });
  tile(cam, .9, 220, function (x, i) {
    rr(c, '#2b2f3a', x + 20, 64, 84, 18); rr(c, '#36b5a5', x + 20, 80, 84, 3); c.font = 'bold 9px sans-serif'; c.fillStyle = '#ffffff'; c.fillText('조로역  ZORRO', x + 28, 77);
    var a = ['#ff9bd3', '#9fd3ff', '#ffe27a', '#b8f0a0'][Math.floor(ih(i, 51) * 4)]; rr(c, '#5a5d63', x + 128, 62, 58, 44); rr(c, a, x + 131, 65, 52, 38); rr(c, '#ffffff', x + 136, 92, 30, 4);
  });
  tile(cam, 1, 150, function (x) { rr(c, '#b9c0c9', x + 110, RGY - RMAP.subway.ceil - 40, 12, RMAP.subway.ceil + 40); rr(c, '#a6aeb8', x + 120, RGY - RMAP.subway.ceil - 40, 2, RMAP.subway.ceil + 40); });
  tile(cam, .95, 300, function (x) { rr(c, '#7e848c', x + 30, RGY - 14, 40, 4); rr(c, '#5a5d63', x + 32, RGY - 10, 3, 10); rr(c, '#5a5d63', x + 65, RGY - 10, 3, 10); });
  rr(c, '#a6aeb8', 0, RGY, RW, RH - RGY); rr(c, '#ffcf3d', 0, RGY + 3, RW, 4); tile(cam, 1, 6, function (x) { rr(c, '#e0b52f', x + 1, RGY + 4, 2, 2); });
}

function rAhj(c, x, gy, t) {
  rr(c, '#1b1d18', x - 1, gy - 45, 20, 45); rr(c, '#7a4a2a', x, gy - 31, 18, 20); rr(c, '#3b3f4a', x + 2, gy - 11, 14, 10); rr(c, '#1b1d18', x + 1, gy - 2, 16, 2);
  rr(c, '#f2c9a0', x + 3, gy - 41, 12, 11); rr(c, '#1b1d18', x + 5, gy - 37, 2, 2); rr(c, '#1b1d18', x + 11, gy - 37, 2, 2); rr(c, '#2b1f18', x + 5, gy - 33, 8, 2);
  rr(c, '#3a2f28', x + 1, gy - 45, 16, 5); rr(c, '#3a2f28', x - 2, gy - 41, 10, 2);
  var w = Math.floor(t * 4) % 2; rr(c, '#7a4a2a', x - 5, gy - 30 + w * 2, 6, 4); rr(c, '#f2c9a0', x - 7, gy - 30 + w * 2, 3, 3);
}
var SH_X = [124, 162, 200];

function rSay(c, txt, tx, ty, col) {
  c.font = 'bold 8px sans-serif'; var w = Math.ceil(c.measureText(txt).width) + 10, h = 14, x = Math.max(4, Math.min(RW - 4 - w, tx - w + 12)), y = ty - h - 5;
  rr(c, '#1b1d18', x - 1, y - 1, w + 2, h + 2); rr(c, '#ffffff', x, y, w, h); rr(c, '#1b1d18', tx - 3, y + h, 6, 1); rr(c, '#ffffff', tx - 2, y + h, 4, 3); rr(c, '#1b1d18', tx - 3, y + h + 1, 1, 3); rr(c, '#1b1d18', tx + 2, y + h + 1, 1, 3); rr(c, '#1b1d18', tx - 1, y + h + 4, 2, 1);
  c.fillStyle = col; c.fillText(txt, x + 5, y + 10);
}
function rCard(c, x, y, up, tg, hl) {
  rr(c, hl || '#1b1d18', x - 13, y - 1, 26, 34);
  if (!up) { rr(c, '#3f6fb5', x - 12, y, 24, 32); for (var d = 0; d < 3; d++) rr(c, '#c6ff3d', x - 3, y + 6 + d * 8, 6, 4); return; }
  rr(c, tg ? '#c6ff3d' : '#ffffff', x - 12, y, 24, 32);
  c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillStyle = tg ? '#1b1d18' : '#e8412c'; c.fillText(tg ? '★' : '✕', x, y + 19);
  c.font = 'bold 6px sans-serif'; c.fillText(tg ? '조로' : '꽝', x, y + 28); c.textAlign = 'left';
}

function runWx(c, R) {
  var t = R.t, w = R.wx, i, SP = RH + R_XT.e, Y0 = -R_XT.t, NK = SP / RH;
  if (w === 'rain') { rr(c, 'rgba(40,60,90,.16)', 0, 0, RW, RH); c.fillStyle = 'rgba(190,215,240,.85)'; for (i = 0; i < Math.round(46 * NK); i++) c.fillRect(Math.floor(((ih(i, 20) * RW - t * 70 - R.dist * .3) % RW + RW) % RW), Y0 + Math.floor((ih(i, 21) * SP + t * 280) % SP), 1, 5); }
  else if (w === 'snow') { c.fillStyle = '#ffffff'; for (i = 0; i < Math.round(50 * NK); i++) c.fillRect(Math.floor(((ih(i, 22) * RW + Math.sin(t * 2 + i) * 6 - R.dist * .2) % RW + RW) % RW), Y0 + Math.floor((ih(i, 23) * SP + t * 34) % SP), 2, 2); }
  else if (w === 'wind') { c.fillStyle = '#e0a020'; for (i = 0; i < 18; i++) c.fillRect(Math.floor(((ih(i, 24) * RW - t * 240) % RW + RW) % RW), Math.floor(ih(i, 25) * RGY + Math.sin(t * 5 + i) * 8), 3, 2); }
  else if (w === 'fog') { rr(c, 'rgba(240,242,245,.24)', 0, 0, RW, RH); var fg = c.createLinearGradient(130, 0, RW, 0); fg.addColorStop(0, 'rgba(240,242,245,0)'); fg.addColorStop(1, 'rgba(240,242,245,.7)'); c.fillStyle = fg; c.fillRect(130, Y0, RW - 130, RGY - Y0); }
  else if (w === 'dust') rr(c, 'rgba(196,166,96,.24)', 0, 0, RW, RH);
}


var R_LEN_TXT = '1분 20초 안팎';



var R_DAYEV = { 1: ['😩 월요병', '조로가 조금 느려요 · 커피 효과 2배', { spd: .93, cof: 2 }], 3: ['💪 수요일 고비', '콤보 배율 +0.5', { cmb: .5 }], 5: ['🎉 불금', '줍는 돈 ×1.2', { mon: 1.2 }] };
function runDayEv(wx) {
  var e = R_DAYEV[PC.dow(TODAY)], o = e ? { nm: e[0], how: e[1], fx: e[2] } : null;
  if (wx === 'rain') o = { nm: (o ? o.nm + ' · ' : '') + '☔ 비 오는 날', how: (o ? o.how + ' · ' : '') + '정시 도착하면 우산값 +200만원 · 웅덩이 밟으면 미끄덩', fx: Object.assign({ rain: 200 }, o ? o.fx : {}) };
  return o;
}

function runDexHtml() {
  var D = runDex(), n = R_DEX.filter(function (k) { return D[k]; }).length;
  return '<div class="rdex"><p class="src" style="margin:0">미니게임 도감 <b>' + n + ' / ' + R_DEX.length + '</b>' + (n < R_DEX.length ? ' · 다 모으면 전설 소품' : ' · 완성! 🏆') + '</p><ul>' +
    R_DEX.map(function (k) { var X = R_MINI[k]; return '<li class="' + (D[k] ? 'on' : '') + '" title="' + esc(X.nm) + '">' + (D[k] ? X.nm.split(' ')[0] : '?') + '</li>'; }).join('') + '</ul></div>';
}

function runMyDest() { var n = store.get('slp-rundest'); return n && BYN[n] ? BYN[n] : null; }
function runAbandoned() { return runTry().open && !(RUN && RUN.on); }

function runClock(R) { return R_T0 + R.t * R_RATE + R.pen; }
function hhmm(m) { m = Math.floor(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

function runMorning() {
  if (document.getElementById('rnAm') || typeof sceneURL !== 'function') return;
  try { var S = TOD_SKY.morning, st = document.createElement('style'); st.id = 'rnAm';
    st.textContent = 'html #p-run .pxst.pxst.pxst.pxst{background:' + sceneURL('run', 'morning') + ' center bottom / auto 100% repeat-x, linear-gradient(' + S[0] + ',' + S[1] + ');color:#0b0b0b;--soft:#45483f;--muted:#5d6057}';
    document.head.appendChild(st); } catch (e) {}
}
function renderRun() {
  runMorning();
  if (!PX.ok) { $('run').innerHTML = '<p class="src">이 브라우저에선 그림 게임을 열 수 없어요. 다른 게임을 즐겨 주세요.</p>'; return; }
  if (RUN && RUN.on) { if (!$('rnC')) runStage(); runPause('계속 달리려면 누르세요'); return; }
  var x = runRec(), ranked = runRanked(), all = store.getJ('slp-runbest', null);
  var maps = Object.keys(RMAP).filter(function (k) { return RMAP[k].tip; }).map(function (k) { var M = RMAP[k]; return '<li>' + M.emo + ' <b>' + M.nm + '</b> — ' + esc(M.tip) + '</li>'; }).join('');
  $('run').innerHTML = '<div class="intro"><h3>조로 출근길</h3>' +
    stage(zorro(myRank(), 'normal', 3, 'idle') + icon('bus', 5), 'resst', '내 조로와 버스') +
    '<p class="sum"><b>내 조로</b>가 집에서 회사까지 달려요. 한 판 ' + R_LEN_TXT + '!<br>탈것·길마다 규칙이 달라요. 지하철은 <b>연타</b>로 밀고 타고, 신호등에선 <b>꾹</b> 눌러 멈춰요.</p>' +
    (ranked ? '<p class="src" style="margin:0">오늘의 코스는 모두 같은 길이에요. <b>하루 2번 도전, 높은 점수가 순위에 올라가요.</b>' + (runTries() && x && x.score != null ? ' 지금 <b>' + man(x.score) + '만원</b>' + (x.rank ? ' · ' + man(x.rank) + '위' : '') + ' · <b>1번 남음</b>' : '') + '</p>'
      : '<p class="src" style="margin:0">오늘 순위 판 2번을 다 했어요' + (x && x.sent && x.rank ? ' · <b>' + man(x.rank) + '위</b> / ' + man(x.total) + '명 (' + man(x.score) + '만원)' : '') + '. 지금부턴 길·날씨가 매번 바뀌는 연습 판이에요.</p>') +
    (runAbandoned() ? '<p class="src" style="margin:0">⚠️ 중간에 멈춘 순위 판이 있어요. <b>중단한 판도 1번으로 쳐요.</b></p>' : '') +
    (runDayEv('') ? '<p class="src" style="margin:0">오늘의 이벤트 <b>' + runDayEv('').nm + '</b> · ' + runDayEv('').how + '</p>' : '') +
    (!ranked ? '<div class="fld rdest"><label for="rdIn">연습 판 출근지 (내 회사·가고 싶은 회사)</label><input type="text" id="rdIn" autocomplete="off" placeholder="회사 이름 · 비우면 매번 랜덤" value="' + esc(runMyDest() ? runMyDest().n : '') + '"><div class="ac" id="rdAc" hidden></div></div>' : '') +
    '<button class="btn big" id="rGo" type="button">' + (ranked ? (runTries() ? '오늘의 코스 두 번째 도전 ▶' : '오늘의 코스 출근하기 ▶') : '연습 출근하기 ▶') + '</button>' +
    (ranked ? '<button class="btn" id="rPr" type="button" style="margin-top:6px">연습 먼저 (순위 안 들어가요)</button>' : '') +
    (x || all ? '<p class="src" style="margin:8px 0 0">' + (x && x.best ? '오늘 최고 <b>' + man(x.best) + '만원</b> (' + (x.n || 1) + '판)' : '') + (x && x.best && all ? ' · ' : '') + (all ? '역대 최고 <b>' + man(all.s) + '만원</b>' : '') + '</p>' : '') +
    '<p class="src" style="margin:6px 0 0">달리는 조로는 <a href="#look">내 조로</a>에서 꾸민 모습 그대로예요. 순위표·명예의 전당에도 이 모습으로 올라가요.</p>' +
    '<details class="rules"><summary>규칙 보기</summary><ul>' +
    '<li><b>화면 어디를 눌러도 점프</b> (길게 누르면 더 높이, 공중에서 한 번 더 = 2단 점프). 폰은 아래 <b>⬇ 버튼</b>이나 <b>아래로 쓸기</b>, 키보드는 ↓ = 발판에서 내려오기.</li>' +
    '<li>적(야근 유령 · 스팸 메일 · 서류 괴물)은 위에서 밟으면 처치 +100만원. 옆에서 부딪히면 꽈당(⏰ +2분 · −100만원).</li>' +
    '<li>쉬지 않고 돈을 주우면 콤보! 10콤보마다 돈 배율이 올라가요(최대 ×3). 장애물을 아슬아슬하게 넘으면 +50만원.</li>' +
    '<li>갈림길 3번: 큰 화살표 표지판이 나오면 끝까지 <b>위층에 있으면 위 길, 땅에 있으면 아래 길</b>. 길마다 규칙과 미니게임이 달라요:</li></ul>' +
    '<ul class="rn-maps">' + maps + '</ul><ul>' +
    '<li>9시 전에 도착하면 정시 출근 보너스 1,000만원 + 일찍 온 1분마다 50만원.</li>' +
    '<li>하루 2판 = 오늘의 코스(둘 중 높은 점수가 순위 · 이번 주 합계 · 명예의 전당). 하루 첫 완주에 경험치 +1. 소품 ' + gameItems('run').length + '개와 칭호 2개(출근의 신 · 얼리버드).</li></ul></details>' +
    runDexHtml() + (!ranked ? '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbR"></div></details>' : '') + gotBox('run') + '</div>';
  $('rGo').onclick = function () { runStart(); };
  if ($('rPr')) $('rPr').onclick = function () { runStart(1); };
  if ($('rdIn')) { ac($('rdIn'), $('rdAc'), CO, function (c) { if (!c) return; store.set('slp-rundest', c.n); $('rdIn').value = c.n; toast('연습 판은 ' + c.n + '(으)로 출근해요'); });
    $('rdIn').addEventListener('change', function () { if (!this.value.trim()) { store.del('slp-rundest'); toast('출근지를 매번 랜덤으로 바꿨어요'); } }); }
  if (!ranked) miniLb('lbR', 'run');
}
function RR() { return RUN && RUN.rnd ? RUN.rnd() : Math.random(); }
function runStart(prac) {
  var ranked = !prac && runRanked(), seed = ranked ? 'day|' + TODAY : Date.now().toString(36) + Math.random().toString(36).slice(2, 7), P = runPlan(seed);
  if (!ranked && runMyDest()) P.dest = runMyDest();
  RIMG = rImgs(P.dest, PC.rng('runbld|' + seed));
  RUN = { on: 1, ranked: ranked, seed: seed, rnd: PC.rng('runev|' + seed), dest: P.dest, wx: P.wx, slots: P.slots, seg: 0, key: 'alley', route: ['alley'], dist: 0, t: 0, el: 0, pen: 0,
    h: 0, v: 0, jumps: 0, air: 0, drop: 0, buf: 0, coy: 0, held: 0, jumpHeld: 0, jt: -9, jh: 0,
    money: 0, got: 0, hits: 0, combo: 0, maxCombo: 0, kills: 0, near: 0, esc: 0, cd: 1.8, cdn: 0, warned: 0, mini: null, card: null, seen: {}, mres: [],
    dev: runDayEv(P.wx),
    stun: 0, slip: 0, slips: 0, left: [], bstop: 0, inv: 0, boost: 0, land: 0, lift: 0, hs: 0, acc: 0, zx: 0, blink: 0, fade: null, carry: null, nudge: 0, coast: 0, crem: 0, easeIn: 0, shake: 0, flash: 0, magnet: 0, lowg: 0, chase: 0, fever: 0, dark: 0, fx: [], dust: [], pops: [], log: [], pause: '', last: 0, raf: 0, bn: 0, step: 0 };
  if (ranked) { var T = runTry(); T.n = runTries() + 1; T.open = 1; store.setJ('slp-runtry', T); RUN.try = T.n;
    var X0 = runRec(); RUN.ref = T.n > 1 && X0 && X0.sg ? X0.sg : null; RUN.sg = [];
    setProg('run', { tok: '', t0: Date.now() }); startDaily('run').then(function (t) { var p = prog('run'); if (p) { p.tok = t.tok; setProg('run', p); } }); }
  var G = rGen('alley', RUN, 0); RUN.objs = G.objs; RUN.ev = G.ev;
  runStage(); runSegCard('alley', 1); runGo();
  runFit(); setTimeout(function () { if (RUN && RUN.on && $('rnC')) { runLay(); runFit(); } }, 120);
}

function runFit() { try { var rn = document.querySelector('#run .rn'), pb = document.querySelector('.playbar'); if (!rn) return;
  var st = pb ? parseFloat(getComputedStyle(pb).top) || 0 : 0, y = Math.max(0, rn.getBoundingClientRect().top + window.scrollY - st - (pb ? pb.getBoundingClientRect().height : 0) - (R_XT.e ? 0 : 6)), sec = $('p-run');
  if (sec) { sec.style.minHeight = ''; var lack = y + window.innerHeight - document.documentElement.scrollHeight; if (lack > 0 && R_XT.e) sec.style.minHeight = Math.ceil(sec.getBoundingClientRect().height + lack) + 'px'; }
  window.scrollTo(0, y); } catch (e) {} }


var R_XT = { e: 0, t: 0, b: 0 };
function runLay() {
  var rn = document.querySelector('#run .rn'), box = $('rnCv'); if (!rn || !box) return;
  var W = document.documentElement.clientWidth || window.innerWidth, H = window.innerHeight, pb = $('playbar'), ph = pb ? pb.getBoundingClientRect().height + (parseFloat(getComputedStyle(pb).top) || 0) : 0, e = 0, sc = W / RW, coarse = false;
  try { coarse = matchMedia('(pointer:coarse)').matches; } catch (x) {}
  if (H > W && (W <= 640 || coarse)) { e = Math.floor(Math.min(172, (H - ph - 8) / sc - RH, 260 / sc)); if (e < 24) e = 0; }
  R_XT.e = e; R_XT.t = Math.round(e * .42); R_XT.b = e - R_XT.t;
  rn.classList.toggle('xt', e > 0); box.style.height = e ? Math.round(W * (RH + e) / RW) + 'px' : '';
  rn.style.setProperty('--xt', Math.round(R_XT.t * sc) + 'px'); rn.style.setProperty('--xb', Math.round(R_XT.b * sc) + 'px'); rn.style.setProperty('--xh', Math.round(W * (RH + e) / RW) + 'px');
}
window.addEventListener('resize', function () { if (!RUN || !RUN.on || !$('rnC')) return; runLay(); if (RUN.pause) runDraw(); });
function runStage() {
  $('run').innerHTML = '<div class="rn"><div class="rn-hud"><span class="ck" id="rnCk">' + icon('rclock', 2) + '<b></b></span><span class="mo" id="rnMo">' + icon('money', 2) + '<b></b></span><span class="cb" id="rnCb" hidden>' + icon('flame', 2) + '<b></b></span><span class="sg" id="rnSg"></span>' +
    '<span class="tb" id="rnTb"><button type="button" id="rnPz" aria-label="잠깐 멈춤" title="잠깐 멈춤">' + icon('rpause', 2) + '</button></span></div>' +
    '<div class="rn-pips" id="rnPips" aria-hidden="true"></div>' +
    '<div class="rn-cv" id="rnCv"><canvas id="rnC" width="' + RW + '" height="' + RH + '" role="img" aria-label="조로 출근길 게임 화면. 어디를 눌러도 점프"></canvas>' +
    '<div class="rn-fk" id="rnFk" hidden></div><div class="rn-bn" id="rnBn" hidden></div><div class="rn-mg" id="rnMg" hidden><span class="h" id="rnMgH"></span><span class="g" id="rnMgG"><i></i></span></div>' +
    '<div class="rn-tc" id="rnTc" hidden></div><div class="rn-ov" id="rnOv" hidden></div></div>' +
    '<div class="rn-pad"><button type="button" class="dn" id="rnDn" aria-label="발판에서 내려오기">' + icon('rdown', 2) + '내려오기</button><div class="jp" id="rnJp" aria-hidden="true">점프 · 어디를 눌러도 돼요</div></div>' +
    '<p class="rn-help">아무 데나 누르기 · 스페이스 = 점프 (길게 = 높이) · 내려오기 버튼 · 아래로 쓸기 · ↓ = 내려오기 · 멈춤은 오른쪽 위 버튼</p></div>';
  $('rnDn').addEventListener('pointerdown', function (e) { e.preventDefault(); runDrop(); });
  $('rnPz').onclick = function () { runPause('잠깐 멈췄어요'); };
  runLay(); runHud(1);
}
function runMult(R) { var f = R.dev ? R.dev.fx : {}; return Math.round((1 + Math.min(2, Math.floor(R.combo / 10) * .5) + (f.cmb || 0)) * (f.mon || 1) * 10) / 10; }
function runHud(force) {
  var R = RUN; if (!R || !$('rnCk')) return;
  var cl = runClock(R), ck = hhmm(cl), M = RMAP[R.key];
  if (force || ck !== R.hck) { R.hck = ck; $('rnCk').lastChild.textContent = ck; $('rnCk').classList.toggle('late', cl > R_DUE); $('rnCk').classList.toggle('warn', cl >= R_DUE - 8 && cl <= R_DUE); }
  if (force || R.money !== R.hmo) { R.hmo = R.money; $('rnMo').lastChild.textContent = man(R.money) + '만원'; }
  var cb = R.combo >= 5 ? R.combo + (runMult(R) > 1 ? ' ×' + runMult(R) : '') : '';
  if (force || cb !== R.hcb) { R.hcb = cb; $('rnCb').hidden = !cb; $('rnCb').lastChild.textContent = cb; }
  if (force) $('rnSg').innerHTML = icon(R_ICO[R.key], 2) + ' ' + esc(M.nm) + (M.inn ? '' : ' · ' + icon('r' + R.wx, 2, '', R_WX[R.wx][0])) + (R.dev && R_DAYEV[PC.dow(TODAY)] ? ' · ' + esc(R_DAYEV[PC.dow(TODAY)][0].replace(/^\S+ /, '')) : '');
  var p = Math.round(Math.min(1, R.dist / M.len) * 20) * 5;
  if (force || p !== R.hp) { R.hp = p; $('rnPips').innerHTML = R_SLOTS.map(function (x, i) { return '<i class="' + (i < R.seg ? 'on' : i === R.seg ? 'cur' : '') + '"' + (i === R.seg ? ' style="--p:' + p + '%"' : '') + '></i>'; }).join(''); }

  var F = R.fork, up = R.h >= R_T1 - 2, fk = F && !R.card ? (up ? 'u' : 'd') : '';
  if (force || fk !== R.hfk) { R.hfk = fk; var el = $('rnFk'); el.hidden = !fk;
    if (fk) el.innerHTML = [[F.up, '⬆ 위층', up], [F.dn, R_UNDER[F.dn] ? '⬇ 땅 → 지하' : '➡ 땅(아래)', !up]].map(function (a) { var X = RMAP[a[0]]; return '<b class="' + (a[2] ? 'on' : '') + '">' + a[1] + ' ' + X.emo + ' ' + X.nm + '<small>' + esc(X.tip || '') + '</small></b>'; }).join(''); }
}
function runBanner(txt, ms, big) { var b = $('rnBn'); if (!b) return; b.textContent = txt; b.className = 'rn-bn' + (big ? ' big' : ''); b.hidden = false; clearTimeout(RUN.bn); RUN.bn = setTimeout(function () { b.hidden = true; }, ms || 1400); }
function rBuzz(ms) { try { if (navigator.vibrate && !REDUCE) navigator.vibrate(ms); } catch (e) {} }
function runPop(R, x, y, txt, col) { R.pops.forEach(function (p) { if (Math.abs(p.y - y) < 14 && Math.abs(p.x - x) < 50) p.t = Math.max(p.t, .65); });
  R.pops.push({ x: x, y: y, t: 0, s: txt, c: col || '#ffe27a' }); }


function runOn() { return CUR === 'run' && RUN && RUN.on && !RUN.pause; }
document.addEventListener('pointerdown', function (e) {
  if (!runOn() || e.button > 0) return;
  var t = e.target; if (t && t.closest && t.closest('a,button,input,select,textarea,summary,label,.rn-ov,.dock,.zn,.zb')) return;
  e.preventDefault(); RUN.py = e.clientY; RUN.pt = performance.now(); RUN.swiped = 0;
  var cv = $('rnC'), r = cv && cv.getBoundingClientRect(); var ty = r ? r.top + R_XT.t * r.width / RW : 0; RUN.tapX = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= ty && e.clientY <= (R_XT.e ? ty + RH * r.width / RW : r.bottom) ? (e.clientX - r.left) / r.width * RW : null;
  var m = RUN.mini; if (m && m.k === 'shell' && m.p2 === 'pick' && RUN.tapX == null) return;
  R_PTR[e.pointerId] = 1;
  runPress();
}, { passive: false });
var R_PTR = {};
document.addEventListener('pointermove', function (e) {
  var R = RUN; if (!runOn() || !R.held || R.swiped || R.py == null) return;
  if (e.clientY - R.py > 26 && performance.now() - R.pt < 350) { R.swiped = 1; runDrop(1); }
});
['pointerup', 'pointercancel'].forEach(function (n) { document.addEventListener(n, function (e) {
  delete R_PTR[e.pointerId]; if (RUN && RUN.on && !Object.keys(R_PTR).length) runRelease(); }); });
document.addEventListener('visibilitychange', function () { if (document.hidden && RUN && RUN.on && !RUN.pause) runPause('잠깐 멈췄어요'); });
document.addEventListener('keydown', function (e) {
  if (CUR !== 'run' || !RUN || !RUN.on || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); runDrop(); return; }
  var mk = RUN.mini && RM[RUN.mini.k].key; if (mk && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); mk(RUN, RUN.mini, e.key === 'ArrowLeft' ? -1 : 1); return; }
  RUN.tapX = null;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (e.target && e.target.tagName === 'BUTTON' && RUN.pause) return; e.preventDefault();
    if (RUN.pause) runGo(); else if (!e.repeat) runPress();
  }
});
document.addEventListener('keyup', function (e) { if (RUN && RUN.on && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) runRelease(); });
function runPress() {
  var R = RUN; if (!R || !R.on || R.pause) return;
  R.held = 1; var jp = $('rnJp'); if (jp) jp.classList.add('on');
  if (R.tr) return;
  if (R.out) { if (R.out.t > .6) R.out.t = Math.max(R.out.t, 4.2); return; }
  if (R.card) { if (R.card.t > .4) R.card.t = Math.max(R.card.t, R.card.dur - .25); return; }
  if (R.cd > 0) return;
  var m = R.mini;
  if (m) { if (m.ph !== 'play') return; if (RM[m.k].press) RM[m.k].press(R, m); if (R_MINI[m.k].nj) return; }
  runJump();
}
function runRelease() {
  var R = RUN; R.held = 0; var jp = $('rnJp'); if (jp) jp.classList.remove('on');
  if (R.jumpHeld && R.air && R.v > RJCUT) R.v = RJCUT;
  R.jumpHeld = 0;
}
function runJump() {
  var R = RUN, M = RMAP[R.key], maxJ = M.bike && !R.docked ? 1 : 2;
  if (!R.air || R.coy > 0) {
    R.v = RJ1; R.jumps = 1; R.air = 1; R.coy = 0; R.buf = 0; R.jumpHeld = 1; R.jt = R.t; R.jh = R.h; R.lift = .1; sfx('jump');
    for (var i = 0; i < 3; i++) R.dust.push({ x: RPX + 12 + i * 4, y: RGY - R.h - 1, t: 0, vx: -40 - i * 20 });
    return;
  }
  if (R.jumps === 0) R.jumps = 1;
  if (R.jumps < maxJ) { R.v = RJ2; R.jumps++; R.jumpHeld = 1; R.lift = .1; sfx('jump'); return; }
  R.buf = R_BUF;
}
function runDrop(sw) {
  var R = RUN; if (!R || !R.on || R.pause || R.cd > 0 || R.card || (R.mini && R_MINI[R.mini.k].fr)) return;
  if (!R.air && R.h > 0) { R.drop = .25; R.v = -80; R.air = 1; R.jumps = 1; return; }
  if (sw && R.air && R.t - R.jt < .35 && R.jh > 0) { R.drop = .3; R.v = -120; R.jumps = 1; R.jumpHeld = 0; }
}
function runGo() { var R = RUN; R.pause = ''; $('rnOv').hidden = true; R.last = performance.now(); document.documentElement.classList.add('rn-play'); cancelAnimationFrame(R.raf); R.raf = requestAnimationFrame(runFrame); }
function runPause(msg) {
  var R = RUN; if (!R || !R.on) return;
  R.pause = 'pause'; R.held = 0; R_PTR = {}; cancelAnimationFrame(R.raf); runDraw(); document.documentElement.classList.remove('rn-play');
  var o = $('rnOv'); o.hidden = false; o.innerHTML = '<p class="q">' + esc(msg) + '</p><button class="btn lime" type="button" id="rnRe">계속 달리기 ▶</button>';
  $('rnRe').onclick = runGo;
}


var R_DT = 1 / 120;
function runFrame(now) {
  var R = RUN; if (!R || !R.on || R.pause) return;
  if (CUR !== 'run') { runPause('계속 달리려면 누르세요'); return; }
  R.acc = Math.min(.25, (R.acc || 0) + Math.max(0, (now - R.last) / 1000)); R.last = now;
  while (R.acc >= R_DT) {
    R.acc -= R_DT;
    if (R.hs > 0) { R.hs -= R_DT; continue; }
    runStep(R_DT); if (!R.on) return; if (R.pause) break;
  }
  runDraw(); runHud();
  if (!R.pause) R.raf = requestAnimationFrame(runFrame);
}


function runCard(o) {
  var R = RUN; R.card = { t: 0, dur: o.dur || 1.8, dark: o.dark == null ? 1 : o.dark, mid: o.mid, end: o.end, did: 0, wipe: o.wipe || null };
  var el = $('rnTc'); if (!el) return;
  el.innerHTML = (o.k ? '<span class="k">' + esc(o.k) + '</span>' : '') + '<span class="e">' + o.e + '</span><span class="t">' + esc(o.t) + '</span>' + (o.r ? '<span class="r">' + esc(o.r) + '</span>' : '') + (o.v ? '<span class="v">' + esc(o.v) + '</span>' : '') + '<span class="s">' + esc(o.s || '누르면 바로 시작') + '</span>';
  el.hidden = true; $('rnFk').hidden = true; R.hfk = '';
}

function runRefTxt(R) { var a = R.ref && R.seg > 0 && R.ref[R.seg - 1]; return a ? '1번째 판 여기서 ' + man(a[0]) + '만원 · ' + hhmm(a[1]) + '  →  지금 ' + man(R.money) + '만원 · ' + hhmm(runClock(R)) : ''; }
function runSegCard(key, first, mid, nowipe) {
  var R = RUN, M = RMAP[key], mn = [];
  (M.mini || []).forEach(function (m) { var n = R_MINI[m[0]].nm; if (mn.indexOf(n) < 0) mn.push(n); });
  runCard({ k: first ? (R.ranked ? '오늘의 코스 · 순위 판' : '연습 판') : hhmm(runClock(R)) + ' · ' + (R_SLOTS[R.seg] ? R.seg + 1 : '') + '구간', e: M.emo,
    t: M.nm + (key === 'lobby' ? ' · ' + R.dest.n : ''), r: first ? '화면 아무 데나 누르면 점프!' : M.rule, s: (mn.length ? '미니게임 ' + mn.join(' · ') + ' — ' : '') + '누르면 바로 시작',
    v: runRefTxt(R), dur: first ? 2.4 : 2.2, mid: mid, wipe: first || nowipe ? null : runSnap(), dark: first ? 1 : nowipe ? .55 : .66 });
  runHud(1);
}

var R_WIPE = .6;
function runSnap() {
  var cv = $('rnC'); if (!cv || REDUCE) return null;
  RUN.noZ = 1; runDraw(); RUN.noZ = 0;
  var kk = cv.width / RW, s = document.createElement('canvas'); s.width = cv.width; s.height = Math.round(RH * kk); s.getContext('2d').drawImage(cv, 0, -Math.round(R_XT.t * kk));
  return s;
}


function runMini(k) {
  var R = RUN, X = R_MINI[k], m = { k: k, ph: 'intro', t: 0, g: 0, n: 0, ok: 0, tries: 0, p0: R.pen };
  R.mini = m; R.nudge = 0; R.nvv = 0;
  var go = function () { m.ph = 'play'; m.t = 0; if (RM[k].start && !m.pre) RM[k].start(R, m); runMg(m); };
  if (k === 'pedal') { R.seen[k] = 1; runBanner('🚲 오르막! 박자 맞춰 페달', 1500); go(); }
  else if (!X.fr) { R.seen[k] = 1; runBanner(X.nm, 1500); go(); }
  else { R.seen[k] = 1; if (RM[k].start) RM[k].start(R, m); m.pre = 1; R.coast = Math.max(60, (R.spdx || 1) * RMAP[R.key].spd); R.crem = R_COAST; R.cacc = R.coast * R.coast / (2 * R_COAST); rClear(R, -10, R_COAST + 240);
    runCard({ k: '미니게임', e: X.nm.split(' ')[0], t: X.nm.slice(X.nm.indexOf(' ') + 1), r: X.how, dur: 1.7, dark: .35, end: go }); }
}

var R_PADT = { chase: '연타!', board: '연타!', sale: '연타!', elev: '연타!', brake: '꾹!', wind: '꾹!', light: '빨간불엔 꾹!', pedal: '박자 맞춰 딱!', snack: '가운데서 딱!', badge: '초록 칸에서 딱!', rope: '점프!', shell: '위에서 카드를 눌러요' };
function runPadTxt(m) { var j = $('rnJp'), t = m ? R_PADT[m.k] || '점프' : '점프 · 어디를 눌러도 돼요'; if (j && j._t !== t) { j._t = t; j.textContent = t; j.classList.toggle('mg', !!m); } }
function runMg(m, h, g, hot) {
  var el = $('rnMg'); runPadTxt(m); if (!el) return;
  if (!m) { el.hidden = true; return; }
  el.hidden = false; h = h || R_MINI[m.k].how;
  if (h !== el._h) { el._h = h; $('rnMgH').textContent = h; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
  var G = $('rnMgG'); G.hidden = g == null; if (g != null) { G.firstChild.style.width = Math.round(Math.max(0, Math.min(1, g)) * 100) + '%'; G.classList.toggle('hot', !!hot); }
}
function runMiniEnd(money, pen, msg, good) {
  var R = RUN, m = R.mini; if (!m) return;
  R.mini = null; runMg(null); if (R_MINI[m.k].fr) R.easeIn = .6;
  if (RM[m.k].prop) R.left.push({ k: m.k, m: m, x0: R.dist });
  if (money) { R.money = Math.max(0, R.money + money); }
  if (pen) R.pen += pen;
  R.mres.push([m.k, good ? 1 : 0, Math.round((R.pen - m.p0) * 10) / 10]);
  var t = msg + (money > 0 ? ' +' + man(money) + '만원' : money < 0 ? ' −' + man(-money) + '만원' : '') + (pen > 0 ? ' ⏰ +' + pen + '분' : '');
  R.log.push(R_MINI[m.k].nm.split(' ')[0] + ' ' + t); runBanner(t, 1600); sfx(good ? 'combo' : 'wrong');
  if (good) { R.combo += 3; R.maxCombo = Math.max(R.maxCombo, R.combo);
    var DX = runDex(); if (!DX[m.k] && R_DEX.indexOf(m.k) >= 0) { DX[m.k] = TODAY; store.setJ('slp-rundex', DX); runPop(R, RPX - 6, RGY - 62, '📖 도감 ' + R_DEX.filter(function (k) { return DX[k]; }).length + '/' + R_DEX.length, '#9fd3ff'); } }
  if (m.k === 'board') R.inTrain = 1;
  if (m.k === 'elev') runEndPick(R);
  if (m.k === 'elev' && !REDUCE) { R.out = { t: 0, fl: 6 + PC.hash32(R.dest.n) % 14 }; var bn = $('rnBn'); if (bn) bn.classList.add('lo'); }
}
function rBar(c, pos, zone, lab) {
  var x0 = 70, w = 140, y = 34;
  rr(c, '#0d0f0a', x0 - 2, y - 2, w + 4, 14); rr(c, '#3a3f4a', x0, y, w, 10); rr(c, '#3f9a4a', x0 + w * (.5 - zone), y, w * zone * 2, 10); rr(c, '#c6ff3d', x0 + w / 2 - 1, y, 2, 10);
  var px = x0 + w * pos; rr(c, '#0d0f0a', px - 3, y - 6, 7, 22); rr(c, lab || '#ffcf3d', px - 2, y - 5, 5, 20);
}
function rDoorPanels(c, x, open, col) {
  var w = 40, g = Math.round(w * open);
  rr(c, col, x, RGY - 70, w - g, 70); rr(c, col, x + w + g, RGY - 70, w - g, 70);
  rr(c, '#bfe6ff', x + 6, RGY - 60, Math.max(0, w - g - 12), 24); rr(c, '#bfe6ff', x + w + g + 6, RGY - 60, Math.max(0, w - g - 12), 24);
  rr(c, '#2b2f3a', x + w - g - 1, RGY - 70, 1, 70); rr(c, '#2b2f3a', x + w + g, RGY - 70, 1, 70);
}
function rDoor(c, x, open, col) {
  var w = 40, g = Math.round(w * open);
  rr(c, '#5a5d63', x - 4, RGY - 74, 2 * w + 8, 74); rr(c, '#1a2030', x, RGY - 70, 2 * w, 70);
  rr(c, col, x, RGY - 70, w - g, 70); rr(c, col, x + w + g, RGY - 70, w - g, 70);
  rr(c, '#bfe6ff', x + 6, RGY - 60, Math.max(0, w - g - 12), 24); rr(c, '#bfe6ff', x + w + g + 6, RGY - 60, Math.max(0, w - g - 12), 24);
}
var RM = {


  chase: { start: function (R, m) { m.g = 100; },
    press: function (R, m) { if (m.win || m.miss) return; m.g -= 7; R.step++; R.dust.push({ x: RPX + 10 + R.zx, y: RGY - 1, t: 0, vx: -70 }); },
    step: function (R, m, dt) { m.t += dt;
      if (m.win) { m.wt += dt;
        if (m.wt > .55) R.hideZ = 1;
        if (m.wt > .85 - R_FD[0] && !m.fd) { m.fd = 1; runFade(function () { R.hideZ = 0; R.zx = 0; R.onBus = 1; if (m.miss) runMiniEnd(0, 2, '🚌 버스 놓침… 다음 버스'); else runMiniEnd(200, 0, '🚌 버스 잡았다!', 1); }); }
        return; }
      if (m.miss) { m.mt += dt; m.g = Math.max(0, 140 * (1 - m.mt / 1.1)); runMg(m, '다음 버스가 와요…', null); if (m.mt > 1.1) { m.win = 1; m.wt = 0; } return; }
      m.g = Math.min(130, m.g + 15 * dt); runMg(m, '연타! 버스까지 ' + Math.max(0, Math.round(m.g)) + 'm', 1 - m.g / 130, m.g < 30);
      if (m.g <= 0) { m.g = 0; m.win = 1; m.wt = 0; sfx('coin'); return; }
      if (m.t > 4.6) { m.miss = 1; m.mt = 0; m.g = 200; sfx('wrong'); } },
    zx: function (R, m) { return m.win ? 30 + Math.min(1, m.wt / .5) * 6 : m.miss ? 0 : Math.max(0, (100 - m.g) * .22); },
    draw: function (c, R, m) { var bx = Math.round(RPX + 34 + Math.max(0, m.g) * 1.3);
      if (bx > RW + 10) return;
      rr(c, '#1b1d18', bx - 1, RGY - 67, 132, 58); rr(c, '#3f9a4a', bx, RGY - 66, 130, 56); rr(c, '#2f7a3a', bx, RGY - 66, 130, 4); rr(c, '#ffe27a', bx, RGY - 20, 130, 3);
      for (var i = 0; i < 4; i++) rr(c, '#bfe6ff', bx + 40 + i * 22, RGY - 54, 17, 15);
      rr(c, '#1a2030', bx + 3, RGY - 62, 30, 52);
      rr(c, '#2b2b2b', bx + 44, RGY - 14, 18, 14); rr(c, '#2b2b2b', bx + 104, RGY - 14, 18, 14); rr(c, '#9aa0a6', bx + 50, RGY - 9, 6, 4); rr(c, '#9aa0a6', bx + 110, RGY - 9, 6, 4);
      rr(c, '#ffcf3d', bx + 124, RGY - 30, 5, 5); rr(c, '#1b1d18', bx + 38, RGY - 66, 90, 11);
      c.font = 'bold 8px sans-serif'; c.fillStyle = '#ffe27a'; c.textBaseline = 'middle'; c.fillText('출근 ' + (R.dest.n.length > 7 ? R.dest.n.slice(0, 7) : R.dest.n), bx + 42, RGY - 60.5, 82); c.textBaseline = 'alphabetic'; },
    front: function (c, R, m) { if (!m.win) return; var bx = Math.round(RPX + 34 + Math.max(0, m.g) * 1.3), q = Math.max(0, Math.min(1, (m.wt - .5) / .15));
      if (q <= 0) return; var w = Math.round(15 * q); rr(c, '#3f9a4a', bx + 3, RGY - 62, w, 52); rr(c, '#3f9a4a', bx + 33 - w, RGY - 62, w, 52); rr(c, '#bfe6ff', bx + 6, RGY - 56, Math.max(0, w - 5), 16); rr(c, '#1b1d18', bx + 18, RGY - 62, 1, 52 * (q >= 1 ? 1 : 0)); } },

  board: { press: function (R, m) { if (m.win) return; m.g += 9; R.shake = REDUCE ? 0 : .06; R.dust.push({ x: RPX + 10 + R.zx, y: RGY - 1, t: 0, vx: -70 }); },
    step: function (R, m, dt) { m.t += dt;
      if (m.win) { m.wt += dt; if (m.wt > .6 - R_FD[0] && !m.fd) { m.fd = 1; runFade(function () { R.zx = 0; runMiniEnd(300, 0, '🚇 탑승 성공!', 1); }); } return; }
      m.g = Math.max(0, Math.min(100, m.g - 16 * dt)); runMg(m, '연타! 밀고 들어가기 ' + Math.round(m.g) + '%', m.g / 100, m.g > 70);
      if (m.g >= 100) { m.win = 1; m.wt = 0; m.op = Math.max(0, 1 - m.t / 4.6); sfx('coin'); return; } if (m.t > 4.6 && !m.fd) { m.fd = 1; runFade(function () { R.zx = 0; runMiniEnd(0, 2, '🚇 문이 닫혔다… 다음 열차'); }); } },
    zx: function (R, m) { return m.win ? 121 : m.g / 100 * 82; },
    draw: function (c, R, m) { rr(c, '#1b1d18', 96, RGY - 92, RW, 92); rr(c, '#e3e7ec', 98, RGY - 90, RW, 88); rr(c, '#36b5a5', 98, RGY - 46, RW, 5);
      for (var wi = 0; wi < 3; wi++) if (wi !== 1) rr(c, '#1a2030', 104 + wi * 62, RGY - 80, 40, 26);
      rr(c, '#5a5d63', 146, RGY - 74, 88, 74); rr(c, '#1a2030', 150, RGY - 70, 80, 70); rr(c, '#36b5a5', 146, RGY - 78, 88, 4);
      for (var i = 0; i < 3; i++) { var P = RIMG.ppl[i]; c.drawImage(P, Math.round(160 + i * 18 + Math.sin(R.t * 9 + i) * 2 + (m.g > 50 ? (i - 1) * m.g / 25 : 0)), RGY - P.height); } },
    front: function (c, R, m) { rDoorPanels(c, 150, m.win ? m.op * Math.max(0, 1 - m.wt / .4) : Math.max(0, 1 - m.t / 4.6), '#c4cbd4'); } },

  brake: { step: function (R, m, dt) { m.t += dt;
      if (m.t < 1) { runMg(m, '✊ 급정거 온다! 꾹 누르세요', 1 - m.t, R.held); R.shake = REDUCE ? 0 : .04; return; }
      if (!m.hit) { m.hit = 1; R.shake = REDUCE ? 0 : .45;
        R.objs.forEach(function (o) { if (o.k === 'bag' && !o.done) { var d = o.x - R.dist; if (d > 0 && d < 400) o.vx = 90; } });
        R.bstop = .6; R.easeIn = 1.2;
        if (R.held) { runMiniEnd(100, 0, '✊ 손잡이 꽉! 버텼다', 1); return; }
        R.stun = .6; R.combo = 0; runMiniEnd(0, 1, '끼익— 휘청! 급정거'); } } },

  pedal: { start: function (R, m) { m.b0 = 1; m.hit = {}; R.stun = 0; m.x0 = R.dist; m.vx = (R.spdx || 1) * RMAP[R.key].spd; m.tg = R.dist + 28; m.slide = 0; },
    miss: function (R, m) { m.slide = .55; m.tg = Math.max(m.x0, m.tg - 20); runPop(R, RPX + 4, RGY - R.h - 52, 'MISS', '#ff9b9b'); },
    press: function (R, m) { var i = Math.round((m.t - m.b0) / .55), d = Math.abs(m.t - m.b0 - i * .55);
      if (i < 0 || i > 9 || m.hit[i]) return; m.hit[i] = 1;
      if (d < .13) { var pf = d < .06; m.ok++; m.tg += pf ? 30 : 22; m.slide = 0; runPop(R, RPX + 4, RGY - R.h - 52, pf ? 'PERFECT' : 'GOOD', '#c6ff3d'); sfx('coin'); } else RM.pedal.miss(R, m); },

    step: function (R, m, dt) { m.t += dt; m.slide = Math.max(0, m.slide - dt);
      var pi = Math.floor((m.t - m.b0 - .13) / .55); if (pi >= 0 && pi <= 9 && !m.hit[pi]) { m.hit[pi] = 2; RM.pedal.miss(R, m); }
      var H = R_HILL, x0 = runHill0(R); if (x0 != null) m.tg = Math.min(m.tg, x0 - 17 + H.up + H.top - 12);
      var K = m.slide > 0 ? 60 : 110; m.vx = (m.vx || 0) + ((m.tg - R.dist) * K - (m.vx || 0) * 2 * Math.sqrt(K)) * dt; R.dist += m.vx * dt;
      var hh = runHillH(R, R.dist + 17); R.h = R.h > hh ? Math.max(hh, R.h - 220 * dt) : hh; R.v = 0; R.air = 0; R.jumps = 0;
      runMg(m, '박자 맞춰 페달! ' + m.ok + ' / 10', m.ok / 10, m.ok >= 7);
      if (m.t > m.b0 + 9 * .55 + .4) { var g = m.ok >= 7; runMiniEnd(m.ok * 30 + (g ? 200 : 0), m.ok < 4 ? 1 : 0, g ? '🚲 오르막 정복!' : '🚲 헉헉… 들고 뛰어 올라감', g);
        if (!g && x0 != null) { R.carry = { x1: x0 - 17 + H.up + 6, t: 0 }; rClear(R, -10, R.carry.x1 - R.dist + 80); R.lift = .12; for (var cd = 0; cd < 4; cd++) R.dust.push({ x: RPX + 8 + cd * 6, y: RGY - R.h - 2, t: 0, vx: (cd - 1.5) * 40 }); } } },
    draw: function (c, R, m) {
      if (m.slide > 0) { c.font = 'bold 9px sans-serif'; c.fillStyle = '#ff9b9b'; c.fillText('주르륵…', RPX - 6, RGY - R.h - 50); }
      var i = Math.max(0, Math.ceil((m.t - m.b0) / .55 - .25)), nt = m.b0 + i * .55 - m.t, cx = RPX + 17 + Math.round(R.zx), cy = RGY - 30 - R.h;
      if (i <= 9) { c.strokeStyle = '#c6ff3d'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(cx, cy, 12 + Math.max(0, nt) * 60, 0, Math.PI * 2); c.stroke(); }
    } },

  wind: { start: function (R, m) { m.gs = [1.2, 2.8, 4.4]; m.i = 0; },
    step: function (R, m, dt) { m.t += dt; var at = m.gs[m.i];
      if (at != null) {
        var warn = m.t > at - .9 && m.t < at;
        runMg(m, warn ? '🌪 돌풍 온다! 꾹 누르기' : '돌풍 ' + (m.i + 1) + ' / 3 · 손 떼고 달려요', warn ? 1 - (at - m.t) / .9 : null, warn && R.held);
        if (m.t >= at) { m.i++; R.shake = REDUCE ? 0 : .3;
          if (R.held) { m.ok++; R.money += 60; runPop(R, RPX, RGY - R.h - 44, '버텼다 +60', '#c6ff3d'); sfx('coin'); }
          else { R.nudge = (R.nudge || 0) - 50; R.pen += .5; R.money = Math.max(0, R.money - 50); R.combo = 0; runPop(R, RPX, RGY - R.h - 44, '휘청! −50', '#ff9b9b'); sfx('wrong'); } }
        return;
      }
      if (m.t > 5) runMiniEnd(m.ok === 3 ? 200 : 0, 0, m.ok === 3 ? '🌪 돌풍 3번 다 버텼다!' : '🌪 돌풍 ' + m.ok + '번 버팀', m.ok >= 2); },
    draw: function (c, R, m) { var at = m.gs[m.i], warn = at != null && m.t > at - .9 && m.t < at;
      c.fillStyle = warn ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.4)';
      for (var i = 0; i < (warn ? 26 : 8); i++) c.fillRect(Math.floor(((ih(i, 40) * RW - R.t * (warn ? 520 : 200)) % RW + RW) % RW), Math.floor(ih(i, 41) * RGY), warn ? 16 : 8, 1); } },

  snack: { start: function (R, m) { m.tt = 0; m.wait = 0; },
    press: function (R, m) { if (m.wait > 0) return; var pos = .5 + .5 * Math.sin(m.tt * (3 + m.tries)); m.tries++; m.wait = .75;
      var fx = Math.round(70 + 140 * pos - 3);
      if (Math.abs(pos - .5) < .11) { m.ok++; m.last = 1; R.money += 150; m.fly = { x: fx, t: 0, ok: 1 }; R.hs = .06; rBuzz(15); runPop(R, 120, 30, '떡꼬치 GET +150', '#c6ff3d'); sfx('combo'); }
      else { m.last = 0; m.fly = { x: fx, t: 0, ok: 0 }; runPop(R, 120, 30, '헛손질!', '#ff9b9b'); sfx('wrong'); } },
    step: function (R, m, dt) { m.t += dt; if (m.fly) m.fly.t += dt; if (m.wait > 0) { m.wait -= dt; if (m.wait <= 0 && m.tries >= 3) { runMiniEnd(m.ok === 3 ? 200 : 0, 0, m.ok === 3 ? '🍢 시식 코너 싹쓸이!' : '🍢 떡꼬치 ' + m.ok + '개', m.ok >= 2); } return; }
      m.tt += dt; runMg(m, '가운데서 딱! (' + (m.tries + 1) + ' / 3)', null);
      if (m.tt > 2.6 * (m.tries + 1)) { m.tries++; m.wait = .3; m.last = 0; } },
    draw: function (c, R, m) { var pos = .5 + .5 * Math.sin(m.tt * (3 + m.tries)), T = RIMG.obj.tteok, F = m.fly && m.fly.t < .75 ? m.fly : null;
      rBar(c, pos, .11);
      if (!F || m.wait <= 0) c.drawImage(T, Math.round(70 + 140 * pos - 3), 18);
      if (F && F.ok) {
        c.strokeStyle = 'rgba(198,255,61,' + Math.max(0, 1 - F.t / .35) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(F.x + 3, 26, 4 + F.t * 60, 0, Math.PI * 2); c.stroke();
        var at = function (q) { q = Math.max(0, Math.min(1, q)); var ex = RPX + 6 + (m.ok - 1) * 9, ey = RGY - R.h - 50; return [F.x + (ex - F.x) * q, 18 + (ey - 18) * q - Math.sin(q * Math.PI) * 30]; };
        var q = F.t / .45;
        for (var gq = 4; gq >= 1; gq--) { var pp = at(q - gq * .07); c.globalAlpha = .12 * (5 - gq); c.drawImage(T, Math.round(pp[0]), Math.round(pp[1])); }
        c.globalAlpha = 1; if (q < 1) { var p0 = at(q); c.drawImage(T, Math.round(p0[0]), Math.round(p0[1])); }
      } else if (F) { c.globalAlpha = Math.max(0, 1 - F.t / .6); c.drawImage(T, F.x, Math.round(18 + F.t * F.t * 300)); c.globalAlpha = 1; }
      for (var n = 0; n < m.ok - (F && F.ok && F.t < .45 ? 1 : 0); n++) c.drawImage(T, RPX + 6 + n * 9, RGY - R.h - 50 - (n % 2) * 2);
      RM.snack.prop(c, R, m); },
    prop: function (c) { rr(c, '#8a5a32', 180, RGY - 30, 70, 30); rr(c, '#e8412c', 176, RGY - 40, 78, 10); c.font = 'bold 9px sans-serif'; c.fillStyle = '#fff'; c.fillText('시식 코너', 192, RGY - 32); } },

  rope: { start: function (R, m) { m.next = 1.1; m.per = 1.05; },
    step: function (R, m, dt) { m.t += dt; runMg(m, '줄이 발밑에 올 때 점프! ' + m.n + ' / 6', m.n / 6, m.ok === m.n && m.n > 0);
      if (m.n < 6 && m.t >= m.next) { m.n++;
        if (R.h > 6) { m.ok++; R.money += 40; R.combo++; runPop(R, RPX, RGY - R.h - 44, '휙! +40', '#c6ff3d'); sfx('coin'); }
        else { R.stun = .35; R.money = Math.max(0, R.money - 30); runPop(R, RPX, RGY - 44, '걸림! −30', '#ff9b9b'); sfx('wrong'); }
        m.per = Math.max(.72, m.per - .06); m.next += m.per; }
      if (m.n >= 6 && m.t > m.next - m.per + .45) runMiniEnd(m.ok === 6 ? 200 : 0, 0, m.ok === 6 ? '🐕 줄넘기 완벽!' : '🐕 줄넘기 ' + m.ok + ' / 6', m.ok >= 4); },
    draw: function (c, R, m) { var ph = 1 - Math.max(0, m.next - m.t) / m.per, ang = ph * Math.PI * 2, ry = RGY - 30 - Math.cos(ang) * 30, a = RPX - 34, b = RPX + 68;
      c.drawImage(RIMG.obj.dog, a - 14, RGY - RIMG.obj.dog.height); c.drawImage(RIMG.obj.dog, b, RGY - RIMG.obj.dog.height);
      c.strokeStyle = Math.cos(ang) > .2 ? '#e8412c' : '#ffcf3d'; c.lineWidth = 2; c.beginPath(); c.moveTo(a, RGY - 6); c.quadraticCurveTo((a + b) / 2, ry * 2 - (RGY - 6), b, RGY - 6); c.stroke(); } },

  light: { ph: [['g', 1.2], ['y', .5], ['r', 1.5], ['g', 1], ['y', .4], ['r', 1.4], ['g', .4]],


    start: function (R, m) { m.hits = 0; m.xs = [R.dist + 34 + RM.light.v(R) * 1.7]; },
    v: function (R) { var M = RMAP[R.key]; return rSpd(M, R.seg, Math.min(1, R.dist / M.len)) * (R.dev && R.dev.fx.spd || 1); },
    cur: function (m) { var t = m.t, P = RM.light.ph; for (var i = 0; i < P.length; i++) { if (t < P[i][1]) return [P[i][0], i]; t -= P[i][1]; } return ['', P.length]; },
    step: function (R, m, dt) { m.t += dt; var c = RM.light.cur(m), s = c[0];
      if (!s) { runMiniEnd(m.ok * 80 + (m.ok === 2 ? 120 : 0), 0, m.ok === 2 ? '🚦 신호 완벽 준수!' : '🚦 횡단보도 통과', m.ok === 2); return; }
      if (c[1] === 3 && m.xs.length < 2) m.xs.push(R.dist + 34 + RM.light.v(R) * 1.4);
      if (s === 'r' && m.fix !== c[1]) { m.fix = c[1]; var L = m.xs.length - 1, d = m.xs[L] - R.dist; if (d < 20 || d > 120) m.xs[L] = R.dist + 34; }
      runMg(m, s === 'r' ? '🔴 빨간불! 꾹 눌러 멈춰요' : s === 'y' ? '🟡 노란불… 곧 빨간불' : '🟢 초록불! 손 떼고 건너요', null);
      if (s === 'r') { if (!R.held && m.redHit !== c[1]) { m.redHit = c[1]; m.hits++; R.stun = .6; R.pen += 1.5; R.money = Math.max(0, R.money - 100); R.combo = 0; R.flash = .18; R.shake = REDUCE ? 0 : .35; runBanner('빵빵! 빨간불엔 멈춰요 ⏰ +1.5분', 1300); sfx('wrong'); }
        m.inRed = c[1]; }
      else if (m.inRed != null) { if (m.redHit !== m.inRed) { m.ok++; runPop(R, RPX, RGY - 50, '안전 +80', '#c6ff3d'); sfx('coin'); } m.inRed = null; } },

    prop: function (c, R, m, done) {
      var cs = done ? 'g' : RM.light.cur(m)[0], any = 0;
      (m.xs || []).forEach(function (X, i) {
        var sx = Math.round(X - R.dist + RPX), s = i === m.xs.length - 1 ? cs : 'g'; if (sx > RW + 40 || sx < -180) return; any = 1;
        rr(c, '#5d6066', sx + 4, RGY - 40, 128, 40); rr(c, '#4f5258', sx + 4, RGY - 40, 128, 2); for (var dy = 0; dy < 40; dy += 8) rr(c, '#ffcf3d', sx + 67, RGY - 38 + dy, 2, 4);
        for (var k = 0; k < 9; k++) rr(c, '#f2f2f2', sx + 6 + k * 14, RGY - 5, 8, 5);
        rr(c, '#f2f2f2', sx + 2, RGY - 40, 2, 40);
        var cars = s === 'r' ? [[(m.t * 1.5) % 1, 1], [(m.t * 1.5 + .5) % 1, 1], [1 - (m.t * 1.3 + .25) % 1, 0]] : [[.04, 1]];
        cars.sort(function (a, b) { return a[0] - b[0]; }).forEach(function (q) {
          var im = q[1] ? RIMG.obj.carF : RIMG.obj.carB, sc = s === 'r' ? .5 + q[0] * 1.6 : 1, w = im.width * sc, h = im.height * sc, cx = sx + (q[1] ? 44 : 94) + (q[1] ? -1 : 1) * q[0] * 8;
          var y = s === 'r' ? RGY - 44 + q[0] * 64 : RGY - 50;
          c.drawImage(im, Math.round(cx - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
        });
        if (s === 'r') for (var sl = 0; sl < 3; sl++) rr(c, 'rgba(255,255,255,.6)', sx + 38 + sl * 22, Math.round(RGY - 30 + ((m.t * 140 + sl * 13) % 40)), 1, 8);
        var x = sx + 136;
        rr(c, '#5a5d63', x + 12, 46, 3, RGY - 46); rr(c, '#1b1d18', x + 2, 14, 24, 34); rr(c, '#2b2f3a', x + 4, 16, 20, 30);
        [['r', '#ff3b30', 22], ['y', '#ffcc00', 31], ['g', '#34c759', 40]].forEach(function (L) { c.fillStyle = s === L[0] ? L[1] : '#3a3f4a'; c.beginPath(); c.arc(x + 14, L[2], 4, 0, Math.PI * 2); c.fill(); });
      });
      return any;
    },
    draw: function (c, R, m) { RM.light.prop(c, R, m, 0); } },

  sale: { press: function (R, m) { if (m.n >= 40) return; m.n++; R.money += 15; m.grab = .14; var sl = Math.floor(Math.random() * 6); m.bags = (m.bags || []).concat([{ sl: sl, t: 0 }]); R.fx.push({ x: 158 + sl * 13, y: RGY - 34, t: 0 }); sfx('coin'); },
    zx: function (R, m) { return Math.min(1, m.t / .35) * 86; },
    step: function (R, m, dt) { m.t += dt; m.grab = Math.max(0, (m.grab || 0) - dt); (m.bags || []).forEach(function (b) { b.t += dt; }); m.bags = (m.bags || []).filter(function (b) { return b.t < .28; });
      runMg(m, '연타! 쇼핑백 ' + m.n + '개', 1 - m.t / 3.2, m.n > 20); if (m.t > 3.2) runMiniEnd(m.n >= 25 ? 150 : 0, 0, '🛍 세일 매대 쇼핑백 ' + m.n + '개 (+' + man(m.n * 15) + '만원)', m.n >= 15); },
    prop: function (c) { rr(c, '#7d3a2c', 152, RGY - 74, 3, 30); rr(c, '#7d3a2c', 235, RGY - 74, 3, 30); rr(c, '#e8412c', 146, RGY - 80, 98, 14); c.font = 'bold 9px sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('오늘만 SALE 70%', 195, RGY - 70); c.textAlign = 'left';
      rr(c, '#8a6440', 150, RGY - 32, 90, 32); rr(c, '#b98a5a', 148, RGY - 34, 94, 4); var IC = ['#ff8fc7', '#9fd3ff', '#ffcf3d', '#c6ff3d', '#ff9b3d', '#b58cff']; for (var i = 0; i < 6; i++) { rr(c, '#1b1d18', 156 + i * 13, RGY - 44, 11, 10); rr(c, IC[i], 157 + i * 13, RGY - 43, 9, 8); rr(c, 'rgba(255,255,255,.5)', 157 + i * 13, RGY - 43, 9, 2); } },
    draw: function (c, R, m) { RM.sale.prop(c, R, m); },
    front: function (c, R, m) { var zx0 = RPX + Math.round(R.zx || 0), hx = zx0 + 30, hy = RGY - 34;
      var pile = Math.min(9, m.n - (m.bags || []).length); for (var i = 0; i < pile; i++) c.drawImage(RIMG.obj.sbag, zx0 - 4 - (i % 3) * 7 + Math.floor(i / 3) * 3, RGY - 7 - Math.floor(i / 3) * 6);
      (m.bags || []).forEach(function (b) { var q = b.t / .28, x0 = 157 + b.sl * 13, x = x0 + (zx0 - 4 - x0) * q, y = RGY - 44 + (RGY - 7 - (RGY - 44)) * q - Math.sin(q * Math.PI) * 20; c.drawImage(RIMG.obj.sbag, Math.round(x), Math.round(y)); });
      if (m.grab > 0) { rr(c, '#2b2f3a', hx, hy, 12, 2); rr(c, '#f6cfa6', hx + 11, hy - 1, 3, 4); } } },

  badge: { start: function (R, m) { m.wait = 0; },
    press: function (R, m) { if (m.wait > 0) return; var pos = .5 + .5 * Math.sin(m.t * 3.4); m.tries++;
      if (Math.abs(pos - .5) < .1) { m.ok = 1; m.wait = .5; runPop(R, 120, 30, '삑!', '#c6ff3d'); sfx('coin'); }
      else { m.wait = .45; R.pen += .5; runPop(R, 120, 30, '삐빅! 다시', '#ff9b9b'); sfx('wrong'); } },
    step: function (R, m, dt) { if (m.wait > 0) { m.wait -= dt; if (m.wait <= 0 && (m.ok || m.tries >= 3)) runMiniEnd(m.ok ? (m.tries === 1 ? 150 : 50) : 0, 0, m.ok ? '🪪 출입 완료' + (m.tries === 1 ? ' · 한 번에!' : '') : '🪪 경비원이 열어 줌', m.ok); return; }
      m.t += dt; runMg(m, '초록 칸에서 딱! (' + (m.tries + 1) + ' / 3)', null); if (m.t > 2.4 * (m.tries + 1)) { m.tries++; m.wait = .3; R.pen += .5; } },
    prop: function (c) { c.drawImage(RIMG.obj.gate, 150, RGY - RIMG.obj.gate.height); c.drawImage(RIMG.obj.gate, 190, RGY - RIMG.obj.gate.height); },
    draw: function (c, R, m) { rBar(c, .5 + .5 * Math.sin(m.t * 3.4), .1, '#ffffff'); RM.badge.prop(c, R, m); } },


  shell: { start: function (R, m) {
      m.pos = [0, 1, 2]; m.tg = Math.floor(RR() * 3); m.sw = []; m.cur = 1; m.p2 = 'show'; m.t = 0;
      for (var i = 0; i < 4; i++) { var a = Math.floor(RR() * 3); m.sw.push([a, (a + 1 + Math.floor(RR() * 2)) % 3]); }
    },
    press: function (R, m) {
      if (m.p2 !== 'pick') return;
      var s = R.tapX == null ? m.cur : SH_X.reduce(function (b, x, i) { return Math.abs(R.tapX - x) < Math.abs(R.tapX - SH_X[b]) ? i : b; }, 0);
      RM.shell.pick(R, m, s);
    },
    key: function (R, m, d) { if (m.p2 === 'pick') { m.cur = Math.max(0, Math.min(2, m.cur + d)); sfx('coin'); } },
    pick: function (R, m, s) { m.sel = s; m.ok = s >= 0 && m.pos[m.tg] === s; m.p2 = 'rev'; m.t = 0; sfx(m.ok ? 'combo' : 'wrong'); if (!m.ok) R.shake = REDUCE ? 0 : .2; },
    step: function (R, m, dt) { m.t += dt;
      if (m.p2 === 'show') { runMg(m, '👀 ★조로 카드를 기억하세요', null); if (m.t > 1.5) { m.p2 = 'flip'; m.t = 0; } return; }
      if (m.p2 === 'flip') { if (m.t > .35) { m.p2 = 'mix'; m.t = 0; m.k2 = 0; } return; }
      if (m.p2 === 'mix') { runMg(m, '🔀 섞는 중… ' + (m.k2 + 1) + ' / 4', null);
        if (m.t > .5) { var w = m.sw[m.k2]; m.pos = m.pos.map(function (p) { return p === w[0] ? w[1] : p === w[1] ? w[0] : p; }); m.k2++; m.t = 0; sfx('jump'); if (m.k2 >= 4) { m.p2 = 'pick'; m.t = 0; } }
        return; }
      if (m.p2 === 'pick') { runMg(m, '어디일까? 카드를 눌러요 (← → · 스페이스)', 1 - m.t / 4, m.t > 2.6); if (m.t > 4) RM.shell.pick(R, m, -1); return; }
      if (m.p2 === 'rev' && m.t > 1.2) runMiniEnd(m.ok ? 200 : 0, m.ok ? 0 : 2, m.ok ? '🃏 맞혔다! 아저씨가 길 비켜 줌' : '🃏 꽝… 한 판 더 붙잡힘', m.ok);
    },
    prop: function (c, R, m, sh) {
      rAhj(c, sh ? 214 : 226, RGY - (sh ? 6 : 0), R.t);
      rr(c, '#6b4a2a', 108, RGY - 30, 108, 5); rr(c, '#2f6b3a', 110, RGY - 31, 104, 2); rr(c, '#6b4a2a', 112, RGY - 25, 3, 25); rr(c, '#6b4a2a', 209, RGY - 25, 3, 25); },
    draw: function (c, R, m) {
      rAhj(c, 226, RGY, R.t);
      rr(c, '#6b4a2a', 108, RGY - 30, 108, 5); rr(c, '#2f6b3a', 110, RGY - 31, 104, 2); rr(c, '#6b4a2a', 112, RGY - 25, 3, 25); rr(c, '#6b4a2a', 209, RGY - 25, 3, 25);
      var y0 = RGY - 64, up = m.p2 === 'show' || m.p2 === 'rev';
      [0, 1, 2].forEach(function (cd) {
        var s = m.pos[cd], x = SH_X[s], y = y0;
        if (m.p2 === 'mix' && m.k2 < 4) { var w = m.sw[m.k2], q = rEase(m.t / .5);
          if (s === w[0] || s === w[1]) { var to = s === w[0] ? w[1] : w[0]; x = SH_X[s] + (SH_X[to] - SH_X[s]) * q; y = y0 - Math.sin(q * Math.PI) * (s === w[0] ? 12 : -4); } }
        var hl = m.p2 === 'rev' && s === m.sel ? (m.ok ? '#3f9a4a' : '#e8412c') : m.p2 === 'pick' && s === m.cur ? '#ffcf3d' : null;
        rCard(c, Math.round(x), Math.round(y), up, cd === m.tg, hl);
      });
      if (m.p2 === 'show') rSay(c, '자, 잘 봐~', 236, RGY - 46, '#1b1d18');
      if (m.p2 === 'rev') rSay(c, m.ok ? '어이쿠, 졌네!' : '한 판 더~', 236, RGY - 46, m.ok ? '#2f7a3a' : '#c0392b');
    } },

  elev: { press: function (R, m) { if (m.win) return; m.g += 10; R.shake = REDUCE ? 0 : .05; R.dust.push({ x: RPX + 10 + R.zx, y: RGY - 1, t: 0, vx: -70 }); },
    step: function (R, m, dt) { m.t += dt;
      if (m.win) { m.wt += dt; if (m.wt > .6 - R_FD[0] && !m.fd) { m.fd = 1; runFade(function () { R.zx = 0; runMiniEnd(200, 0, '🛗 엘리베이터 탑승!', 1); }); } return; }
      m.g = Math.max(0, Math.min(100, m.g - 18 * dt)); runMg(m, '연타! 엘리베이터 ' + Math.round(m.g) + '%', m.g / 100, m.g > 70);
      if (m.g >= 100) { m.win = 1; m.wt = 0; m.op = Math.max(0, 1 - m.t / 3.8); sfx('coin'); return; } if (m.t > 3.8 && !m.fd) { m.fd = 1; runFade(function () { runMiniEnd(0, 1, '🛗 문 닫힘… 다음 엘리베이터'); }); } },
    zx: function (R, m) { return m.win ? 121 : m.g / 100 * 82; },
    draw: function (c, R, m) { rr(c, '#5a5d63', 146, RGY - 74, 88, 74); rr(c, '#1a2030', 150, RGY - 70, 80, 70); rr(c, '#1b1d18', 176, RGY - 82, 28, 8); rr(c, '#c6ff3d', 186, RGY - 80, 8, 4); },
    front: function (c, R, m) { rDoorPanels(c, 150, m.win ? m.op * Math.max(0, 1 - m.wt / .4) : Math.max(0, 1 - m.t / 3.8), '#8f96a3'); } }
};



function rVeh(R) { return R.key === 'bus' && R.onBus || R.key === 'subway' && R.inTrain; }
function rCeil(R, M) { return R.key === 'bus' ? (R.onBus ? M.ceil : 0) : R.key === 'lobby' ? (R.dist > R_GATE ? M.ceil : 0) : M.ceil || 0; }
function runPhys(dt, M, frozen) {
  var R = RUN, g = RG * (R.lowg > 0 ? .55 : M.float ? M.float : !M.inn && R.wx === 'wind' ? .88 : 1), prevH = R.h, wasGround = !R.air;
  if (R.air) g *= R.jumpHeld && Math.abs(R.v) < 80 ? .6 : R.v < 0 ? 1.15 : 1;
  R.v -= g * dt; R.h += R.v * dt;
  var ce = rCeil(R, M); if (ce && R.h > ce) { R.h = ce; if (R.v > 0) R.v = -40; }
  var sup = 0, so = null;
  if (!frozen && R.drop <= 0 && R.v <= 0) R.objs.forEach(function (o) {
    if (o.k !== 'plat') return; var sx = o.x - R.dist + RPX;
    if (sx > RPX + 24 || sx + o.w < RPX + 10) return;
    if (prevH >= o.y - .5 && R.h <= o.y && o.y > sup) { sup = o.y; so = o; }
  });
  var hs = M.bike ? runHillH(R, R.dist + 17) : 0;
  if (hs > 0) { if (wasGround && R.v <= 0 && R.h > hs && R.h - hs < 10) R.h = hs; if (hs > sup) { sup = hs; so = null; } }
  if (R.h <= sup) {
    if (R.air && R.v < -520) { R.shake = REDUCE ? 0 : .12; for (var d = 0; d < 4; d++) R.dust.push({ x: RPX + 8 + d * 6, y: RGY - sup - 1, t: 0, vx: (d - 1.5) * 40 }); }
    if (R.air) R.land = .12;
    R.h = sup; R.v = 0; R.jumps = 0; R.air = 0; R.jumpHeld = 0;
    if (so && so.b) { R.v = 470; R.air = 1; R.jumps = 1; sfx('jump'); return prevH; }
    if (R.buf > 0) runJump();
  } else {
    if (wasGround && R.v <= 0) { R.coy = R_COY; R.jumps = 0; }
    R.air = 1;
  }
  return prevH;
}
var R_FD = [.18, .3];
function runFade(fn) { var R = RUN; if (R.fade) return; R.fade = { t: 0, fn: fn, did: 0 }; }
function runFadeDraw(c) { var F = RUN.fade; if (!F) return; var a = F.t < R_FD[0] ? F.t / R_FD[0] : Math.max(0, 1 - (F.t - R_FD[0]) / R_FD[1]); rr(c, 'rgba(13,15,10,' + a.toFixed(3) + ')', 0, 0, RW, RH); }
var R_COAST = 150;
function runCoast(dt) { var R = RUN; if (!(R.coast > 0)) return; var mv = Math.min(R.coast * dt, R.crem || 0); R.dist += mv; R.crem = Math.max(0, (R.crem || 0) - mv); R.coast = Math.max(20, R.coast - R.cacc * dt); if (R.crem <= .01) { R.coast = 0; R.crem = 0; } }
function runStep(dt) {
  var R = RUN, M = RMAP[R.key];
  R.el += dt;
  if (R.fade) { var FD = R.fade; FD.t += dt; if (!FD.did && FD.t >= R_FD[0]) { FD.did = 1; FD.fn(); } if (FD.t >= R_FD[0] + R_FD[1]) R.fade = null; }
  if (R.tr) { R.tr.t += dt; if (R.tr.t >= R.tr.dur) { var tk = R.tr.to; R.tr = null; runSegCard(tk, 0, null, 1); } return; }
  if (R.out) { var O = R.out; O.t += dt; if (!O.ding && O.t > 1.7) { O.ding = 1; sfx('coin'); } if (!O.pop && O.t > 2.4) { O.pop = 1; sfx('jump'); } if (O.t >= R_OUT) { R.out = null; runFinish(); } return; }
  if (R.card) {
    var C = R.card; C.t += dt;
    if (!C.did && (C.wipe || C.t >= .28)) { C.did = 1; if (C.mid) C.mid(); }
    if (!C.shown && C.t >= (C.wipe ? R_WIPE : .28)) { C.shown = 1; var tc = $('rnTc'); if (tc) tc.hidden = false; }
    if (C.t >= C.dur) { R.card = null; var tc2 = $('rnTc'); if (tc2) tc2.hidden = true; runHud(1); R.easeIn = .6; if (C.end) C.end(); }
    runCoast(dt); return;
  }

  if (R.cd > 0) {
    R.cd -= dt; var n = Math.ceil(R.cd / .6);
    if (n !== R.cdn) { R.cdn = n; if (n > 0) { runBanner(String(n), 700, 1); sfx('coin'); } }
    if (R.cd <= 0) { R.easeIn = .6; runBanner('GO! 🏢 ' + R.dest.n + ' · ' + R_WX[R.wx][1] + ' ' + R_WX[R.wx][0], 1800); sfx('combo'); if (R.dev) R.devAt = R.t + 1.9; }
    return;
  }
  ['stun', 'inv', 'boost', 'shake', 'flash', 'magnet', 'lowg', 'fever', 'dark', 'drop', 'buf', 'coy', 'land', 'lift', 'blink', 'slip', 'bstop', 'easeIn'].forEach(function (k) { R[k] = Math.max(0, R[k] - dt); });
  var zm = R.mini, ztg = zm && zm.ph === 'play' && RM[zm.k].zx && !(R_MINI[zm.k].fr && zm.k !== 'pedal' && R.h > 0) ? RM[zm.k].zx(R, zm) : 0; R.zx += (ztg - R.zx) * Math.min(1, dt * (ztg ? 9 : 14));
  var m = R.mini;
  if (m && (m.ph !== 'play' || R_MINI[m.k].fr)) {
    R.t += dt; runCoast(dt); if (m.k === 'rope') runPhys(dt, M, 1);
    else if (m.k !== 'pedal' && R.h > 0) { R.h = Math.max(0, R.h - 260 * dt); R.v = 0; R.air = R.h > 0 ? 1 : 0; R.jumps = 0; if (!R.h) R.land = .12; }
    if (m.ph === 'play') RM[m.k].step(R, m, dt);
    runFx(dt); return;
  }
  if (R.carry) { R.carry.t += dt; if (!M.bike || R.dist >= R.carry.x1) { R.carry = null; if (M.bike) { R.lift = .12; runPop(R, RPX + 2, RGY - R.h - 52, '다시 출발!', '#c6ff3d'); for (var cq = 0; cq < 4; cq++) R.dust.push({ x: RPX + 8 + cq * 6, y: RGY - R.h - 2, t: 0, vx: (cq - 1.5) * 40 }); } } }
  var hsl = M.bike ? runHillSl(R) : 0, lt = (R.carry ? .55 : 1) * (m && m.k === 'light' && R.held ? 0 : 1) * (m && m.k === 'wind' ? .6 : 1) * (hsl > .01 ? .8 : hsl < -.01 ? 1.15 : 1);
  R.lsm = R.lsm == null ? lt : R.lsm + (lt - R.lsm) * Math.min(1, dt * 14); if (Math.abs(R.lsm - lt) < .01) R.lsm = lt;
  var sf = R.stun > 0 ? .35 : 1; R.ssm = R.ssm == null || sf < R.ssm ? sf : R.ssm + (1 - R.ssm) * Math.min(1, dt * 7);
  var f = Math.min(1, R.dist / M.len), belt = 0;
  if (M.belt && !R.air && R.h === 0) R.objs.forEach(function (o) { if (o.k === 'belt' && o.x - R.dist + RPX < RPX + 17 && o.x + o.w - R.dist + RPX > RPX + 17) belt = 1; });
  var spd = rSpd(M, R.seg, f) * (R.boost > 0 ? 1.35 : 1) * R.ssm * (R.slip > 0 ? .45 : 1) * (belt ? 1.6 : 1) * (R.lsm == null ? 1 : R.lsm) * (R.bstop > 0 ? 0 : m && m.k === 'brake' ? Math.max(.35, 1 - .65 * m.t) : 1);
  if (belt && !R.onBelt) runPop(R, RPX, RGY - 46, '무빙워크 쭉~', '#9fd3ff'); R.onBelt = belt;
  spd *= R.dev && R.dev.fx.spd || 1;
  spd *= 1 - .65 * Math.min(1, (R.easeIn || 0) / .6);
  R.dist += spd * dt; R.t += dt; R.spdx = spd / M.spd;
  if (R.nudge) { var ntg = (R.nudge > 0 ? 1 : -1) * Math.min(R.nudge > 0 ? 1100 : 300, Math.abs(R.nudge) * 7); R.nvv = (R.nvv || 0) + (ntg - (R.nvv || 0)) * Math.min(1, dt * 9); var nv = (R.nudge > 0 ? 1 : -1) * Math.min(Math.abs(R.nudge), Math.max(Math.abs(R.nvv), 30) * dt); R.dist = Math.max(0, R.dist + nv); R.nudge -= nv; if (Math.abs(R.nudge) < .01) { R.nudge = 0; R.nvv = 0; } if (nv > 0) R.spdx += nv / dt / M.spd; }
  if (M.bike && !R.docked && R.dist > M.len - 70) { R.docked = 1; runPop(R, RPX - 4, RGY - 52, '따릉이 반납 ✔', '#9fd3ff'); sfx('coin'); }
  if (R.key === 'subway' && R.inTrain && R.dist > M.len - 300) runFade(function () { R.inTrain = 0; runBanner('🚇 내렸다! 출구로', 1200); });
  if (m) RM[m.k].step(R, m, dt);
  if (R.chase > 0) { R.chase -= dt; if (R.chase <= 0) { R.chase = 0; if (!R.chHit) { R.esc++; R.money += 200; R.log.push('😮‍💨 부장님 따돌림 +200만원'); runBanner('부장님 따돌렸다! +200만원'); sfx('combo'); } } }
  if (R.devAt && R.t >= R.devAt) { R.devAt = 0; runBanner(R.dev.nm + ' · ' + R.dev.how, 2600); }
  if (!R.warned && runClock(R) >= R_DUE - 8 && runClock(R) <= R_DUE) { R.warned = 1; runBanner('⏰ 지각 위기! 서둘러요', 1500); }
  var prevH = runPhys(dt, M);

  if (!R.air) R.objs.forEach(function (o) { if (o.k !== 'ramp' || o.done) return; var sx = o.x - R.dist + RPX; if (sx < RPX + 20 && sx + 12 > RPX + 12) { o.done = 1; R.v = 600; R.air = 1; R.jumps = 1; R.jumpHeld = 0; runPop(R, RPX, RGY - 50, '붕~', '#9fd3ff'); sfx('jump'); } });

  var st = Math.floor(R.dist / 11) % 4;
  if (!R.air && st !== R.step && (st === 1 || st === 3) && !M.bike) R.dust.push({ x: RPX + 12, y: RGY - R.h - 1, t: 0, vx: -60 });
  R.step = st;

  R.ev.forEach(function (E) {
    if (E.done || R.dist < E.at || R.card || (R.mini && E.k !== 'fork')) return; E.done = 1;
    if (E.k === 'mini') { runMini(E.m); return; }
    if (E.k === 'fork') { var s = R.slots[R.seg + 1]; R.fork = { up: s[0], dn: s[1] }; runBanner('갈림길! ' + R_ASK[R.seg + 1], 1800); sfx('combo'); runHud(1); return; }
    var X = R_EV[E.k]; if (X.msg) { runBanner(X.msg, 1800); R.log.push(X.msg.split('!')[0].split(' ·')[0]); } X.go(R);
  });
  var P = runHitBox(R), cx = (P[0] + P[2]) / 2, cy = (P[1] + P[3]) / 2;
  R.objs.forEach(function (o) {
    if (o.k === 'plat' || o.k === 'sign' || o.k === 'belt' || o.k === 'ramp') return;
    if (o.sq > 0) { o.sq -= dt; return; }
    if (o.done) return;
    o.x += o.vx * dt;
    if (o.ty != null && o.y > o.ty) o.y = Math.max(o.ty, o.y - 150 * dt);
    if (o.k === 'ghost') o.y = o.by + Math.sin(R.t * 3 + o.x * .02) * 8;
    if (M.hop && o.k === 'dog') o.y = Math.max(0, Math.sin(R.t * 4 + o.x * .013)) * 30;
    var sx = o.x - R.dist + RPX; if (sx < -60 || sx > RW + 20) return;
    var im = runImg(o), top = RGY - o.y - im.height, good = R_VAL[o.k] || o.k === 'coffee' || o.k === 'box';
    if (R.magnet > 0 && R_VAL[o.k] && sx < RW - 10) { var dx = cx - (sx + im.width / 2), dy = cy - (top + im.height / 2), dd = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dd < 150) { var mv = Math.min(dd, 260 * dt); o.x += dx / dd * mv; o.y -= dy / dd * mv; sx = o.x - R.dist + RPX; top = RGY - o.y - im.height; o.ty = null; } }
    if (o.k === 'puddle') {
      if (!o.wet && !R.air && R.h < 1 && sx + 4 < P[2] && sx + im.width - 4 > P[0]) { o.wet = 1; R.slip = 1.2; R.slips++; runPop(R, RPX - 4, RGY - 46, '첨벙! 미끄덩', '#9fd3ff'); sfx('wrong'); for (var w2 = 0; w2 < 5; w2++) R.dust.push({ x: RPX + 6 + w2 * 5, y: RGY - 2, t: 0, vx: (w2 - 2) * 50 }); }
      return;
    }
    var pad = good ? -1 : 4;
    var hit = sx + pad < P[2] && sx + im.width - pad > P[0] && top + pad < P[3] && RGY - o.y - 1 > P[1];
    if (!hit) {
      if (!good && !o.pass && sx + im.width < P[0]) { o.pass = 1; var gp = top - (RGY - prevH); if (R.air && gp >= -2 && gp < 10) { R.near++; R.combo += 3; R.money += 50; runPop(R, RPX + 16, P[1] - 4, '아슬아슬 +50', '#c6ff3d'); sfx('coin'); } }
      return;
    }
    if (R_VAL[o.k]) {
      o.done = 1; R.combo++; R.maxCombo = Math.max(R.maxCombo, R.combo);
      var v = Math.round(R_VAL[o.k] * runMult(R) * (R.fever > 0 ? 2 : 1) / 10) * 10; R.money += v; R.got++;
      R.fx.push({ x: sx + im.width / 2, y: top, t: 0 }); if (o.k !== 'coin') runPop(R, sx, top, '+' + v);
      sfx(o.k === 'coin' ? 'coin' : 'combo');
      if (R.combo % 10 === 0) { runBanner('🔥 ' + R.combo + ' 콤보! 돈 ×' + runMult(R), 1000); sfx('combo'); }
      return;
    }
    if (o.k === 'coffee') { var cf = R.dev && R.dev.fx.cof || 1; o.done = 1; R.boost = 4 * cf; R.inv = Math.max(R.inv, 4 * cf); sfx('combo'); runBanner('☕ 커피 부스트! ' + 4 * cf + '초 무적'); return; }
    if (o.k === 'box') { o.done = 1; runBox(R); return; }
    if (R_FOE[o.k] && R.v < 0 && P[3] <= top + 10) {
      o.done = 1; o.sq = .35; R.v = 400; R.jumps = 1; R.air = 1; R.jumpHeld = 0; R.kills++; R.hs = .045; R.lift = .1; rBuzz(12); R.combo += 2; R.maxCombo = Math.max(R.maxCombo, R.combo);
      var kv = Math.round(100 * runMult(R) * (M.kill2 ? 2 : 1) / 10) * 10; R.money += kv; runPop(R, sx, top - 4, R_FOE[o.k] + ' 처치 +' + kv, '#ff9bd3'); R.shake = REDUCE ? 0 : .1; sfx('combo'); return;
    }
    if (R.inv > 0) { if (R.boost > 0 && R_FOE[o.k]) { o.done = 1; o.sq = .35; R.kills++; runPop(R, sx, top, '퍽!', '#ff9bd3'); } return; }
    o.done = 1; R.hits++; (R.hitk = R.hitk || []).push(o.k); R.stun = .7; R.inv = 1.4; R.pen += 2; R.hs = .07; rBuzz(35); R.shake = REDUCE ? 0 : .35; R.flash = .18;
    var lost = Math.min(100, R.money); R.money -= lost; sfx('wrong');
    var broke = R.combo >= 10; R.combo = 0;
    if (R.chase > 0 && !R.chHit) { R.chHit = 1; R.pen += 3; R.log.push('😱 부장님한테 딱 걸림 ⏰ +3분'); runBanner('부장님한테 딱 걸렸다! ⏰ +5분', 1600); return; }
    runBanner('꽈당! ⏰ +2분' + (lost ? ' · −' + lost + '만원' : '') + (broke ? ' · 콤보 끊김' : ''));
  });
  runFx(dt);
  if (R.dist >= M.len && !R.mini) runSegEnd();
}
function runFx(dt) {
  var R = RUN;
  R.fx = R.fx.filter(function (f) { f.t += dt; return f.t < .45; });
  R.dust = R.dust.filter(function (d) { d.t += dt; d.x += d.vx * dt; return d.t < .35; });
  R.pops = R.pops.filter(function (p) { p.t += dt; return p.t < .9; });
}
function runHitBox(R) { return [RPX + 10, RGY - R.h - 32, RPX + 24, RGY - R.h - 2]; }
function runImg(o) { return o.k === 'person' ? RIMG.ppl[o.p] : RIMG.obj[o.k]; }

function runBox(R) {
  var x = RR(), m;
  if (x < .28) { R.money += 1000; m = '🎉 대박! 특별 성과급 +1,000만원'; sfx('fanfare'); }
  else if (x < .53) { R.money += 300; m = '🎫 백화점 상품권 +300만원'; sfx('combo'); }
  else if (x < .7) { R.boost = 5; R.inv = 5; m = '⚡ 에너지 드링크! 5초 무적'; sfx('combo'); }
  else if (x < .85) { var d = Math.min(200, R.money); R.money -= d; m = '💳 카드값 청구서… −' + d + '만원'; sfx('wrong'); }
  else { R.pen += 1; m = '📄 결재 서류 떠안음… ⏰ +1분'; sfx('wrong'); }
  R.log.push('❓ 상자: ' + m.replace(/^\S+ /, '')); runBanner(m, 1800);
}

function runSegEnd() {
  var R = RUN, F = R.fork; R.seg++;
  if (R.sg) R.sg.push([Math.round(R.money), Math.round(runClock(R) * 10) / 10]);
  if (R.seg >= R_SLOTS.length) return runFinish();
  var opts = R.slots[R.seg], k = opts.length === 1 ? opts[0] : R.h >= R_T1 - 2 ? opts[0] : opts[1];
  if (F) R.log.push((k === F.up ? '⬆ 위층으로 ' : R_UNDER[k] ? '⬇ 지하로 ' : '➡ 아래로 ') + RMAP[k].emo + ' ' + RMAP[k].nm);
  R.fork = null;
  var from = R.key, h0 = R.h, a = runSnap(); runEnter(k); runHud(1); var b = a ? runSnap() : null;
  if (a && b) { var kd = rTrKind(from, k); R.tr = { kind: kd, t: 0, dur: kd === 'pan' ? .9 : 1.5, a: a, b: b, to: k, h0: h0 }; }
  else runSegCard(k, 0, null, 1);
}
function runEnter(key) {
  var R = RUN, G = rGen(key, R, R.seg);
  R.key = key; R.route.push(key); R.dist = 0; R.left = []; R.objs = G.objs; R.ev = G.ev; R.fx = []; R.carry = null; R.chase = 0; R.dark = 0; R.magnet = 0;
  R.h = 0; R.v = 0; R.air = 0; R.jumps = 0; R.buf = 0; R.coy = 0; R.inTrain = 0; R.onBus = 0; R.hideZ = 0; R.docked = 0; R.nudge = 0; R.nvv = 0; R.coast = 0; R.crem = 0; R.lsm = null; R.ssm = 1;
}
function rArrow(c, x, y, dir, col) {
  var px = function (a, b, w, h) { rr(c, '#0d0f0a', a - 1, b - 1, w + 2, h + 2); };
  var draw = function (f) { for (var i = 0; i < 9; i++) f(i); };
  if (dir === 'u') { px(x + 5, y + 9, 8, 14); draw(function (i) { px(x + 8 - i, y + i, 2 + i * 2, 1); }); rr(c, col, x + 5, y + 9, 8, 14); draw(function (i) { rr(c, col, x + 8 - i, y + i, 2 + i * 2, 1); }); }
  else { px(x, y + 5, 14, 8); draw(function (i) { px(x + 14 + i, y + i, 1, 18 - i * 2); }); rr(c, col, x, y + 5, 14, 8); draw(function (i) { rr(c, col, x + 14 + i, y + i, 1, 18 - i * 2); }); }
}



var R_UNDER = { subway: 1, under: 1 };
function rTrKind(a, b) { return R_UNDER[b] && !R_UNDER[a] ? 'down' : R_UNDER[a] && !R_UNDER[b] ? 'up' : 'pan'; }
function rEase(p) { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); }
function rZ(c, im, x, y) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x + 7, y + im.height - 2, 20, 2); c.drawImage(im, Math.round(x), Math.round(y)); }
function rTrDraw(c, R) {
  var T = R.tr, p = rEase(T.t / T.dur), zi = RIMG.run[Math.floor(R.el * 12) % 4], A = T.a, B = T.b;
  var q0 = Math.min(1, T.t / .4), dh = Math.round((T.h0 || 0) * (1 - q0 * q0));
  if (dh > 0) zi = RIMG.jump;
  if (T.kind === 'pan') {
    var ox = Math.round(-p * RW);
    c.drawImage(A, 0, 0, A.width, A.height, ox, 0, RW, RH); c.drawImage(B, 0, 0, B.width, B.height, ox + RW, 0, RW, RH);
    rr(c, 'rgba(13,15,10,.18)', ox + RW - 3, 0, 3, RH);
    rZ(c, zi, RPX, RGY - 37 - dh); return;
  }

  var dn = T.kind === 'down', L = 170, S = RH, sg = dn ? 1 : -1, fx = RPX + 17;
  var ax = -L * p, ay = -sg * S * p, bx = L * (1 - p), by = sg * S * (1 - p);
  rr(c, '#2f343d', 0, 0, RW, RH);
  for (var ty = ((ay % 16) + 16) % 16; ty < RH; ty += 16) rr(c, '#383e48', 0, Math.round(ty), RW, 1);
  for (var tx = ((ax % 24) + 24) % 24; tx < RW; tx += 24) rr(c, '#383e48', Math.round(tx), 0, 1, RH);
  for (var li = 0; li < 3; li++) { var lx = Math.round(ax + 60 + li * 70), ly = Math.round(RGY + ay + sg * (li * 70 / L) * S) - 70; rr(c, '#fff8d8', lx, ly, 18, 3); rr(c, 'rgba(255,248,216,.08)', lx - 10, ly + 3, 38, 40); }
  c.drawImage(A, 0, 0, A.width, A.height, Math.round(ax), Math.round(ay), RW, RH);
  c.drawImage(B, 0, 0, B.width, B.height, Math.round(bx), Math.round(by), RW, RH);
  rStairs(c, fx + ax, RGY + ay, fx + bx, RGY + by, dn);
  var top = dn ? [fx + ax, RGY + ay] : [fx + bx, RGY + by], X = RMAP[T.to];
  rr(c, '#5a5d63', Math.round(top[0] - 2), Math.round(top[1] - 64), 3, 64);
  var st = (dn ? '⬇ ' : '⬆ 출구 · ') + X.nm, fs = 9; c.font = 'bold 9px sans-serif'; while (fs > 7 && c.measureText(st).width > 110) { fs--; c.font = 'bold ' + fs + 'px sans-serif'; }
  var sw2 = Math.max(66, Math.ceil(c.measureText(st).width) + 12);
  rr(c, '#0d0f0a', Math.round(top[0] - sw2 / 2 - 1), Math.round(top[1] - 84), sw2 + 2, 22); rr(c, dn ? '#3f6fb5' : '#3f9a4a', Math.round(top[0] - sw2 / 2), Math.round(top[1] - 83), sw2, 20);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(st, Math.round(top[0]), Math.round(top[1] - 69)); c.textAlign = 'left';
  rZ(c, zi, RPX, RGY - 37 - dh + (dh ? 0 : Math.floor(R.el * 10) % 2));
}
function rStairs(c, x0, y0, x1, y1, dn) {
  var N = 12, w = (x1 - x0) / N, h = (y1 - y0) / N;
  for (var i = 0; i < N; i++) {
    var sx = Math.round(x0 + i * w), sy = Math.round(dn ? y0 + (i + 1) * h : y0 + i * h);
    rr(c, '#7e848c', sx, sy, Math.ceil(w) + 1, 40); rr(c, '#c9ccd2', sx, sy, Math.ceil(w) + 1, 2); rr(c, '#ffcf3d', sx, sy, 3, 2);
  }
  c.strokeStyle = '#5a5d63'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0 - 26); c.lineTo(x1, y1 - 26); c.stroke();
  for (var j = 1; j < N; j += 3) rr(c, '#5a5d63', Math.round(x0 + j * w), Math.round(y0 + j * h - 26), 2, 24);
}



var R_OUT = 5;
function rEndMate(R) { return R.endEv === 0 ? RIMG.boss : R.endEv === 5 ? RIMG.ppl[3 % RIMG.ppl.length] : null; }
function rOutDraw(c, R) {
  var O = R.out, t = O.t, F = O.fl;
  if (t < 2.1) {
    var q = rEase(t / 1.7), cam = q * (F - 1) * 90, bump = t > 1.7 ? Math.round(Math.sin((t - 1.7) * 30) * 2 * Math.max(0, 1 - (t - 1.7) / .3)) : 0;
    rr(c, '#d9d4c8', 0, 0, RW, RH);
    for (var f = 1; f <= F + 1; f++) {
      var y = Math.round(RGY + 20 - (f - 1) * 90 + cam); if (y < -100 - R_XT.t || y > RH + 100 + R_XT.b) continue;
      [[0, 98], [182, 98]].forEach(function (s, si) {
        rr(c, '#eef0ea', s[0], y - 86, s[1], 86); rr(c, '#cfe3ef', s[0] + 6, y - 78, s[1] - 12, 26);
        for (var d = 0; d < 2; d++) { var dx = s[0] + 10 + d * 44; rr(c, '#8a6a4a', dx, y - 22, 34, 4); rr(c, '#2b2f3a', dx + 10, y - 34, 14, 11); rr(c, ih(f * 7 + d + si, 41) < .5 ? '#9fd3ff' : '#c6ff3d', dx + 12, y - 32, 10, 7); }
        if (ih(f, 42 + si) < .6) { var P = RIMG.ppl[(f + si) % RIMG.ppl.length]; c.drawImage(P, s[0] + 18 + si * 30, y - P.height); }
      });
      rr(c, '#9b917f', 0, y, RW, 6); rr(c, '#7d7466', 0, y + 6, RW, 2);
      c.font = 'bold 9px sans-serif'; c.fillStyle = '#5a5d63'; c.fillText(f + 'F', 4, y - 4);
    }
    rr(c, '#3a3f4a', 98, 0, 84, RH); rr(c, '#2b2f3a', 100, 0, 4, RH); rr(c, '#2b2f3a', 176, 0, 4, RH);
    var cy = 52 + bump; rr(c, '#1b1d18', 139, 0, 2, cy);
    rr(c, '#1b1d18', 109, cy - 1, 62, 80); rr(c, '#8f96a3', 110, cy, 60, 78); rr(c, '#e8e4da', 114, cy + 6, 52, 68); rr(c, '#fff8d8', 120, cy + 8, 40, 3);
    rr(c, 'rgba(255,255,255,.35)', 116, cy + 12, 3, 56);
    var cmp = rEndMate(R); if (cmp) c.drawImage(cmp, 136, cy + 74 - cmp.height);
    c.drawImage(RIMG.stand, cmp ? 112 : 123, cy + 74 - RIMG.stand.height);
    var fl = Math.max(1, Math.min(F, Math.round(1 + (F - 1) * q)));
    rr(c, '#0d0f0a', 110, 6, 60, 20); c.font = 'bold 12px sans-serif'; c.fillStyle = t > 1.7 ? '#c6ff3d' : '#ff9b3d'; c.textAlign = 'center'; c.fillText((t > 1.7 ? '● ' : '▲ ') + fl + 'F', 140, 21); c.textAlign = 'left';
    if (t > 1.7) { c.font = 'bold 14px sans-serif'; c.fillStyle = '#0d0f0a'; c.fillText('띵!', 176, cy + 18); }
    if (t > 1.95) rr(c, 'rgba(255,255,255,' + Math.min(1, (t - 1.95) / .15) + ')', 0, 0, RW, RH);
    return;
  }
  rOffice(c, R, F);
  var ex = 16, op = rEase((t - 2.1) / .3), zx, zy, im;
  rr(c, '#e8e4da', ex, RGY - 70, 80, 70); rr(c, '#fff8d8', ex + 10, RGY - 68, 60, 3);
  if (t < 2.4) { zx = ex + 23; zy = RGY - 37; im = RIMG.stand; }
  else if (t < 2.75) { var a = (t - 2.4) / .35; zx = ex + 23 + a * 62; zy = RGY - 37 - Math.sin(a * Math.PI) * 24; im = RIMG.jump; }
  else if (t < 4.2) { var b = rEase((t - 2.75) / 1.45); zx = ex + 85 + b * 140; zy = RGY - 37; im = RIMG.run[Math.floor(t * 12) % 4]; }
  else { zx = ex + 225; zy = RGY - 41 + Math.round(Math.max(0, Math.sin(Math.min(1, (t - 4.2) / .25) * Math.PI)) * 3); im = RIMG.jump; }
  var mt = rEndMate(R); if (mt && t >= 2.1) c.drawImage(mt, ex + 40, RGY - mt.height);
  if (t >= 2.4) rDoorPanels(c, ex, op, '#8f96a3');
  if (t > 4.2) { rr(c, '#1b1d18', 265, RGY - 36, 3, 24); c.save(); c.beginPath(); c.rect(0, 0, RW, RGY - 13); c.clip(); c.drawImage(im, Math.round(zx), Math.round(zy)); c.restore(); rr(c, '#c6ff3d', 246, RGY - 14, 24, 4); rr(c, '#1b1d18', 256, RGY - 10, 3, 8); rr(c, '#1b1d18', 249, RGY - 3, 18, 3); }
  else rZ(c, im, zx, zy);
  if (t < 2.4) rDoorPanels(c, ex, op, '#8f96a3');
  if (t >= 2.72 && t < 2.95) { c.font = 'bold 10px sans-serif'; c.fillStyle = '#e8412c'; c.fillText('슝!', zx + 30, zy + 4); }
  if (t > 4.2) {
    var s = Math.min(1, (t - 4.2) / .25);
    for (var k = 0; k < 6; k++) { var an = k * 1.05 + t * 2; rr(c, '#ffcf3d', Math.round(zx + 17 + Math.cos(an) * 26 * s), Math.round(zy + 14 + Math.sin(an) * 18 * s), 3, 3); }
    var lt = runClock(R) > R_DUE; rr(c, lt ? 'rgba(192,57,43,.92)' : 'rgba(13,15,10,.82)', 40, 18, 200, 34); c.font = 'bold 14px sans-serif'; c.fillStyle = lt ? '#ffffff' : '#c6ff3d'; c.textAlign = 'center';
    c.fillText((lt ? '지각 ' : '출근 완료! ') + hhmm(runClock(R)), 140, 40); c.textAlign = 'left';
  }
  if (t < 2.3) rr(c, 'rgba(255,255,255,' + Math.max(0, 1 - (t - 2.1) / .2) + ')', 0, 0, RW, RH);
}
function rOffice(c, R, F) {
  rr(c, '#eef0ea', 0, 0, RW, RGY); rr(c, '#cfe3ef', 0, 8, RW, 46);
  for (var i = 0; i < 9; i++) { var bh = 14 + ih(i, 43) * 26; rr(c, '#a9c3d6', i * 32, 54 - bh, 26, bh); }
  for (var j = 0; j < RW; j += 56) rr(c, '#b9cfdc', j, 8, 2, 46);
  rr(c, '#8f96a3', 12, RGY - 74, 88, 74); rr(c, '#0d0f0a', 40, RGY - 88, 32, 12); c.font = 'bold 9px sans-serif'; c.fillStyle = '#c6ff3d'; c.fillText(F + 'F', 48, RGY - 79);
  [[118, 0], [196, 1]].forEach(function (d) {
    var x = d[0]; rr(c, '#2b2f3a', x + 16, RGY - 40, 18, 14); rr(c, d[1] ? '#c6ff3d' : '#9fd3ff', x + 18, RGY - 38, 14, 10); rr(c, '#2b2f3a', x + 24, RGY - 26, 3, 4);
    rr(c, '#8a6a4a', x, RGY - 22, 56, 4); rr(c, '#6b5236', x + 3, RGY - 18, 3, 18); rr(c, '#6b5236', x + 50, RGY - 18, 3, 18);
    if (d[1]) { var nk = NICK || '조로'; nk = nk.length > 6 ? nk.slice(0, 5) + '…' : nk; c.font = 'bold 6px sans-serif'; var nw = Math.ceil(c.measureText(nk).width);
      if (nw > 40) { c.font = 'bold 5px sans-serif'; nw = Math.ceil(c.measureText(nk).width); }
      rr(c, '#5a5d63', x + 27, RGY - 46, 2, 6); rr(c, '#0d0f0a', x + 28 - Math.ceil(nw / 2) - 3, RGY - 56, nw + 6, 10); rr(c, '#ffffff', x + 28 - Math.ceil(nw / 2) - 2, RGY - 55, nw + 4, 8); c.fillStyle = '#0d0f0a'; c.textAlign = 'center'; c.fillText(nk, x + 28, RGY - 48.5); c.textAlign = 'left';
      rr(c, '#3f9a4a', x + 4, RGY - 32, 6, 10); rr(c, '#c0602b', x + 4, RGY - 24, 6, 2); if (!(R.out && R.out.t > 4.2)) { rr(c, '#c6ff3d', x + 56, RGY - 30, 12, 4); rr(c, '#1b1d18', x + 61, RGY - 26, 3, 26); } }
    else { var P = RIMG.ppl[1 % RIMG.ppl.length]; c.drawImage(P, x + 20, RGY - P.height - 4); }
  });
  rr(c, '#b9c2c9', 0, RGY, RW, RH - RGY); tile(0, 1, 20, function (x) { rr(c, '#a9b2b9', x, RGY, 1, RH - RGY); });
}


function runScale(cv) {
  var w = cv.clientWidth || RW, k = Math.max(1, Math.min(8, Math.round(w * (window.devicePixelRatio || 1) / RW)));
  if (cv.width !== RW * k || cv.height !== (RH + R_XT.e) * k) { cv.width = RW * k; cv.height = (RH + R_XT.e) * k; }
  return k;
}

function rXt(c) {
  if (c.__xt) return; c.__xt = 1; var f0 = c.fillRect;
  c.fillRect = function (x, y, w, h) { if (R_XT.e && y <= 0 && y + h >= RH) return f0.call(c, x, y - R_XT.t - 2, w, h + R_XT.e + 4); return f0.call(c, x, y, w, h); };
}

function runEdge(c, cv, k, ins) {
  var X = R_XT; if (!X.e) return; var a = (X.t + ins) * k, b = (X.t + RH - 1 - ins) * k, w = cv.width, h = Math.max(1, Math.round(k));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.globalAlpha = 1;
  c.drawImage(cv, 0, Math.round(a), w, h, 0, 0, w, Math.round(a)); c.drawImage(cv, 0, Math.round(b), w, h, 0, Math.round(b) + h, w, cv.height - Math.round(b) - h);
  c.restore();
}
function runHillDraw(c, R) {
  var x0 = runHill0(R); if (x0 == null) return; var H = R_HILL, L = H.up + H.top + H.dn, sx = x0 - R.dist + RPX; if (sx > RW + 20 || sx + L < -4) return;
  var P = [[sx, RGY], [sx + H.up, RGY - H.ht], [sx + H.up + H.top, RGY - H.ht], [sx + L, RGY]];
  var path = function (d) { c.beginPath(); c.moveTo(P[0][0], P[0][1] + d); for (var i = 1; i < 4; i++) c.lineTo(P[i][0], P[i][1] + d); };
  path(0); c.closePath(); c.fillStyle = '#a77b5c'; c.fill();
  c.fillStyle = 'rgba(0,0,0,.14)'; for (var bx = Math.ceil(sx / 12) * 12; bx < sx + L; bx += 12) { var bh = runHillH(R, bx - RPX + R.dist); for (var by = RGY - 6, r = 0; by > RGY - bh + 2; by -= 7, r++) c.fillRect(Math.round(bx + (r % 2 ? 6 : 0)), by, 1, 5); }
  path(-14); for (var j = 3; j >= 0; j--) c.lineTo(P[j][0], P[j][1]); c.closePath(); c.fillStyle = '#c95a4a'; c.fill();
  path(-14); c.strokeStyle = '#b14a3c'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#f2f2f2'; for (var lx = Math.ceil((sx + 6) / 24) * 24; lx < sx + L - 6; lx += 24) { var lh = runHillH(R, lx - RPX + R.dist); c.fillRect(Math.round(lx), Math.round(RGY - lh - 8), 8, 2); }
  var tx = Math.round(sx - 14); rr(c, '#2b2f3a', tx + 8, RGY - 40, 2, 26); rr(c, '#ffcf3d', tx, RGY - 50, 18, 12); c.font = 'bold 8px sans-serif'; c.fillStyle = '#1b1d18'; c.fillText('⛰', tx + 4, RGY - 41);
  var fx = Math.round(sx + H.up + H.top / 2); rr(c, '#2b2f3a', fx, RGY - H.ht - 14 - 22, 1, 22); rr(c, '#c6ff3d', fx + 1, RGY - H.ht - 14 - 22, 9, 6);
}
function runDraw() {
  var R = RUN, cv = $('rnC'); if (!R || !cv) return;
  var k = runScale(cv), c = cv.getContext('2d'); rHR(c); rXt(c); var sa = Math.min(1, R.shake / .2), sh = R.shake > 0 ? Math.round(Math.sin(R.t * 70) * 4 * sa) : 0, shy = R.shake > 0 ? Math.round(Math.cos(R.t * 55) * 2 * sa) : 0, M = RMAP[R.key], m = R.mini;
  c.setTransform(k, 0, 0, k, 0, R_XT.t * k); c.imageSmoothingEnabled = false; rr(c, '#0d0f0a', 0, 0, RW, RH); if (R.tr) { rTrDraw(c, R); runEdge(c, cv, k, 0); return; } if (R.out) { rOutDraw(c, R); if (R.out.t >= 2.1) runEdge(c, cv, k, 0); runFadeDraw(c); return; } c.save(); c.translate(sh, shy);
  RBG[R.key](c, R.dist, R.t); runEdge(c, cv, k, 3);
  if (/^(alley|bike|bridge|park|avenue)$/.test(R.key) && !REDUCE) tile(R.dist + R.t * 6, .05, 150, function (x, i) {
    var y = 8 + ih(i, 31) * 22, w = 26 + ih(i, 32) * 22; c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(Math.round(x), Math.round(y + 4), Math.round(w), 6); c.fillRect(Math.round(x + w * .2), Math.round(y), Math.round(w * .45), 5); c.fillRect(Math.round(x + w * .55), Math.round(y + 2), Math.round(w * .3), 3); });
  if (R.key === 'subway' && R.inTrain) { var cy = RGY - M.ceil - 40; rr(c, '#aab2bc', 0, 0, RW, cy); rr(c, '#7e848c', 0, cy - 2, RW, 2); tile(R.dist, 1, 26, function (x) { rr(c, '#9aa0a6', x + 12, cy, 1, 5); rr(c, '#f6f6f2', x + 10, cy + 5, 5, 5); }); }
  if (R.fever > 0) rr(c, 'rgba(255,207,61,' + (.12 + .06 * Math.sin(R.t * 12)) + ')', 0, 0, RW, RH);
  if (M.bike) runHillDraw(c, R);

  R.objs.forEach(function (o) {
    if (o.k !== 'belt') return; var sx = Math.round(o.x - R.dist + RPX); if (sx > RW || sx + o.w < 0) return;
    rr(c, '#1b1d18', sx - 1, RGY - 4, o.w + 2, 8); rr(c, '#4a4f57', sx, RGY - 3, o.w, 6); for (var j = Math.floor((R.t * 40) % 10); j < o.w; j += 10) rr(c, '#6d737c', sx + j, RGY - 3, 4, 6);
    rr(c, '#ffcf3d', sx, RGY - 4, 6, 1); rr(c, '#ffcf3d', sx + o.w - 6, RGY - 4, 6, 1); rr(c, '#2b2f3a', sx, RGY - 26, o.w, 3); rr(c, '#2b2f3a', sx + 2, RGY - 23, 2, 20); rr(c, '#2b2f3a', sx + o.w - 4, RGY - 23, 2, 20);
  });

  R.objs.forEach(function (o) {
    if (o.k !== 'plat') return; var sx = Math.round(o.x - R.dist + RPX); if (sx > RW || sx + o.w < 0) return;
    var y = RGY - o.y;
    if (rVeh(R)) {
      for (var hk = 6; hk < o.w - 2; hk += 40) rr(c, '#9aa0a6', sx + hk, 0, 2, y);
      rr(c, '#1b1d18', sx - 1, y - 1, o.w + 2, 7); rr(c, '#c9ced6', sx, y, o.w, 2); rr(c, '#8a8f98', sx, y + 2, o.w, 3); for (var mk = 2; mk < o.w; mk += 6) rr(c, '#6d737c', sx + mk, y + 2, 1, 3);
      return; }
    for (var k = 8; k < o.w - 4; k += 56) rr(c, M.pc[1], sx + k, y + 7, 3, o.y - 7);
    rr(c, '#1b1d18', sx - 1, y - 1, o.w + 2, 9); rr(c, M.pc[0], sx, y, o.w, 3); rr(c, M.pc[1], sx, y + 3, o.w, 4);
    if (o.b) for (var s = 0; s < o.w; s += 12) rr(c, '#ffffff', sx + s, y, 6, 7);
    else for (var j = 4; j < o.w; j += 12) rr(c, 'rgba(255,255,255,.35)', sx + j, y, 4, 1);
  });
  if (M.bike) { var rk = Math.round(M.len - 70 - R.dist + RPX + 6);
    if (rk > -90 && rk < RW + 10) { rr(c, '#3f9a4a', rk, RGY - 46, 70, 10); c.font = 'bold 7px sans-serif'; c.fillStyle = '#fff'; c.fillText('따릉이 대여소', rk + 10, RGY - 38);
      for (var rq = 0; rq < 4; rq++) { rr(c, '#5a5d63', rk + 6 + rq * 18, RGY - 36, 3, 36); rr(c, '#36b5a5', rk + 4 + rq * 18, RGY - 20, 7, 4); }
      var BK2 = RIMG.obj.bike; if (R.docked) c.drawImage(BK2, rk + 2, RGY - BK2.height * 2, BK2.width * 2, BK2.height * 2); } }

  R.objs.forEach(function (o) {
    if (o.k !== 'sign') return; var sx = Math.round(o.x - R.dist + RPX); if (sx > RW + 240 || sx < -330) return;
    if (rVeh(R)) {
      var lx = sx + 20, l1 = '다음 정류장 안내', l2 = '⬆ 선반 위 → ' + RMAP[o.up].nm, l3 = (R_UNDER[o.dn] ? '⬇ 바닥 → ' : '➡ 바닥 → ') + RMAP[o.dn].nm;
      c.font = 'bold 8px sans-serif'; var lw = Math.max(c.measureText(l2).width, c.measureText(l3).width) + 14;
      var ly = 34; rr(c, '#9aa0a6', lx + 10, 0, 2, ly); rr(c, '#9aa0a6', lx + lw - 12, 0, 2, ly); rr(c, '#2b2f3a', lx - 2, ly - 2, lw + 4, 44); rr(c, '#0d0f0a', lx, ly, lw, 40);
      c.fillStyle = '#ff9b3d'; c.fillText(l1, lx + 6, ly + 11); c.fillStyle = Math.floor(R.t * 2) % 2 ? '#ffcf3d' : '#ff9b3d'; c.fillText(l2, lx + 6, ly + 23); c.fillText(l3, lx + 6, ly + 35);
      return; }
    rr(c, '#5a5d63', sx + 44, RGY - 112, 4, 112);
    [[o.up, RGY - 116, '#3f9a4a', '⬆ 위층'], [o.dn, RGY - 76, '#3f6fb5', R_UNDER[o.dn] ? '⬇ 지하' : '➡ 아래']].forEach(function (b) {
      var X = RMAP[b[0]]; rr(c, '#0d0f0a', sx - 2, b[1] - 2, 96, 34); rr(c, b[2], sx, b[1], 92, 30); rr(c, 'rgba(255,255,255,.25)', sx, b[1], 92, 2);
      c.font = '16px sans-serif'; c.fillStyle = '#fff'; c.fillText(X.emo, sx + 3, b[1] + 21);
      c.font = 'bold 8px sans-serif'; c.fillText(b[3], sx + 25, b[1] + 11); c.font = 'bold 10px sans-serif'; c.fillText(X.nm, sx + 25, b[1] + 24);
    });
    var ux = sx + 230;
    rArrow(c, ux + 6, RGY - R_T1 - 46, 'u', '#c6ff3d'); c.font = '14px sans-serif'; c.fillText(RMAP[o.up].emo, ux + 26, RGY - R_T1 - 30);
    rArrow(c, ux + 4, RGY - 30, 'r', '#ffffff'); c.fillText(RMAP[o.dn].emo, ux + 30, RGY - 16);
  });
  R.objs.forEach(function (o) {
    if (o.k === 'plat' || o.k === 'sign' || o.k === 'belt' || (o.done && !(o.sq > 0) && o.k !== 'ramp')) return;
    var sx = o.x - R.dist + RPX; if (sx < -60 || sx > RW + 20) return;
    var im = runImg(o), bob = R_VAL[o.k] || o.k === 'coffee' || o.k === 'box' ? Math.round(Math.sin(R.t * 6 + o.x) * 1.5) : 0;
    if (o.sq > 0) { c.drawImage(im, Math.round(sx - 2), Math.round(RGY - o.y - im.height / 3), im.width + 4, Math.round(im.height / 3)); return; }
    var fl = (o.k === 'mail' || o.k === 'pigeon') && Math.floor(R.t * 8) % 2 ? 1 : 0;
    if (o.k === 'hang') { var hy = Math.round(RGY - o.y - im.height); rr(c, '#5a5d63', Math.round(sx) + 2, 0, 1, hy); rr(c, '#5a5d63', Math.round(sx) + im.width - 3, 0, 1, hy); }
    c.drawImage(im, Math.round(sx), Math.round(RGY - o.y - im.height + bob - fl));
  });
  R.left = R.left.filter(function (L) { var sh = R.dist - L.x0; if (L.k === 'light') { if (!RM.light.prop(c, R, L.m, 1)) return false; return true; }
    if (sh > RW + 260) return false; c.save(); c.translate(-Math.round(sh), 0); RM[L.k].prop(c, R, L.m, Math.max(1, sh)); c.restore(); return true; });
  var crx = Math.round(R.crem || 0); if (m && (m.ph === 'play' || m.pre) && RM[m.k].draw) { if (crx) { c.save(); c.translate(crx, 0); } RM[m.k].draw(c, R, m); if (crx) c.restore(); }
  if (R.chase > 0) c.drawImage(RIMG.boss, Math.round(RPX - 46 + Math.sin(R.t * 3) * 6), RGY - 37 - (Math.floor(R.t * 8) % 2));

  var lines = (R.boost > 0 ? 6 : 0) + (R.onBelt ? 4 : 0) + Math.max(0, Math.round((R.spdx - 1.15) * 20));
  for (var k = 0; k < lines; k++) rr(c, 'rgba(255,255,255,.55)', RW - ((R.t * 600 + k * 53) % (RW + 40)), 20 + (k * 37) % (RGY - 30), 14 + (k % 3) * 6, 1);
  R.dust.forEach(function (d) { var a = 1 - d.t / .35; c.fillStyle = 'rgba(200,190,170,' + a + ')'; c.fillRect(Math.round(d.x), Math.round(d.y - d.t * 14), 3, 3); });
  var WC = R.card && R.card.wipe && R.card.t < R_WIPE ? R.card : null;
  if (WC) {
    var sn = WC.wipe, sk = sn.width / RW, pw = WC.t / R_WIPE;
    for (var wi = 0; wi < 14; wi++) {
      var lp = Math.max(0, Math.min(1, pw * 1.8 - (13 - wi) * (.8 / 13))), wv = Math.round(20 * (1 - lp));
      if (wv > 0) c.drawImage(sn, wi * 20 * sk, 0, wv * sk, sn.height, wi * 20, 0, wv, RH);
      if (wv > 0 && wv < 20) rr(c, 'rgba(13,15,10,.55)', wi * 20 + wv, 0, 1, RH);
    }
  }
  if (!R.noZ && !R.hideZ && !(R.inv > 0 && R.boost <= 0 && !R.card && Math.floor(R.el * 12) % 2)) {
    var fr = m && m.ph === 'play' && R_MINI[m.k].fr, mash = fr && /chase|board|elev|sale/.test(m.k);
    var onb = M.bike && !R.docked && !R.carry, bike = onb && R.stun <= 0, zy = Math.round(RGY - R.h - 37 - (bike ? 9 : 0));
    var hold = !R.air && R.held && m && (m.k === 'brake' || m.k === 'wind') || R.bstop > 0 && R.held;
    var im = WC ? RIMG.run[Math.floor(R.el * 14) % 4] : R.cd > 0 || (R.card && !(R.coast > 0)) || (fr && !mash && m.k !== 'rope' && m.k !== 'pedal') ? RIMG.stand : R.stun > 0 ? RIMG.hit : mash && m.k === 'sale' && m.t > .35 ? (m.grab > 0 ? RIMG.jump : RIMG.stand) : mash ? RIMG.run[Math.floor(R.el * 14) % 4]
      : bike ? RIMG.run[1] : hold ? RIMG.stand : R.air ? (R.v > -60 ? RIMG.jump : RIMG.run[0]) : m && m.k === 'light' && R.held ? RIMG.stand : R.bstop > 0 ? RIMG.stand : RIMG.run[Math.floor(R.dist / 11) % 4];
    var sx2 = 1, sy2 = 1;
    if (!REDUCE && !bike) { if (R.lift > 0) { sx2 = .9; sy2 = 1.1; } else if (R.land > 0) { sx2 = 1.14; sy2 = .86; } }
    var zx0 = RPX + Math.round(R.zx || 0), shw = Math.max(4, 12 - Math.min(8, R.h / 6));
    var hg = M.bike ? Math.round(runHillH(R, R.dist + 17)) : 0; shw = Math.max(4, 12 - Math.min(8, Math.max(0, R.h - hg) / 6)); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(zx0 + 17 - shw, RGY - 2 - hg, shw * 2, 2); c.fillRect(zx0 + 19 - shw, RGY - 3 - hg, shw * 2 - 4, 1);
    var tilt = hg > 0 && R.h - hg < 1.5 && !REDUCE ? -Math.atan(runHillSl(R)) : 0; if (tilt) { c.save(); c.translate(zx0 + 17, RGY - R.h); c.rotate(tilt); c.translate(-(zx0 + 17), -(RGY - R.h)); }
    if (sx2 === 1) c.drawImage(im, zx0, zy);
    else { var zw = Math.round(im.width * sx2), zh = Math.round(im.height * sy2); c.drawImage(im, Math.round(zx0 + (im.width - zw) / 2), zy + im.height - zh, zw, zh); }
    var BK = RIMG.obj.bike, bw = BK.width * 2, bh = BK.height * 2;
    if (bike) c.drawImage(BK, zx0 + 2, Math.round(RGY - R.h - bh), bw, bh);
    else if (onb) { c.save(); c.translate(zx0 - 26, RGY - Math.round(R.h)); c.scale(1, -1); c.drawImage(BK, 0, 0, bw, bh); c.restore(); }
    if (R.carry && M.bike) {
      var ca = Math.min(1, R.carry.t / .18), cb = Math.floor(R.dist / 11) % 2, cyb = Math.round(zy - bh + 6 - 4 * ca + cb);
      c.drawImage(BK, zx0 + 1, Math.round(RGY - R.h - bh) * (1 - ca) + cyb * ca, bw, bh);
      rr(c, '#2b2f3a', zx0 + 9, cyb + bh - 2, 2, zy + 14 - (cyb + bh - 2)); rr(c, '#2b2f3a', zx0 + 25, cyb + bh - 2, 2, zy + 14 - (cyb + bh - 2));
      var sw = (R.carry.t * 2.2) % 1; c.fillStyle = 'rgba(159,211,255,' + (1 - sw) + ')'; c.fillRect(zx0 - 2 - Math.round(sw * 6), zy + 4 - Math.round(sw * 4), 2, 3); c.fillRect(zx0 + 33 + Math.round(sw * 5), zy + 8 - Math.round(sw * 3), 2, 2);
    }
    if (tilt) c.restore();
    if (hold) { var gx = zx0 + 24, top = R.key === 'bus' ? 22 : Math.max(0, zy - 14); rr(c, '#9aa0a6', gx, top, 1, zy + 14 - top); rr(c, '#ffcf3d', gx - 2, zy + 12, 5, 3); }
  }
  if (/^(alley|bike|bridge|park|avenue|market)$/.test(R.key)) tile(R.dist, 1.45, 96, function (x, i) {
    if (ih(i, 33) < .45) return; var w = 10 + ih(i, 34) * 14; c.fillStyle = 'rgba(30,48,26,.55)';
    c.fillRect(Math.round(x), RH - 4, Math.round(w), 4); c.fillRect(Math.round(x + 2), RH - 7, 3, 3); c.fillRect(Math.round(x + w - 6), RH - 6, 3, 2); });
  if (m && (m.ph === 'play' || m.pre) && RM[m.k].front) { if (crx) { c.save(); c.translate(crx, 0); } RM[m.k].front(c, R, m); if (crx) c.restore(); }
  R.fx.forEach(function (f) { var a = 1 - f.t / .45; c.fillStyle = 'rgba(255,226,122,' + a + ')'; c.fillRect(Math.round(f.x - 1), Math.round(f.y - f.t * 30), 3, 3); c.fillRect(Math.round(f.x - 5), Math.round(f.y - f.t * 22 + 3), 2, 2); c.fillRect(Math.round(f.x + 4), Math.round(f.y - f.t * 26 + 2), 2, 2); });
  c.font = 'bold 13px sans-serif'; c.lineJoin = 'round'; c.textBaseline = 'alphabetic';
  R.pops.forEach(function (p) { var e = Math.min(1, p.t / .12), k = .6 + .55 * e - .15 * Math.max(0, Math.min(1, (p.t - .12) / .1)), a = Math.min(1, (.9 - p.t) / .25), w = c.measureText(p.s).width;
    var x = Math.max(2 + w * k / 2, Math.min(RW - 2 - w * k / 2, p.x + w / 2)), y = Math.max(16, p.y - 8 - (1 - Math.pow(1 - Math.min(1, p.t / .9), 2)) * 22);
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(Math.round(x), Math.round(y)); c.scale(k, k); c.textAlign = 'center';
    if (p.s.length > 5 && p.s.indexOf(' ') > 0) { c.fillStyle = 'rgba(13,15,10,.72)'; c.beginPath(); if (c.roundRect) c.roundRect(-w / 2 - 5, -12, w + 10, 16, 8); else c.rect(-w / 2 - 5, -12, w + 10, 16); c.fill(); }
    c.strokeStyle = 'rgba(13,15,10,.85)'; c.lineWidth = 3; c.strokeText(p.s, 0, 0); c.fillStyle = p.c; c.fillText(p.s, 0, 0); c.restore(); });
  if (!M.inn) runWx(c, R);
  else if (R.key === 'lobby') { var gxw = Math.round(R_GATE - R.dist + RPX) + 20; if (gxw > 0) { c.save(); c.beginPath(); c.rect(0, -R_XT.t, gxw, RH + R_XT.e); c.clip(); runWx(c, R); c.restore(); } }
  var dka = Math.min(1, (5 - R.dark) / .4, R.dark / .6), dk = R.dark > 0 ? [.9 * dka, 52 + (1 - dka) * 120] : M.dim ? [.8, 74] : null;
  if (dk) { var lcx = RPX + 17 + (M.dim ? 20 : 0), lcy = RGY - R.h - 18, lr = dk[1] * (REDUCE ? 1 : 1 + .03 * Math.sin(R.el * 6.3)), lg = c.createRadialGradient(lcx, lcy, lr * .45, lcx, lcy, lr * 1.25);
    lg.addColorStop(0, 'rgba(5,6,10,0)'); lg.addColorStop(.55, 'rgba(5,6,10,' + (dk[0] * .55) + ')'); lg.addColorStop(1, 'rgba(5,6,10,' + dk[0] + ')'); c.fillStyle = lg; c.fillRect(0, 0, RW, RH);
    if (M.dim && !R.dark) { var wg = c.createRadialGradient(lcx, lcy, 0, lcx, lcy, lr * .9); wg.addColorStop(0, 'rgba(255,214,140,.10)'); wg.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = wg; c.fillRect(0, 0, RW, RH); } }
  if (R.flash > 0) rr(c, 'rgba(232,65,44,' + (R.flash * 2) + ')', 0, 0, RW, RH);
  if (R.card) { var C = R.card, a = C.wipe ? (C.t < R_WIPE ? 0 : Math.min(1, (C.t - R_WIPE) / .25)) : C.t < .28 ? C.t / .28 : 1; if (C.t > C.dur - .28) a = Math.min(a, Math.max(0, (C.dur - C.t) / .28)); rr(c, 'rgba(13,15,10,' + (a * C.dark) + ')', 0, 0, RW, RH); }
  if (R.blink > 0) rr(c, 'rgba(13,15,10,' + Math.min(1, R.blink / .3) + ')', 0, 0, RW, RH); runFadeDraw(c);
  c.restore();
}


function runFinish() {
  var R = RUN; R.on = 0; cancelAnimationFrame(R.raf); document.documentElement.classList.remove('rn-play'); runMg(null); if ($('p-run')) $('p-run').style.minHeight = '';
  runEndPick(R); var ei = R.endEv, E = R_END[ei];
  var arr = runClock(R), late = arr > R_DUE, early = late ? 0 : Math.floor(R_DUE - arr);
  if (!late && R.dev && R.dev.fx.rain) { R.money += R.dev.fx.rain; R.log.push('☔ 비 오는 날 정시 도착 · 우산값 +' + R.dev.fx.rain + '만원'); }
  var money = Math.max(0, Math.min(PC.RUN_MONEY_MAX || 30000, Math.round(R.money))), bonus = late ? 0 : Math.min(PC.RUN_BONUS_MAX || 2000, 1000 + early * 50), score = money + bonus;
  var x = runRec() || {}, all = store.getJ('slp-runbest', null), newAll = !all || score > all.s, n = (x.n || 0) + 1, best = Math.max(score, x.best || 0), newDay = score > (x.best || 0) && n > 1;
  if (newAll) store.setJ('slp-runbest', { s: score, d: TODAY });
  var st = runStats(); st.n++; if (!late) st.ontime++; st.esc += R.esc; st.maxHits = Math.max(st.maxHits, R.hits); st.maxMoney = Math.max(st.maxMoney, money);
  st.wx[R.wx] = 1; R.route.forEach(function (k) { st.cnt[k] = (st.cnt[k] || 0) + 1; });
  st.end[['ceo', 'card', 'party', 'elev', 'hunter', 'coffee', 'home', 'room'][ei]] = 1; store.setJ('slp-runst', st);
  if (!late && !R.hits) award('commute'); if (arr < 8 * 60 + 50) award('early');
  if (R.ranked) { var T = runTry(); T.open = 0; store.setJ('slp-runtry', T); }
  sfx(late ? 'wrong' : 'fanfare');
  var S = { score: score, money: money, bonus: bonus, arr: hhmm(arr), late: late, early: early, hits: R.hits, kills: R.kills, near: R.near, combo: R.maxCombo, route: R.route, dest: R.dest, wx: R.wx, log: R.log,
    mres: R.mres, miss: runMiss(R, arr, late, st, score), ranked: R.ranked, end: E[0] + (E[1] ? ' +' + man(E[1]) + '만원' : '') + (E[2] ? ' ⏰ +' + E[2] + '분' : ''), newDay: newDay, newAll: newAll && !!all, all: newAll ? score : all.s, best: best, n: n };
  if (R.ranked) {
    $('run').innerHTML = '<p class="src" style="text-align:center;margin:40px 0">점수 보내는 중…</p>';
    submitDaily('run', { s: score, m: money, b: bonus, el: Math.round(R.el), h: R.hits }, { score: score, aux: late ? 0 : 1 }, { n: n, best: best, arr: hhmm(arr), route: R.route, rt: R.try || runTries(), sg: x.sg || R.sg })
      .then(function (y) { S.x = y; runResult(S); });
  } else {
    x.n = n; x.best = best; setRec(TODAY, 'run', x); S.x = x; runResult(S);
  }
}

var R_ROUTES = R_SLOTS.slice(1, 4).reduce(function (a, s) { return a.concat(s); }, []);
function runMiss(R, arr, late, st, score) {
  var mins = R.mres.filter(function (r) { return r[2] > 0; }).sort(function (a, b) { return b[2] - a[2]; }), mp = mins.reduce(function (a, r) { return a + r[2]; }, 0);
  var nm = function (k) { return R_MINI[k].nm.replace(/^\S+ /, ''); };
  if (late) {
    var lm = Math.ceil(arr - R_DUE), hm = R.hits * 2;
    if (R.hits && hm >= lm) { var nh = Math.ceil(lm / 2); return ['아까운 한 줄', '꽈당 ' + nh + '번(+' + nh * 2 + '분)만 덜 했으면 정시 보너스 +1,000만원이었어요.']; }
    if (mins.length && mins[0][2] >= lm) return ['아까운 한 줄', nm(mins[0][0]) + ' 실패(+' + mins[0][2] + '분)만 없었으면 정시 보너스 +1,000만원이었어요.'];
    if (hm + mp >= lm) { var nh2 = Math.ceil(Math.max(0, lm - mp) / 2); return ['아까운 한 줄', lm + '분 늦었어요. 미니게임 실패(+' + mp + '분) 없이 꽈당만 ' + nh2 + '번 덜 했으면 정시 +1,000만원이었어요.']; }
    return ['아까운 한 줄', lm + '분 늦었어요. 커피(☕)를 주우면 4초 동안 빨라져요.'];
  }
  var left = R_ROUTES.filter(function (k) { return !st.cnt[k]; });
  if (left.length) return ['다음 목표', '아직 안 가 본 길: ' + left.slice(0, 3).map(function (k) { return RMAP[k].nm; }).join('·') + ' (노선도 ' + (R_ROUTES.length - left.length) + '/' + R_ROUTES.length + ')'];
  if (R.hits) return ['다음 목표', '꽈당 ' + R.hits + '번만 피하면 칭호 「출근의 신」이에요.'];
  var up = null; FAM.forEach(function (c) { c.rk.forEach(function (v, i) { if (v > score && (!up || v < up.v)) up = { c: c, i: i, v: v }; }); });
  return up ? ['다음 목표', man(up.v - score) + '만원 더 주우면 ' + up.c.n + ' ' + RK[up.i] + ' 연봉(' + man(up.v) + '만원)'] : ['다음 목표', '이미 최고 연봉급! 꽈당 없이 더 일찍 도착해 봐요.'];
}
function runResult(S) {
  var D = S.dest, x = S.x || runRec() || {}, emo = S.route.map(function (k) { return RMAP[k].emo; }).join('→'), names = S.route.slice(1, 4).map(function (k) { return RMAP[k].nm; }).join(' · ');
  var best = null; FAM.forEach(function (c) { c.rk.forEach(function (v, i) { var d = Math.abs(v - S.score); if (!best || d < best.d) best = { c: c, i: i, v: v, d: d }; }); });
  var lo = Math.min.apply(null, FAM.map(function (c) { return c.rk[0]; }));
  var cmp = S.score < lo * .6 ? '아직 어느 회사 사원 연봉에도 한참 못 미쳐요. 다음 판엔 더 주워 봐요!' : '이 돈이면 <b>' + esc(best.c.n) + ' ' + RK[best.i] + '</b> 연봉(추정 ' + man(best.v) + '만원)쯤이에요.';
  var tips = S.late ? ['지각 한 번은 해프닝, 세 번이면 평판이에요.', '늦은 날일수록 인사는 더 밝게. 그게 경력이에요.', '다음엔 커피부터 챙겨요. 출근길도 전략이에요.']
    : S.hits ? ['넘어져도 9시 전에만 도착하면 돼요. 커리어도 그래요.', '꽈당은 몇 번 했지만 결국 도착. 그게 실력이에요.'] : ['한 번도 안 넘어졌어요. 이 정도면 출근의 신이에요.', '깔끔한 출근. 오늘 회의도 이렇게만 넘겨요.'];
  var tip = tips[Math.floor(Math.random() * tips.length)], mok = S.mres.filter(function (r) { return r[1]; }).length;
  $('run').innerHTML = '<div class="over"><span class="lv">조로 출근길 · ' + mmdd(TODAY) + ' · ' + (S.ranked ? '오늘의 코스' : '연습 판') + ' · ' + R_WX[S.wx][1] + ' ' + R_WX[S.wx][0] + '</span>' +
    stage(zorro(myRank(), S.late ? 'sad' : 'happy', 3, S.late ? 'oops' : 'jump') + bld(D, 3, null, 'grow'), 'resst', (S.late ? '지각한' : '정시 출근한') + ' 내 조로와 ' + D.n) + (S.ranked ? vsScene('run', x) : '') +
    '<div class="big">' + man(S.score) + '<small>만원</small></div>' +
    '<div class="ttl"><b>' + esc(D.n) + ' ' + (S.late ? '⏰ ' + S.arr + ' 지각!' : '⏰ ' + S.arr + ' 정시 출근') + '</b></div>' +
    (S.ranked ? rankBox('run', x) : '<p class="src" style="margin:0">연습 판은 순위에 안 올라가요' + (x.sent && x.rank ? ' · 오늘 순위 판 <b>' + man(x.rank) + '위</b> (' + man(x.score) + '만원)' : '') + '</p>') +
    '<p class="rn-route" aria-label="지나온 길">' + emo + '</p>' +
    '<p><b>도착하자마자</b> ' + esc(S.end) + '</p>' +
    '<p>주운 연봉 ' + man(S.money) + '만원' + (S.bonus ? ' + 정시 보너스 ' + man(S.bonus) + '만원' + (S.early ? ' (' + S.early + '분 일찍)' : '') : '') + '</p>' +
    '<p>🎮 미니게임 ' + mok + ' / ' + S.mres.length + ' 성공 · 🔥 최대 ' + S.combo + '콤보 · 👊 적 ' + S.kills + ' · 😮 아슬아슬 ' + S.near + ' · 💥 꽈당 ' + S.hits + '</p>' +
    (S.miss ? '<p class="rn-miss"><b>' + S.miss[0] + '</b> ' + esc(S.miss[1]) + '</p>' : '') +
    '<p>' + cmp + '</p>' + (S.ranked && x.sent != null ? '<p>⭐ 오늘 첫 출근 완주 · <b>경험치 +1</b></p>' : '') +
    '<p>' + (S.newAll ? '🎉 <b>역대 최고 기록!</b>' : S.newDay ? '🎉 <b>오늘 최고 기록!</b>' : '오늘 최고 ' + man(S.best) + '만원 (' + S.n + '판) · 역대 최고 ' + man(S.all) + '만원') + '</p>' +
    (S.log.length ? '<details class="more"><summary>오늘 출근길에 생긴 일 ' + S.log.length + '가지</summary><ul class="rn-log">' + S.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></details>' : '') +
    '<p><b>조로의 한마디</b> — ' + esc(tip) + '</p>' +
    gotBox('run') + shareBox('shRn', S.ranked ? vsBox('run', x) : '') + '<div class="row"><button class="btn" type="button" id="rnAgain">' + (runRanked() ? (runTries() ? '오늘의 코스 두 번째 도전 ▶' : '오늘의 코스 출근하기 ▶') : '연습 출근하기 ▶') + '</button>' + (runRanked() ? '<button class="btn" type="button" id="rnPrac">연습 한 판 더</button>' : '') + '</div>' + nextBtn('run') + week7('run') +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbR"></div></details>' +
    '<p class="src">연습 판은 출근 회사·날씨·길·사건이 매번 달라요. 내일 0시에 새 오늘의 코스가 열려요.</p></div>';
  $('rnAgain').onclick = function () { runStart(); }; if ($('rnPrac')) $('rnPrac').onclick = function () { runStart(1); };
  miniLb('lbR', 'run');
  wireShare('shRn', '연봉 놀이터 · 조로 출근길 ' + mmdd(TODAY) + '\n' + D.n + ' 출근 ' + R_WX[S.wx][1] + '\n' + emo + '\n💰 ' + man(S.score) + '만원 · 🎮 미니게임 ' + mok + '/' + S.mres.length + ' · ⏰ ' + S.arr + (S.late ? ' 지각' : ' 정시 출근') + '\n' + SITE_S + '/#run',
    { title: '조로 출근길', big: man(S.score) + '만원', sub: D.n + ' ⏰ ' + S.arr + (S.late ? ' 지각' : ' 정시 출근') + '\n' + names, lines: [emo.replace(/→/g, ' ')], px: { mood: S.late ? 'sad' : 'happy', co: D } });
}


if (!API_BASE) window.__run = { R: function () { return RUN; }, RM: RM, rec: function () { return runRec(); }, step: function () { runStep(R_DT); }, press: runPress, release: runRelease, start: runStart, ranked: runRanked, tries: runTries, RMAP: RMAP, RSPR: RSPR, SH_X: SH_X, draw: runDraw, hud: runHud, enter: function (k, sg) { RUN.seg = sg; RUN.mini = null; RUN.card = null; RUN.tr = null; RUN.out = null; RUN.fork = null; runMg(null); if ($('rnTc')) $('rnTc').hidden = true; runEnter(k); runHud(1); }, day: function (d) { TODAY = d; } };







var R3_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
var R3 = { on: false, want: true, D: 170, ex: 150, ey: 100, pool: {}, gid: 0, env: {}, cbs: [] };
try { R3.want = store.get('slp-run3d') !== '0'; } catch (e) {}
function r3Load(cb) {
  if (window.THREE) { if (cb) cb(); return; }
  if (cb) R3.cbs.push(cb); if (R3.loading) return; R3.loading = 1;
  var s = document.createElement('script'); s.src = R3_SRC; s.crossOrigin = 'anonymous';
  s.onload = function () { R3.cbs.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); }; s.onerror = function () { R3.fail = 1; };
  document.head.appendChild(s);
}
(function () {
  var st = document.createElement('style');
  st.textContent = '.rn-cv.r3 #rnC{position:relative;z-index:1;image-rendering:auto}.rn-cv.r3 #rn3{position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;image-rendering:auto}.rn-cv.r3>div{z-index:3}.rn-cv.r3.tr #rn3{z-index:2}.rn.xt .rn-cv.r3 #rnC{position:absolute}';
  document.head.appendChild(st);
}());


function r3Lin(v) { return Math.pow(v / 255, 2.2); }
var R3C = {};
function r3Col(s) {
  var c = R3C[s]; if (c !== undefined) return c;
  if (typeof s === 'string' && s[0] === '#') { var h = s.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h.slice(0, 6), 16); c = [r3Lin(n >> 16), r3Lin((n >> 8) & 255), r3Lin(n & 255)]; } else c = null;
  R3C[s] = c; return c;
}
function r3Batch(mat, cap, shadow) {
  var T = THREE, g = new T.BoxGeometry(1, 1, 1); g.translate(.5, .5, .5);
  var m = new T.InstancedMesh(g, mat, cap); m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  m.frustumCulled = false; m.castShadow = !!shadow; m.receiveShadow = !!shadow; m.count = 0;
  m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.instanceColor.setUsage(T.DynamicDrawUsage);
  return { m: m, n: 0, cap: cap };
}
function r3Init() {
  if (R3.rd) return true; var T = window.THREE; if (!T || R3.fail) return false;
  try {
    var cv = document.createElement('canvas'); cv.id = 'rn3';
    var rd = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    rd.outputEncoding = T.sRGBEncoding; rd.shadowMap.enabled = true; rd.shadowMap.type = T.PCFSoftShadowMap;
    var coarse = false; try { coarse = matchMedia('(pointer:coarse)').matches; } catch (e) {}
    var sc = new T.Scene(), cam = new T.Camera();
    var hemi = new T.HemisphereLight(0xffffff, 0x8f8a7c, .8), sun = new T.DirectionalLight(0xfff1d6, .85), pt = new T.PointLight(0xffd68c, 0, 210, 1.2);
    sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    var s = sun.shadow.camera; s.left = -280; s.right = 280; s.top = 230; s.bottom = -230; s.near = 40; s.far = 1100; sun.shadow.bias = -.0012; sun.shadow.normalBias = .5;
    sun.target.position.set(140, 20, -30); sc.add(hemi, sun, sun.target, pt);
    R3.S = r3Batch(new T.MeshLambertMaterial(), 9000, 1);
    R3.G = r3Batch(new T.MeshBasicMaterial(), 3000, 0);
    R3.A = r3Batch(new T.MeshLambertMaterial({ transparent: true, opacity: .42, depthWrite: false }), 400, 0);
    R3.A.m.renderOrder = 2; sc.add(R3.S.m, R3.G.m, R3.A.m);
    var sg = new T.PlaneGeometry(9000, 3400, 1, 2); sg.setAttribute('color', new T.BufferAttribute(new Float32Array(18), 3));
    R3.sky = new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false })); R3.sky.position.set(140, 1550, -2600); R3.sky.renderOrder = -1; sc.add(R3.sky);
    R3.smat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
    R3.sgrp = new T.Group(); sc.add(R3.sgrp);
    sc.fog = new T.Fog(0xdfeeff, 320, 1900); sc.background = new T.Color(0x0d0f0a);
    R3.rd = rd; R3.el = cv; R3.sc = sc; R3.cam = cam; R3.hemi = hemi; R3.sun = sun; R3.pt = pt;
    var n = parseInt(String(PX.tok('--px-ol', '#1b1d18')).replace('#', '').slice(0, 6), 16); R3.ol = [n >> 16, (n >> 8) & 255, n & 255];
    R3.c = r3Ctx();
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); R3.on = false; R3.fail = 1; r3Unmount(); var t = $('rn3T'); if (t) t.hidden = true; if (RUN && RUN.on && RUN.pause) runDraw(); });
    return true;
  } catch (e) { R3.fail = 1; try { console.warn('run3d', e); } catch (x) {} return false; }
}
function r3Mount() {
  var box = $('rnCv'), cv = $('rnC'); if (!box || !cv) return;
  R3.on = R3.want && r3Init();
  var hp = $('rnTb');
  if (hp && !$('rn3T') && !R3.fail) { var b = document.createElement('button'); b.type = 'button'; b.id = 'rn3T'; hp.insertBefore(b, hp.firstChild);
    b.onclick = function () { R3.want = !R3.want; try { store.set('slp-run3d', R3.want ? '1' : '0'); store.set('slp-run3dk', R3.want ? '1' : ''); } catch (e) {}
      var go = function () { r3Mount(); if (RUN && RUN.on && RUN.pause) runDraw(); toast(R3.want && !R3.on ? '이 기기에선 3D 그래픽을 켤 수 없어요' : R3.want ? '3D 그래픽으로 바꿨어요' : '도트 그래픽으로 바꿨어요'); };
      if (R3.want && !window.THREE) { r3Load(go); setTimeout(function () { if (!window.THREE && R3.want) { R3.fail = 1; go(); } }, 8000); } else go(); }; }
  if ($('rn3T')) { $('rn3T').textContent = R3.want ? '3D' : '도트'; $('rn3T').title = R3.want ? '그래픽: 3D (누르면 도트로)' : '그래픽: 도트 (누르면 3D로)'; $('rn3T').setAttribute('aria-label', $('rn3T').title); }
  if ($('rn3T') && R3.fail) $('rn3T').hidden = true;
  if (!R3.on) { r3Unmount(); return; }
  box.classList.add('r3'); if (R3.el.parentNode !== box) box.insertBefore(R3.el, cv);
}
function r3Unmount() { var box = $('rnCv'); if (box) box.classList.remove('r3', 'tr'); if (R3.el && R3.el.parentNode) R3.el.parentNode.removeChild(R3.el); var cv = $('rnC'); if (cv) cv.width = RW; }
function r3Size(cv) {
  var cw = cv.clientWidth || RW, dpr = Math.min(window.devicePixelRatio || 1, R3.dpr || 2), w = Math.max(RW, Math.round(cw * dpr)), h = Math.round(w * (RH + R_XT.e) / RW);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  if (R3.w !== w || R3.h !== h) { R3.w = w; R3.h = h; R3.rd.setSize(w, h, false); }
  return w / RW;
}


function r3Put(B, col, x, y, z, w, h, d) {
  var c = r3Col(col); if (!c || B.n >= B.cap) return;
  if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
  if (R3.cl != null && x < R3.cl) { w -= R3.cl - x; x = R3.cl; } if (R3.cr != null && x + w > R3.cr) w = R3.cr - x;
  if (!(w > 0 && h > 0 && d > 0)) return;
  var a = B.m.instanceMatrix.array, o = B.n * 16, k = B.m.instanceColor.array, q = B.n * 3;
  a[o] = w; a[o + 5] = h; a[o + 10] = d; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  k[q] = c[0]; k[q + 1] = c[1]; k[q + 2] = c[2]; B.n++;
}
function r3B(col, x, y, z, w, h, d) { r3Put(R3.S, col, x, y, z, w, h, d); }
function r3G(col, x, y, z, w, h, d) { r3Put(R3.G, col, x, y, z, w, h, d); }
function r3A(col, x, y, z, w, h, d) { r3Put(R3.A, col, x, y, z, w, h, d); }

function r3Row(cam, P, z, fn, pad) {
  var k = (R3.D - z) / R3.D, x0 = R3.ex - R3.ex * k - (pad || 0) - P, x1 = R3.ex + (RW - R3.ex) * k + (pad || 0);
  for (var i = Math.floor((cam - RPX + x0) / P), i1 = Math.ceil((cam - RPX + x1) / P); i <= i1; i++) fn(i * P - cam + RPX, i);
}
function r3Flr(col, z0, z1, y) { var xr = 260 + Math.max(0, -z0) * 1.3; r3B(col, -xr, (y || 0) - 30, z0, 2 * xr + RW, 30, z1 - z0); }


function r3Geo(im, dep) {
  var C = im.__g3 || (im.__g3 = {}); if (C[dep]) return C[dep];
  var w = im.width, h = im.height, d;
  try { d = im.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
  var OL = R3.ol, hd = new Float32Array(w * h), x, y, i;
  var A = function (xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3] > 127; };

  var E = function (xx, yy) { return !A(xx - 1, yy) || !A(xx + 1, yy) || !A(xx, yy - 1) || !A(xx, yy + 1); }, cnt = {}, tot = 0, best = '', bn = 0, key;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (A(x, y) && E(x, y)) { i = (y * w + x) * 4; key = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; cnt[key] = (cnt[key] || 0) + 1; tot++; if (cnt[key] > bn) { bn = cnt[key]; best = key; } }
  if (bn >= tot * .6) OL = best.split(',').map(Number);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) { if (!A(x, y)) continue; i = (y * w + x) * 4;
    if (d[i] === OL[0] && d[i + 1] === OL[1] && d[i + 2] === OL[2] && E(x, y)) continue;
    hd[y * w + x] = 1; }
  var S = function (xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h ? hd[yy * w + xx] : 0; }, h2 = new Float32Array(w * h);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (hd[y * w + x]) h2[y * w + x] = dep * (dep > 2.5 && (!S(x - 1, y) || !S(x + 1, y) || !S(x, y - 1) || !S(x, y + 1)) ? .34 : .5);
  var H = function (xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h ? h2[yy * w + xx] : 0; };
  var pos = [], nor = [], col = [], idx = [], r, g, b;
  var quad = function (p, nx, ny, nz) { var n0 = pos.length / 3; for (var q = 0; q < 12; q += 3) { pos.push(p[q], p[q + 1], p[q + 2]); nor.push(nx, ny, nz); col.push(r, g, b); } idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3); };
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var z = h2[y * w + x]; if (!z) continue; i = (y * w + x) * 4; r = r3Lin(d[i]); g = r3Lin(d[i + 1]); b = r3Lin(d[i + 2]);
    var X0 = x - w / 2, X1 = X0 + 1, Y1 = h / 2 - y, Y0 = Y1 - 1;
    quad([X0, Y0, z, X1, Y0, z, X1, Y1, z, X0, Y1, z], 0, 0, 1); quad([X1, Y0, -z, X0, Y0, -z, X0, Y1, -z, X1, Y1, -z], 0, 0, -1);
    [[1, 0], [-1, 0], [0, -1], [0, 1]].forEach(function (D) {
      var zn = H(x + D[0], y + D[1]); if (zn >= z) return;
      (zn ? [[zn, z], [-z, -zn]] : [[-z, z]]).forEach(function (Z) { var a = Z[0], c = Z[1];
        if (D[0] === 1) quad([X1, Y0, c, X1, Y0, a, X1, Y1, a, X1, Y1, c], 1, 0, 0);
        else if (D[0] === -1) quad([X0, Y0, a, X0, Y0, c, X0, Y1, c, X0, Y1, a], -1, 0, 0);
        else if (D[1] === -1) quad([X0, Y1, c, X1, Y1, c, X1, Y1, a, X0, Y1, a], 0, 1, 0);
        else quad([X0, Y0, a, X1, Y0, a, X1, Y0, c, X0, Y0, c], 0, -1, 0); });
    });
  }
  var T = THREE, G = new T.BufferGeometry();
  G.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); G.setAttribute('color', new T.Float32BufferAttribute(col, 3)); G.setIndex(idx);
  return (C[dep] = { geo: G, id: ++R3.gid, dep: dep });
}

function r3Spr(im, x, y, z, o) {
  o = o || {}; var G = im && r3Geo(im, o.dep || 5); if (!G) return;
  var P = R3.pool[G.id] || (R3.pool[G.id] = { l: [], n: 0, g: G }), ms = P.l[P.n];
  if (!ms) { ms = new THREE.Mesh(G.geo, R3.smat); ms.receiveShadow = true; ms.frustumCulled = false; R3.sgrp.add(ms); P.l.push(ms); }
  P.n++; var sx = o.sx == null ? 1 : o.sx, sy = o.sy == null ? 1 : o.sy, W = im.width * Math.abs(sx), H = im.height * Math.abs(sy);
  ms.visible = true; ms.castShadow = !o.ns; ms.position.set(x + W / 2, RGY - y - H / 2, z); ms.scale.set(sx, sy, o.sz || Math.max(Math.abs(sx), .01)); ms.rotation.set(0, o.ry || 0, o.rz || 0);
}
function r3Free() { for (var k in R3.pool) { var P = R3.pool[k]; P.l.forEach(function (m) { R3.sgrp.remove(m); }); P.g.geo.dispose(); } R3.pool = {}; }



var R3Z = { z: 0, d: 4, sd: 3 };
function r3Z(z, d, sd) { R3Z.z = z; R3Z.d = d || 4; R3Z.sd = sd || 3; }
function r3P(x, y, z) { var s = R3.D / (R3.D - z), vx = R3.ex, vy = RGY - R3.ey; return [vx + (x - vx) * s, vy + (y - vy) * s, s]; }
function r3Ctx() {
  var c = {}, S = [], m = { a: 1, d: 1, e: 0, f: 0 }, fs = '#000';
  var O = function () { return R3.oc; };
  ['strokeStyle', 'font', 'textAlign', 'textBaseline', 'lineWidth', 'lineJoin', 'globalAlpha', 'imageSmoothingEnabled'].forEach(function (p) { Object.defineProperty(c, p, { get: function () { return O()[p]; }, set: function (v) { O()[p] = v; } }); });
  Object.defineProperty(c, 'fillStyle', { get: function () { return fs; }, set: function (v) { fs = v; } });
  var ax = function (x) { return m.a * x + m.e; }, ay = function (y) { return m.d * y + m.f; }, pt = function (x, y) { return r3P(ax(x), ay(y), R3Z.z); };
  c.reset = function () { S = []; m = { a: 1, d: 1, e: 0, f: 0 }; };
  c.save = function () { S.push({ a: m.a, d: m.d, e: m.e, f: m.f }); O().save(); };
  c.restore = function () { var q = S.pop(); if (q) m = q; O().restore(); };
  c.translate = function (x, y) { m.e += m.a * x; m.f += m.d * y; };
  c.scale = function (x, y) { m.a *= x; m.d *= y; };
  c.rotate = c.setTransform = c.clip = c.clearRect = function () {};
  c.fillRect = function (x, y, w, h) {
    var X = ax(x), Y = ay(y), W = m.a * w, H = m.d * h;
    if (typeof fs === 'string' && fs[0] === '#' && O().globalAlpha > .98) {
      if (X <= 0 && X + W >= RW) { X -= 70; W += 140; } else if (X + W >= RW) W += 70; if (Y <= 0 && Y + H >= RH) { Y -= 40 + R_XT.t * 1.2; H += 80 + R_XT.e * 1.2; }
      R3Z.z += .04; r3Put(R3.S, fs, X, RGY - Y - H, R3Z.z - R3Z.d, W, H, R3Z.d); return; }
    var p = r3P(X, Y, R3Z.z), o = O(); o.fillStyle = fs; if (W >= RW && H >= RH) o.fillRect(-20, -20, RW + 40, RH + 40); else o.fillRect(p[0], p[1], W * p[2], H * p[2]);
  };
  c.drawImage = function (im, a, b, w, h, e, f, g, i) {
    var n = arguments.length, o = O();
    if (n >= 9) { var p9 = r3P(ax(e), ay(f), R3Z.z); o.drawImage(im, a, b, w, h, p9[0], p9[1], m.a * g * p9[2], m.d * i * p9[2]); return; }
    var W = m.a * (n >= 5 ? w : im.width), H = m.d * (n >= 5 ? h : im.height), X = ax(a), Y = ay(b);
    if (im && im.getContext && im.width * im.height <= 5000 && o.globalAlpha > .98) {
      var sx = W / im.width, sy = H / im.height; if (W < 0) X += W; if (H < 0) Y += H;
      var dw = R3Z.sd * Math.abs(sx); r3Spr(im, X, Y, R3Z.z + dw / 2 + .05, { dep: R3Z.sd, sx: sx, sy: sy }); R3Z.z += dw + .1; return; }
    var p = r3P(X, Y, R3Z.z); try { o.drawImage(im, p[0], p[1], W * p[2], H * p[2]); } catch (x) {}
  };
  var txt = function (fn) { return function (t, x, y, mw) { var p = pt(x, y), o = O(); o.save(); o.translate(p[0], p[1]); o.scale(p[2] * Math.abs(m.a), p[2] * Math.abs(m.d)); o.fillStyle = fs; if (mw != null) o[fn](t, 0, 0, mw); else o[fn](t, 0, 0); o.restore(); }; };
  c.fillText = txt('fillText'); c.strokeText = txt('strokeText');
  c.measureText = function (t) { return O().measureText(t); };
  c.beginPath = function () { O().beginPath(); }; c.closePath = function () { O().closePath(); };
  c.moveTo = function (x, y) { var p = pt(x, y); O().moveTo(p[0], p[1]); }; c.lineTo = function (x, y) { var p = pt(x, y); O().lineTo(p[0], p[1]); };
  c.quadraticCurveTo = function (a, b, x, y) { var p = pt(a, b), q = pt(x, y); O().quadraticCurveTo(p[0], p[1], q[0], q[1]); };
  c.arc = function (x, y, r, a0, a1) { var p = pt(x, y); O().arc(p[0], p[1], r * p[2], a0, a1); };
  c.rect = function (x, y, w, h) { var p = pt(x, y); O().rect(p[0], p[1], m.a * w * p[2], m.d * h * p[2]); };
  c.roundRect = function (x, y, w, h, r) { var p = pt(x, y), o = O(); if (o.roundRect) o.roundRect(p[0], p[1], m.a * w * p[2], m.d * h * p[2], r); else o.rect(p[0], p[1], m.a * w * p[2], m.d * h * p[2]); };
  c.fill = function () { var o = O(); o.fillStyle = fs; o.fill(); }; c.stroke = function () { O().stroke(); };
  c.createLinearGradient = function (a, b, x, y) { return O().createLinearGradient(a, b, x, y); };
  c.createRadialGradient = function (a, b, r, x, y, q) { return O().createRadialGradient(a, b, r, x, y, q); };
  return c;
}


function r3Env(kind, top, bot) { var E = R3.env; E.kind = kind; E.top = top; E.bot = bot || top; }
function r3Mix(a, b, t) { return a + (b - a) * t; }



var R3_WX = {
  rain: [.86, .4, '#9db4cf', 330, 1500, '#6887ad', '#b3c6db', [.82, .9, 1], [.86, .92, 1]],
  snow: [.86, .55, '#e4edf6', 320, 1500, '#a9c4e0', '#edf4fa', [.95, .97, 1], [1, .97, .93]],
  fog: [.8, .4, '#e6eaee', 235, 640, '', '', [1, 1, 1], [1, 1, 1]],
  dust: [.8, .58, '#e0d4b0', 280, 1300, '#cdbf93', '#eadfbd', [1, .97, .9], [1, .93, .8]]
};
function r3EnvApply(R) {
  var T = THREE, E = R3.env, out = E.kind === 'out', dim = E.kind === 'dim', wx = out ? R.wx : '', M = RMAP[R.key], W = R3_WX[wx];
  var dka = R.dark > 0 ? Math.min(1, (5 - R.dark) / .4, R.dark / .6) : dim ? 1 : 0;
  var hI = out ? .78 : .9, sI = out ? .85 : .38, fc = E.bot, fn = out ? 330 : 900, ff = out ? 1900 : 6000, hc = [1, 1, 1], sc = [1, out ? .945 : .98, out ? .84 : .95];
  if (W) { hI = W[0]; sI = W[1]; fc = W[2]; fn = W[3]; ff = W[4]; hc = W[7]; sc = W[8]; }
  var k = dka, dc = r3Col('#07080c'), c0 = r3Col(fc) || dc, bg = r3Col(E.top) || dc;
  R3.hemi.intensity = r3Mix(hI, .2, k); R3.sun.intensity = r3Mix(sI, .03, k);
  R3.hemi.color.setRGB(hc[0], hc[1], hc[2]); R3.sun.color.setRGB(sc[0], sc[1], sc[2]);
  var sd = out ? [-.5, 1, .62] : [-.12, 1, .5]; R3.sun.position.set(140 + sd[0] * 520, 20 + sd[1] * 520, -30 + sd[2] * 520);
  R3.pt.intensity = k * 2.1; R3.pt.position.set(RPX + 17 + (R.zx || 0) + (M.dim ? 22 : 0), R.h + 30, 26);
  R3.sc.fog.color.setRGB(r3Mix(c0[0], dc[0], k), r3Mix(c0[1], dc[1], k), r3Mix(c0[2], dc[2], k)); R3.sc.fog.near = r3Mix(fn, 215, k); R3.sc.fog.far = r3Mix(ff, 470, k);
  var sky = out && wx !== 'fog';
  R3.sky.visible = sky && !R3.only;
  if (sky) { var a = R3.sky.geometry.attributes.color, t = r3Col(W ? W[5] : E.top), b = r3Col(W ? W[6] : E.bot), d = [t[0] * .72, t[1] * .82, t[2] * .96];
    [d, d, t, t, b, b].forEach(function (q, i) { a.setXYZ(i, r3Mix(q[0], dc[0], k), r3Mix(q[1], dc[1], k), r3Mix(q[2], dc[2], k)); }); a.needsUpdate = true; }
  if (R3.only) { R3.sc.background = null; R3.rd.setClearColor(0, 0); }
  else { if (!R3.bgc) R3.bgc = new T.Color(); var bb = sky ? c0 : out ? c0 : bg; R3.bgc.setRGB(r3Mix(bb[0], dc[0], k), r3Mix(bb[1], dc[1], k), r3Mix(bb[2], dc[2], k)); R3.sc.background = R3.bgc; }
}
function r3Begin(R, cv) {
  if (R3.img !== RIMG) { r3Free(); R3.img = RIMG; }
  var k = r3Size(cv), oc = cv.getContext('2d'); rHR(oc); rXt(oc); R3.oc = oc; R3.k = k;
  oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, cv.width, cv.height); oc.setTransform(k, 0, 0, k, 0, R_XT.t * k);
  oc.imageSmoothingEnabled = false; oc.globalAlpha = 1; oc.textAlign = 'left'; oc.textBaseline = 'alphabetic';
  R3.S.n = R3.G.n = R3.A.n = 0; for (var q in R3.pool) R3.pool[q].n = 0;
  R3.cl = R3.cr = null; R3.only = 0; R3.c.reset(); r3Z(0);
  var ty = 100 + Math.min(40, R.h || 0) * .14; R3.ey += (ty - R3.ey) * .12; R3.ex = REDUCE ? 150 : 150 + Math.sin((R.el || 0) * .45) * 5;
  return oc;
}
function r3End(R) {
  var T = THREE, D = R3.D, n = 30, ex = R3.ex, ey = R3.ey, sa = Math.min(1, R.shake / .2), sh = R.shake > 0 && !R3.only ? Math.sin(R.t * 70) * 4 * sa : 0, shy = R.shake > 0 && !R3.only ? Math.cos(R.t * 55) * 2 * sa : 0;
  r3EnvApply(R);
  [R3.S, R3.G, R3.A].forEach(function (B) { var m = B.m; m.count = R3.only ? 0 : B.n; m.instanceMatrix.updateRange.count = B.n * 16; m.instanceColor.updateRange.count = B.n * 3; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
  for (var q in R3.pool) { var P = R3.pool[q]; for (var i = P.n; i < P.l.length; i++) P.l[i].visible = false; }
  var cam = R3.cam; cam.position.set(ex - sh, ey + shy, D);
  cam.projectionMatrix.makePerspective((0 - ex) * n / D, (RW - ex) * n / D, (RGY + R_XT.t - ey) * n / D, (RGY - RH - R_XT.b - ey) * n / D, n, 5200); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  var box = $('rnCv'); if (box) box.classList.toggle('tr', !!R3.only);
  R3.rd.render(R3.sc, cam);
}


function r3Tree(x, z, s, sn) {
  r3B('#7a5a3a', x - 2 * s, 0, z - 2 * s, 4 * s, 22 * s, 4 * s); r3B(sn ? '#4f7a5a' : '#3f9a4a', x - 12 * s, 20 * s, z - 12 * s, 24 * s, 22 * s, 24 * s); r3B(sn ? '#f4f8fb' : '#56b04a', x - 8 * s, 42 * s, z - 8 * s, 16 * s, 7 * s, 16 * s);
  if (sn) r3B('#f4f8fb', x - 12 * s, 41 * s, z - 12 * s, 24 * s, 2 * s, 24 * s);
}
function r3Car(x, z, col, back) {
  r3B(col, x, 4, z, 42, 11, 18); r3B('#bfe6ff', x + 9, 15, z + 1.5, 22, 8, 15); r3B(col, x + 8, 22.5, z + 1, 24, 1.5, 16);
  r3B('#1b1d18', x + 5, 0, z - .6, 8, 8, 19.2); r3B('#1b1d18', x + 29, 0, z - .6, 8, 8, 19.2);
  r3G(back ? '#ffe27a' : '#e8412c', x - .4, 9, z + 2, .6, 3, 3); r3G(back ? '#e8412c' : '#ffe27a', x + 41.8, 9, z + 2, .6, 3, 3);
}
function r3Skyline(cam, z, P, col, h0, hv, sd) { r3Row(cam, P, z, function (x, i) { var h = h0 + ih(i, sd) * hv; r3B(col, x, 0, z - 40, P * .72, h, 40); if (ih(i, sd + 1) < .3) r3B(col, x + P * .2, h, z - 30, P * .3, h * .18, 20); }); }
function r3Bld(i, x, z, s) { var n = RIMG.bld.length; if (!n) return; var b = RIMG.bld[((i % n) + n) % n]; r3Spr(b, x, RGY - b.height * s, z, { sx: s, sy: s, dep: 6 }); }
function r3Clouds(R) { r3Row(R.dist * .25 + R.t * 9, 420, -900, function (x, i) { var y = 300 + ih(i, 31) * 130, w = 120 + ih(i, 32) * 110; r3G('#ffffff', x, y, -900, w, 22, 40); r3G('#ffffff', x + w * .2, y + 20, -894, w * .45, 16, 30); }); r3G('#fff4c2', 430, 440, -1200, 80, 80, 3); }
function r3Joints(cam, P, col, z0, z1) { r3Row(cam, P, 0, function (x) { r3B(col, x, 0, z0, .7, .14, z1 - z0); }); }
var R3BG = {
  alley: function (R, cam) {
    r3Env('out', '#9fcfff', '#e4f2ff');
    r3Flr('#6d6f73', -16, 46); r3B('#a9abaf', -300, 0, -19, 900, 2, 3); r3Flr('#b9b2a6', -50, -19, 1.2); r3Flr('#aab19f', -2400, -50);
    r3Row(cam, 40, 16, function (x) { r3B('#e9e9e9', x, 0, 15, 18, .14, 2); });
    r3Row(cam, 96, -50, function (x, i) {
      var st = ih(i, 6) < .3;
      if (st) { r3B('#e9e4da', x + 6, 0, -66, 68, 80, 18); r3B('#2f7a3a', x + 4, 67, -48.5, 72, 11, 2.5); r3G('#ffffff', x + 14, 71, -45.9, 22, 3, .3); r3G('#c6ff3d', x + 52, 70, -45.9, 14, 4, .3); r3G('#d9f1ff', x + 10, 2, -47.8, 60, 60, .5); r3B('#9fb9c9', x + 39, 2, -47.5, 2, 60, .6); r3B('#cdbfae', x, 0, -54, 6, 60, 6); r3B('#cdbfae', x + 74, 0, -54, 22, 60, 6); }
      else { r3B('#cdbfae', x, 0, -54, 96, 60, 6); for (var k = 0; k < 6; k++) r3B('#bfb09f', x, 8 + k * 9, -47.9, 96, 1, .2); }
      r3B('#b3a492', st ? x + 74 : x, 60, -55, st ? 22 : 96, 4, 8);
      r3B('#5a5d63', x + 82, 0, -22, 2.5, 92, 2.5); r3B('#5a5d63', x + 76, 90, -22, 9, 2, 2.5); r3G('#ffe27a', x + 74, 87, -23, 9, 3, 5);
    });
    r3Row(cam, 118, -160, function (x, i) { var h = 78 + ih(i, 1) * 60, col = ['#e9c9a8', '#d9b8a0', '#c9d3c0', '#e2d1b8'][Math.floor(ih(i, 2) * 4)];
      r3B(col, x, 0, -200, 92, h, 52); r3B(['#b5523b', '#4f6f93', '#7a5a3a'][Math.floor(ih(i, 3) * 3)], x - 5, h, -204, 102, 10, 60);
      (ih(i, 4) < .6 ? r3G : r3B)(ih(i, 4) < .6 ? '#fff3b0' : '#8a94a6', x + 14, h - 34, -147.8, 18, 18, .5); (ih(i, 5) < .5 ? r3G : r3B)(ih(i, 5) < .5 ? '#fff3b0' : '#8a94a6', x + 56, h - 34, -147.8, 18, 18, .5); });
    r3Skyline(cam, -620, 100, '#b3c4d8', 130, 240, 71);
  },
  bus: function (R, cam, t) {
    if (!R.onBus) return R3BG.busstop(R, cam, t);
    r3Env('in', '#efe6d2');
    r3B('#4f5359', -300, -30, -38, 900, 30, 90); r3Row(cam, 8, 0, function (x) { r3B('#5f646b', x, 0, -36, 4, .14, 80); });
    r3G('#bfe3ff', -900, -40, -640, 2200, 600, 2); r3Row(cam * 2.6, 170, -230, function (x, i) { r3Bld(i, x, -230, 7); }); r3Row(cam * 3.2, 140, -120, function (x, i) { if (ih(i, 7) < .5) r3Tree(x, -120, 1.5, rSnow()); });
    r3B('#8d8f8a', -900, -40, -640, 2200, 40, 560);
    r3B('#efe6d2', -300, 0, -40, 900, 70, 2); r3B('#efe6d2', -300, 136, -40, 900, 30, 2); r3B('#b3a68b', -300, 66, -39, 900, 5, 3.5); r3A('#bfe6ff', -300, 70, -39.4, 900, 66, .5);
    r3Row(cam, 70, -38, function (x) { r3B('#c8bba0', x, 70, -40, 12, 66, 2.5); r3B('#3f6fb5', x + 14, 34, -36, 50, 26, 6); r3B('#2f5a96', x + 12, 26, -36, 54, 8, 18); r3B('#5a5d63', x + 18, 0, -30, 3, 26, 3); r3B('#5a5d63', x + 57, 0, -30, 3, 26, 3); });
    r3Row(cam, 140, -20, function (x) { r3B('#ffcf3d', x + 40, 0, -20, 2.5, 150, 2.5); r3G('#e8412c', x + 39, 82, -20.5, 4.5, 4, 3.5); });
    r3B('#9aa0a6', -300, 147, -8, 900, 2, 2); r3Row(cam, 28, -8, function (x) { r3B('#9aa0a6', x + 12, 141, -7.5, 1, 6, 1); r3B('#ffcf3d', x + 10, 136, -7.5, 5, 5, 1); });
    r3B('#e2d8c2', -300, 158, -40, 900, 6, 90); r3Row(cam, 90, -20, function (x) { r3G('#fff8d8', x + 20, 157, -24, 40, 1, 8); });
  },
  busstop: function (R, cam) {
    r3Env('out', '#a9d6ff', '#e2f2ff'); var sn = rSnow();
    r3Flr('#d8d2c6', -30, 46); r3Joints(cam, 16, '#c4bdb0', -30, 46); r3B('#b5b0a5', -400, 0, -33, 1100, 3, 3); r3Flr('#6d6f73', -130, -33, -2); r3Flr('#b8b3a8', -2400, -130);
    r3Row(cam, 44, -80, function (x) { r3B('#e9e9e9', x, -2, -82, 20, .14, 2); });
    var q = (R.el * 70 + cam * .2) % 900; r3Car(520 - q, -66, '#3f6fb5', 1); r3Car((q * 1.2) % 900 - 260, -104, '#e8e4da', 0); r3Car(900 - q, -66, '#c0392b', 1);
    r3Row(cam, 130, -200, function (x, i) { r3Bld(i, x, -200, 7); }); r3Skyline(cam, -560, 110, '#b9c9db', 120, 260, 73);
    r3Row(cam, 520, -26, function (x) { r3B('#2b2f3a', x + 16, 72, -30, 104, 5, 24); r3A('#bfe6ff', x + 26, 28, -29, 84, 44, .6); r3B('#5a5d63', x + 22, 0, -29, 3, 72, 3); r3B('#5a5d63', x + 111, 0, -29, 3, 72, 3); r3B('#8a6a4a', x + 34, 18, -27, 60, 4, 11); r3B('#5a5d63', x + 38, 0, -24, 3, 18, 3); r3B('#5a5d63', x + 87, 0, -24, 3, 18, 3);
      r3B('#5a5d63', x + 134, 0, -24, 2, 76, 2); r3B('#3f9a4a', x + 124, 74, -24.5, 22, 14, 3); var p = r3P(x + 127, RGY - 78, -21.4), o = R3.oc; o.font = 'bold ' + 8 * p[2] + 'px sans-serif'; o.fillStyle = '#fff'; o.fillText('BUS', p[0], p[1]); });
    r3Row(cam, 180, -36, function (x, i) { if (i % 3) r3Tree(x + 150, -40, .9, sn); });
  },
  subway: function (R, cam, t) {
    if (!R.inTrain) return R3BG.platform(R, cam, t);
    r3Env('in', '#e3e7ec');
    r3B('#9aa0a8', -300, -30, -34, 900, 30, 86); r3B('#ffcf3d', -300, 0, 24, 900, .2, 2);
    r3B('#11141d', -900, -20, -90, 2200, 260, 4); r3Row(cam * 1.5 + t * 900, 120, -80, function (x, i) { r3G('#ffe27a', x, 86 + Math.floor(ih(i, 8) * 3) * 12, -80, 60, 2, 1); });
    r3B('#e3e7ec', -300, 0, -36, 900, 80, 2); r3B('#e3e7ec', -300, 134, -36, 900, 30, 2); r3B('#36b5a5', -300, 66, -34.6, 900, 4, .8); r3A('#9fb7c9', -300, 80, -35.5, 900, 54, .5);
    r3Row(cam, 110, -34, function (x) { r3B('#b9c0c9', x + 94, 80, -36.5, 16, 54, 3); r3B('#3f8f7a', x + 2, 34, -32, 104, 20, 5); r3B('#2f6f5f', x, 26, -32, 108, 8, 16); });
    r3Row(cam, 330, -34, function (x) { r3B('#c4cbd4', x + 140, 0, -34.5, 50, 140, 1.6); r3B('#a6aeb8', x + 164, 0, -33, 2, 140, .4); r3B('#1a2030', x + 146, 98, -33.2, 14, 30, .5); r3B('#1a2030', x + 172, 98, -33.2, 14, 30, .5); });
    var cy = RMAP.subway.ceil + 40; r3B('#aab2bc', -300, cy, -38, 900, 60, 90); r3B('#9aa0a6', -300, cy - 3, -8, 900, 2, 2);
    r3Row(cam, 26, -8, function (x) { r3B('#9aa0a6', x + 12, cy - 8, -7.5, 1, 5, 1); r3B('#f6f6f2', x + 10, cy - 13, -7.5, 5, 5, 1); }); r3Row(cam, 80, -10, function (x) { r3G('#fff8d8', x + 10, cy - .6, -24, 36, .6, 7); });
  },
  platform: function (R, cam) {
    r3Env('in', '#dfe4e9'); var cy = RMAP.subway.ceil + 40;
    r3B('#a6aeb8', -300, -30, -62, 900, 30, 110); r3B('#ffcf3d', -300, 0, 22, 900, .25, 4); r3Row(cam, 6, 24, function (x) { r3B('#e0b52f', x + 1, .25, 23, 2, .2, 2); });
    r3B('#dfe4e9', -300, 0, -66, 900, cy, 4); for (var y = 10; y < cy; y += 12) r3B('#d2d8de', -300, y, -62, 900, 1, .2);
    r3B('#aab2bc', -300, cy, -66, 900, 60, 116); r3B('#7e848c', -300, cy - 2, -62, 900, 2, 1); r3Row(cam, 60, -20, function (x) { r3G('#fff8d8', x + 20, cy - .7, -26, 22, .7, 8); });
    var c = R3.c;
    r3Row(cam, 220, -62, function (x, i) { r3B('#2b2f3a', x + 20, 76, -62, 84, 18, 1.4); r3G('#36b5a5', x + 20, 75, -62, 84, 3, 1.5); r3Z(-60.4); c.font = 'bold 9px sans-serif'; c.fillStyle = '#ffffff'; c.fillText('조로역  ZORRO', x + 28, 77);
      var a = ['#ff9bd3', '#9fd3ff', '#ffe27a', '#b8f0a0'][Math.floor(ih(i, 51) * 4)]; r3B('#5a5d63', x + 128, 52, -62, 58, 44, 1.2); r3G(a, x + 131, 55, -61, 52, 38, .5); r3G('#ffffff', x + 136, 62, -60.6, 30, 4, .3); });
    r3Z(0);
    r3Row(cam, 150, -40, function (x) { r3B('#b9c0c9', x + 110, 0, -46, 12, cy, 12); r3B('#a6aeb8', x + 108, 0, -47, 16, 4, 14); });
    r3Row(cam, 300, -50, function (x) { r3B('#7e848c', x + 30, 10, -56, 40, 4, 12); r3B('#5a5d63', x + 32, 0, -52, 3, 10, 3); r3B('#5a5d63', x + 65, 0, -52, 3, 10, 3); });
  },
  bike: function (R, cam) {
    r3Env('out', '#9fd0ff', '#dff1ff'); var sn = rSnow();
    r3Flr('#c95a4a', -16, 14); r3B('#b14a3c', -400, 0, -17, 1100, .3, 1.5); r3Flr('#6d6f73', 14, 46, -.3); r3Row(cam, 36, 24, function (x) { r3B('#f2f2f2', x, -.3, 24, 16, .14, 2); });
    r3Row(cam, 300, 0, function (x) { r3B('#f2f2f2', x + 20, 0, -6, 12, .16, 7); r3B('#c95a4a', x + 23, .1, -4, 6, .16, 3); });
    r3Flr(sn ? '#e9f0f3' : '#7fbf5a', -150, -16, -.2); r3Row(cam, 74, -70, function (x, i) { if (ih(i, 32) < .6) r3Tree(x + 18, -50 - ih(i, 3) * 60, 1.1, sn); });
    r3Flr('#4f8fd0', -1100, -150, -8); r3Row(cam, 90, -500, function (x, i) { r3G('#bfe3ff', x + ih(i, 31) * 60, -7.8, -260 - (i % 5) * 190, 26, .2, 3); });
    r3Flr('#9db0a0', -2600, -1100, -2); r3Skyline(cam, -1100, 120, '#a9bccf', 90, 300, 30);
  },
  bridge: function (R, cam, t) {
    r3Env('out', '#8fc8ff', '#e0f0ff');
    r3Flr('#7d8088', -18, 46); r3Row(cam, 48, 22, function (x) { r3B('#ffcf3d', x, 0, 21, 24, .14, 2); });
    r3B('#d0d4da', -400, 13, -19, 1100, 2.5, 2.5); r3Row(cam, 14, -18, function (x) { r3B('#a6abb3', x, 0, -18.5, 1.6, 13, 1.6); }); r3B('#9a9da5', -400, -30, -24, 1100, 30, 6);
    r3Row(cam, 120, -30, function (x) { r3B('#8796ab', x, -60, -30, 5, 150, 5); r3B('#8796ab', x + 60, 0, -29, 2, 88, 2); }); r3B('#8796ab', -500, 88, -30, 1300, 3.5, 4);
    r3Flr('#3f7fbf', -1300, -24, -70); r3Row(cam, 100, -500, function (x, i) { r3G((Math.floor(t * 3) + i) % 3 ? '#9fd3ff' : '#d6eeff', x + ih(i, 10) * 60, -69.8, -200 - (i % 6) * 210, 28, .2, 3); });
    r3Flr('#93a79a', -3000, -1300, -40); r3Skyline(cam, -1300, 150, '#9fb4c8', 120, 380, 9);
    r3Row(cam, 2600, -1300, function (x) { r3B('#9fb4c8', x + 400, 0, -1330, 22, 520, 22); r3B('#9fb4c8', x + 386, 430, -1338, 50, 30, 38); });
  },
  market: function (R, cam) {
    r3Env('in', '#f3e2c4');
    r3B('#a89a86', -300, -30, -46, 900, 30, 96); r3Joints(cam, 20, '#968873', -46, 46); r3B('#f3e2c4', -300, 0, -50, 900, 170, 4); r3B('#d9c7a8', -300, 148, -46, 900, 22, 1);
    r3Row(cam, 30, -14, function (x, i) { r3G(['#ffcf3d', '#e8412c', '#ffffff'][((i % 3) + 3) % 3], x, 151, -14, 12, 5, 2); }); r3B('#5a4a3a', -300, 156, -13.5, 900, .6, .6);
    r3Row(cam, 84, -44, function (x, i) {
      var a = ['#e8412c', '#3f6fb5', '#3f9a4a', '#ff9a1f'][Math.floor(ih(i, 33) * 4)];
      for (var k = 0; k < 7; k++) r3B(k % 2 ? '#ffffff' : a, x + k * 12, 114 - (k % 2 ? .01 : 0), -46, 12, 5, 30);
      r3B('#8a6a4a', x + 2, 0, -18, 2, 114, 2); r3B('#8a6a4a', x + 80, 0, -18, 2, 114, 2);
      r3B('#b98a5a', x + 4, 28, -44, 78, 6, 24); r3B('#8a5a32', x + 4, 0, -44, 78, 28, 22);
      var g = ['#e8412c', '#ffcf3d', '#3f9a4a', '#ff9a1f', '#c06bd6']; for (var j = 0; j < 6; j++) { r3B(g[(((i + j) % 5) + 5) % 5], x + 8 + j * 12, 34, -32, 8, 6, 8); r3B(g[(((i + j + 2) % 5) + 5) % 5], x + 8 + j * 12, 34, -42, 8, 9, 8); }
      r3B('#1b1d18', x + 26, 96, -45.5, 34, 10, 1.4); r3G('#ffe27a', x + 30, 99, -44, 26, 4, .3);
    });
  },
  park: function (R, cam, t) {
    r3Env('out', '#a8ddff', '#e6f7ff'); var sn = rSnow();
    r3Flr('#e0c99a', -16, 46); r3Row(cam, 26, 0, function (x, i) { r3B('#cdb585', x + ih(i, 37) * 20, 0, -12 + (((i % 3) + 3) % 3) * 12, 3, .2, 2); });
    r3Flr(sn ? '#e9f0f3' : '#8fd06a', -2400, -16, .4);
    r3Row(cam, 110, -50, function (x, i) {
      r3Tree(x + 22, -52, 1.25, sn);
      if (ih(i, 35) < .4) { r3B('#8a5a32', x + 60, 10, -34, 30, 3, 9); r3B('#8a5a32', x + 60, 13, -35, 30, 9, 2); r3B('#3a3f4a', x + 62, 0, -32, 2, 10, 6); r3B('#3a3f4a', x + 86, 0, -32, 2, 10, 6); }
      else if (ih(i, 36) < .3) { r3B('#b9c0c9', x + 56, 0, -48, 38, 8, 26); r3A('#9fd3ff', x + 59, 8, -45, 32, .6, 20); if (!sn) r3G('#bfe6ff', x + 72, 8, -37, 5, 16 + Math.abs(Math.sin(t * 4 + i)) * 8, 5); }
    });
    r3Row(cam, 190, -180, function (x, i) { r3Tree(x + ih(i, 3) * 90, -150 - ih(i, 4) * 120, 1.9, sn); });
    r3Row(cam, 150, -520, function (x, i) { var h = 110 + ih(i, 34) * 90; r3B(sn ? '#b9cbc4' : '#7fbf6a', x, 0, -560, 130, h, 60); r3B(sn ? '#f4f8fb' : '#6aa85a', x + 22, h, -548, 86, 24, 40); });
  },
  short: function (R, cam) {
    r3Env('dim', '#0a0b10');
    r3B('#5b4f48', -300, -30, -26, 900, 30, 76); r3Row(cam, 200, 0, function (x) { r3B('#3e3530', x, 0, 4, 16, .2, 8); });
    r3Row(cam, 64, -24, function (x, i) {
      r3B(ih(i, 11) < .5 ? '#a5553c' : '#94493a', x, 0, -30, 64, 180, 6); for (var k = 0; k < 14; k++) r3B('#7d3a2c', x, 6 + k * 11, -24, 64, 1, .2);
      r3B('#6b6f74', x + 52, 0, -24, 3, 180, 3);
      if (ih(i, 12) < .5) { r3B('#d7dbe0', x + 10, 87, -24, 18, 13, 8); r3B('#9aa0a6', x + 13, 92, -15.9, 12, 1, .2); r3B('#9aa0a6', x + 13, 96, -15.9, 12, 1, .2); }
      if (ih(i, 13) < .35) { r3B('#2b2f3a', x + 20, 108, -17, 24, 1, 1); r3B(['#ff9bd3', '#ffe27a', '#9fd3ff'][((i % 3) + 3) % 3], x + 22, 96, -17, 18, 12, 1); }
      if (i % 3 === 0) { r3B('#3a3f4a', x + 30, 118, -24, 2, 2, 10); r3G('#ffd68c', x + 28, 114, -15, 6, 4, 4); }
    });
  },
  avenue: function (R, cam) {
    r3Env('out', '#a4d4ff', '#e2f2ff'); var sn = rSnow();
    r3Flr('#d8d2c6', -24, 46); r3Joints(cam, 16, '#c4bdb0', -24, 46); r3B('#b5b0a5', -400, 0, -27, 1100, 3, 3);
    r3Flr('#5d6066', -124, -27, -2); r3B('#f2f2f2', -600, -2, -76, 1500, .14, 1.4); r3Flr('#cfc9bd', -2400, -124);
    var tt = R.t; [[0, 230, 0, '#3f6fb5', -62], [1, -150, 1, '#e8e4da', -106], [2, 190, 0, '#c0392b', -62]].forEach(function (q) { var x = ((q[0] * 260 - tt * q[1] - cam * .9) % 760 + 760) % 760 - 240; r3Car(x, q[4], q[3], !q[2]); });
    r3Row(cam, 150, -190, function (x, i) { r3Bld(i, x, -190, 8); }); r3Skyline(cam, -560, 120, '#b7c7da', 140, 300, 77);
    r3Row(cam, 90, -20, function (x) { r3Tree(x + 32, -20, .95, sn); });
    var dx = RMAP.avenue.len + 30 - cam + RPX, D = RIMG.dest; if (dx < RW + 140) { r3Z(-170, 6, 5); rDestBld(R3.c, Math.round(dx) + D.width * 6, RGY, D.height * 6); r3Z(0); }
  },
  under: function (R, cam) {
    r3Env('in', '#d9dde3');
    r3B('#c9ccd2', -300, -30, -38, 900, 30, 88); r3Row(cam, 22, 0, function (x, i) { r3B(i % 2 ? '#b9bdc4' : '#d6d9de', x, 0, -36, 22, .12, 84); });
    r3B('#d9dde3', -300, 0, -42, 900, 160, 4); r3B('#bfc5cd', -300, 144, -42, 900, 20, 92); r3Row(cam, 40, -8, function (x) { r3G('#fff8d8', x + 10, 143.3, -14, 20, .7, 8); });
    r3Row(cam, 100, -38, function (x, i) {
      var a = ['#ff9bd3', '#9fd3ff', '#ffe27a', '#b8f0a0', '#d9b8ff'][Math.floor(ih(i, 38) * 5)];
      r3B('#2b2f3a', x + 4, 124, -38, 92, 12, 3); r3G(a, x + 10, 127, -34.9, 40, 6, .3);
      r3G('#fffdf4', x + 4, 16, -37.6, 92, 108, .5); r3G(a, x + 8, 115, -37, 84, 3, .4);
      for (var j = 0; j < 4; j++) { r3B(a, x + 12 + j * 20, 88, -36, 12, 16, 3); r3B('#8a8f98', x + 12 + j * 20, 86, -36.5, 12, 2, 5); r3B('#e9e2d4', x + 14 + j * 20, 40, -35, 8, 30, 5); }
      r3B('#8a8f98', x + 4, 14, -38, 92, 2, 4); r3B('#a6aeb8', x + 1, 0, -38, 4, 144, 5);
    });
  },
  lobby: function (R, cam) {
    var gx = R_GATE - cam + RPX, bx = R_BADGE() - cam + RPX, ex = R_ELEV() - cam + RPX, c = R3.c, sn = rSnow(), ins = gx < RPX + 4;
    r3Env(ins ? 'in' : 'out', ins ? '#f0ede6' : '#a4d4ff', '#e2f2ff');
    if (gx > -260) {
      R3.cr = gx + 16; r3Flr('#c9c3b6', -2400, 46); r3Joints(cam, 24, '#b8b1a3', -40, 46); R3.cr = null;
      r3Row(cam, 150, -260, function (x, i) { if (x < gx - 150) r3Bld(i, x, -260, 8); });
      r3Row(cam, 110, -30, function (x) { if (x < gx - 50) r3Tree(x + 32, -32, 1, sn); });
      r3Z(-92, 8, 4); rDestBld(c, gx + 120, RGY, RGY + 60); r3Z(0);
    }
    R3.cl = gx + 16;
    r3B('#ddd6c8', -300, -30, -56, 2400, 30, 106); r3Joints(cam, 24, '#c9c1b1', -56, 46); r3B('#f0ede6', -300, 0, -60, 2400, 170, 4); r3B('#e4dfd4', -300, 140, -60, 2400, 30, 110);
    r3Row(cam, 60, -56, function (x) { r3G('#cfe3ef', x + 4, 64, -56, 52, 70, .4); r3B('#b9cfdc', x + 4, 98, -55.6, 52, 1, .3); r3G('#fff8d8', x + 16, 139.3, -20, 28, .7, 8); });
    r3Row(cam, 150, -30, function (x) { r3B('#c0602b', x + 20, 0, -40, 12, 16, 12); r3B('#3f9a4a', x + 16, 16, -44, 20, 18, 20); r3B('#2a6b33', x + 23, 34, -37, 6, 6, 6); });
    R3.cl = null;
    r3Row(cam, 240, -56, function (x) { if (x + 58 < gx + 20) return;
      r3B(RIMG.destCol, x + 58, 114, -56, 94, 30, 1.5); r3G('#ffffff', x + 62, 118, -54.5, 86, 22, .4); r3Z(-54);
      var L = RIMG.logo; if (L && L.complete && L.naturalWidth) { var h = 18, w = Math.min(80, L.naturalWidth * h / L.naturalHeight); c.drawImage(L, x + 105 - w / 2, 20, w, h); }
      else { c.font = 'bold 11px sans-serif'; c.fillStyle = '#1b1d18'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(R.dest.n, x + 105, 29.5, 80); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; } });
    r3Z(0);
    if (bx > -260 && bx < RW + 300) {
      r3B('#2b2f3a', bx + 168, 84, -50, 76, 14, 2); r3Z(-47.8); c.font = 'bold 8px sans-serif'; c.fillStyle = '#ffffff'; c.fillText('안내 RECEPTION', bx + 174, RGY - 88);
      var Q = RIMG.ppl[2 % RIMG.ppl.length]; r3Spr(Q, bx + 192, RGY - Q.height, -44, { dep: 5 });
      r3B('#6b5236', bx + 170, 0, -40, 74, 30, 12); r3B('#9b7652', bx + 168, 30, -41, 78, 3, 14); r3G('#c6ff3d', bx + 172, 22, -27.9, 70, 2, .3);
      [bx + 76, bx + 162].forEach(function (g, gi) { r3Z(-18, 5); rGuard(c, g, RGY, gi); }); r3Z(0);
    }
    if (ex > -260 && ex < RW + 300) [ex - 96, ex + 96].forEach(function (x) { r3B('#8f96a3', x, 0, -56, 88, 74, 3); r3B('#c4cbd4', x + 4, 0, -53, 80, 70, .5); r3B('#8f96a3', x + 43, 0, -52.6, 2, 70, .3); r3B('#1b1d18', x + 30, 74, -55, 28, 8, 3); r3G('#ff9b3d', x + 40, 76, -51.9, 8, 4, .3); });
    if (gx > -80 && gx < RW + 120) {
      r3B('#2b2f3a', gx + 10, 0, -20, 8, 108, 5); r3B('#2b2f3a', gx + 10, 0, 16, 8, 108, 5); r3B('#2b2f3a', gx + 8, 100, -20, 12, 10, 41); r3B(RIMG.destCol, gx + 7, 102, -18, 14, 6, 37);
      r3B('#d9e6ee', gx + 12, 0, -400, 4, 170, 380); r3A('#bfe6ff', gx + 2, 0, -20, 12, 80, 1); r3A('#bfe6ff', gx + 2, 0, 19, 12, 80, 1);
    }
  }
};



var R3_APR = { alley: '#6d6f73', bus: '#4f5359', busstop: '#d8d2c6', subway: '#9aa0a8', platform: '#a6aeb8', bike: '#6d6f73', bridge: '#7d8088', market: '#a89a86', park: '#e0c99a', short: '#5b4f48', avenue: '#d8d2c6', under: '#c9ccd2' };
var R3_CAP = { bus: ['#e2d8c2', 164], subway: ['#aab2bc', 164], platform: ['#aab2bc', 164], market: ['#d9c7a8', 170], under: ['#bfc5cd', 164] };
function r3Apron(R) {
  if (!R_XT.e) return;
  var k = R.key === 'bus' && !R.onBus ? 'busstop' : R.key === 'subway' && !R.inTrain ? 'platform' : R.key, z0 = 44, d = 100;
  if (k === 'lobby') { var gx = R_GATE - R.dist + RPX + 16; R3.cr = gx; r3B('#c9c3b6', -400, -30, z0, 1100, 30, d); R3.cr = null; R3.cl = gx; r3B('#ddd6c8', -400, -30, z0, 1100, 30, d); r3B('#e4dfd4', -400, 170, -60, 1100, 220, 112); R3.cl = null; return; }
  if (R3_APR[k]) r3B(R3_APR[k], -400, k === 'bike' ? -30.3 : -30, z0, 1100, 30, d);
  var C = R3_CAP[k]; if (C) r3B(C[0], -400, C[1], -60, 1100, 220, 112);
}
function r3Hill(R) {
  var x0 = runHill0(R); if (x0 == null) return; var H = R_HILL, L = H.up + H.top + H.dn, sx = x0 - R.dist + RPX; if (sx > RW + 60 || sx + L < -60) return;
  for (var x = Math.max(-60, sx); x < Math.min(RW + 60, sx + L); x += 3) { var h = runHillH(R, x + 1.5 - RPX + R.dist); if (h <= 0) continue; r3B('#a77b5c', x, 0, -16, 3, Math.max(.1, h - 1.2), 30); r3B('#c95a4a', x, Math.max(0, h - 1.2), -16, 3, 1.2, 30); }
  for (var lx = Math.ceil((sx + 6) / 24) * 24; lx < sx + L - 6; lx += 24) { var lh = runHillH(R, lx - RPX + R.dist); r3B('#f2f2f2', lx, lh, -1, 8, .2, 2); }
  r3B('#2b2f3a', sx - 6, 0, -17, 2, 40, 2); r3G('#ffcf3d', sx - 14, 38, -17.5, 18, 12, 2);
  var fx = sx + H.up + H.top / 2; r3B('#2b2f3a', fx, H.ht, -15, 1, 24, 1); r3G('#c6ff3d', fx + 1, H.ht + 17, -15, 9, 6, .6);
}
function r3Stage(R, M) {
  var c = R3.c, veh = rVeh(R);
  R.objs.forEach(function (o) {
    var sx = o.x - R.dist + RPX;
    if (o.k === 'belt') { if (sx > RW + 40 || sx + o.w < -40) return;
      r3B('#1b1d18', sx - 1, 0, -10, o.w + 2, .5, 20); r3B('#4a4f57', sx, .5, -9, o.w, .5, 18); for (var j = (R.t * 40) % 10; j < o.w - 4; j += 10) r3B('#6d737c', sx + j, 1, -9, 4, .12, 18);
      r3G('#ffcf3d', sx, 1, -9, 5, .2, 18); r3G('#ffcf3d', sx + o.w - 5, 1, -9, 5, .2, 18); r3B('#2b2f3a', sx, 23, -11, o.w, 3, 1.5); r3B('#2b2f3a', sx + 2, 0, -11, 2, 23, 1.5); r3B('#2b2f3a', sx + o.w - 4, 0, -11, 2, 23, 1.5); return; }
    if (o.k !== 'plat' || sx > RW + 40 || sx + o.w < -40) return;
    var y = o.y;
    if (veh) { for (var hk = 6; hk < o.w - 2; hk += 40) { r3B('#9aa0a6', sx + hk, y, -9, 1.6, 160 - y, 1.6); r3B('#9aa0a6', sx + hk, y, 7, 1.6, 160 - y, 1.6); }
      r3B('#c9ced6', sx, y - 2, -11, o.w, 2, 21); r3B('#8a8f98', sx, y - 5, -11, o.w, 3, 1.4); r3B('#8a8f98', sx, y - 5, 8.6, o.w, 3, 1.4); for (var mk = 2; mk < o.w; mk += 8) r3B('#6d737c', sx + mk, y - 4.6, -10, 1, 2.4, 19); return; }
    for (var k = 8; k < o.w - 4; k += 56) { r3B(M.pc[1], sx + k, 0, -11, 3, y - 7, 3); }
    r3B(M.pc[0], sx, y - 3, -12, o.w, 3, 22); r3B(M.pc[1], sx, y - 7, -12, o.w, 4, 22);
    if (o.b) for (var s = 0; s < o.w; s += 12) r3B('#ffffff', sx + s, y - 7.1, -12.1, Math.min(6, o.w - s), 7.2, 22.2);
    else for (var j2 = 4; j2 < o.w - 4; j2 += 12) r3B('#ffffff', sx + j2, y - .05, 6, 4, .12, 3);
  });
  if (M.bike) { var rk = M.len - 70 - R.dist + RPX + 6;
    if (rk > -120 && rk < RW + 40) { r3B('#3f9a4a', rk, 36, -16, 70, 10, 2); r3Z(-13.8); c.font = 'bold 7px sans-serif'; c.fillStyle = '#fff'; c.fillText('따릉이 대여소', rk + 10, RGY - 38); r3Z(0);
      for (var rq = 0; rq < 4; rq++) { r3B('#5a5d63', rk + 6 + rq * 18, 0, -15, 3, 36, 3); r3B('#36b5a5', rk + 4 + rq * 18, 16, -15.5, 7, 4, 4); }
      var BK2 = RIMG.obj.bike; if (R.docked) r3Spr(BK2, rk + 2, RGY - BK2.height * 2, -9, { sx: 2, sy: 2, dep: 2 }); } }
  R.objs.forEach(function (o) {
    if (o.k !== 'sign') return; var sx = Math.round(o.x - R.dist + RPX); if (sx > RW + 260 || sx < -340) return;
    if (veh) {
      var lx = sx + 20, l1 = '다음 정류장 안내', l2 = '⬆ 선반 위 → ' + RMAP[o.up].nm, l3 = (R_UNDER[o.dn] ? '⬇ 바닥 → ' : '➡ 바닥 → ') + RMAP[o.dn].nm;
      r3Z(-16, 3); c.font = 'bold 8px sans-serif'; var lw = Math.max(c.measureText(l2).width, c.measureText(l3).width) + 14, ly = 34;
      rr(c, '#9aa0a6', lx + 10, 0, 2, ly); rr(c, '#9aa0a6', lx + lw - 12, 0, 2, ly); rr(c, '#2b2f3a', lx - 2, ly - 2, lw + 4, 44); rr(c, '#0d0f0a', lx, ly, lw, 40);
      c.fillStyle = '#ff9b3d'; c.fillText(l1, lx + 6, ly + 11); c.fillStyle = Math.floor(R.t * 2) % 2 ? '#ffcf3d' : '#ff9b3d'; c.fillText(l2, lx + 6, ly + 23); c.fillText(l3, lx + 6, ly + 35); r3Z(0); return; }
    r3Z(-15, 3); rr(c, '#5a5d63', sx + 44, RGY - 112, 4, 112);
    [[o.up, RGY - 116, '#3f9a4a', '⬆ 위층'], [o.dn, RGY - 76, '#3f6fb5', R_UNDER[o.dn] ? '⬇ 지하' : '➡ 아래']].forEach(function (b) {
      var X = RMAP[b[0]]; rr(c, '#0d0f0a', sx - 2, b[1] - 2, 96, 34); rr(c, b[2], sx, b[1], 92, 30);
      c.font = '16px sans-serif'; c.fillStyle = '#fff'; c.fillText(X.emo, sx + 3, b[1] + 21);
      c.font = 'bold 8px sans-serif'; c.fillText(b[3], sx + 25, b[1] + 11); c.font = 'bold 10px sans-serif'; c.fillText(X.nm, sx + 25, b[1] + 24);
    });
    var ux = sx + 230; r3Z(-13, 2);
    rArrow(c, ux + 6, RGY - R_T1 - 46, 'u', '#c6ff3d'); c.font = '14px sans-serif'; c.fillText(RMAP[o.up].emo, ux + 26, RGY - R_T1 - 30);
    rArrow(c, ux + 4, RGY - 30, 'r', '#ffffff'); c.fillText(RMAP[o.dn].emo, ux + 30, RGY - 16); r3Z(0);
  });
}
var R3_DEP = { coin: 2.6, cash: 2.2, bonus: 9, coffee: 6, box: 10, bag: 7, cone: 8, papers: 9, trash: 10, cat: 5, dog: 5, pigeon: 5, scooter: 4, ghost: 6, mail: 3, blob: 8, moto: 7, aboard: 3, hang: 2.5, ramp: 16, car: 12 };
function r3Objs(R) {
  R.objs.forEach(function (o) {
    if (o.k === 'plat' || o.k === 'sign' || o.k === 'belt' || (o.done && !(o.sq > 0) && o.k !== 'ramp')) return;
    var sx = o.x - R.dist + RPX; if (sx < -60 || sx > RW + 20) return;
    var im = runImg(o), good = R_VAL[o.k] || o.k === 'coffee' || o.k === 'box', bob = good ? Math.sin(R.t * 6 + o.x) * 1.5 : 0, dep = R3_DEP[o.k] || 5;
    if (o.k === 'puddle') { r3B('#3f86c9', sx - 1, 0, -8, 20, .22, 15); r3G('#5fa8e8', sx + 1, .22, -6, 16, .1, 11); r3G('#d6eeff', sx + 4, .32, -1, 5, .06, 1.6); return; }
    if (o.sq > 0) { r3Spr(im, sx - 2, RGY - o.y - im.height / 3, 0, { dep: dep, sx: (im.width + 4) / im.width, sy: 1 / 3, sz: 1.3 }); return; }
    var fl = (o.k === 'mail' || o.k === 'pigeon') && Math.floor(R.t * 8) % 2 ? 1 : 0, y = RGY - o.y - im.height + bob - fl, op = { dep: dep };
    if (o.k === 'coin') op.ry = R.t * 5 + o.x * .07; else if (o.k === 'cash') op.ry = Math.sin(R.t * 3 + o.x) * .7; else if (o.k === 'bonus' || o.k === 'box' || o.k === 'coffee') op.ry = Math.sin(R.t * 2 + o.x) * .35;
    else if (o.k === 'ghost') op.rz = Math.sin(R.t * 3 + o.x * .02) * .12; else if (o.k === 'mail') op.rz = Math.sin(R.t * 9 + o.x) * .1;
    if (o.k === 'hang') { r3B('#5a5d63', sx + 2, o.y + im.height, -.5, 1, 170 - o.y - im.height, 1); r3B('#5a5d63', sx + im.width - 3, o.y + im.height, -.5, 1, 170 - o.y - im.height, 1); }
    r3Spr(im, sx, y, 0, op);
  });
}
function r3Zorro(R, M, m) {
  if (R.noZ || R.hideZ || (R.inv > 0 && R.boost <= 0 && !R.card && Math.floor(R.el * 12) % 2)) return;
  var fr = m && m.ph === 'play' && R_MINI[m.k].fr, mash = fr && /chase|board|elev|sale/.test(m.k);
  var onb = M.bike && !R.docked && !R.carry, bike = onb && R.stun <= 0, zy = RGY - R.h - 37 - (bike ? 9 : 0);
  var hold = !R.air && R.held && m && (m.k === 'brake' || m.k === 'wind') || R.bstop > 0 && R.held;
  var run = RIMG.run[Math.floor(R.el * 14) % 4];
  var im = R.cd > 0 || (R.card && !(R.coast > 0)) || (fr && !mash && m.k !== 'rope' && m.k !== 'pedal') ? RIMG.stand : R.stun > 0 ? RIMG.hit : mash && m.k === 'sale' && m.t > .35 ? (m.grab > 0 ? RIMG.jump : RIMG.stand) : mash ? run
    : bike ? RIMG.run[1] : hold ? RIMG.stand : R.air ? (R.v > -60 ? RIMG.jump : RIMG.run[0]) : m && m.k === 'light' && R.held ? RIMG.stand : R.bstop > 0 ? RIMG.stand : RIMG.run[Math.floor(R.dist / 11) % 4];
  var sx2 = 1, sy2 = 1; if (!REDUCE && !bike) { if (R.lift > 0) { sx2 = .9; sy2 = 1.1; } else if (R.land > 0) { sx2 = 1.14; sy2 = .86; } }
  var zx0 = RPX + (R.zx || 0), hg = M.bike ? runHillH(R, R.dist + 17) : 0, tilt = hg > 0 && R.h - hg < 1.5 && !REDUCE ? Math.atan(runHillSl(R)) : 0;
  var moving = im !== RIMG.stand && im !== RIMG.hit, lean = REDUCE ? 0 : R.stun > 0 ? .16 : R.air ? Math.max(-.14, Math.min(.12, -R.v / 3600)) : moving ? -.05 - .05 * Math.min(1.6, R.spdx || 1) : 0;
  r3Spr(im, zx0 + im.width * (1 - sx2) / 2, zy + im.height * (1 - sy2), 0, { dep: 6, sx: sx2, sy: sy2, rz: tilt + (bike ? 0 : lean) });
  var BK = RIMG.obj.bike, bw = BK.width * 2, bh = BK.height * 2;
  if (bike) r3Spr(BK, zx0 + 2, RGY - R.h - bh, 4.6, { sx: 2, sy: 2, dep: 1.6, rz: tilt });
  else if (onb) r3Spr(BK, zx0 - 26, RGY - R.h - bh, 2, { sx: 2, sy: -2, dep: 1.6 });
  if (R.carry && M.bike) { var ca = Math.min(1, R.carry.t / .18), cb = Math.floor(R.dist / 11) % 2, cyb = zy - bh + 6 - 4 * ca + cb, by = (RGY - R.h - bh) * (1 - ca) + cyb * ca;
    r3Spr(BK, zx0 + 1, by, 0, { sx: 2, sy: 2, dep: 1.6 }); r3B('#2b2f3a', zx0 + 9, RGY - zy - 14, 3.2, 2, zy + 14 - (cyb + bh - 2), 1.4); r3B('#2b2f3a', zx0 + 25, RGY - zy - 14, 3.2, 2, zy + 14 - (cyb + bh - 2), 1.4);
    var sw = (R.carry.t * 2.2) % 1; r3G('#9fd3ff', zx0 - 2 - sw * 6, RGY - zy - 6 + sw * 4, 2, 2 * (1 - sw), 3 * (1 - sw), 1); r3G('#9fd3ff', zx0 + 33 + sw * 5, RGY - zy - 9 + sw * 3, 2, 2 * (1 - sw), 2 * (1 - sw), 1); }
  if (hold) { var gx = zx0 + 24, top = R.key === 'bus' ? 22 : Math.max(0, zy - 14); r3B('#9aa0a6', gx, RGY - zy - 14, 3.4, 1, zy + 14 - top, 1); r3B('#ffcf3d', gx - 2, RGY - zy - 15, 3.2, 5, 3, 1.4); }
  if (R.boost > 0 && !REDUCE) for (var a = 0; a < 5; a++) { var an = R.t * 7 + a * 1.26; r3G(a % 2 ? '#ffe27a' : '#c6ff3d', zx0 + 17 + Math.cos(an) * 20, R.h + 18 + Math.sin(an * 1.3) * 16, Math.sin(an) * 9, 2, 2, 2); }
}
function r3Wx(R) {
  var t = R.t, w = R.wx, i, x, y, z, SP = 200 + R_XT.t * 1.6, N = Math.round(SP / 200 * 130), dk = R3.env.kind === 'dim' || R.dark > 0;
  if (w === 'rain') { for (i = 0; i < N; i++) { z = -150 + ih(i, 26) * 190; x = ((ih(i, 20) * 520 - t * 70 - R.dist * .3) % 520 + 520) % 520 - 120; y = SP - 10 - ((ih(i, 21) * SP + t * 300) % SP); r3G(dk ? '#66788c' : i % 3 ? '#dbe9f8' : '#f4f9ff', x, y, z, .6, 9, .6); }
    for (i = 0; i < 26; i++) { var q = (t * 2.6 + ih(i, 27) * 7) % 1; if (q > .34) continue; x = ((ih(i + Math.floor(t * 2.6 + ih(i, 27) * 7) * 13, 28) * 420 - R.dist) % 420 + 420) % 420 - 70; z = -14 + ih(i, 29) * 54; r3G(dk ? '#66788c' : '#e6f1ff', x - q * 4, .2 + q * 3, z, 1.2, .5, 1.2); r3G(dk ? '#66788c' : '#e6f1ff', x + 2 + q * 4, .2 + q * 3, z, 1.2, .5, 1.2); } }
  else if (w === 'snow') for (i = 0; i < N; i++) { z = -170 + ih(i, 26) * 210; x = ((ih(i, 22) * 520 + Math.sin(t * 2 + i) * 6 - R.dist * .2) % 520 + 520) % 520 - 120; y = SP - 10 - ((ih(i, 23) * SP + t * 34) % SP); r3G('#ffffff', x, y, z, 1.8, 1.8, 1.8); }
  else if (w === 'wind') for (i = 0; i < 26; i++) { z = -60 + ih(i, 26) * 90; x = ((ih(i, 24) * 520 - t * 260) % 520 + 520) % 520 - 120; y = 6 + ih(i, 25) * 130 + Math.sin(t * 5 + i) * 8; r3G(i % 3 ? '#e0a020' : '#c9772a', x, y, z, 4, 1.6, 2.4); }
}

var R3_MZ = { chase: [-12, 24, 3], board: [-6, 22, 1.5], elev: [-6, 8, 1.5], snack: [-9, 14, 3], sale: [-9, 14, 3], badge: [-11, 6, 8], shell: [-10, 6, 3] };
var R3_MF = { chase: [-10.6, 1.4, 3] };
function r3MiniZ(k, front) { var a = front ? R3_MF[k] || [4.6, 1.6, 3] : R3_MZ[k] || [-10, 8, 3]; r3Z(a[0], a[1], a[2]); }

function r3Light(R, m, done) {
  var cs = done ? 'g' : RM.light.cur(m)[0], any = 0;
  (m.xs || []).forEach(function (X, i) {
    var sx = X - R.dist + RPX, s = i === m.xs.length - 1 ? cs : 'g'; if (sx > RW + 80 || sx < -220) return; any = 1;
    r3B('#5d6066', sx + 4, 0, -900, 128, .3, 960); for (var dz = -880; dz < 40; dz += 26) r3G('#ffcf3d', sx + 67, .3, dz, 2, .12, 12);
    for (var k = 0; k < 9; k++) r3G('#f2f2f2', sx + 6 + k * 14, .3, -12, 8, .14, 24); r3G('#f2f2f2', sx + 1, .3, -14, 2.4, .14, 28);
    var cars = s === 'r' ? [[(m.t * 1.5) % 1, 1], [(m.t * 1.5 + .5) % 1, 1], [1 - (m.t * 1.3 + .25) % 1, 0]] : [[.12, 1]];
    cars.forEach(function (q) { var im = q[1] ? RIMG.obj.carF : RIMG.obj.carB, z = s === 'r' ? -520 + q[0] * 560 : -70, sc = 2.6; r3Spr(im, sx + (q[1] ? 44 : 96) - im.width * sc / 2, RGY - im.height * sc, z, { sx: sc, sy: sc, dep: 6 }); });
    var x = sx + 136; r3B('#5a5d63', x + 12, 0, -16, 3, 112, 3); r3B('#1b1d18', x + 2, 110, -17.5, 24, 34, 6);
    [['r', '#ff3b30', 22], ['y', '#ffcc00', 31], ['g', '#34c759', 40]].forEach(function (L) { (s === L[0] ? r3G : r3B)(s === L[0] ? L[1] : '#3a3f4a', x + 10, RGY - L[2] - 4, -11.4, 8, 8, .6); });
  });
  return any;
}


function r3Draw() {
  var R = RUN, cv = $('rnC'); if (!R || !cv) return;
  var oc = r3Begin(R, cv), c = R3.c, M = RMAP[R.key], m = R.mini;
  if (R.tr) {
    rr(oc, '#0d0f0a', 0, 0, RW, RH); var z0 = rZ; rZ = function () {}; try { rTrDraw(oc, R); } finally { rZ = z0; } runEdge(oc, cv, R3.k, 0);
    var T = R.tr, q0 = Math.min(1, T.t / .4), dh = (T.h0 || 0) * (1 - q0 * q0), zi = dh > 0 ? RIMG.jump : RIMG.run[Math.floor(R.el * 12) % 4];
    r3Spr(zi, RPX, RGY - 37 - dh + (dh || T.kind === 'pan' ? 0 : Math.floor(R.el * 10) % 2), 0, { dep: 6, rz: -.08 });
    R3.only = 1; r3End(R); return;
  }
  if (R.out) {
    r3Env('in', R.out.t < 2.1 ? '#d9d4c8' : '#eef0ea'); if (R.out.t >= 2.1) r3B('#b9c2c9', -300, -30, -4, 900, 30, 150);
    r3Z(-3, 3, R.out.t < 2.1 ? 1.5 : 5); rOutDraw(c, R); r3Z(0); runFadeDraw(oc); r3End(R); return;
  }
  var cam = R.dist, out = !M.inn || (R.key === 'lobby' && R_GATE - cam + RPX > RPX + 4) || (R.key === 'bus' && !R.onBus);
  R3BG[R.key](R, cam, R.t); r3Apron(R);
  if (R3.env.kind === 'out' && R.wx !== 'fog') r3Clouds(R);
  if (M.bike) r3Hill(R);
  r3Stage(R, M); r3Objs(R);
  R.left = R.left.filter(function (L) { var sh = R.dist - L.x0; if (L.k === 'light') return !!r3Light(R, L.m, 1);
    if (sh > RW + 260) return false; r3MiniZ(L.k); c.save(); c.translate(-sh, 0); RM[L.k].prop(c, R, L.m, Math.max(1, sh)); c.restore(); r3Z(0); return true; });
  var crx = R.crem || 0, live = m && (m.ph === 'play' || m.pre);
  if (live && m.k === 'light') r3Light(R, m, 0);
  else if (live && RM[m.k].draw) { r3MiniZ(m.k); c.save(); c.translate(crx, 0); RM[m.k].draw(c, R, m); c.restore(); r3Z(0); }
  if (R.chase > 0) r3Spr(RIMG.boss, RPX - 46 + Math.sin(R.t * 3) * 6, RGY - 37 - (Math.floor(R.t * 8) % 2), -1, { dep: 6, rz: -.1 });
  var lines = (R.boost > 0 ? 6 : 0) + (R.onBelt ? 4 : 0) + Math.max(0, Math.round((R.spdx - 1.15) * 20));
  for (var k = 0; k < lines; k++) r3G('#ffffff', RW - ((R.t * 600 + k * 53) % (RW + 40)), 6 + (k * 37) % 120, -14 + (k * 7) % 32, 14 + (k % 3) * 6, .5, .5);
  R.dust.forEach(function (d, i) { var a = Math.max(.1, 1 - d.t / .35), s = 3.4 * a; r3B('#cfc6b4', d.x, RGY - d.y + d.t * 14, -3 + (i % 3) * 3, s, s, s); });
  r3Zorro(R, M, m);
  if (/^(alley|bike|bridge|park|avenue)$/.test(R.key) || (R.key === 'bus' && !R.onBus)) r3Row(cam, 96, 26, function (x, i) { if (ih(i, 33) < .45) return; var w = 10 + ih(i, 34) * 14; r3B('#2f4a2a', x, 0, 27, w, 5, 5); r3B('#3f6a36', x + 2, 5, 28, w * .5, 3, 3); });
  if (live && RM[m.k].front) { r3MiniZ(m.k, 1); c.save(); c.translate(crx, 0); RM[m.k].front(c, R, m); c.restore(); r3Z(0); }
  R.fx.forEach(function (f) { var a = 1 - f.t / .45, s = 3 * a; r3G('#ffe27a', f.x - 1, RGY - f.y + f.t * 30, 4, s, s, s); r3G('#ffe27a', f.x - 5, RGY - f.y + f.t * 22 - 3, 2, s * .7, s * .7, s * .7); r3G('#fff3b0', f.x + 4, RGY - f.y + f.t * 26 - 2, 6, s * .7, s * .7, s * .7); });
  if (out && R.key !== 'market') r3Wx(R);

  var sa = Math.min(1, R.shake / .2), sh2 = R.shake > 0 ? Math.sin(R.t * 70) * 4 * sa : 0, shy = R.shake > 0 ? Math.cos(R.t * 55) * 2 * sa : 0;
  oc.save(); oc.translate(sh2, shy); oc.font = 'bold 13px sans-serif'; oc.lineJoin = 'round'; oc.textBaseline = 'alphabetic';
  R.pops.forEach(function (p) { var e = Math.min(1, p.t / .12), kk = .6 + .55 * e - .15 * Math.max(0, Math.min(1, (p.t - .12) / .1)), a = Math.min(1, (.9 - p.t) / .25), w = oc.measureText(p.s).width;
    var x = Math.max(2 + w * kk / 2, Math.min(RW - 2 - w * kk / 2, p.x + w / 2)), y = Math.max(16, p.y - 8 - (1 - Math.pow(1 - Math.min(1, p.t / .9), 2)) * 22);
    oc.save(); oc.globalAlpha = Math.max(0, a); oc.translate(x, y); oc.scale(kk, kk); oc.textAlign = 'center';
    if (p.s.length > 5 && p.s.indexOf(' ') > 0) { oc.fillStyle = 'rgba(13,15,10,.72)'; oc.beginPath(); if (oc.roundRect) oc.roundRect(-w / 2 - 5, -12, w + 10, 16, 8); else oc.rect(-w / 2 - 5, -12, w + 10, 16); oc.fill(); }
    oc.strokeStyle = 'rgba(13,15,10,.85)'; oc.lineWidth = 3; oc.strokeText(p.s, 0, 0); oc.fillStyle = p.c; oc.fillText(p.s, 0, 0); oc.restore(); });
  oc.restore();
  if (R.fever > 0) rr(oc, 'rgba(255,207,61,' + (.1 + .05 * Math.sin(R.t * 12)) + ')', 0, 0, RW, RH);
  if (R.wx === 'rain' && R3.env.kind === 'out') rr(oc, 'rgba(30,60,110,.07)', 0, 0, RW, RH);
  if (R.flash > 0) rr(oc, 'rgba(232,65,44,' + (R.flash * 2) + ')', 0, 0, RW, RH);
  if (R.card) { var C = R.card, a = C.t < .28 ? C.t / .28 : 1; if (C.t > C.dur - .28) a = Math.min(a, Math.max(0, (C.dur - C.t) / .28)); rr(oc, 'rgba(13,15,10,' + (a * C.dark) + ')', 0, 0, RW, RH); }
  if (R.blink > 0) rr(oc, 'rgba(13,15,10,' + Math.min(1, R.blink / .3) + ')', 0, 0, RW, RH); runFadeDraw(oc);
  r3End(R);
}

function r3Snap() {
  var cv = $('rnC'); if (!cv || REDUCE) return null;
  RUN.noZ = 1; r3Draw(); RUN.noZ = 0;
  var kk = cv.width / RW, oy = -Math.round(R_XT.t * kk), s = document.createElement('canvas'); s.width = cv.width; s.height = Math.round(RH * kk); var g = s.getContext('2d');
  try { g.drawImage(R3.el, 0, oy, cv.width, cv.height); g.drawImage(cv, 0, oy); } catch (e) { return null; }
  return s;
}


var runDraw2D = runDraw, runSnap2D = runSnap, runStage2D = runStage, renderRun2D = renderRun, rBar2D = rBar;
runStage = function () { runStage2D(); r3Mount(); };
renderRun = function () { renderRun2D(); if (R3.want && !R3.fail) r3Load(function () { if (RUN && RUN.on && $('rnC') && !R3.on) r3Mount(); }); };



var R3P = { n: 0, sum: 0, last: 0, done: 0, skip: 30 }; R3.perf = R3P;
try { if (store.get('slp-run3dq') === '1') R3.dpr = 1; } catch (e) {}
function r3Perf() {
  var R = RUN, P = R3P; if (P.done) return; if (!R || !R.on || R.pause || R.card || R.tr || R.out) { P.last = 0; return; }
  var now = performance.now(), d = P.last ? now - P.last : 0; P.last = now;
  if (!d) return; d = Math.min(d, 1000);
  if (P.skip > 0) { P.skip--; return; }
  P.n++; P.sum += d; if (P.sum < 3000) return;
  P.avg = P.sum / P.n;
  if (P.avg <= 55 || store.get('slp-run3dk') === '1') { P.done = 1; return; }
  if (!(R3.dpr <= 1) && (window.devicePixelRatio || 1) > 1.2) { R3.dpr = 1; store.set('slp-run3dq', '1'); P.n = 0; P.sum = 0; P.skip = 10; P.last = 0; return; }
  P.done = 1; R3.want = false; store.set('slp-run3d', '0'); r3Mount(); toast('기기가 느려서 도트 그래픽으로 바꿨어요');
}
runDraw = function () {
  if (R3.on && $('rn3')) { try { r3Draw(); r3Perf(); return; } catch (e) { R3.on = false; R3.fail = 1; try { console.warn('run3d', e); } catch (x) {} r3Unmount(); } }
  runDraw2D();
};
runSnap = function () { return R3.on && $('rn3') ? r3Snap() : runSnap2D(); };
rBar = function (c, pos, zone, lab) { if (c !== R3.c) return rBar2D(c, pos, zone, lab); var z = [R3Z.z, R3Z.d, R3Z.sd]; r3Z(3, 1.6); rBar2D(c, pos, zone, lab); r3Z(z[0], z[1], z[2]); };
if (!API_BASE) { window.__r3 = R3; window.__r3draw = function () { runDraw(); }; }

