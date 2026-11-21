# 투잡 플러그인 규약 (After 6PM v4)

새 투잡 하나는 **파일 두 개만** 쓰면 게임 전체에 붙는다.

| 파일 | 하는 일 |
|---|---|
| `web/engine/jobs/<key>.js` | 엔진: 상태·행동·월 정산·이벤트·순자산·대행 수익·할 일·본잡 전환·마일스톤·특전·시너지·저장 이전·미니게임 연결 |
| `web/jobs/<key>_ui.js` | 화면: 보드 페이지(`page`)·버튼 연결(`bind`)·타일·배경·행동 아이콘·홈 '바로 하기'·화보 배경 |

- `<key>` 는 `defs.js` 의 `SIDEJOBS` 키 그대로: `tarot`, `webnovel`, `tutoring`, `chicken`, `vibe`.
- 두 파일 모두 `export default { ... }` 로 객체 하나를 내보낸다. 자리 표시는 `export default null;` (= 건너뜀).
- **고치지 말 것:** `engine/jobs/index.js`, `jobs/index.js`(목록은 이미 5개 다 들어 있음), `core.js`·`defs.js`·`ui.js`·`sj.js`, `mg.js`·`mg2/*`·`deco/*`.
- 엔진 플러그인을 넣는 순간 `SIDEJOBS[key].play = true` 가 되어 투잡 탐색에서 '시작하기'가 생기고, 전체 메뉴('다른 투잡' 앞)에 칸이 생긴다.
- 화면 플러그인이 없으면(null) 행동 목록만 있는 기본 보드가 뜬다. 엔진부터 만들고 화면을 붙여도 된다.

연결 구조(참고): `engine/reg.js` 가 엔진 플러그인을 읽어 `D.ACTIONS`·`D.HUB`·`D.MOMENTS`·`D.PERKS`·`D.PERK_CINE`·`D.SYNERGY`·성향 카드 숨은 특성·지도 장소에 붙인다. `core.js`·`sj.js` 는 `REG.JOBS` 를 돌며 can/act/month/value/passive/todos/본잡 전환/저장 이전을 부른다. `ui.js` 의 `regUiPlugins()` 가 화면 플러그인을 `TILE`·`PAGE_BG`·`SJ_BG`·`ACT_IC`·`MGJ`·`CINE_BG`·`CINE_TAG`·pages 에 붙인다. 기존 5개(pr·cs·insta·airbnb·ucafe)는 예전 코드 그대로다.

---

## 1. 엔진 플러그인 `engine/jobs/<key>.js`

### 1-1. 가져오기(import)

```js
import * as D from "../defs.js";
import { addMoney, log, won, jo, gainStat, mod, creditRoom, addLoan, helperPower, applyEff, CHAR } from "../core.js";
import * as SYN from "../syn.js"; // SYN.on(s, "시너지id"), SYN.pi(s) = 물가 지수
```

- 순환 import 라서 **파일 맨 위(top-level)에서 core.js 함수를 부르면 안 된다.** 함수 안에서만 쓴다. `D`(defs)는 위에서 써도 된다.
- 돈 단위는 **만원**. 물가는 `SYN.pi(s)` 를 곱한다(ucafe.js 참고).
- 난수는 인자로 받는 `r` 만 쓴다: `r.chance(p)`, `r.int(a,b)`, `r.range(a,b)`, `r.pick(arr)`, `r.normal()`, `r.shuffle(arr)`. `Math.random` 금지(저장·재현이 깨짐).

### 1-2. 내보낼 것 한눈에

| 이름 | 필수 | 형식 | 설명 |
|---|---|---|---|
| `key` | O | `"tarot"` | SIDEJOBS 키 |
| `prefix` | O | `"tr_"` | 행동 접두사. 영문 소문자 2~4자 + `_`. 이미 쓰는 것 금지: `pr_ cs_ in_ ab_ uc_ sj_ hb_ bg_ co_ grad_` |
| `init(s)` | O | → 상태 객체 | 새 게임·처음 시작 때. 상태는 **`s[key]`** 에 저장된다(예: `s.tarot`) |
| `actions` | O | `{ tr_xxx: {...} }` | 행동 정의(아래 1-3) |
| `act(s, r, id, arg, boost)` | O | → `{ lines, msg, scene? }` | 행동 실행 |
| `month(s, r, notes, scenes)` | O | → 이번 달 이익(만원) | 월 정산. **투잡을 하고 있을 때만** 불린다 |
| `can(s, id, arg)` |  | → 막는 이유 문자열 또는 `null` | 행동 가능 여부(투잡 시작 여부·행동력·스태미너는 core 가 이미 검사) |
| `money` |  | `{ inc: [이름], exp: [이름] }` | 투잡 이익을 장부 이름으로 집계(권장, 1-6) |
| `monthStart(s, r)` |  | | 매달 시작 때(하고 있을 때만) |
| `idle(s, r, notes)` |  | | 투잡을 안 하고 있는 달에 |
| `value(s)` |  | → 만원 | 순자산에 더할 사업 자산(보증금·장비 중고값 등) |
| `passive(s)` |  | → 만원/월 | 대행을 맡겨 저절로 들어오는 돈(파이어 계산에 반영) |
| `slot(s)` |  | → bool | 매니저·대행을 두면 투잡 칸 +1 |
| `todos(s)` |  | → `[{lv, text, go?}]` | 홈 '이번 달 할 일'. `lv` 0~2(2=급함). `go` 생략하면 이 투잡 보드로 |
| `yearProfit(s)` |  | → 만원 | 최근 12달 이익(본잡 전환 때 어느 투잡이 1등인지). 생략하면 자동 집계(1-9) |
| `stopWhy(s)` / `onStop(s)` / `onStart(s)` |  | | 접기 막기 이유 / 접을 때 / 시작할 때 |
| `eff(s, eff, out, who)` |  | | 장면 선택지의 **전용 효과 키** 처리(1-7) |
| `choose` |  | `{ tr_ev(s, r, i, ok) → lines }` | 장면 `onChoose` 처리(1-7) |
| `migrate(s, st)` |  | | 저장 이전(1-10) |
| `mg` |  | `{ tr_read: "talk" }` | 미니게임을 부를 행동 → 쓰는 능력치(1-11) |
| `milestones` |  | `[{key, title, test, lines, who?, end?, kind?, epi?}]` | 큰 순간 화보(1-8). `end: true` 면 투잡 엔딩(1-8-1) |
| `perks`, `perkCine` |  | | 특전 카드와 그 화보(1-8) |
| `titleCine` |  | `{ "장면 제목": "화보키" }` | 제목으로 화보 붙이기 |
| `synergy` |  | `[{id, kind, n, need, desc, test}]` | 시너지(1-12) |
| `traits` |  | `[{trait, t, m}]` | 성향 카드 숨은 특성 추가(1-12) |
| `spots` |  | `{ 장소id: [행동id] }` | 지도 장소에도 행동 버튼 띄우기 |
| `info` |  | `{ inc, hours, ... }` | SIDEJOBS 소개 글 덮어쓰기(보통 안 씀) |
| `hubName` |  | `"타로"` | 전체 메뉴 칸 이름(기본 SIDEJOBS.n) |

### 1-3. 행동(actions)

`defs.js` 의 `ACTIONS` 와 같은 모양. 키는 반드시 `prefix` 로 시작.

```js
actions: {
  tr_read:  { n: "타로 상담", ap: 1, hp: 3, desc: "손님 한 명. 말빨·입소문 +" },
  tr_study: { n: "카드 공부", ap: 1, hp: 2, desc: "카드 뜻 외우기", stat: { sense: 0.5 } }, // stat: 자동으로 gainStat
  tr_shop:  { n: "출장 상담 지역 보기", ap: 1, hp: 2, pick: "trarea", desc: "지역을 골라요" },  // pick: 고르는 창(1-13)
  tr_agent: { n: "대행 맡기기/해지", ap: 0, hp: 0, desc: "수익 절반을 주고 맡겨요(투잡 칸 +1)" },
},
```

- 쓸 수 있는 칸: `n` 이름, `ap` 행동력, `hp` 스태미너 소모, `desc` 설명, `mental` 멘탈 변화, `cash`(음수 = 활동비, 자동 차감), `stat` 자동 능력치, `need(s)` 가능 조건, `pick` 고르기.
- `track: "일"` 은 자동으로 붙는다.
- `act` 의 `boost`: 카페·공유오피스 버프와 **미니게임 점수**(×0.7~1.5)가 곱해진 값. 핵심 행동의 효과에 곱한다.
- `arg`: 보드 버튼의 `data-arg` 값(예: 매장 id). 없으면 화면 플러그인 `defaultArg` 값.
- 돌려줄 것: `{ lines: ["짧은 효과", ...], msg: "한 줄 이야기", scene?: 장면 }`. `scene` 을 주면 바로 장면이 열린다.

### 1-4. 상태 `init`

```js
init: () => ({ v: 1, lv: 1, rep: 0, ap: 0, agent: false, hist: [], seq: 0 }),
```

- 저장은 JSON 이므로 **함수·Map·Set·Date 금지**. 숫자·문자·배열·객체만.
- `v`(상태 버전)를 넣어 두면 나중에 저장 이전이 쉽다.

### 1-5. 월 정산 `month` + 이벤트(scenes)

`ucafe.js` 의 `month`·`ucEvent` 와 같은 방식.

```js
month(s, r, notes, scenes) {
  const T = s.tarot, pi = SYN.pi(s);
  const rev = Math.round(T.clients * 4 * pi), cost = Math.round(5 * pi);
  s.cash += rev - cost; addMoney(s, "inc", "타로 상담료", rev); addMoney(s, "exp", "타로 비용", cost);
  T.ap = 0; T.hist.push(rev - cost); if (T.hist.length > 24) T.hist.shift();
  if (r.chance(0.03)) notes.push("근처에 타로 카페가 생겼다");      // notes: 월 정산 영수증에 한 줄
  else if (r.chance(0.06)) scenes.push(trEvent(s, r, rev));        // scenes: 다음 달 넘어갈 때 뜨는 장면
  return rev - cost;
},
```

**이벤트 장면 형식**(ucEvent 와 같다):

```js
function trEvent(s, r, rev) {
  const L = [
    { t: "단골의 고백", x: "석 달째 오는 손님이 카드를 덮었다. \"사실 이야기 들어 줄 사람이 필요했어요.\"",
      c: [ { t: "시간을 더 내 들어 준다", eff: { hp: -4, tr_rep: 3 }, text: "후기가 길게 달렸다." },
           { t: "다음 예약을 잡아 준다", eff: { cash: 3 }, text: "정기 손님이 생겼다." } ] },
    { t: "악플", x: "\"다 뻔한 말\" 리뷰가 달렸다.",
      c: [ { t: "정중하게 답글", check: { stat: "talk", dc: 40 },
             ok: { text: "오히려 신뢰가 올랐다.", eff: { tr_rep: 2 } },
             ng: { text: "말싸움이 됐다.", eff: { mental: -4 } } },
           { t: "무시한다", eff: {}, text: "조용히 묻혔다." } ] },
  ];
  const e = r.pick(L);
  return { kind: "event", tag: "타로", title: e.t, text: e.x, choices: e.c };
}
```

- `kind`: `"event"`(선택지) 또는 `"story"`(계속 버튼 하나: `choices: [{ t: "계속", eff: {}, text: "" }]`).
- `tag`: 장면 위 작은 꼬리표(투잡 이름).
- 선택지: `{ t, eff, text }` 또는 판정 `{ t, check: { stat, dc }, ok: {text, eff}, ng: {text, eff} }`. 성공 확률은 core 가 계산해 화면에 % 로 보여 준다.
- 기본 효과 키(core `applyEff`): `cash`, `hp`, `mental`, `eye`(회사 눈치), `family`, `stat: {talk: 1}`, `ap`(다음 달 행동력), `aff`(장면 인물 호감, `who` 필요), `flag`. 투잡 전용 키는 1-7.
- `who: "c012"` 를 넣으면 그 인물이 장면에 선다(관계 장면). 실제 사람 이름·실제 회사·브랜드명은 쓰지 않는다(`tools/brands.py --check`).
- 비용을 장면 안에서 고르게 하려면 `eff: { cash: -Math.round(rev * 0.1) }` 처럼 숫자를 미리 계산해 넣는다.

### 1-6. 투잡 이익 집계 `money`

연 수입(세금·본잡 전환), 월 기록 `s.hist[].px[key]` 에 쓰인다.

```js
money: { inc: ["타로 상담료"], exp: ["타로 비용"] },
```

- `addMoney(s, "inc"|"exp", 이름, 금액)` 로 장부에 적은 이름을 그대로 적는다. **행동(act)에서 바로 번 돈도** 같은 이름이면 함께 잡힌다.
- `money` 가 없으면 `month()` 가 돌려준 값만 이익으로 친다.
- 장부 이름은 다른 투잡과 겹치지 않게(앞에 투잡 이름을 붙인다).

### 1-7. 전용 효과 키 `eff` 와 장면 선택 처리 `choose`

```js
// 장면 선택지에 eff: { tr_rep: 3 } 처럼 쓰면 여기로 온다. out 에 화면에 보일 한 줄을 넣는다
eff(s, eff, out) { if (eff.tr_rep) { s.tarot.rep = Math.min(100, s.tarot.rep + eff.tr_rep); out.push(`타로 입소문 +${eff.tr_rep}`); } },

// 선택 결과로 복잡한 일을 해야 하면: 장면에 onChoose: "tr_ev" 를 넣고
choose: {
  tr_ev(s, r, i, ok) { // i = 고른 번호, ok = 판정 성공 여부(판정 없으면 null)
    if (i === 0 && ok) { s.tarot.rep += 5; return ["단골 +1"]; }
    return [];
  },
},
```

- `choose` 키와 전용 효과 키는 **접두사로 시작**(`tr_ev`, `tr_rep`). 장면에 임시 값을 넘기려면 `s._trEv = {...}` 처럼 `s._<접두사>` 를 쓴다(ucafe 의 `s._ucEv`).

### 1-8. 마일스톤·특전 카드·화보

```js
milestones: [ // 조건을 처음 채운 달에 화보 장면. key = 화보 키(img/cg/<key>_<n>.webp 가 있으면 그 그림, 없으면 배경)
  { key: "tr_first", title: "첫 손님", test: (s) => s.tarot.reads >= 1,
    lines: ["카드를 펼치는 손이 떨렸다.", "\"잘 맞아요!\" 한마디에 하루가 밝아졌다."] },
],
perks: [ // 특전 카드: m 의 키는 mod(s, "키", 기본값) 으로 읽는다
  { id: "p_tarot", n: "읽는 눈", line: "카드보다 사람이 먼저 보인다", pro: "타로 손님 +10%", m: { trMult: 1.1 },
    got: "타로 상담 50번", test: (s) => s.tarot.reads >= 50 },
],
perkCine: { p_tarot: "tr_first" }, // 특전을 받을 때 보여 줄 화보 키
```

- `test` 는 매달 모든 게임에서 불린다. **`s.tarot` 이 있다고 가정해도 된다**(newGame·load 가 항상 만든다).
- 화보 배경·꼬리표는 화면 플러그인 `cine` 에 적는다(2-3).
- 특전 효과 읽기: `mod(s, "trMult", 1)`(곱), `mod(s, "trBonus", 0)`(더하기). 기존 키와 겹치지 않게 접두사를 붙인다.

#### 1-8-1. 투잡 엔딩 (11-21 추가)

마일스톤에 `end: true` 를 달면 **투잡 엔딩**이 된다. 판 중에는 다른 마일스톤처럼 화보로 한 번 뜨고, 판이 끝나면 결산 화면의 '투잡 엔딩' 칸·'그 뒤의 이야기'(에필로그)·엔딩 도감(회차를 넘어 쌓임)에 오른다.

```js
milestones: [
  { key: "tr_end_wait", end: true, kind: "good", epi: "타로 예약은 지금도 3주 뒤까지 차 있다.",
    title: "예약 대기 3주의 리더", test: (s) => (s.tarot?.goodM || 0) >= 12, lines: ["재구매율 30%, 월 매출 200만을 1년 동안 지켰다."] },
  { key: "tr_end_witch", end: true, kind: "bad", epi: "타로는 결국 내려놓았다.", title: "탈진한 마녀", test: (s) => (s.tarot?.witch || 0) >= 2, lines: ["멘탈 0. 두 번째다."] },
],
```

| 칸 | 설명 |
|---|---|
| `end` | `true` 면 엔딩. 키는 **접두사로 시작**(`tr_end_…` 권장. 아니면 등록표가 경고) |
| `kind` | `"good"`(기본) 또는 `"bad"`(쓴 엔딩: 결산 화면에 '(쓴맛)' 표시) |
| `epi` | 판 끝 에필로그에 들어갈 한 줄(과거형 독백). 없으면 "투잡 이름: 제목" |
| `title` | 도감에는 "투잡 이름 · 제목" 으로 나온다. 앞의 "엔딩:" 은 자동으로 뗀다 |

- 투잡마다 **2~3개**: 보통 플레이에서 자주 받는 좋은 엔딩 1개(40~80%), 잘해야 받는 엔딩 1개(10~30%), 쓴 엔딩 1개(조건이 나쁠 때만). 같은 판에 여러 개 받을 수 있다.
- 숫자는 실제 고생과 실제 금액으로("월 150만 원 넘는 달이 스물네 달"). 회사·사람·브랜드 실명 금지.
- 연결 지점: `engine/reg.js` 의 `ENDS`(전체 목록: 기존 5개 투잡은 `defs.js` 의 `ME(...)`, 새 투잡은 이 플래그)와 `endsOf(s)`(이번 판에서 받은 것). `ui.js` 가 `ENDINGS`(엔딩 도감)·`ngEndRecord`(기억 포인트: 투잡 엔딩은 새것이 몇 개든 +1)·`jobEndCard`·`epilogue` 에서 읽는다.
- 화보 배경: 화면 플러그인 `cine` 에 키가 없으면 그 투잡 배경, 꼬리표는 "○○ 엔딩".
- 시험: `index.html#auto18-ending-jobend` → 엔딩 몇 개를 받은 결산 화면.

### 1-9. 본잡 전환(연 수입)

연말(12월)에 투잡 이익이 연봉의 1·1.5·2·3배를 넘으면 core 가 본잡 전환 장면을 띄운다. 이때 "가장 많이 번 투잡"을 고르려고 `yearProfit(s)` 를 부른다.

- 생략하면 최근 12달 `s.hist[].px[key]`(1-6 의 월 이익)를 더한다. 보통은 생략.
- 화보 키는 자동으로 `full_<key>` (배경은 화면 플러그인 `fullBg` 또는 `bg`). 장면·퇴사 처리는 core 가 한다.
- 전업 뒤 보너스를 주고 싶으면 `s.fullJob === "tarot"` 을 `month` 에서 확인한다.

### 1-10. 저장 이전 `migrate`

불러오기(`core.load`) 때마다 불린다. 옛 저장에 `s[key]` 가 없으면 core 가 먼저 `init(s)` 로 만든 뒤 부른다.

```js
migrate(s, T) { // T === s.tarot
  if (!T.v) { T.v = 1; }
  if (T.v < 2) { T.reads = T.reads || 0; T.v = 2; } // 새 칸을 넣었으면 옛 저장에 기본값
},
```

- 상태 구조를 바꿀 때마다 `v` 를 올리고 여기에 이전 코드를 더한다. 기존 칸을 지우지 말고 새 칸에 기본값을 준다.
- 플러그인을 다시 null 로 돌린 판을 불러오면 그 투잡은 하는 중 목록에서 빠진다(상태는 남는다).

### 1-11. 미니게임 연결 `mg`

```js
mg: { tr_read: "talk" }, // 이 행동을 할 때 한 달에 한 번 미니게임 제안, 건너뛰기 결과는 talk 능력치 기준
```

- 게임 파일은 `mg2/<key>1.js`·`<key>2.js`·`<key>3.js`(다른 도우미 담당). mg.js 가 이미 불러오고, `GAME = null` 이면 미니게임 없이 바로 행동한다.
- 점수는 `act` 의 `boost` 로 들어온다(×0.7~1.5). **핵심 행동의 효과에 `boost` 를 꼭 곱해야** 미니게임이 의미가 있다.
- 핵심 행동 하나만 연결한다(ui.js 의 `mgOffer` 참고: 파티룸 pr_manage, 무인카페 uc_check).

### 1-12. 시너지·숨은 특성·지도 장소

```js
synergy: [ // 투잡 탐색의 '투잡 궁합' 칸에 자동으로 나온다. 효과는 내 코드에서 SYN.on(s, id) 로 읽는다
  { id: "tr_book", kind: "good", n: "독서모임 × 타로", need: "독서모임 + 타로", desc: "상징 읽는 눈: 손님 +10%",
    test: (s) => !!s.sj?.active?.includes("tarot") && (s.hb?.joined || []).includes("book") },
  { id: "tr_late", kind: "bad", n: "야간 상담 × 회사", need: "타로 + 회사 다니는 중", desc: "늦은 상담: 매달 스태미너 −2",
    test: (s) => !!s.sj?.active?.includes("tarot") && !(s.co.quit || s.co.fired) },
],
traits: [ // 성향 카드에 숨은 특성 추가: 이 투잡을 시작하면 공개(core.reveal). m 은 mod() 키
  { trait: "insider", t: "타로 손님이 소개를 데려온다", m: { trMult: 1.05 } },
],
spots: { cafe: ["tr_read"] }, // 지도 장소 id(defs REGIONS 의 spots)에 행동 버튼 추가. 투잡을 안 하면 안 보인다
```

- 시너지 `id` 는 다른 시너지와 겹치지 않게(접두사 권장). 다른 투잡과의 시너지는 `s.sj.active.includes("pr")` 처럼 쓴다.
- 성향 카드 id 는 `defs.js` 의 `TRAITS`.

### 1-13. 고르기 창(pick)이 필요한 행동

`pick: "trarea"` 를 단 행동은 ui.js 의 `pickFor()` 가 처리하는데, 기존 pick 종류만 안다. 새 투잡은 **pick 대신 보드에서 버튼마다 `data-arg` 를 달아** 고르게 한다(무인카페 매장 버튼처럼). 지역 고르기도 보드에 버튼 줄로 만든다.

---

## 2. 화면 플러그인 `jobs/<key>_ui.js`

### 2-1. 내보낼 것

| 이름 | 필수 | 설명 |
|---|---|---|
| `key` | O | 엔진과 같은 키. 엔진 플러그인이 없으면 화면 플러그인도 무시된다 |
| `page(c)` | O | 보드 HTML 문자열. 맨 위에 `c.boardHead(key)` |
| `bind(c)` |  | 보드 버튼 연결. 이 투잡 보드가 화면에 있을 때만 불린다 |
| `ic` |  | 타일 아이콘 이름(ui.js `P` 아이콘표: spark, book, pen, cam, video, coin, glass, bld, door, users, msg, mega, wrench, search, heart, chart, brief …). 기본 SIDEJOBS.ic |
| `bg` |  | 배경 키(`img/bg/<bg>.webp`). 타일·보드 장면·투잡 탐색 배너에 쓴다. 있는 것: partyroom consult airbnb ucafe cafe popup online home realty pub wedding cowork library gallery desk apt rooftop alley gate parents pantry … (`img/bg/` 폴더·`gen/body.js` 의 BG. 없는 키면 기본 그림) |
| `sjBg` |  | 투잡 탐색 배너만 다르게 |
| `lock` |  | 잠긴 타일 문구(기본 "투잡 탐색에서 ○○ 시작") |
| `tile(S)` |  | 타일 작은 글(예: `"${S.tarot.clients}명"`) |
| `side(S)` |  | 홈 위쪽 꼬리표 한 줄(예: `"타로 Lv2"`) |
| `icons` |  | 행동 아이콘 `{ tr_read: "msg" }` (= ACT_IC) |
| `quick(S)` |  | 홈 '바로 하기'에 넣을 행동 id 하나(없으면 null) |
| `defaultArg(S, id)` |  | 홈·지도에서 누를 때 쓸 기본 arg(예: 관리가 가장 밀린 매장 id) |
| `fullBg` |  | 본잡 전환 화보 배경(기본 `bg`) |
| `cine` |  | 화보 키 → `[배경, 꼬리표]` (마일스톤·특전 화보) |
| `auto(c)` |  | `#auto18-<key>` 시험 때 시작 직후 상태 꾸미기 |

### 2-2. ctx(c) 로 받는 공용 도구

`c.S`(지금 게임 상태), `c.D`(defs), `c.E`(core), `c.SJ`, `c.SYN`, `c.REG`, `c.ui`, `c.esc`(HTML 이스케이프, **사용자·데이터 글은 꼭 감싼다**), `c.won`(만원 → "1억 2,000만"), `c.jo`(조사), `c.r1`, `c.toast(lines, msg)`, `c.save()`, `c.render()`, `c.go(page)`, `c.openWin(html, onBind)`, `c.closeWin()`, `c.actRow(id, arg, label)`, `c.boardHead(key)`, `c.meter(v, max, color)`, `c.ic(name)`, `c.img(src)`, `c.bgUrl(bgKey)`, `c.doAct(id, arg)`, `c.afterRes(res)`, `c.defaultArg(id)`, `c.FX`, `c.q(selector, fn)`(bind 에서 버튼 연결).

- `c.S` 는 부를 때마다 새로 받는다. 모듈 위쪽에 S 를 저장해 두지 않는다.
- 행동 버튼은 `c.actRow(id)` 또는 `<button class="btn sm" data-act="tr_read" data-arg="${id}">상담 ⚡1</button>` — `data-act` 는 ui.js 가 알아서 연결한다(미니게임·장면 포함). **bind 에서 다시 연결하지 않는다.**
- 엔진에 없는 화면 조작(가격 바꾸기·양도 등)은 `data-tr...` 속성을 만들고 `bind` 에서 `c.q("[data-trprice]", (el) => { 엔진함수(c.S, ...); c.save(); c.render(); })`.
- 엔진의 보조 함수(quote, contract 등)를 화면에서 쓰려면 엔진 파일에서 `export function` 으로 내보내고 `import * as T from "../engine/jobs/tarot.js"` 로 가져온다.
- CSS 는 기존 클래스만 쓴다: `card, row, grow, kv, k, v, tag, tiny, small, muted, gold, good, bad, btn sm gold danger, acts, room, body, nm, sec, pick, season, chips`. 인라인 style 은 조금만.

### 2-3. 예시

```js
// jobs/tarot_ui.js
export default {
  key: "tarot", ic: "spark", bg: "gallery",
  icons: { tr_read: "msg", tr_study: "book", tr_agent: "users" },
  tile: (S) => `손님 ${S.tarot.clients}명`,
  side: (S) => `타로 Lv${S.tarot.lv}`,
  quick: (S) => (S.tarot.agent ? null : "tr_read"),
  cine: { tr_first: ["gallery", "타로"] },
  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, T = S.tarot;
    return `${boardHead("tarot")}<div class="card"><h3>타로 <small>Lv${T.lv}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v">${won(T.hist.at(-1) || 0)}</div></div>
      <div><div class="k">입소문</div><div class="v gold">${Math.round(T.rep)}</div></div></div>
      ${meter(T.rep, 100, "var(--gold)")}
      <div class="row" style="margin-top:8px"><button class="btn sm" data-trprice="1">상담료 +1만</button></div></div>
      <div class="acts" style="padding:0">${actRow("tr_read")}${actRow("tr_study")}${actRow("tr_agent", undefined, T.agent ? "대행 해지" : "대행 맡기기")}</div>`;
  },
  bind(c) { c.q("[data-trprice]", (el) => { c.S.tarot.price = (c.S.tarot.price || 4) + +el.dataset.trprice; c.save(); c.render(); }); },
};
```

---

## 3. 엔진 예시 전체(작게)

```js
// engine/jobs/tarot.js
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod } from "../core.js";
import * as SYN from "../syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const needAp = (s) => (s.tarot.agent ? 0 : 1 + Math.floor(s.tarot.rep / 40));

function trEvent(s, r) { /* 1-5 형식 */ }

export default {
  key: "tarot", prefix: "tr_",
  init: () => ({ v: 1, lv: 1, rep: 0, clients: 0, ap: 0, agent: false, hist: [], reads: 0 }),
  actions: {
    tr_study: { n: "카드 공부", ap: 1, hp: 2, desc: "카드 뜻 외우기. 감각 +", stat: { sense: 0.5 } },
    tr_read: { n: "타로 상담", ap: 1, hp: 3, desc: "손님 한 명을 본다. 말빨·입소문 +" },
    tr_agent: { n: "상담 대행 맡기기/해지", ap: 0, hp: 0, desc: "후배에게 맡기고 수익 절반(투잡 칸 +1)" },
  },
  mg: { tr_read: "talk" },
  money: { inc: ["타로 상담료"], exp: ["타로 비용"] },
  can(s, id) { if (id === "tr_agent" && s.tarot.reads < 3) return "상담 3번부터"; return null; },
  act(s, r, id, arg, boost = 1) {
    const T = s.tarot;
    if (id === "tr_study") return { lines: ["카드 뜻 +"], msg: "타워 카드는 무섭게 생겼지만 늘 나쁜 뜻은 아니다." };
    if (id === "tr_read") {
      T.ap += boost; T.reads++; T.rep = clamp(T.rep + 2 * boost, 0, 100);
      const fee = Math.round(3 * boost * SYN.pi(s)); s.cash += fee; addMoney(s, "inc", "타로 상담료", fee); gainStat(s, "talk", 0.3);
      return { lines: [`상담료 +${won(fee)}`, "입소문 +"], msg: r.pick(["카드보다 손님 표정을 먼저 봤다.", "같은 카드도 사람마다 다르게 읽힌다."]) };
    }
    if (id === "tr_agent") { T.agent = !T.agent; return { lines: [T.agent ? "대행 계약" : "대행 해지"], msg: "" }; }
    return null;
  },
  month(s, r, notes, scenes) {
    const T = s.tarot, q = T.agent ? 1 : clamp(T.ap / Math.max(1, needAp(s)), 0, 1);
    T.clients = Math.round((2 + T.rep / 5) * (0.6 + 0.4 * q) * (SYN.on(s, "tr_book") ? 1.1 : 1) * mod(s, "trMult", 1));
    const rev = Math.round(T.clients * 4 * SYN.pi(s)), cost = 5 + (T.agent ? Math.round(rev * 0.5) : 0);
    s.cash += rev - cost; addMoney(s, "inc", "타로 상담료", rev); addMoney(s, "exp", "타로 비용", cost);
    T.ap = 0; T.hist.push(rev - cost); if (T.hist.length > 24) T.hist.shift();
    if (r.chance(0.06)) scenes.push(trEvent(s, r));
    return rev - cost;
  },
  value: (s) => 0,
  passive: (s) => (s.tarot.agent ? Math.max(0, s.tarot.hist.at(-1) || 0) : 0),
  slot: (s) => !!s.tarot.agent,
  todos(s) { const n = needAp(s); return s.tarot.ap < n ? [{ lv: 1, text: `타로 상담 ${s.tarot.ap}/${n}` }] : []; },
  stopWhy: (s) => (s.tarot.agent ? "대행을 먼저 해지하세요" : null),
  eff(s, eff, out) { if (eff.tr_rep) { s.tarot.rep = clamp(s.tarot.rep + eff.tr_rep, 0, 100); out.push(`타로 입소문 +${eff.tr_rep}`); } },
  migrate(s, T) { if (!T.v) T.v = 1; },
  milestones: [{ key: "tr_first", title: "첫 손님", test: (s) => s.tarot.reads >= 1, lines: ["카드를 펼치는 손이 떨렸다."] }],
  perks: [{ id: "p_tarot", n: "읽는 눈", line: "카드보다 사람이 먼저 보인다", pro: "타로 손님 +10%", m: { trMult: 1.1 }, got: "타로 상담 50번", test: (s) => s.tarot.reads >= 50 }],
  perkCine: { p_tarot: "tr_first" },
  synergy: [{ id: "tr_book", kind: "good", n: "독서모임 × 타로", need: "독서모임 + 타로", desc: "손님 +10%", test: (s) => !!s.sj?.active?.includes("tarot") && (s.hb?.joined || []).includes("book") }],
};
```

`trEvent` 는 1-5 의 예시를 그대로 쓰면 된다.

---

## 4. 시험하는 법 (v4 폴더 기준, 로컬 서버 http://localhost:8777/)

1. **클릭 흐름 시험(가장 중요):** `index.html#jobflow12-<key>`
   투잡 탐색에서 시작하기 → 보드 → 보드의 행동 버튼(`data-act^="<prefix>"`) → 12달 넘김 → 장면 처리 → 저장/불러오기까지 실제 버튼으로 돈다. 화면 아래에 `JOB FLOW OK <key>` 와 달마다 이익이 나오면 통과. 오류가 나면 `JOB FLOW FAIL` 과 오류 내용.
   ```
   "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=60000 --window-size=400,800 --dump-dom "http://localhost:8777/index.html#jobflow12-tarot" | grep -o "JOB FLOW[^<]*"
   ```
2. **보드 바로가기:** `index.html#auto18-<key>` (18달 자동 진행 뒤 이 투잡 보드). `auto(c)` 가 있으면 시작 직후 불린다.
3. **전체 흐름:** `index.html#flow40` → `FLOW OK`(기존 게임이 안 깨졌는지).
4. **실명 점검:** v4 폴더에서 `python tools/brands.py --check` → 0곳.
5. 끝나면 `node tools/build_sw.cjs`(오프라인 캐시 목록 갱신).

브라우저 콘솔의 `[투잡 등록표]` 경고는 규약 오류다(키·접두사·필수 함수·이름 겹침). 경고가 있으면 그 플러그인은 등록되지 않거나 그 항목만 빠진다.

## 5. 주의할 점

- 다른 파일을 고치지 않는다. 필요한 연결 지점이 없으면 직접 고치지 말고 요청한다.
- 행동 id·장부 이름·시너지 id·특전 id·mod 키·`s._` 임시 키·`data-` 속성은 **모두 접두사로 시작**(다른 도우미와 충돌 방지).
- `month` 는 투잡을 하는 달에만 불리지만 `value`·`passive`·`milestones.test`·`perks.test`·`synergy.test` 는 **안 하는 판에서도** 불린다. 상태가 비어 있어도 오류가 나지 않게 쓴다.
- 핵심 관리 행동을 안 하면 손해가 나는 구조(파티룸·무인카페처럼 `ap/needAp` 품질)로 만들면 '바쁘다'는 느낌이 산다. `todos` 로 밀린 일을 알려 준다.
- 숫자 균형: 기존 투잡의 월 순이익(무인카페 1곳 월 100만 안팎)·시작 자본(SIDEJOBS.cap)과 비슷한 크기로.
- 돈을 빌려야 하는 시작(가맹비 등)은 ucafe.js `contract` 처럼 `creditRoom`·`addLoan` 을 쓴다.
- 글은 짧은 문장, 존댓말 안내 + 반말 독백(기존 투잡 글 톤). 실명·실제 회사·브랜드명 금지.
