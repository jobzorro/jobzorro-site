// 배경 음악. 자리 이름(title·home·board·crisis·ending·love…)을 주면 audio/bgm.json 에 연결된 곡을 튼다.
// - 자리 → 곡 연결은 audio/bgm.json 한 파일(데이터만 고치면 곡이 바뀐다). 출처·라이선스는 audio/CREDITS.json
// - 곡 파일은 그 자리가 처음 나올 때 받는다(첫 화면 용량을 늘리지 않는다). 못 받아도 게임은 그대로 돈다
// - 브라우저 정책상 첫 터치 뒤에만 소리가 난다. 화면이 가려지면 멈추고, 돌아오면 이어서 튼다
// - 설정은 효과음과 같은 곳(after6pm_set)의 music(켜기)·musicVol(크기)에 둔다. 기본: 브라우저에서는 꺼짐·설치된 앱에서는 켜짐(효과음과 같은 판정), 0.35
import { isApp } from "./app.js";
const KEY = "after6pm_set", DEF_VOL = 0.35, JSON_URL = "audio/bgm.json";
let DEF_ON = false; try { DEF_ON = !!isApp(); } catch (e) {}
const TICK = 40, KEEP = 4; // 페이드 한 걸음(ms), 받아 둔 곡을 몇 개까지 들고 있을지

let store = null;          // { get, put } — fx.js 를 넘겨받으면 그쪽으로 저장(설정 값이 한곳에 모인다)
let cfg = null, cfgP = null; // bgm.json
let want = null;           // 지금 틀고 싶은 것 { slot, id }
let chans = [];            // 소리 줄. 교차 페이드 동안에는 2개
let unlocked = false, hidden = false, seq = 0, timer = 0;
let ctx = null, duckTo = 1, duckLv = 1, duckEnd = 0;
const blobs = new Map();   // 곡 id → 받아 둔 주소(blob:)
const rot = {};            // 돌려 듣기 자리의 다음 순번

const clamp = (v) => Math.max(0, Math.min(1, +v || 0));
function rd() { if (store) { try { return store.get() || {}; } catch (e) { return {}; } } try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
function wr(k, v) {
  if (store) { try { store.put(k, v); } catch (e) {} return; }
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; s[k] = v; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}
const isOn = () => { const v = rd().music; return v === undefined ? DEF_ON : !!v; };
const vol = () => { const v = rd().musicVol; return typeof v === "number" ? clamp(v) : DEF_VOL; };
const fadeSec = () => (cfg && cfg.fade > 0 ? cfg.fade : 0.8);

function load() {
  if (cfg) return Promise.resolve(cfg);
  if (!cfgP) cfgP = fetch(JSON_URL, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error("bgm.json " + r.status); return r.json(); }).then((j) => (cfg = j)).catch((e) => { cfgP = null; throw e; });
  return cfgP;
}
function fileUrl(t) { return (cfg.base || "audio/") + t.file; }
// 곡을 통째로 받아 들고 있는다(끊겨 받기 요청을 쓰지 않아 서비스워커 보관과 부딪히지 않는다)
const getting = new Map(); // 받는 중인 곡(같은 곡을 두 번 받지 않게)
function fetchTrack(id) {
  if (blobs.has(id)) { const u = blobs.get(id); blobs.delete(id); blobs.set(id, u); return Promise.resolve(u); }
  if (!getting.has(id)) getting.set(id, fetchTrack0(id).finally(() => getting.delete(id)));
  return getting.get(id);
}
async function fetchTrack0(id) {
  const t = cfg.tracks[id]; if (!t) throw new Error("없는 곡 " + id);
  const r = await fetch(fileUrl(t)); if (!r.ok) throw new Error(t.file + " " + r.status);
  const u = URL.createObjectURL(await r.blob());
  blobs.set(id, u);
  for (const k of [...blobs.keys()]) { if (blobs.size <= KEEP) break; if (!chans.some((c) => c.id === k)) { URL.revokeObjectURL(blobs.get(k)); blobs.delete(k); } }
  return u;
}

function audioCtx() {
  if (ctx) return ctx;
  try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}
function mkChan(id, slot, url) {
  const el = new Audio(); el.preload = "auto"; el.src = url;
  const c = { id, slot, el, node: null, lv: 0, to: 1, gain: (cfg.tracks[id] && cfg.tracks[id].gain) || 1, dead: false };
  // 아이폰은 audio.volume 을 바꿀 수 없어 소리 크기 마디(GainNode)를 거친다. 안 되면 volume 으로
  try { const a = audioCtx(); if (a) { const src = a.createMediaElementSource(el); c.node = a.createGain(); c.node.gain.value = 0; src.connect(c.node).connect(a.destination); } } catch (e) { c.node = null; }
  return c;
}
function setOut(c) {
  const v = clamp(c.lv * vol() * c.gain * duckLv);
  try { if (c.node) c.node.gain.value = v; else c.el.volume = v; } catch (e) {}
}
function kill(c) { c.dead = true; try { c.el.pause(); c.el.removeAttribute("src"); c.el.load(); } catch (e) {} try { c.node && c.node.disconnect(); } catch (e) {} }
function tick() {
  const step = TICK / 1000 / fadeSec(), now = Date.now();
  duckTo = now < duckEnd ? duckTo : 1;
  if (duckLv !== duckTo) duckLv = duckLv < duckTo ? Math.min(duckTo, duckLv + TICK / 400) : Math.max(duckTo, duckLv - TICK / 120);
  for (const c of chans) {
    if (c.lv !== c.to) c.lv = c.lv < c.to ? Math.min(c.to, c.lv + step) : Math.max(c.to, c.lv - step);
    setOut(c);
    if (c.to === 0 && c.lv === 0) kill(c);
  }
  chans = chans.filter((c) => !c.dead);
  if (!chans.some((c) => c.lv !== c.to) && duckLv === 1 && now >= duckEnd) { clearInterval(timer); timer = 0; }
}
function run() { if (!timer) timer = setInterval(tick, TICK); }
function fadeOutAll() { for (const c of chans) c.to = 0; run(); }

function pickId(slot) {
  const s = cfg.slots && cfg.slots[slot]; if (!s) return null;
  const list = (s.list && s.list.length ? s.list : [s.use]).filter((id) => cfg.tracks[id]);
  if (s.mode === "rotate" && list.length > 1) { const i0 = Math.max(0, list.indexOf(s.use)); const n = rot[slot] || 0; return list[(i0 + n) % list.length]; }
  return cfg.tracks[s.use] ? s.use : list[0] || null;
}
async function start(slot, id, my) {
  const u = await fetchTrack(id);
  if (my !== seq || !unlocked || hidden || !isOn()) return; // 받는 사이에 자리가 바뀌었거나 꺼졌다
  const c = mkChan(id, slot, u), s = cfg.slots[slot] || {};
  const rotate = s.mode === "rotate" && (s.list || []).length > 1;
  c.el.loop = !rotate;
  if (rotate) c.el.addEventListener("ended", () => { if (c.dead || !want || want.slot !== slot) return; rot[slot] = (rot[slot] || 0) + 1; c.to = 0; c.lv = 0; want = null; play(slot); });
  try { if (ctx && ctx.state === "suspended") await ctx.resume(); await c.el.play(); } catch (e) { kill(c); if (e && e.name === "NotAllowedError") unlocked = false; return; }
  if (my !== seq) { kill(c); return; }
  for (const o of chans) o.to = 0;
  chans.push(c); run();
}
// 자리 이름으로 틀기. 같은 자리(같은 곡)면 그대로 이어서 튼다
function play(slot) {
  if (!slot) return stop();
  load().then(() => {
    const id = pickId(slot);
    if (!id) return; // 연결된 곡이 없는 자리: 지금 곡을 그대로 둔다
    if (want && want.id === id && chans.some((c) => c.id === id && c.to > 0)) { want.slot = slot; return; }
    want = { slot, id };
    const my = ++seq;
    if (!unlocked || hidden || !isOn()) return; // 첫 터치·돌아옴·켜기 때 다시 부른다
    return start(slot, id, my);
  }).catch(() => {});
}
function playTrack(id) { // 들어 보는 페이지용: 곡을 바로 지정
  load().then(() => { if (!cfg.tracks[id]) return; cfg.slots = cfg.slots || {}; cfg.slots["_test"] = { use: id, mode: "loop", list: [id] }; want = null; play("_test"); }).catch(() => {});
}
function stop() { want = null; seq++; fadeOutAll(); }
function resume() { if (want && unlocked && !hidden && isOn() && !chans.some((c) => c.id === want.id && c.to > 0)) { const w = want; want = null; play(w.slot); } }
function setVolume(v) { wr("musicVol", clamp(v)); for (const c of chans) setOut(c); }
function setOn(on) { wr("music", !!on); if (on) resume(); else { seq++; fadeOutAll(); } }
// 효과음이 날 때 잠깐 낮춘다(ms 동안 to 배)
function duck(ms = 500, to = 0.45) { if (!chans.length) return; duckTo = clamp(to); duckEnd = Date.now() + ms; run(); }
function useStore(s) { if (s && typeof s.get === "function" && typeof s.put === "function") store = s; }
function state() { const c = chans.find((x) => x.to > 0); return { on: isOn(), volume: vol(), slot: want ? want.slot : null, id: want ? want.id : null, playing: !!c && !c.el.paused, unlocked, time: c ? c.el.currentTime : 0 }; }

try {
  const unlock = () => { if (unlocked) return; unlocked = true; try { const a = audioCtx(); if (a && a.state === "suspended") a.resume(); } catch (e) {} resume(); };
  for (const ev of ["pointerdown", "keydown", "touchend"]) document.addEventListener(ev, unlock, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    hidden = document.hidden;
    if (hidden) { for (const c of chans) { try { c.el.pause(); } catch (e) {} } }
    else { let live = false; for (const c of chans) { if (c.to > 0 && isOn()) { live = true; c.el.play().catch(() => {}); } } if (!live) resume(); }
  });
  hidden = document.hidden;
} catch (e) {}

export const BGM = { play, playTrack, stop, setVolume, setOn, duck, useStore, load, state, isOn, volume: vol };
export { play, stop, setVolume, setOn, duck, useStore, load, state };
try { window.BGM = BGM; } catch (e) {}
