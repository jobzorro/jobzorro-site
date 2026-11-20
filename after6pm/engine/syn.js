// 투잡·취미 시너지. 조건은 defs.SYNERGY에 있고, 효과는 각 엔진이 on()으로 물어본다.
import * as D from "./defs.js";
export const on = (s, id) => { const x = D.SYNERGY.find((y) => y.id === id); try { return !!x && !!x.test(s); } catch (e) { return false; } };
export const list = (s) => D.SYNERGY.map((x) => ({ ...x, on: on(s, x.id) }));
// 물가 지수(1에서 시작해 해마다 2.5%, 물가 급등 때 더)
export const pi = (s) => s.pi || 1;
