// 앱 느낌: 설정(효과음·진동·글자 크기) + 효과음(파일 없이 기기에서 바로 만든 소리) + 진동
// 설정은 기기마다 따로 저장한다(after6pm_set). 저장이 막힌 환경에서도 게임은 그대로 돈다.
import { isApp } from "./app.js";

export const VERSION = "0.9.1";
const KEY = "after6pm_set";
const DEF = () => ({ sound: isApp(), vib: true, big: false }); // 브라우저에서는 소리를 꺼 둔다(회사에서 여는 사람이 많다)
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
const SND = {
  tap: () => note(520, 0, 0.05, 0.028, "square"),
  ok: () => { note(660, 0, 0.09); note(880, 0.07, 0.12); },
  coin: () => { note(988, 0, 0.07, 0.05, "square"); note(1319, 0.06, 0.16, 0.05, "square"); },
  bad: () => { note(220, 0, 0.14, 0.05, "sawtooth"); note(165, 0.1, 0.2, 0.05, "sawtooth"); },
  scene: () => { note(523, 0, 0.1); note(659, 0.09, 0.1); note(784, 0.18, 0.18); },
  month: () => { note(392, 0, 0.08); note(523, 0.08, 0.14); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.11, 0.24, 0.06)),
};
const VIB = { tap: 8, ok: 12, coin: [10, 40, 14], bad: [30, 50, 30], scene: 14, month: 10, win: [20, 60, 20, 60, 40] };
export function play(k) {
  try { SND[k]?.(); } catch (e) {}
  try { if (set.vib && navigator.vibrate && VIB[k]) navigator.vibrate(VIB[k]); } catch (e) {}
}
// 누를 수 있는 것을 누르면 '톡'
try {
  document.addEventListener("pointerdown", (e) => { const b = e.target?.closest?.("button,[role=button],a"); if (b && !b.disabled) play("tap"); }, { capture: true, passive: true });
} catch (e) {}
