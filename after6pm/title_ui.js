// After 6PM · 시작 화면(B안, 11-23). 같은 화면이 사람에 따라 세 모습:
//   first = 저장·끝낸 판 없음 / cont = 하던 인생 있음 / ng = 끝낸 판 있음(하던 인생도 있으면 이어 하기 카드가 먼저)
// ui.js 의 renderTitle 이 재료(c)를 넘기고, 여기서 그리고 누르는 곳을 잇는다. 저장 형식·메타는 읽기만 한다.
// 클래스는 모두 a6t- 로 시작(사이트 공통 CSS 와 겹치지 않게). CSS 도 이 파일이 넣는다.

const SHORT = { insta: "인별", chicken: "치킨" }; // 간판 줄에서만 쓰는 짧은 이름. 없으면 D.SIDEJOBS 의 이름 그대로
const MALE_K = 1.15; // 남자 인물은 여자보다 이만큼 크게(발 위치는 같음)
const PEEK = new Map(); // 칸+저장 시각 → 불러온 인생 요약(얼굴·목표). 화면을 다시 그릴 때 깜빡이지 않게
let introSeen = false;

function css() {
  if (document.getElementById("a6tcss")) return;
  const s = document.createElement("style"); s.id = "a6tcss";
  s.textContent = `.title.a6t{--a6t-h:46vh;--a6t-h:46svh;min-height:100vh;min-height:100dvh;margin-bottom:-84px;padding:0;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:#141233 url(img/keyvisual.webp) center top/cover}
html.big .title.a6t{min-height:calc(100vh / 1.12);min-height:calc(100dvh / 1.12)}
html.app .title.a6t{min-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}
.title.a6t::before{background:linear-gradient(180deg,rgba(8,6,25,.18),rgba(8,6,25,.05) 30%,rgba(8,6,25,.3));z-index:0}
.title.a6t.a6t-is-first{--a6t-h:52vh;--a6t-h:52svh}
.a6t .a6t-clock{position:absolute;z-index:4;top:calc(12px + env(safe-area-inset-top,0px));left:14px;font-family:var(--sans);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.02em;font-size:14px;line-height:1.8;background:rgba(24,22,56,.86);border:1px solid rgba(255,255,255,.16);border-radius:7px;padding:1px 10px;color:var(--gold)}
.a6t .a6t-clock.a6t-tick{animation:a6tTick .5s ease-out}
@keyframes a6tTick{0%{transform:scale(1.35);background:#ffc04d;color:#1b1a2e}100%{transform:none}}
.a6t .a6t-gear{position:absolute;z-index:4;top:calc(6px + env(safe-area-inset-top,0px));right:8px;width:44px;height:44px;display:grid;place-items:center}
.a6t .a6t-gear i{width:36px;height:36px;border-radius:50%;background:rgba(24,22,56,.86);border:1px solid rgba(255,255,255,.16);display:grid;place-items:center;font-style:normal;font-size:17px;line-height:1}
.a6t .a6t-cast{position:absolute;z-index:1;left:0;right:0;top:calc(48px + env(safe-area-inset-top,0px));height:calc(var(--a6t-h) * ${MALE_K + 0.01});display:flex;justify-content:center;align-items:flex-end;pointer-events:none;-webkit-mask-image:linear-gradient(#000 80%,transparent);mask-image:linear-gradient(#000 80%,transparent)}
.a6t .a6t-fig{flex:none;height:calc(var(--a6t-h) * var(--a6t-k,1) * var(--a6t-g,1));aspect-ratio:240/540;background-size:300% 200%;background-position:0 0;background-repeat:no-repeat;margin:0 -26px;opacity:0;transition:opacity .5s;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5));position:relative;z-index:2}
.a6t .a6t-fig.a6t-s{--a6t-k:.86;z-index:1}
.a6t .a6t-fig.a6t-m{--a6t-g:${MALE_K}}
.a6t .a6t-fig.a6t-on{opacity:1}.a6t .a6t-fig.a6t-s.a6t-on{opacity:.93}
.a6t .a6t-pb{position:relative;z-index:3;display:flex;flex-direction:column;gap:8px;padding:76px max(16px,env(safe-area-inset-left,0px)) calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,rgba(14,12,40,0),rgba(14,12,40,.86) 84px,#0e0c28 150px)}
.a6t h1.a6t-logo{font-family:var(--disp);font-style:italic;font-weight:900;font-size:clamp(50px,15.5vw,66px);line-height:1;margin:0;letter-spacing:-.01em;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35),0 10px 30px rgba(0,0,0,.5)}
.a6t h1.a6t-logo span{background:linear-gradient(180deg,#fff1b8,#f5b83d 55%,#c9861a);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;padding:0 .04em}
.a6t .a6t-sub{font-size:16.5px;font-weight:700;margin:0;line-height:1.35;word-break:keep-all}
.a6t .a6t-tag2{color:#c9c6e6;font-size:12.5px;line-height:1.5;word-break:keep-all;margin-top:-4px}
.a6t .a6t-marq{overflow:hidden;white-space:nowrap;border-block:1px solid rgba(255,255,255,.16);padding:3px 0;font-family:var(--sans);font-weight:500;letter-spacing:.02em;font-size:12px;color:var(--gold);line-height:1.5}
.a6t .a6t-marq span{display:inline-block;animation:a6tMq 36s linear infinite}
@keyframes a6tMq{to{transform:translateX(-50%)}}
.a6t .a6t-ng{display:flex;justify-content:space-between;gap:8px;background:rgba(24,22,56,.86);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:6px 11px;font-size:12.5px;color:#c9c6e6;white-space:nowrap}
.a6t .a6t-ng span{min-width:0;overflow:hidden;text-overflow:ellipsis}.a6t .a6t-ng b{color:var(--gold)}
.a6t .a6t-gold{background:linear-gradient(180deg,#ffd76a,#f0aa2a);color:#2a1a00;font-weight:900;text-align:center;border-radius:13px;padding:8px 12px;min-height:54px;font-size:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.3;width:100%}
.a6t .a6t-gold small{display:block;font-weight:500;font-size:11.5px}
.a6t .a6t-gold.a6t-2nd{min-height:46px;font-size:15px;background:rgba(245,192,78,.14);color:var(--gold2);border:1px solid rgba(245,192,78,.55)}
.a6t .a6t-gold.a6t-2nd small{color:#e9d9a8}
.a6t .a6t-line{border:1px solid rgba(255,255,255,.18);background:rgba(24,22,56,.86);text-align:center;border-radius:12px;padding:6px 6px;min-height:44px;font-size:13.5px;font-weight:700;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a6t .a6t-rowb{display:flex;gap:6px}.a6t .a6t-rowb>*{flex:1;min-width:0}
.a6t .a6t-rowb.a6t-n3 .a6t-line{font-size:12.5px}
.a6t .a6t-cont{background:linear-gradient(180deg,rgba(74,56,22,.94),rgba(30,26,58,.94) 70%);box-shadow:0 0 0 1px rgba(245,192,78,.25),0 6px 18px rgba(0,0,0,.35);border:1.5px solid var(--gold);border-radius:14px;padding:10px 12px;display:grid;grid-template-columns:52px 1fr;gap:3px 11px;align-items:center;text-align:left;width:100%}
.a6t .a6t-face{grid-row:span 2;width:52px;height:52px;border-radius:50%;border:1.5px solid var(--gold);overflow:hidden;background:#2a2f4e;display:grid;place-items:center;font-weight:900;color:var(--gold);font-size:19px}
.a6t .a6t-face img{width:100%;height:100%;object-fit:cover;display:block}
.a6t .a6t-cont b{font-size:15.5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;align-self:end}
.a6t .a6t-cont>span{font-size:12px;color:#c9c6e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;align-self:start}
.a6t .a6t-bar{grid-column:1/-1;height:7px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:3px}
.a6t .a6t-bar u{display:block;height:100%;background:linear-gradient(90deg,#f5a524,#ffd76a);border-radius:4px;transition:width .4s}
.a6t .a6t-barl{grid-column:1/-1;display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:#c9c6e6;white-space:nowrap}
.a6t .a6t-barl span:last-child{color:var(--gold);font-weight:700}
/* 11-25 저장한 인생이 여럿이면 시작 화면에 모두 보인다(대표 요청) */
.a6t .a6t-oth{display:grid;gap:6px;margin-top:6px;width:100%}
.a6t .a6t-oth button{display:grid;grid-template-columns:34px 1fr auto;gap:0 9px;align-items:center;text-align:left;width:100%;padding:6px 10px;border-radius:12px;background:rgba(30,26,58,.88);border:1px solid rgba(245,192,78,.35);color:#eceaff}
.a6t .a6t-oth .a6t-face{grid-column:1;grid-row:1/3;width:34px;height:34px;font-size:14px;border-width:1px}
.a6t .a6t-oth b{grid-column:2;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a6t .a6t-oth span.l2{grid-column:2;font-size:11.5px;color:#c9c6e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a6t .a6t-oth em{grid-column:3;grid-row:1/3;font-style:normal;font-size:12px;color:var(--gold);font-weight:700;white-space:nowrap}
.a6t .a6t-mini{display:flex;gap:6px}
.a6t .a6t-mini button{flex:1;min-width:0;min-height:46px;background:rgba(24,22,56,.86);border:1px solid rgba(255,255,255,.16);border-radius:11px;padding:5px 9px;text-align:left;display:flex;flex-direction:column;justify-content:center;line-height:1.35}
.a6t .a6t-mini b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a6t .a6t-mini em{font-style:normal;color:var(--gold);font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a6t .a6t-foot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:0 4px;font-size:11.5px;color:#9ea3c0;min-height:26px;margin:-2px 0 -4px}
.a6t .a6t-foot button{color:#c9c6e6;padding:6px 6px;font-size:11.5px;text-decoration:underline;text-underline-offset:3px}
.a6t .a6t-foot .a6t-who{color:var(--gold)}
@media (max-height:720px){.title.a6t{--a6t-h:44vh;--a6t-h:44svh}.title.a6t:not(.a6t-is-first) .a6t-tag2{display:none}.a6t .a6t-pb{gap:7px;padding-top:60px}.a6t .a6t-gold{min-height:48px}.a6t .a6t-cont{padding:8px 11px}.a6t .a6t-face{width:46px;height:46px}.a6t .a6t-cont{grid-template-columns:46px 1fr}}
@media (max-width:380px){.a6t .a6t-tag2{font-size:11.6px;letter-spacing:-.03em}}
/* 여는 연출: 17:59 → 18:00. 버튼은 처음부터 보이고 누를 수 있다 */
.title.a6t.a6t-intro::after{content:"";position:absolute;inset:0;z-index:2;background:#05040f;pointer-events:none;animation:a6tDusk 1.35s ease-out both}
@keyframes a6tDusk{0%,42%{opacity:.6}100%{opacity:0}}
.a6t-intro h1.a6t-logo{animation:a6tLogo .55s .62s cubic-bezier(.2,1.3,.4,1) both}
.a6t-intro .a6t-sub,.a6t-intro .a6t-tag2,.a6t-intro .a6t-marq{animation:a6tUp .4s .95s ease-out both}
.a6t-intro .a6t-cast{animation:a6tFade .7s .62s ease-out both}
@keyframes a6tLogo{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}
@keyframes a6tUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes a6tFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.a6t .a6t-marq span{animation:none}.a6t .a6t-fig,.a6t .a6t-bar u{transition:none}.a6t *,.title.a6t::after{animation:none!important}}
/* 창 안: 저장 칸 목록·바로 시작·30초 보기·엔딩 */
.a6t-sl{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.a6t-sl>div{display:flex;gap:6px;align-items:stretch;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:6px}
.a6t-sl>div.a6t-cur{border-color:var(--gold)}
.a6t-sl .a6t-go{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left;padding:6px 8px;font-size:12.5px;color:#cfd2ea;min-height:44px}
.a6t-sl .a6t-go b{font-size:14px;color:var(--fg)}
.a6t-sl .a6t-del{align-self:center;color:var(--red);font-size:12px;font-weight:700;padding:10px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel)}
.a6t-ch{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.a6t-ch button{text-align:left;border-radius:13px;padding:12px 14px;border:1px solid var(--line);background:var(--panel2);display:flex;flex-direction:column;gap:2px;min-height:60px}
.a6t-ch button.a6t-rec{border-color:var(--gold);background:rgba(245,192,78,.1)}
.a6t-ch b{font-size:15.5px}.a6t-ch span{font-size:12.5px;color:var(--muted);line-height:1.45;word-break:keep-all}
.a6t-in{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--fg);font:inherit;font-size:16px;margin-top:8px}
.a6t-tour{display:flex;flex-direction:column;gap:10px}
.a6t-tour .a6t-pic{aspect-ratio:16/10;border-radius:14px;background:#141233 center/cover no-repeat;position:relative;overflow:hidden}
.a6t-tour .a6t-pic i{position:absolute;bottom:0;height:92%;aspect-ratio:240/540;background-size:300% 200%;background-position:0 0;background-repeat:no-repeat;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))}
.a6t-tour h3{margin:0;font-size:18px;word-break:keep-all}.a6t-tour h3 span{color:var(--gold)}
.a6t-tour p{margin:0;font-size:14px;line-height:1.65;color:#cfd2ea;word-break:keep-all;min-height:4.95em}
.a6t-tour .a6t-dots{display:flex;gap:5px}.a6t-tour .a6t-dots i{height:4px;flex:1;border-radius:3px;background:#ffffff22}.a6t-tour .a6t-dots i.on{background:var(--gold)}
.a6t-ends{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.a6t-ends span{font-size:12px;border-radius:999px;padding:3px 10px;background:var(--panel2);border:1px solid var(--line);color:var(--muted)}
.a6t-ends span.on{color:var(--gold);border-color:var(--gold);background:rgba(245,192,78,.1)}`;
  document.head.appendChild(s);
}

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const pctOf = (nw, target) => Math.max(0, Math.min(100, Math.round(((nw || 0) / Math.max(1, target)) * 100)));

// 서 있는 인물 세 명: 그림이 있는 사람만. 도감에서 만난 사람 먼저, 모자라면 아무나
function pickCast(c) {
  const ok = Object.keys(c.CHAR).filter((id) => c.BODY[id]);
  const met = shuffle(ok.filter((id) => (c.m.dex || {})[id])), rest = shuffle(ok.filter((id) => !(c.m.dex || {})[id]));
  const all = [...met, ...rest], g = (id) => (c.CHAR[id].gender === "M" ? "M" : "F"), pick = all.slice(0, 3);
  // 세 명이 모두 같은 성별이면 한 명을 다른 성별로 바꾼다(남 1·여 1 이상)
  if (pick.length === 3 && pick.every((id) => g(id) === g(pick[0]))) { const o = all.find((id) => g(id) !== g(pick[0])); if (o) pick[2] = o; }
  return shuffle(pick).map((id) => ({ id, g: g(id) }));
}
const bodyUrl = (c, id) => `img/body/${(c.IMG_OF && c.IMG_OF[id]) || id}.webp`;
// 그림을 다 받은 뒤에 붙인다(자리는 처음부터 잡혀 있어 흔들리지 않는다)
function figLoad(el, url) { const im = new Image(); im.onload = () => { if (!el.isConnected) return; el.style.backgroundImage = `url("${url}")`; el.classList.add("a6t-on"); }; im.src = url; }
function castHtml(list) {
  // 가운데가 앞, 양옆은 조금 작게. 한 명이면 가운데만
  const ord = list.length === 3 ? [[list[1], 1], [list[0], 0], [list[2], 1]] : list.map((x) => [x, 0]);
  return ord.map(([x, side]) => `<i class="a6t-fig${side ? " a6t-s" : ""}${x.g === "M" ? " a6t-m" : ""}" data-fig="${x.id}"></i>`).join("");
}

export function draw(root, c) {
  css();
  const { esc, won, D, m, u, slots } = c;
  const saved = slots.filter((x) => !x.empty), empty = slots.find((x) => x.empty);
  const live = saved.filter((x) => !x.summary?.end).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || a.slot - b.slot);
  const last = live[0] || null, runs = m.runs || [], hasRuns = runs.length > 0;
  const mode = hasRuns ? "ng" : last ? "cont" : "first";
  const collected = c.n.album + c.n.mg + c.n.dex > 0;
  const target0 = D.FIRE_TARGET.single, years = D.endAge("M") - 27;
  const jobs = Object.entries(D.SIDEJOBS).filter(([, j]) => j.play).map(([k, j]) => SHORT[k] || j.n);
  const marq = jobs.map(esc).join(" · ") + " · ";
  const othL = saved.filter((x) => x !== last).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || a.slot - b.slot), others = othL.length;

  // ── 조각 ──
  const sm = last?.summary || {};
  const pk = last ? PEEK.get(last.slot + "|" + (last.updatedAt || "")) : null;
  const contCard = last ? `<button class="a6t-cont" data-sload="${last.slot}"><span class="a6t-face" data-a6face>${pk?.face || esc((sm.name || "나").slice(0, 1))}</span>
    <b>이어 하기 · ${sm.age ?? "?"}세${sm.ym ? " " + esc(String(sm.ym).replace(/^\d+년\s*/, "")) : ""}</b><span>${esc([sm.name, sm.job, sm.side].filter(Boolean).join(" · "))}</span>
    <div class="a6t-bar"><u data-a6bar style="width:${pctOf(pk?.nw ?? sm.nw, pk?.target || target0)}%"></u></div>
    <div class="a6t-barl"><span>순자산 ${won(sm.nw || 0)}</span><span data-a6pct>파이어까지 ${pctOf(pk?.nw ?? sm.nw, pk?.target || target0)}%</span></div></button>` : "";
  // 11-25 다른 칸 인생도 시작 화면에 바로 보인다(누르면 이어 하기). 얼굴은 불러온 뒤 채운다
  const othCards = othL.length ? `<div class="a6t-oth">${othL.map((sl) => { const o = sl.summary || {}, op = PEEK.get(sl.slot + "|" + (sl.updatedAt || "")); return `<button data-sload="${sl.slot}"><span class="a6t-face" data-a6oface="${sl.slot}">${op?.face || esc((o.name || "나").slice(0, 1))}</span><b>${sl.slot}번 칸 · ${esc(o.name || "나")} · ${o.age != null ? Math.floor(o.age) : "?"}세${o.end ? " · 끝난 인생" : ""}</b><span class="l2">${esc([o.job, o.side ? "투잡 " + o.side : ""].filter(Boolean).join(" · ") || "이어 하기")}</span><em>${won(o.nw || 0)}</em></button>`; }).join("")}</div>` : "";
  const lastRun = runs[runs.length - 1];
  const lastTxt = !lastRun ? "" : lastRun.fireAt ? `${lastRun.fireAt}세 파이어` : lastRun.kind === "over" ? `${lastRun.age}세에 멈춤` : `${lastRun.age}세 결산`;
  const ngLine = hasRuns ? `<div class="a6t-ng"><span>지난 인생 <b>${esc(lastTxt)}</b></span><span>내 최고 <b>${m.best ? m.best + "세" : "아직"}</b></span></div>` : "";
  const ngBtn = hasRuns ? `<button class="a6t-gold${last ? " a6t-2nd" : ""}" data-new>${c.n.next}회차 인생 시작<small>기억 포인트 ${c.n.pts} · 선물 고르기</small></button>` : "";
  const myHall = (() => {
    if (c.hall && u?.nick) { const i = [...c.hall].sort((a, b) => b.nw - a.nw).findIndex((x) => x.name === u.nick); if (i >= 0) return `내 순위 ${i + 1}위`; }
    const mine = (m.hall || [])[0]; return mine ? `최고 ${mine.nw >= 10000 ? String(Math.floor(mine.nw / 1000) / 10).replace(/\.0$/, "") + "억" : won(mine.nw)}` : "기록 보기";
  })();
  const card = (attr, name, val) => `<button ${attr}><b>${name}</b><em>${val}</em></button>`;
  const cAlbum = card("data-album", "인생 앨범", `${c.n.album}장`), cMg = card("data-mgre", "미니게임", `${c.n.mg}/${c.n.mgAll}`), cDex = card("data-dex", "인물 도감", `<span data-a6dex>${c.n.dex}</span>/${c.n.dexAll}`);
  const mini = mode === "ng" ? `<div class="a6t-mini">${cAlbum}${card("data-ends", "엔딩", `${c.n.end}/${c.n.endAll}`)}${card("data-hall", "명예의 전당", esc(myHall))}</div>`
    : mode === "cont" || collected ? `<div class="a6t-mini">${cAlbum}${cMg}${cDex}</div>` : "";
  const slotsBtn = saved.length ? `<button class="a6t-line" data-others>저장 칸 관리 · ${saved.length}/${slots.length}칸</button>` : ""; // 11-25 다른 인생은 위에 바로 보이니 버튼은 관리(지우기·빈 칸)로
  const row = mode === "ng" ? `<div class="a6t-rowb${slotsBtn ? " a6t-n3" : ""}">${slotsBtn}<button class="a6t-line" data-mgre>미니게임 연습</button><button class="a6t-line" data-dex>인물 도감</button></div>`
    : mode === "cont" ? `<div class="a6t-rowb">${slotsBtn}<button class="a6t-line" data-new>새 인생 시작</button></div>`
    : `<button class="a6t-line" data-tour>어떤 게임인지 30초만 보기</button>`;
  const foot = [u ? `<span class="a6t-who">${esc(u.nick || u.id)}님의 저장 칸</span>` : "", mode !== "first" ? `<button data-tour>게임 소개</button>` : "",
    `<button data-install ${c.app.canInstall() ? "" : "hidden"}>앱으로 설치</button>`, c.app.isIOS() ? `<button data-ios>아이폰 홈 화면에 추가</button>` : ""].filter(Boolean).join("");

  const cast = last ? [] : pickCast(c); // 하던 인생이 있으면 그 주인공(불러온 뒤 세움)
  const intro = !introSeen && !reduced() && (() => { try { return !sessionStorage.getItem("a6t_intro"); } catch (e) { return true; } })();
  introSeen = true; try { sessionStorage.setItem("a6t_intro", "1"); } catch (e) {}

  root.innerHTML = `<div class="title a6t a6t-is-${mode}${intro ? " a6t-intro" : ""}">
    <div class="a6t-clock" data-a6clock aria-hidden="true">${intro ? "17:59" : "18:00"}</div>
    <button class="a6t-gear" data-set aria-label="설정"><i>⚙</i></button>
    <div class="a6t-cast" data-a6cast aria-hidden="true">${castHtml(cast)}</div>
    <div class="a6t-pb">
      <h1 class="a6t-logo">After <span>6</span>PM</h1>
      <div class="a6t-sub">파이어족을 꿈꾸는 퇴근 후 사장님</div>
      <div class="a6t-tag2">회사 다니며 투잡으로 ${won(target0)} 모아 은퇴하기. 5년 차에 갈림길이 오는 ${years}년짜리 인생 한 판.</div>
      <div class="a6t-marq" aria-label="투잡 ${jobs.length}개: ${jobs.map(esc).join(", ")}"><span aria-hidden="true">${marq}${marq}</span></div>
      ${ngLine}${contCard}${othCards}
      ${mode === "ng" ? ngBtn : mode === "first" ? `<button class="a6t-gold" data-new>새 인생 시작</button>` : ""}
      ${mini}${row}
      ${foot ? `<div class="a6t-foot">${foot}</div>` : ""}
    </div></div>`;
  const el = root.querySelector(".a6t"), $ = (s) => el.querySelector(s), on = (s, fn) => el.querySelectorAll(s).forEach((b) => (b.onclick = () => fn(b)));
  el.querySelectorAll("[data-fig]").forEach((f) => figLoad(f, bodyUrl(c, f.dataset.fig)));

  // ── 여는 연출: 한 세션에 한 번. 어디든 누르면 건너뜀(누른 버튼은 그대로 눌린다) ──
  if (intro) {
    const clock = $("[data-a6clock]"); let t1, t2;
    const strike = () => { if (clock.textContent === "18:00") return; clock.textContent = "18:00"; clock.classList.add("a6t-tick"); };
    const done = () => { clearTimeout(t1); clearTimeout(t2); strike(); el.classList.remove("a6t-intro"); el.removeEventListener("pointerdown", done, true); };
    t1 = setTimeout(strike, 600); t2 = setTimeout(done, 1480);
    el.addEventListener("pointerdown", done, true);
  }

  // ── 하던 인생: 칸을 읽어 얼굴·주인공·목표(결혼·어려움 모드면 다름)를 채운다 ──
  if (last) {
    const key = last.slot + "|" + (last.updatedAt || "");
    const fill = (p) => {
      if (!el.isConnected) return;
      const castEl = $("[data-a6cast]");
      if (p) {
        if (p.face) $("[data-a6face]").innerHTML = p.face;
        const pc = pctOf(p.nw, p.target); $("[data-a6bar]").style.width = pc + "%"; $("[data-a6pct]").textContent = `파이어까지 ${pc}%`;
      }
      const list = p?.avatar && c.BODY[p.avatar] ? [{ id: p.avatar, g: p.gender === "M" ? "M" : "F" }] : pickCast(c); // 도트 얼굴로 사는 인생이면 인물 세 명
      castEl.innerHTML = castHtml(list); castEl.querySelectorAll("[data-fig]").forEach((f) => figLoad(f, bodyUrl(c, f.dataset.fig)));
    };
    if (pk) fill(pk); else c.peek(last.slot).then((p) => { if (p) PEEK.set(key, p); fill(p); }).catch(() => fill(null));
  }
  for (const sl of othL) { const k = sl.slot + "|" + (sl.updatedAt || ""); if (PEEK.has(k)) continue;
    c.peek(sl.slot).then((p) => { if (!p) return; PEEK.set(k, p); const f = el.isConnected && el.querySelector(`[data-a6oface="${sl.slot}"]`); if (f && p.face) f.innerHTML = p.face; }).catch(() => {}); }

  // ── 누르는 곳 ──
  on("[data-set]", () => c.act.set());
  on("[data-album]", () => c.act.album());
  on("[data-mgre]", () => c.act.mg());
  on("[data-dex]", () => c.act.dex());
  on("[data-hall]", () => c.act.hall());
  on("[data-ends]", () => endsWin(c));
  on("[data-tour]", () => tourWin(c, mode === "first" ? () => newLife() : null));
  on("[data-sload]", (b) => c.act.load(+b.dataset.sload));
  on("[data-others]", () => slotsWin(c, last, (slot) => begin(slot)));
  on("[data-ios]", () => c.toast([], "아이폰: 공유 버튼 → '홈 화면에 추가'로 앱처럼 쓸 수 있어요"));
  on("[data-install]", async (b) => { if (await c.app.install()) c.toast([], "설치했어요! 홈 화면에서 열어 보세요"); b.hidden = true; });
  // 새 인생: 빈 칸이 없으면 덮어쓸 칸을 먼저 고른다(새 인생이 실제로 시작될 때 덮어쓴다) → 끝낸 판이 있으면 선물 고르기부터, 처음이면 바로 시작/직접 만들기
  const begin = (slot) => (hasRuns ? c.act.wizard(slot) : startWin(c, slot));
  const newLife = () => empty ? begin(empty.slot) : c.openWin(`<h2>칸이 다 찼어요 <button class="x" data-close>✕</button></h2><div class="small muted">새 인생을 넣을 칸을 골라 주세요. 새 인생이 시작되면 그 칸의 인생은 사라지고, 되돌릴 수 없어요.</div><div class="a6t-sl">${slots.map((sl) => `<div><button class="a6t-go" data-a6over="${sl.slot}"><b>${sl.slot}번 칸 · ${esc(sl.summary?.name || "")}</b><span>${sl.summary?.end ? "끝난 인생 · " : ""}${sl.summary?.age ?? "?"}세 · 순자산 ${won(sl.summary?.nw || 0)}</span></button></div>`).join("")}</div>`,
    (w) => w.querySelectorAll("[data-a6over]").forEach((b) => (b.onclick = () => { c.closeWin(); const sl = slots.find((x) => +x.slot === +b.dataset.a6over); askTwice(c, sl, "새 인생을 시작하면 이 칸의 인생 위에 덮어써요.", () => begin(sl.slot)); })));
  on("[data-new]", () => newLife());
}

// 저장 칸 목록: 불러오기 + 지우기(시작 화면에서는 지우기를 밖에 두지 않는다)
// 지우기 전에 두 번 묻는다(대표 요청 11-25): 칸 지우기와, 꽉 찬 칸에 새 인생을 덮어쓸 때
function askTwice(c, sl, what, yes) {
  const { esc, won } = c, who = `${sl.slot}번 칸${sl.summary?.name ? " · " + esc(sl.summary.name) : ""}`, info = sl.summary ? `${sl.summary.age ?? "?"}세 · 순자산 ${won(sl.summary.nw || 0)}` : "";
  const step = (n) => c.openWin(`<h2>${n === 1 ? `${sl.slot}번 칸을 지울까요?` : "정말 지울까요?"} <button class="x" data-close>✕</button></h2><div class="small muted">${n === 1 ? `${what ? what + " " : ""}지운 인생은 되돌릴 수 없어요.` : `마지막 확인이에요. <b>${who}</b>${info ? ` (${info})` : ""}의 인생이 완전히 사라져요.`}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>${n === 1 ? "지우기" : "네, 정말 지워요"}</button></div>`,
    (w) => (w.querySelector("[data-yes]").onclick = () => { c.closeWin(); if (n === 1) step(2); else yes(); }));
  step(1);
}
function slotsWin(c, last, begin) {
  const { esc, won } = c, saved = c.slots.filter((x) => !x.empty), free = begin ? c.slots.filter((x) => x.empty) : []; // 11-25 빈 칸도 보여 준다(QA 모드·저장 칸 추가로 칸이 늘었을 때)
  c.openWin(`<h2>저장한 인생 <span class="tag gold">${saved.length}/${c.slots.length}칸</span> <button class="x" data-close>✕</button></h2><div class="small muted">누르면 그 인생을 이어서 해요. 기본 1칸이고, 저장 칸 추가로 3칸까지 늘릴 수 있어요.</div>
    <div class="a6t-sl">${saved.map((sl) => `<div class="${sl === last ? "a6t-cur" : ""}"><button class="a6t-go" data-a6go="${sl.slot}"><b>${sl.slot}번 칸 · ${esc(sl.summary?.name || "")}${sl === last ? ' <span class="tag gold">마지막에 하던 인생</span>' : ""}</b><span>${sl.summary?.end ? "끝난 인생 · " : ""}${sl.summary?.age ?? "?"}세 · ${esc(sl.summary?.ym || "")} · 순자산 ${won(sl.summary?.nw || 0)}</span><span class="tiny muted">${esc(sl.summary?.job || "")}${sl.summary?.side ? " · 투잡 " + esc(sl.summary.side) : ""}</span></button><button class="a6t-del" data-a6del="${sl.slot}">지우기</button></div>`).join("")}${free.map((sl) => `<div><button class="a6t-go" data-a6new="${sl.slot}"><b>${sl.slot}번 칸 · 비어 있음</b><span>여기서 새 인생을 시작해요</span></button></div>`).join("")}</div>`, (w) => {
    w.querySelectorAll("[data-a6go]").forEach((b) => (b.onclick = () => { c.closeWin(); c.act.load(+b.dataset.a6go); }));
    w.querySelectorAll("[data-a6new]").forEach((b) => (b.onclick = () => { c.closeWin(); begin(+b.dataset.a6new); }));
    w.querySelectorAll("[data-a6del]").forEach((b) => (b.onclick = () => { const n = +b.dataset.a6del, sl = c.slots.find((x) => +x.slot === n);
      askTwice(c, sl, "", async () => { await c.act.remove(n); }); }));
  });
}

// 새 인생: 바로 시작 / 직접 만들기
function startWin(c, slot) {
  c.openWin(`<h2>새 인생 시작 <button class="x" data-close>✕</button></h2><div class="small muted">어떻게 시작할까요? 어느 쪽이든 같은 규칙으로 살아요.</div>
    <div class="a6t-ch"><button class="a6t-rec" data-a6quick><b>추천 캐릭터로 바로 시작</b><span>성별과 이름만 정하면 첫 달로 가요. 능력치·전공·직무·성향 카드는 한 번씩 뽑아 드려요.</span></button>
    <button data-a6wiz><b>직접 만들기 (5단계)</b><span>능력치 룰렛, 전공, 회사와 직무, 성향 카드를 하나씩 골라요.</span></button></div>`, (w) => {
    w.querySelector("[data-a6wiz]").onclick = () => { c.closeWin(); c.act.wizard(slot); };
    w.querySelector("[data-a6quick]").onclick = () => quickWin(c, slot);
  }, false, true);
}
function quickWin(c, slot) {
  const { esc, u, D } = c, st = { gender: "M", name: "" };
  const paint = () => c.openWin(`<h2>추천 캐릭터로 시작 <button class="x" data-close>✕</button></h2><div class="small muted">성별과 이름만 정해 주세요. 나머지는 시작할 때 한 번 뽑아요. 뽑힌 결과는 '나' 화면에서 볼 수 있어요.</div>
    <div class="seg" style="margin-top:10px"><button class="${st.gender === "M" ? "on" : ""}" data-a6g="M">남자 · 27세</button><button class="${st.gender === "F" ? "on" : ""}" data-a6g="F">여자 · 27세</button></div>
    ${u?.nick ? `<div class="card small" style="margin-top:8px">닉네임 <b class="gold">${esc(u.nick)}</b>${((w) => { w = String(w ?? ""); const ch = w.charCodeAt(w.length - 1); if (ch < 0xac00 || ch > 0xd7a3) return "로"; const f = (ch - 0xac00) % 28; return f && f !== 8 ? "으로" : "로"; })(u.nick)} 살아요.</div>` : `<input class="a6t-in" placeholder="이름 (비우면 '나')" value="${esc(st.name)}" data-a6name maxlength="8">`}
    <div class="row" style="margin-top:12px"><button class="btn grow" data-a6wiz style="padding:12px">직접 만들기</button><button class="btn gold grow" data-a6go style="padding:12px">이대로 시작</button></div>`, (w) => {
    const nm = w.querySelector("[data-a6name]"); if (nm) nm.oninput = () => (st.name = nm.value.trim());
    w.querySelectorAll("[data-a6g]").forEach((b) => (b.onclick = () => { st.gender = b.dataset.a6g; paint(); }));
    w.querySelector("[data-a6wiz]").onclick = () => { c.closeWin(); c.act.wizard(slot); };
    w.querySelector("[data-a6go]").onclick = () => { c.closeWin(); c.act.quick(slot, { gender: st.gender, name: st.name }); };
  }, false, true);
  paint();
}

// 어떤 게임인지 30초만 보기: 넉 장
function tourWin(c, onStart) {
  const { won, D, esc } = c, target = won(D.FIRE_TARGET.single), nJobs = Object.values(D.SIDEJOBS).filter((j) => j.play).length, nPpl = Object.keys(c.CHAR).length;
  const ppl = pickCast(c);
  const P = [
    { bg: "img/bg/desk.webp", who: [], h: `낮에는 <span>회사원</span>`, t: `27세 직장인으로 시작해요. 한 달에 한 번씩 행동력을 받아 회사 일, 공부, 취미, 사람 만나기에 나눠 써요. 평가와 승진도 내 몫이에요.` },
    { bg: "img/bg/partyroom.webp", who: [], h: `퇴근 후에는 <span>사장님</span>`, t: `투잡은 ${nJobs}가지. 회사 소문이나 취미에서 발견하고, 두 개까지 굴릴 수 있어요. 투잡마다 규칙과 골칫거리가 달라요. 회사에 들키지 않는 것도 실력이에요.` },
    { bg: "img/bg/dinner.webp", who: ppl, h: `사람 <span>${nPpl}명</span>, 인생은 판마다 달라요`, t: `동네에서 사람을 만나 친구, 스승, 연인이 돼요. 결혼하면 목표가 커지지만 손도 늘어요. 큰 순간은 화보로 앨범에 남아요.` },
    { bg: "img/keyvisual.webp", who: [], h: `목표는 순자산 <span>${target}</span> 파이어`, t: `내 집과, 꺼내 써도 줄지 않는 돈을 합쳐 ${target}. 1회차는 27세부터 34세까지 맛보는 7년이에요. 2회차부터 ${D.endAge("M")}세까지 ${D.endAge("M") - 27}년, 본격적인 삶을 살아요. 한번 재미지게 살아 보십시다!` },
  ];
  let at = 0;
  const paint = () => c.openWin(`<div class="a6t-tour"><h2>After 6PM은 이런 게임 <button class="x" data-close>✕</button></h2>
    <div class="a6t-pic" style="background-image:url(${P[at].bg})">${P[at].who.map((x, i) => `<i style="left:${8 + i * 30}%;background-image:url(${bodyUrl(c, x.id)});${x.g === "M" ? "height:100%" : ""}"></i>`).join("")}</div>
    <div class="a6t-dots">${P.map((_, i) => `<i class="${i <= at ? "on" : ""}"></i>`).join("")}</div>
    <h3>${P[at].h}</h3><p>${esc(P[at].t)}</p>
    <div class="row">${at ? `<button class="btn" data-a6prev style="padding:12px 14px">이전</button>` : ""}<button class="btn gold grow" data-a6next style="padding:12px">${at < P.length - 1 ? `다음 (${at + 1}/${P.length})` : onStart ? "새 인생 시작" : "닫기"}</button></div></div>`, (w) => {
    const pv = w.querySelector("[data-a6prev]"); if (pv) pv.onclick = () => { at--; paint(); };
    w.querySelector("[data-a6next]").onclick = () => { if (at < P.length - 1) { at++; return paint(); } c.closeWin(); if (onStart) onStart(); };
  }, false, true);
  paint();
}

// 엔딩 도감: 본 엔딩은 이름, 못 본 엔딩은 ???
function endsWin(c) {
  const { esc, m } = c, got = new Set(m.endings || []);
  c.openWin(`<h2>엔딩 <span class="tag gold">${c.n.end}/${c.n.endAll}</span> <button class="x" data-close>✕</button></h2><div class="small muted">인생을 끝낼 때마다 본 엔딩이 여기에 올라요. 새 엔딩을 보면 기억 포인트를 받아요.</div>
    ${c.collection || ""}<div class="a6t-ends">${c.endings.map(([k, n]) => `<span class="${got.has(k) ? "on" : ""}">${got.has(k) ? esc(n) : "???"}</span>`).join("")}</div>`, null, false, true);
}

// 도감을 뒤늦게 채웠을 때 숫자만 바꾼다
export function setDex(root, n) { root.querySelectorAll("[data-a6dex]").forEach((x) => (x.textContent = n)); }
