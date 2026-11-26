// 앱 느낌: 설정(효과음·진동·글자 크기) + 효과음(파일 없이 기기에서 바로 만든 소리) + 진동
// 설정은 기기마다 따로 저장한다(after6pm_set). 저장이 막힌 환경에서도 게임은 그대로 돈다.
import { isApp } from "./app.js";
import { duck as bgmDuck } from "./bgm.js";

export const VERSION = "0.9.1";
const KEY = "after6pm_set";
const DEF = () => ({ sound: isApp(), vib: true, big: false, music: isApp(), musicVol: 0.35 }); // 브라우저에서는 소리를 꺼 둔다(회사에서 여는 사람이 많다)
let set = DEF();
try { Object.assign(set, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
export const get = () => ({ ...set });
export function put(k, v) { set[k] = v; try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) {} apply(); }
function apply() { try { document.documentElement.classList.toggle("big", !!set.big); } catch (e) {} }
apply();

let ctx = null;
function ac() {
  if (!set.sound) return null;
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; } catch (e) { return null; }
}
// 음 하나: 주파수(Hz), 시작(초 뒤), 길이(초), 크기, 파형
function note(f, at, len, vol = 0.05, type = "triangle") {
  const c = ac(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.02);
  } catch (e) {}
}
// 11-26 해금 연출용: 음이 미끄러지는 소리(f0 → f1)와 잡음(바사삭·쾅)
function sweep(f0, f1, at, len, vol = 0.05, type = "sine") {
  const c = ac(); if (!c) return;
  try { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05); o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.08); } catch (e) {}
}
function noise(at, len, vol = 0.05, hz = 3000, q = 0.8, grain = 0) {
  const c = ac(); if (!c) return;
  try { const n = Math.floor(c.sampleRate * len), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = 1 - i / n; d[i] = (Math.random() * 2 - 1) * k * (grain ? (Math.random() < grain ? 1 : 0.08) : 1); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at; s.buffer = b; f.type = "bandpass"; f.frequency.value = hz; f.Q.value = q; g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start(t); } catch (e) {}
}
const SND = {
  tap: () => note(520, 0, 0.05, 0.028, "square"),
  ok: () => { note(660, 0, 0.09); note(880, 0.07, 0.12); },
  coin: () => { note(988, 0, 0.07, 0.05, "square"); note(1319, 0.06, 0.16, 0.05, "square"); },
  bad: () => { note(220, 0, 0.14, 0.05, "sawtooth"); note(165, 0.1, 0.2, 0.05, "sawtooth"); },
  scene: () => { note(523, 0, 0.1); note(659, 0.09, 0.1); note(784, 0.18, 0.18); },
  month: () => { note(392, 0, 0.08); note(523, 0.08, 0.14); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.11, 0.24, 0.06)),
  whoosh: () => { sweep(180, 1500, 0, 0.95, 0.045, "sine"); sweep(90, 700, 0, 0.95, 0.03, "triangle"); noise(0.1, 0.9, 0.03, 1800, 0.6); }, // 11-26 쉬이잉: 자물쇠가 흔들리며 힘이 모인다
  crack: () => { noise(0, 0.5, 0.11, 4200, 1.4, 0.06); [2100, 1500, 2600, 1800, 2300].forEach((f, i) => note(f, i * 0.085, 0.03, 0.035, "square")); }, // 바사사삭: 금이 번진다
  shatter: () => { noise(0, 0.5, 0.16, 5200, 0.5, 0.25); noise(0, 0.28, 0.14, 240, 0.7); sweep(900, 60, 0, 0.3, 0.07, "sawtooth"); [1047, 1319, 1568, 2093].forEach((f, i) => { note(f, 0.03, 0.9, 0.035, "sine"); note(f * 2, 0.03 + i * 0.02, 0.5, 0.012, "sine"); }); }, // 파아앙: 산산이 깨지고 빛이 터진다
  bell3: () => [1568, 1568, 2093].forEach((f, i) => { note(f, i * 0.28, 0.5, 0.05, "sine"); note(f * 2, i * 0.28, 0.3, 0.018, "sine"); }), // 맑은 종소리 세 번
};
const VIB = { tap: 8, ok: 12, coin: [10, 40, 14], bad: [30, 50, 30], scene: 14, month: 10, win: [20, 60, 20, 60, 40], shatter: [40, 30, 90], whoosh: 20, crack: [8, 30, 8, 30, 8] };
export function play(k) {
  try { SND[k]?.(); } catch (e) {}
  try { if (set.sound && k !== "tap" && SND[k]) bgmDuck(k === "win" ? 900 : 450, 0.5); } catch (e) {} // 효과음이 날 때 배경 음악을 잠깐 낮춘다(누르는 소리는 빼고)
  try { if (set.vib && navigator.vibrate && VIB[k]) navigator.vibrate(VIB[k]); } catch (e) {}
}
// 누를 수 있는 것을 누르면 '톡'
try {
  document.addEventListener("pointerdown", (e) => { const b = e.target?.closest?.("button,[role=button],a"); if (b && !b.disabled) play("tap"); }, { capture: true, passive: true });
} catch (e) {}
