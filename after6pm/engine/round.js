// 회차 구조(11-23). 1회차는 27~34세 맛보기 7년, 2회차부터 27~50세 본 게임 23년.
// - 1회차: 판 변화(wave.js)·파티룸 컨셉 위기(prwave.js) 없음, 연애·결혼 잠김(고백 직전까지만). 34세에 결산 등급 S·A·B·C.
// - 2회차: 등급에 따라 시작 보상만 다르다(연애·결혼·판 변화는 누구나 열린다). C는 '구원의 손길'로 B 보상을 받는다.
// - 3회차부터 특전: 안 가 본 길 조건 완화 · 판 변화 예고 더 일찍 · 지난 판 인연 한 명.
// 밸런스 메모: 3회차 특전 넷은 대표가 "일단 다 넣고 나중에 조정"으로 정함. 투잡 칸 +1 은 파이어율을 크게 올릴 수 있으니 측정하면 꼭 알릴 것.
export const RD = {
  start: 27, r1End: 34, end: 50,
  grades: [["S", 40000], ["A", 30000], ["B", 20000]], // 순자산(만원) 이상. 아니면 C
  reward: { S: { cash: 3000, statUp: 3 }, A: { cash: 1500, statUp: 0 }, B: { cash: 500, statUp: 0 } },
  r3: { reqCut: 10, preMore: 6, slot: 0 }, // 투잡 칸 +1 은 뺐다(대표 결정 11-23: 밸런스를 가장 크게 흔든다)
};
if (typeof process !== "undefined" && process.env?.RDB) Object.assign(RD, JSON.parse(process.env.RDB)); // 봇 시험용
export const roundOf = (s) => Math.max(1, s?.ng?.n || 1);
export const isR1 = (s) => roundOf(s) <= 1 && !!s?.rd && !(typeof process !== "undefined" && process.env?.NOR1);
export const isR3 = (s) => roundOf(s) >= 3;
export const endAgeOf = (s) => (isR1(s) ? RD.r1End : RD.end);
export const loveOpen = (s) => !isR1(s); // 연애·결혼은 2회차부터
export function gradeOf(nw) { for (const [g, v] of RD.grades) if (nw >= v) return g; return "C"; }
// 2회차 시작 보상: C는 구원의 손길로 B 보상
export function rewardOf(grade) { const g = grade === "C" || !RD.reward[grade] ? "B" : grade; return { ...RD.reward[g], as: g, rescued: grade === "C" }; }
// 3회차 특전
export const reqCut = (s) => (isR3(s) ? RD.r3.reqCut : 0);
export const preMore = (s) => (isR3(s) ? RD.r3.preMore : 0);
export const slotMore = (s) => (isR3(s) ? RD.r3.slot : 0);
