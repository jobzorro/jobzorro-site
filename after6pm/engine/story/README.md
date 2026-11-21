# 기존 투잡 이야기 보강 규약 (After 6PM v4.22)

기존 5개 투잡(pr 파티룸 · cs 컨설팅 · insta 인별그램 · airbnb 에어씨앤씨 · ucafe 무인카페)은 돈 계산·행동·보드 화면이 원래 코드(`engine/pr.js` 등)에 있다.
이야기(이벤트·마일스톤·특전·시너지)만 **파일 하나**로 덧붙인다: `engine/story/<key>.js`.

| key | prefix | 원래 엔진 | 원래 상태 |
|---|---|---|---|
| pr | `prs_` | engine/pr.js | `s.pr` (rooms, sys, lv, profitHist …) |
| cs | `css_` | engine/cs.js | `s.cs` (lv, passes, reviews, revHist …) |
| insta | `ins_` | engine/insta.js | `s.ins` (f, posts, reels, lv, dealsDone, gongN …) |
| airbnb | `abs_` | engine/abnb.js | `s.ab` (units, superM, raidN, cohost …) |
| ucafe | `ucs_` | engine/ucafe.js | `s.uc` (stores, agent, hist, soldN …) |

## 내보낼 것 (`export default { ... }`)

| 이름 | 필수 | 설명 |
|---|---|---|
| `key`, `prefix` | O | 위 표 그대로 |
| `init(s)` | O | 이야기 상태 객체를 돌려준다 → `s.sx.<key>`. 예: `{ seen: [], evT: -99, ... }` |
| `month(s, r, notes, scenes)` | O | 그 투잡이 켜져 있는 달마다 불린다(원래 엔진의 month 다음). 장면은 `scenes.push(...)`, 영수증 한 줄은 `notes.push(...)`. 돌려주는 값은 쓰지 않는다 |
| `eff(s, eff, out, who)` | | 장면 선택지 전용 효과 키(**prefix 로 시작**, 예 `prs_rating`). 원래 상태(`s.pr` 등)를 바꿔도 된다 |
| `choose` | | `{ prs_ev(s, r, i, ok) { return ["화면 한 줄"]; } }` — 장면에 `onChoose: "prs_ev"` |
| `milestones` | | 마일스톤 화보. key 는 prefix 로 시작. `end: true` 엔딩도 가능하나 **기존 엔딩 3개(defs.js ME)는 그대로 두고 새 엔딩은 넣지 않는다** |
| `perks`, `perkCine`, `synergy` | | engine/jobs/README.md 1-8, 1-12 과 같은 형식 |
| `migrate(s, X)` | | 옛 저장에 빠진 칸 채우기 |

- import: `import * as D from "../defs.js"; import { addMoney, log, won, jo, gainStat, mod, CHAR } from "../core.js"; import * as SYN from "../syn.js";` — core 함수는 **함수 안에서만** 부른다(순환 import).
- 난수는 인자 `r` 만(`Math.random` 금지). 돈 단위 만원, 물가 `SYN.pi(s)` 곱하기.
- 장면 형식·기본 효과 키(cash, hp, mental, eye, family, stat, ap, aff, flag)·판정(check)은 engine/jobs/README.md 1-5 와 같다. 원래 엔진의 전용 키 `pr_rating`, `cs_rep` 도 쓸 수 있다.
- 이벤트 고르기 방식은 `engine/jobs/tarot.js` 의 `evList`·`pickEvent` 를 본뜬다(seen, evT, 단계 ph, 꼭 나올 것 must, 30% 확률, rep 반복).
- 원래 엔진도 이벤트를 띄우므로 **한 달에 장면 하나 이하**, 이야기 이벤트끼리 간격 최소 1달.
- 실명·실제 회사·브랜드 금지(`python tools/brands.py --check` 0곳).
- 고치지 말 것: `core.js`, `defs.js`, `reg.js`, `ui.js`, `sj.js`, `story/index.js`, 다른 투잡 파일.
