// 회차 구조(11-26 대표 결정: 5년 차 갈림길). 첫 5년(27~32세)을 살고 만 5년 결산에서 고른다.
// - 첫 5년: 판 변화(wave.js)·파티룸 컨셉 위기(prwave.js) 없음, 연애·결혼 잠김(고백 직전까지만). 32세에 결산 등급 S·A·B·C.
// - 갈림길 가. 이어 간다(s.rdCont): 같은 인생으로 50세까지. 잠긴 것이 다 열리고 특성 하나를 고른다. 회차 수는 1 그대로.
// - 갈림길 나. 돌아간다: 등급에 따라 보상 하나 + 기억 하나를 골라 2회차(27세)로. 2회차는 처음부터 다 열려 있다.
// - 3회차부터 특전: 안 가 본 길 조건 완화 · 판 변화 예고 더 일찍 · 지난 판 인연 한 명.
// - 예전 구조(11-23): 1회차 27~34세 '맛보기' 7년에 강제 결산. 이제 쓰지 않는다.
export const RD = {
  start: 27, r1End: 32, end: 50,
  grades: [["S", 25000], ["A", 19000], ["B", 12000]], // 5년 시점 순자산(만원) 이상. 아니면 C. 11-26 봇 2,200판: S 11% · A 24% · B 40% · C 25%(예전 7년 4억·3억·2억과 같은 분포)
  reward: { S: { cash: 3000, statUp: 3 }, A: { cash: 1500, statUp: 0 }, B: { cash: 500, statUp: 0 } }, // 예전 저장(7년 결산으로 끝낸 판)의 2회차 보상
  pick: { S: { cash: 3000, stat3: 5 }, A: { cash: 1500, stat3: 3 }, B: { cash: 500, stat3: 2 } }, // 11-26 돌아갈 때 보상 하나: 종잣돈 / 가장 많이 쓴 능력치 셋 +n / 특성 하나(등급과 상관없이 한 장)
  r3: { reqCut: 10, preMore: 6, slot: 0 }, // 투잡 칸 +1 은 뺐다(대표 결정 11-23: 밸런스를 가장 크게 흔든다)
};
if (typeof process !== "undefined" && process.env?.RDB) Object.assign(RD, JSON.parse(process.env.RDB)); // 봇 시험용
export const roundOf = (s) => Math.max(1, s?.ng?.n || 1);
export const isR1 = (s) => roundOf(s) <= 1 && !!s?.rd && !s?.rdCont && !(typeof process !== "undefined" && process.env?.NOR1);
export const isR3 = (s) => roundOf(s) >= 3;
export const endAgeOf = (s) => (isR1(s) ? RD.r1End : RD.end);
export const loveOpen = (s) => !isR1(s); // 연애·결혼은 첫 5년이 지나면(이어 가기·2회차부터)
export const atFork = (s) => !!s && s.ended === "age" && isR1(s) && !s.forkBack; // 갈림길에 서 있다(고르기 전)
export function pickOf(grade) { const g = grade === "C" || !RD.pick[grade] ? "B" : grade; return { ...RD.pick[g], as: g, rescued: grade === "C" }; }
export function gradeOf(nw) { for (const [g, v] of RD.grades) if (nw >= v) return g; return "C"; }
// 2회차 시작 보상: C는 구원의 손길로 B 보상
export function rewardOf(grade) { const g = grade === "C" || !RD.reward[grade] ? "B" : grade; return { ...RD.reward[g], as: g, rescued: grade === "C" }; }
// 3회차 특전
export const reqCut = (s) => (isR3(s) ? RD.r3.reqCut : 0);
export const preMore = (s) => (isR3(s) ? RD.r3.preMore : 0);
export const slotMore = (s) => (isR3(s) ? RD.r3.slot : 0);
