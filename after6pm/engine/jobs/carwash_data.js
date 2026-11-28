// 출장 세차 자료(11-27, 2단계 "세차는 아이템빨"): 용품 · 차 · 도장 상태 · 고객 · 거점 등급 · 세대 교체 · 시대별 비중.
// 이 파일에는 자료만 둔다. 줄을 더하면 게임에 그대로 늘어난다(엔진 carwash.js 는 꼬리표만 맞춘다).
// - 차 이름·용품 이름은 모두 지어낸 것이다. 실제 회사·모델 이름을 쓰지 않는다(python tools/brands.py --check).
// - 미래형 차(cls "fut")와 그 용품은 게임 속 설정이다. 실제 기술 설명이 아니다.
// 꼬리표는 두 가지다. ① 용품이 "해 주는 일"(숙제·요구를 채운다) ② 용품의 "성질"(금기에 걸린다).

// ── 꼬리표 이름 ──
export const TAGS = {
  // 해 주는 일
  soak: "불림(폼)", neutral: "중성 세정", lowwater: "물 조금만", safe: "잔흠집 방지", grit: "모래 거름",
  wheel: "휠 전용 세정", iron: "철분 제거", blow: "틈새 송풍", protect: "보호막", matte: "무광 전용", coat: "코팅 관리", bead: "물방울 맺힘",
  tire: "타이어 광", tar: "타르·벌레 제거", glass: "유리 세정·발수", decon: "표면 이물 제거", spot: "물자국 제거", salt: "하부 염분 헹굼", top: "천 지붕 전용",
  metal: "무도장 금속 전용", sensor: "카메라·센서 닦기", plastic: "무도장 플라스틱 관리", vac: "실내 청소", noscent: "무향", leather: "가죽 관리", wood: "원목 관리",
  satin: "새틴 무광 관리", cam2: "광각 카메라 닦기", cwheel: "세라믹 휠 세정",
  panel: "변색 패널 관리", solar: "태양광 지붕 세정", heal: "복원 필름 활성", hud: "유리 화면 세정", lidar: "센서 스킨 세정",
  // 성질(금기에 걸리는 쪽)
  gloss: "광택 성분", strong: "강한 약품", one: "통 하나", press: "고압", abr: "연마", scent: "향", wet: "물 많이", drip: "물자국 남음",
  // 처방 전체로 정해지는 것(엔진이 계산)
  t40: "40분 안에", t60: "60분 넘김", cheap: "재료비 1만 이하", pricey: "재료비 2만 넘김",
};
export const RISK = ["gloss", "strong", "one", "press", "abr", "scent", "wet", "drip", "t60", "pricey"]; // 성질 꼬리표(화면에서 붉게)

// ── 공정 칸 ── need: 꼭 골라야 하는 칸(다섯 공정) · 특수는 두 가지까지, 실내는 하나(of: 같은 종류의 용품을 쓰는 칸)
export const SLOTS = [
  { id: "pre", n: "프리워시", need: true }, { id: "wash", n: "본세차", need: true }, { id: "wheel", n: "휠·타이어", need: true },
  { id: "dry", n: "드라잉", need: true }, { id: "fin", n: "마무리", need: true }, { id: "spec", n: "특수 ①", need: false }, { id: "spec2", of: "spec", n: "특수 ②", need: false }, { id: "in", n: "실내", need: false },
];
export const TIER_N = ["", "입문", "중급", "장인"];

// ── 용품 ── cost 값(만원) · mat 한 대 재료비(만원) · min 걸리는 시간(분) · wt 무게 · tags 꼬리표
// start: 입문 가방에 들어 있음 · from: 가게에 풀리는 시점(게임 시작 뒤 달 수) · gen: 어느 차든 그 세대가 나온 뒤에 풀림
export const ITEMS = [
  // 프리워시
  { id: "p_spray", slot: "pre", tier: 1, n: "물 분무기", cost: 0, mat: 0.05, min: 4, wt: 1, tags: [], start: true },
  { id: "p_foam", slot: "pre", tier: 2, n: "중성 폼 분무기", cost: 18, mat: 0.25, min: 8, wt: 2, tags: ["soak", "neutral", "wet"] },
  { id: "p_alk", slot: "pre", tier: 2, n: "약알칼리 프리워시", cost: 22, mat: 0.3, min: 5, wt: 2, tags: ["soak", "strong", "wet"], memo: "빨리 불리지만 코팅을 깎아요" },
  { id: "p_less", slot: "pre", tier: 2, n: "워터리스 세정 스프레이", cost: 24, mat: 0.5, min: 7, wt: 1, tags: ["lowwater", "neutral"] },
  { id: "p_gun", slot: "pre", tier: 3, n: "충전식 고압 폼건(중성)", cost: 95, mat: 0.35, min: 5, wt: 6, tags: ["soak", "neutral", "press", "wet"], memo: "빠르지만 필름 끝·천 지붕에는 못 써요" },
  { id: "p_skin", slot: "pre", tier: 3, n: "센서 스킨 전용 폼", cost: 130, mat: 0.9, min: 9, wt: 2, tags: ["soak", "neutral", "lidar"], from: 168, memo: "게임 속 설정: 차 전체가 센서인 차에 써요" },
  // 본세차
  { id: "w_one", slot: "wash", tier: 1, n: "스펀지와 통 하나", cost: 0, mat: 0.1, min: 10, wt: 2, tags: ["one"], start: true },
  { id: "w_two", slot: "wash", tier: 2, n: "양모 미트와 통 둘", cost: 28, mat: 0.2, min: 13, wt: 4, tags: ["safe"] },
  { id: "w_rinse", slot: "wash", tier: 2, n: "린스리스 세차 세트", cost: 32, mat: 0.4, min: 12, wt: 2, tags: ["safe", "lowwater"], memo: "물 한 통으로 닦아요" },
  { id: "w_grit", slot: "wash", tier: 3, n: "미트 여러 장과 모래 거름판", cost: 70, mat: 0.3, min: 16, wt: 5, tags: ["safe", "grit"] },
  // 휠·타이어
  { id: "h_left", slot: "wheel", tier: 1, n: "남은 샴푸로 닦기", cost: 0, mat: 0, min: 4, wt: 0, tags: [], start: true },
  { id: "h_clean", slot: "wheel", tier: 2, n: "휠 전용 세정제와 솔", cost: 20, mat: 0.3, min: 7, wt: 2, tags: ["wheel"] },
  { id: "h_iron", slot: "wheel", tier: 3, n: "철분 제거제와 휠 안쪽 솔", cost: 60, mat: 0.7, min: 9, wt: 3, tags: ["wheel", "iron"] },
  { id: "h_cera", slot: "wheel", tier: 3, n: "세라믹 휠 세정제", cost: 85, mat: 0.9, min: 9, wt: 2, tags: ["wheel", "iron", "cwheel"], gen: 1, memo: "신형 고성능차의 새 휠 소재용" },
  // 드라잉
  { id: "d_towel", slot: "dry", tier: 1, n: "일반 타월", cost: 0, mat: 0.05, min: 8, wt: 1, tags: ["drip"], start: true },
  { id: "d_big", slot: "dry", tier: 2, n: "대형 드라잉 타월", cost: 15, mat: 0.1, min: 6, wt: 1, tags: [] },
  { id: "d_blow", slot: "dry", tier: 3, n: "충전식 송풍기와 타월", cost: 120, mat: 0.1, min: 9, wt: 6, tags: ["blow"] },
  // 마무리
  { id: "f_wax", slot: "fin", tier: 1, n: "물왁스", cost: 0, mat: 0.15, min: 5, wt: 1, tags: ["protect", "gloss"], start: true },
  { id: "f_seal", slot: "fin", tier: 2, n: "실런트", cost: 30, mat: 0.5, min: 9, wt: 1, tags: ["protect", "gloss", "bead"] },
  { id: "f_coat", slot: "fin", tier: 3, n: "코팅 관리제", cost: 65, mat: 0.8, min: 8, wt: 1, tags: ["protect", "gloss", "coat", "bead"] },
  { id: "f_matte", slot: "fin", tier: 3, n: "무광 전용 관리제", cost: 75, mat: 1.1, min: 8, wt: 1, tags: ["protect", "matte"] },
  { id: "f_carn", slot: "fin", tier: 3, n: "천연 고급 왁스", cost: 90, mat: 1.2, min: 14, wt: 1, tags: ["protect", "gloss", "bead"] },
  { id: "f_satin", slot: "fin", tier: 3, n: "새틴 무광 관리제", cost: 110, mat: 1.3, min: 9, wt: 1, tags: ["protect", "matte", "satin"], gen: 1, memo: "신형의 새 무광 색용" },
  { id: "f_heal", slot: "fin", tier: 3, n: "복원 필름 활성제", cost: 150, mat: 1.6, min: 10, wt: 1, tags: ["protect", "heal"], from: 132, memo: "게임 속 설정: 스스로 메워지는 필름을 깨워요" },
  // 특수
  { id: "s_tire", slot: "spec", tier: 2, n: "타이어 드레싱", cost: 12, mat: 0.2, min: 4, wt: 1, tags: ["tire"] },
  { id: "s_lens", slot: "spec", tier: 2, n: "카메라·센서 렌즈 닦이", cost: 14, mat: 0.2, min: 4, wt: 0.5, tags: ["sensor"] },
  { id: "s_glass", slot: "spec", tier: 2, n: "유리 세정·발수제", cost: 16, mat: 0.3, min: 6, wt: 1, tags: ["glass"] },
  { id: "s_tar", slot: "spec", tier: 2, n: "타르·벌레 제거제", cost: 18, mat: 0.4, min: 8, wt: 1, tags: ["tar"] },
  { id: "s_plastic", slot: "spec", tier: 2, n: "무도장 플라스틱 관리제", cost: 19, mat: 0.3, min: 6, wt: 1, tags: ["plastic"] },
  { id: "s_salt", slot: "spec", tier: 2, n: "하부 헹굼 노즐", cost: 25, mat: 0.1, min: 6, wt: 2, tags: ["salt", "wet"] },
  { id: "s_top", slot: "spec", tier: 3, n: "천 지붕 전용 세정 솔", cost: 38, mat: 0.5, min: 10, wt: 1, tags: ["top"] },
  { id: "s_spot", slot: "spec", tier: 3, n: "워터스팟 제거제", cost: 40, mat: 0.5, min: 8, wt: 1, tags: ["spot"] },
  { id: "s_metal", slot: "spec", tier: 3, n: "무도장 금속 전용 클리너", cost: 42, mat: 0.6, min: 9, wt: 1, tags: ["metal", "spot"] },
  { id: "s_clay", slot: "spec", tier: 3, n: "클레이 바와 윤활제", cost: 45, mat: 0.6, min: 15, wt: 1, tags: ["decon", "abr"] },
  { id: "s_lens2", slot: "spec", tier: 3, n: "광각 카메라 전용 닦이", cost: 55, mat: 0.4, min: 5, wt: 0.5, tags: ["sensor", "cam2"], gen: 1, memo: "신형의 새 카메라용" },
  { id: "s_panel", slot: "spec", tier: 3, n: "변색 패널 정전기 방지 천", cost: 140, mat: 1.0, min: 8, wt: 1, tags: ["panel"], from: 108, memo: "게임 속 설정: 색이 바뀌는 외장 패널용" },
  { id: "s_solar", slot: "spec", tier: 3, n: "태양광 지붕 세정액", cost: 120, mat: 0.8, min: 7, wt: 1, tags: ["solar", "glass"], from: 144, memo: "게임 속 설정: 지붕 발전 패널용" },
  { id: "s_hud", slot: "spec", tier: 3, n: "유리 화면 전용 세정 천", cost: 160, mat: 1.1, min: 7, wt: 1, tags: ["hud", "glass"], from: 192, memo: "게임 속 설정: 앞유리 전체가 화면인 차용" },
  // 실내
  { id: "i_handy", slot: "in", tier: 1, n: "핸디 청소기와 향 스프레이", cost: 8, mat: 0.2, min: 8, wt: 2, tags: ["vac", "scent"] },
  { id: "i_vac", slot: "in", tier: 2, n: "충전식 청소기와 무향 세정제", cost: 35, mat: 0.2, min: 12, wt: 4, tags: ["vac", "noscent"] },
  { id: "i_leather", slot: "in", tier: 3, n: "가죽 관리제와 청소기", cost: 55, mat: 0.7, min: 12, wt: 3, tags: ["vac", "noscent", "leather"] },
  { id: "i_lux", slot: "in", tier: 3, n: "가죽·원목 관리 세트", cost: 110, mat: 1.2, min: 16, wt: 4, tags: ["vac", "noscent", "leather", "wood"] },
];

// ── 도장 상태 ── need: 꼭 채울 숙제 · ban: 닿으면 사고
export const PAINTS = {
  std: { n: "순정 도장", need: [], ban: [] },
  coat: { n: "유리막 코팅", need: ["neutral"], ban: ["strong", "abr"], memo: "강한 약품과 연마는 코팅을 깎아요" },
  ppf: { n: "보호 필름", need: ["neutral"], ban: ["press"], memo: "필름 끝에 고압을 쏘면 들떠요" },
  matte: { n: "무광", need: ["matte"], ban: ["gloss", "abr"], memo: "광택 성분이 닿으면 번들거리는 얼룩이 남아요" },
  soft: { n: "부드러운 도장", need: ["safe"], ban: ["one", "abr"], memo: "통 하나로 닦으면 잔흠집이 남아요" },
  new: { n: "출고 한 달 신차", need: ["neutral"], ban: ["strong", "abr"], memo: "아직 손댈 게 없는 도장이에요. 약하게" },
  old: { n: "10년 묵은 차", need: ["decon"], ban: [], memo: "박힌 이물부터 떼야 닦여요" },
  repaint: { n: "최근 재도장", need: ["neutral"], ban: ["gloss", "abr"], memo: "도장이 굳는 동안에는 왁스·실런트를 올리지 않아요" },
};

// ── 차 갈래 ── price 차 기준가(기본 세차 한 대 값, 만원. 갈래·크기·손이 가는 정도로 정한다. 같은 차면 어느 거점에서 닦아도 같다. 일반차 4.5만이 바닥, 가장 비싼 차도 7만) · area 면적(체력) · pw 동력(시대별 비중에 쓰임: ice 일반 · perf 내연 고성능 · ev 전기 · fut 미래형) · paints 나올 수 있는 도장 상태
export const CLASSES = {
  dom: { n: "국산 준대형 세단", hw: "무난해요. 입문용", need: [], ban: [], price: 4.5, area: 1, pw: "ice", paints: ["std", "std", "coat", "new", "old"] },
  exec: { n: "국산 고급 세단(임원차)", hw: "기사 동행. 뒷좌석 실내가 중요", need: ["vac"], ban: [], price: 5, area: 1.1, pw: "ice", paints: ["std", "coat", "coat", "new"] },
  jhy: { n: "일본 고급 세단(엔진·모터 겸용)", hw: "도장이 무른 편. 잔흠집에 약함", need: ["safe"], ban: ["one"], price: 5, area: 1, pw: "ice", paints: ["std", "soft", "coat", "old"] },
  gblack: { n: "독일 대형 세단(검정 유광)", hw: "잔흠집이 조명에 다 보임", need: ["safe", "grit"], ban: ["one"], price: 5.5, area: 1.1, pw: "ice", paints: ["std", "coat", "ppf", "new", "repaint"] },
  gperf: { n: "독일 고성능 쿠페", hw: "브레이크 분진이 휠에 눌어붙음", need: ["wheel", "iron"], ban: [], price: 5.5, area: 1, pw: "perf", paints: ["std", "coat", "matte", "ppf"] },
  rear: { n: "독일 뒤엔진 스포츠카", hw: "앞부분 보호 필름. 틈새 물기", need: ["safe", "blow"], ban: ["press"], price: 6, area: 0.9, pw: "perf", paints: ["ppf", "ppf", "coat", "soft"] },
  super: { n: "이탈리아 미드십 슈퍼카", hw: "무른 도장, 낮은 차체, 카본 부품", need: ["safe", "grit", "blow"], ban: ["one", "abr"], price: 7, area: 0.9, pw: "perf", paints: ["soft", "ppf", "coat", "matte"] },
  brit: { n: "영국 초호화 세단", hw: "수작업 도장, 가죽·원목 실내", need: ["safe", "leather", "wood"], ban: ["one"], price: 7, area: 1.3, pw: "ice", paints: ["std", "coat", "soft"] },
  conv: { n: "컨버터블(천 지붕)", hw: "천 지붕은 전용 솔로. 고압 금지", need: ["top"], ban: ["press"], price: 5.5, area: 0.9, pw: "perf", paints: ["std", "coat", "soft"] },
  lsuv: { n: "대형 럭셔리 SUV", hw: "면적이 커서 체력이 듦. 진흙·타르", need: ["soak", "tar"], ban: [], price: 6, area: 1.4, pw: "ice", paints: ["std", "coat", "matte", "old"] },
  evsedan: { n: "전기 세단", hw: "통유리 지붕. 무광 랩핑이 많음", need: ["glass"], ban: [], price: 5, area: 1, pw: "ev", paints: ["matte", "matte", "coat", "new", "ppf"] },
  evsuv: { n: "전기 대형 SUV", hw: "카메라·센서가 많고 면적이 큼", need: ["sensor", "soak"], ban: [], price: 6, area: 1.4, pw: "ev", paints: ["std", "coat", "new", "matte"] },
  evsport: { n: "전기 고성능 스포츠카", hw: "공력 부품 틈새, 카본, 큰 브레이크", need: ["safe", "blow", "wheel"], ban: ["one"], price: 6, area: 0.9, pw: "ev", paints: ["ppf", "coat", "matte", "soft"] },
  evpick: { n: "전기 픽업(무도장 금속 패널)", hw: "도장이 없는 금속. 지문·물자국이 그대로 남음", need: ["metal", "blow"], ban: ["abr"], price: 6, area: 1.5, pw: "ev", paints: ["std"] },
  evcity: { n: "소형 전기 시티카", hw: "무도장 플라스틱 패널과 투톤", need: ["plastic"], ban: [], price: 4.5, area: 0.7, pw: "ev", paints: ["std", "new", "coat"] },
  classic: { n: "클래식카", hw: "단층 도장, 삭은 고무. 물을 거의 못 씀", need: ["lowwater", "safe"], ban: ["wet", "press", "strong", "abr"], price: 7, area: 1, pw: "perf", paints: ["std"] },
  fut: { n: "미래형 차", hw: "게임 속 설정의 차. 지금 용품으로는 안 돼요", need: [], ban: [], price: 6.5, area: 1.1, pw: "fut", paints: ["std", "new"] },
};

// ── 모델 ── cls 갈래 · need/ban 모델만의 숙제(없으면 생략) · cyc 완전 변경 주기(달, 최소~최대) · from 등장 시점(게임 시작 뒤 달 수)
// gens: 2세대부터의 변화. [그 세대에 새로 생기는 숙제(A에 필요), 세부 숙제(S에 필요), 한 줄 설명]. 자료가 끝나면 GEN_RULE 로 이어 만든다.
const g = (add, fine, memo) => ({ add: add ? add.split(",") : [], fine: fine ? fine.split(",") : [], memo });
export const MODELS = [
  // 국산 준대형 세단
  { id: "haeorum", cls: "dom", n: "해오름 3.3", cyc: [48, 60], gens: [g("", "glass", "유리 지붕이 달려 나왔다"), g("sensor", "glass", "앞뒤로 카메라가 늘었다")] },
  { id: "sonagi", cls: "dom", n: "소나기 터보", cyc: [40, 56], gens: [g("", "wheel", "휠이 커지고 안쪽이 깊어졌다"), g("", "sensor", "범퍼에 센서 덮개가 생겼다")] },
  { id: "gaon", cls: "dom", n: "가온 프리미어", cyc: [44, 60], gens: [g("", "bead", "새 도장 방식. 물이 잘 맺혀야 티가 난다"), g("glass", "", "통유리 지붕이 기본이 됐다")] },
  // 국산 고급 세단(임원차)
  { id: "cheongun", cls: "exec", n: "청운 L9", cyc: [48, 60], gens: [g("", "leather", "뒷좌석 가죽이 밝은색으로 바뀌었다"), g("sensor", "leather", "뒷좌석 화면과 카메라가 늘었다")] },
  { id: "taebaek", cls: "exec", n: "태백 리무진", cyc: [48, 60], gens: [g("", "noscent", "실내 향에 민감한 소재를 썼다"), g("leather", "", "가죽 면적이 두 배가 됐다")] },
  { id: "hanbit", cls: "exec", n: "한빛 프레스티지", cyc: [40, 56], gens: [g("", "glass", "뒷유리 가림막이 전동이 됐다"), g("safe", "glass", "검정 유광 한 색만 나온다")] },
  // 일본 고급 세단(엔진·모터 겸용)
  { id: "asuka", cls: "jhy", n: "아스카 350h", cyc: [48, 60], gens: [g("", "bead", "새 도장. 물 맺힘이 고와야 한다"), g("sensor", "", "앞 유리 위에 카메라 뭉치가 생겼다")] },
  { id: "miyabi", cls: "jhy", n: "미야비 HV", cyc: [44, 60], gens: [g("", "grit", "도장이 더 물러졌다는 말이 돈다"), g("glass", "grit", "유리 지붕이 달렸다")] },
  // 독일 대형 세단(검정 유광)
  { id: "kronen", cls: "gblack", n: "크로넨 S", cyc: [44, 60], gens: [g("", "blow", "문 손잡이가 숨는 방식이 됐다. 틈에 물이 고인다"), g("sensor", "blow", "그릴 전체가 센서 판이 됐다")] },
  { id: "altburg", cls: "gblack", n: "알트부르크 L", cyc: [48, 60], gens: [g("", "leather", "실내가 밝은 가죽으로 바뀌었다"), g("blow", "", "차체 이음매가 늘었다")] },
  { id: "nordstern", cls: "gblack", n: "노르트슈테른 8", cyc: [40, 56], gens: [g("", "coat", "출고 때 코팅이 올라간 채 나온다"), g("glass", "coat", "지붕이 통유리가 됐다")] },
  // 독일 고성능 쿠페
  { id: "munich", cls: "gperf", n: "뮌히 R-쿠페", cyc: [40, 56], gens: [g("cwheel", "", "세라믹 브레이크와 새 휠 소재"), g("cwheel", "blow", "공력 부품이 늘었다")] },
  { id: "eifel", cls: "gperf", n: "아이펠 트랙팩", cyc: [44, 60], gens: [g("", "blow", "뒷날개 틈이 깊다"), g("cwheel", "", "휠 소재가 바뀌었다")] },
  { id: "donau", cls: "gperf", n: "도나우 스포트", cyc: [36, 52], gens: [g("", "matte", "무광 한정판이 주력이 됐다"), g("satin", "", "새틴 무광 색이 나왔다")] },
  // 독일 뒤엔진 스포츠카
  { id: "schwaben", cls: "rear", n: "슈바벤 R6", cyc: [48, 60], gens: [g("", "wheel", "가운데 잠금 휠이 됐다"), g("cwheel", "", "휠 소재가 바뀌었다")] },
  { id: "neckar", cls: "rear", n: "네카어 플랫6", cyc: [44, 60], gens: [g("", "glass", "뒷유리가 넓어졌다"), g("sensor", "glass", "앞 범퍼 센서가 늘었다")] },
  // 이탈리아 미드십 슈퍼카
  { id: "rosso", cls: "super", n: "로쏘 V8", cyc: [48, 60], gens: [g("", "wheel", "카본 휠이 달린다"), g("cwheel", "", "휠 소재가 또 바뀌었다")] },
  { id: "toro", cls: "super", n: "토로 V12", cyc: [48, 60], gens: [g("", "matte", "무광 카본 부품이 드러나 있다"), g("satin", "", "새틴 무광 차체가 기본이 됐다")] },
  { id: "vento", cls: "super", n: "벤토 스파이더", cyc: [44, 60], gens: [g("", "glass", "엔진 덮개가 유리가 됐다"), g("glass", "wheel", "유리 면적이 더 늘었다")] },
  // 영국 초호화 세단
  { id: "highland", cls: "brit", n: "하이랜드 그랜드", cyc: [54, 60], gens: [g("", "grit", "수작업 도장이 더 두꺼워졌다"), g("glass", "grit", "별빛 천장 대신 유리 지붕")] },
  { id: "thames", cls: "brit", n: "템스 리무진", cyc: [54, 60], gens: [g("", "coat", "출고 코팅이 기본이 됐다"), g("sensor", "", "뒷좌석용 카메라가 붙었다")] },
  // 컨버터블(천 지붕)
  { id: "breeze", cls: "conv", n: "브리즈 로드스터", cyc: [44, 60], gens: [g("", "blow", "지붕 접히는 틈이 깊어졌다"), g("", "wheel", "휠이 커졌다")] },
  { id: "solea", cls: "conv", n: "솔레아 카브리오", cyc: [44, 60], gens: [g("", "leather", "밝은 가죽 실내가 늘 열려 있다"), g("blow", "", "뒷날개가 생겼다")] },
  // 대형 럭셔리 SUV
  { id: "titan", cls: "lsuv", n: "티탄 G", cyc: [48, 60], gens: [g("", "wheel", "23인치 휠이 기본이 됐다"), g("sensor", "", "사방에 카메라가 달렸다")] },
  { id: "highmoor", cls: "lsuv", n: "하이무어 4x4", cyc: [48, 60], gens: [g("", "plastic", "무도장 플라스틱 덧판이 늘었다"), g("glass", "plastic", "지붕이 통유리가 됐다")] },
  { id: "alphorn", cls: "lsuv", n: "알프호른 클래스", cyc: [44, 60], gens: [g("", "leather", "3열까지 가죽이다"), g("sensor", "leather", "센서가 늘었다")] },
  // 전기 세단
  { id: "lumen", cls: "evsedan", n: "루멘 E-세단", cyc: [36, 48], gens: [g("sensor", "", "기둥마다 카메라가 생겼다"), g("cam2", "", "카메라가 광각으로 바뀌었다")] },
  { id: "terawatt", cls: "evsedan", n: "테라와트 세단", cyc: [36, 52], gens: [g("", "blow", "문 손잡이가 숨는 방식이 됐다"), g("satin", "", "새틴 무광 색이 기본이 됐다")] },
  { id: "nabi", cls: "evsedan", n: "나비 E6", cyc: [40, 56], gens: [g("", "bead", "새 도장 방식"), g("sensor", "bead", "센서가 늘었다")] },
  // 전기 대형 SUV
  { id: "lumenx", cls: "evsuv", n: "루멘 X-SUV", cyc: [36, 48], gens: [g("glass", "", "통유리 지붕이 뒤까지 이어진다"), g("cam2", "glass", "카메라가 광각으로 바뀌었다")] },
  { id: "hanul", cls: "evsuv", n: "한울 E-SUV 7인승", cyc: [40, 56], gens: [g("", "vac", "3열 바닥이 평평해져 먼지가 잘 보인다"), g("cam2", "", "새 카메라")] },
  { id: "aurora", cls: "evsuv", n: "오로라 XL", cyc: [40, 56], gens: [g("", "plastic", "무도장 덧판이 늘었다"), g("glass", "plastic", "유리 지붕이 달렸다")] },
  // 전기 고성능 스포츠카
  { id: "sparkline", cls: "evsport", n: "스파크라인 GT", cyc: [36, 52], gens: [g("cwheel", "", "새 휠 소재"), g("cwheel", "sensor", "움직이는 공력 부품에 센서가 붙었다")] },
  { id: "lumentrack", cls: "evsport", n: "루멘 트랙 에디션", cyc: [36, 48], gens: [g("", "matte", "무광 카본 지붕"), g("satin", "", "새틴 무광 차체")] },
  // 전기 픽업
  { id: "steelback", cls: "evpick", n: "스틸백 픽업", cyc: [48, 60], from: 36, gens: [g("", "sensor", "짐칸에 카메라가 생겼다"), g("glass", "sensor", "지붕이 유리가 됐다")] },
  { id: "armor", cls: "evpick", n: "아머 트럭", cyc: [48, 60], from: 60, gens: [g("", "plastic", "아래쪽에 무도장 덧판이 붙었다"), g("cam2", "", "새 카메라")] },
  // 소형 전기 시티카
  { id: "kongal", cls: "evcity", n: "콩알 EV", cyc: [36, 48], gens: [g("", "glass", "유리가 넓어졌다"), g("sensor", "", "주차 카메라가 사방에 생겼다")] },
  { id: "minimo", cls: "evcity", n: "미니모 투톤", cyc: [36, 52], gens: [g("", "matte", "지붕만 무광이다"), g("satin", "", "지붕이 새틴 무광이 됐다")] },
  { id: "dotori", cls: "evcity", n: "도토리 시티", cyc: [40, 56], gens: [g("", "wheel", "휠 덮개가 복잡해졌다"), g("glass", "", "통유리 지붕")] },
  // 클래식카(수집가)
  { id: "c83", cls: "classic", n: "83년식 라인 쿠페", cyc: [0, 0], gens: [] },
  { id: "c71", cls: "classic", n: "71년식 로쏘 GT", cyc: [0, 0], gens: [] },
  { id: "c89", cls: "classic", n: "89년식 슈바벤 공랭", cyc: [0, 0], gens: [] },
  { id: "c66", cls: "classic", n: "66년식 브리즈 로드스터", cyc: [0, 0], need: ["top"], gens: [] },
  { id: "c94", cls: "classic", n: "94년식 아스카 쿠페", cyc: [0, 0], gens: [] },
  // 미래형(게임 속 설정. 시간이 지나야 나온다)
  { id: "chameleon", cls: "fut", n: "카멜레온 패널 쿠페", from: 108, need: ["panel", "safe"], ban: ["gloss", "abr"], hw: "게임 속 설정: 외장 패널 색이 바뀐다. 광택 성분이 닿으면 색이 얼룩진다", cyc: [36, 48], gens: [g("", "blow", "패널 조각이 잘게 나뉘었다"), g("sensor", "blow", "패널마다 센서가 들어갔다")] },
  { id: "selfheal", cls: "fut", n: "리본 세단", from: 132, need: ["heal", "neutral"], ban: ["abr", "strong"], hw: "게임 속 설정: 스스로 메워지는 필름이 차 전체를 덮는다. 문지르거나 센 약품을 쓰면 필름이 죽는다", cyc: [36, 48], gens: [g("", "glass", "유리에도 필름이 올라갔다"), g("cam2", "", "새 카메라")] },
  { id: "solarwing", cls: "fut", n: "솔라윙 왜건", from: 144, need: ["solar", "blow"], ban: ["press"], hw: "게임 속 설정: 지붕과 보닛이 발전 패널이다. 물자국이 남으면 발전량이 떨어진다", cyc: [36, 48], gens: [g("", "sensor", "패널 사이에 센서가 생겼다"), g("cam2", "", "새 카메라")] },
  { id: "nuri", cls: "fut", n: "누리 셔틀", from: 168, need: ["lidar", "vac"], ban: ["press", "strong"], hw: "게임 속 설정: 운전대가 없다. 차 겉면 전체가 센서 스킨이다", cyc: [36, 48], gens: [g("", "noscent", "여럿이 타는 차라 향을 꺼린다"), g("glass", "noscent", "벽면이 유리가 됐다")] },
  { id: "glasscockpit", cls: "fut", n: "글래스콕핏 GT", from: 192, need: ["hud", "safe"], ban: ["strong"], hw: "게임 속 설정: 앞유리 전체가 화면이다. 일반 유리 세정제를 쓰면 화면 막이 상한다", cyc: [36, 48], gens: [g("", "blow", "화면이 옆 유리까지 이어졌다"), g("cam2", "blow", "새 카메라")] },
];
// 자료에 없는 세대(4세대~)는 이 표를 돌려 가며 만든다(모델 id 와 세대 번호로 정해져 판마다 같다)
export const GEN_RULE = [g("sensor", "", "센서가 또 늘었다"), g("", "glass", "유리 면적이 넓어졌다"), g("cam2", "", "카메라가 바뀌었다"), g("", "blow", "차체 틈이 늘었다"), g("", "bead", "도장 방식이 바뀌었다"), g("glass", "sensor", "유리와 센서가 함께 늘었다")];

// ── 고객 아홉 유형 ── want 요구 둘(S 조건) · ban 금기 하나 · px 지불 의사(시세의 몇 배까지 받아들이는지. 자동으로 더 받는 값이 아니다) · paints 이 도장 상태일 때만 · cls 이 갈래일 때만 · win 잘 맞추면 얻는 것(엔진이 읽는 키)
export const CUSTS = {
  mania: { n: "동호회 마니아", want: ["grit", "blow"], ban: "one", say: "잔흠집 0, 공정 설명", hate: "통 하나로 닦기", win: "club", winN: "동호회에 소문(고급차 손님 +)", px: 1.1 },
  boss: { n: "바쁜 임원", want: ["t40", "vac"], ban: "t60", say: "정해진 시간 안에, 실내 깔끔", hate: "차를 오래 세워 두기", win: "corp", winN: "임원 지정석이 늘어요", px: 1.1, memo: "법인 계약의 임원 지정석 차량. 창구는 수행 기사나 총무 담당이에요" },
  fleet: { n: "법인 차량 담당", want: ["t40", "cheap"], ban: "t60", say: "일정 엄수, 단가", hate: "회차 밀림", win: "more", winN: "대수 늘림", px: 0.9 },
  newcar: { n: "신차 출고 고객", want: ["neutral", "coat"], ban: "strong", say: "코팅 안 상하게", hate: "강한 약품", win: "stay", winN: "정기 전환(잘 안 끊어요)", px: 1, paints: ["new", "coat", "ppf"] },
  kids: { n: "아이 키우는 집", want: ["vac", "noscent"], ban: "scent", say: "실내, 무향", hate: "향 센 약품", win: "refer", winN: "같은 동 소개", px: 1 },
  seller: { n: "중고로 팔 사람", want: ["bead", "tire"], ban: "pricey", say: "오늘 하루 번쩍", hate: "비싼 견적", win: "once", winN: "한 번에 큰 건(정기는 아님)", px: 1.5, svcMax: 1, paints: ["std", "old", "coat", "soft"] },
  matteowner: { n: "무광 오너", want: ["matte", "blow"], ban: "gloss", say: "얼룩 없이", hate: "광택제", win: "px", winN: "값을 더 불러도 받아들여요", px: 1.25, paints: ["matte"] },
  photo: { n: "사진 올리는 사람", want: ["bead", "tire"], ban: "drip", say: "물방울 맺힘, 타이어 광", hate: "물자국", win: "insta", winN: "인별 문의 +", px: 1.05, paints: ["std", "coat", "soft", "ppf", "new"] },
  collector: { n: "수집가", want: ["lowwater", "grit"], ban: "wet", say: "원래 도장 보존", hate: "물 많이 쓰기", win: "hidden", winN: "히든 길이 열려요", px: 1.2, cls: ["classic"] },
};

// ── 서비스 상품 ── 단가 = 차 기준가 × 상품 배율(k) × 내 가격 수준. 품을 더 들여 더 비싸게 판다. 가장 비싼 조합(기준가 7만 × 프리미엄 1.9배 = 13.3만)은 S 덤과 더 부르기(+25%)를 얹어도 일반차 기본 세차(4.5만)의 4배에 못 미친다
// min 더 걸리는 시간(분, 체력에 걸린다) · mat 더 드는 재료비 · und 팔 수 있는 업의 이해도 · 숙제 깊이: 기본 = 도장 상태 + 그 갈래의 첫 숙제 / 꼼꼼 = 그 차의 숙제 전부 / 프리미엄 = 세부 숙제까지 숙제
export const SVC = [
  { id: "basic", n: "기본 세차", k: 1, min: -10, mat: 0, und: 0, memo: "겉을 깨끗이. 도장 상태와 그 차의 첫 숙제만 맞추면 돼요" },
  { id: "detail", n: "꼼꼼 세차", k: 1.45, min: 0, mat: 0, und: 72, memo: "실내·휠·틈새까지. 그 차의 숙제를 다 채워야 해요" },
  { id: "prem", n: "프리미엄 케어", k: 1.9, min: 25, mat: 0.5, und: 360, memo: "코팅 관리·가죽·세부 마감까지 해요. 25분이 더 걸리고 재료비가 더 들어요. 신형 차는 세부 숙제 하나도 꼭 채워야 해요" },
];

// ── 거점 등급 ── 등급은 값을 올리지 않는다. "어떤 차가 오나(pool) + 어떤 상품이 팔리나(svc: 기본·꼼꼼·프리미엄 비중)"만 정한다 · short 좁은 화면용 이름 · cap 정기 고객 자리 · dc 승인 난이도 · need 열리는 조건(업의 이해도 점수 · 손재주 · 누적 대수) · pool 들어오는 갈래 · cust 오는 고객
export const TIERS = [
  { n: "일반 아파트", svc: [1, 0, 0], memo: "무난한 차. 기본 세차. 버튼 한 번으로 돌아요" },
  { n: "고급 주상복합", svc: [0.45, 0.42, 0.13], cap: [8, 12], dc: [50, 75], need: { und: 0, hands: 0, washes: 120 }, pool: ["dom", "exec", "jhy", "gblack", "gperf", "lsuv", "evsedan", "evsuv", "evcity"], cust: ["kids", "newcar", "photo", "seller", "mania", "matteowner"] },
  { n: "동호회 모임", svc: [0.15, 0.45, 0.4], cap: [7, 10], dc: [55, 80], need: { und: 180, hands: 35, washes: 300 }, pool: ["gperf", "rear", "super", "conv", "evsport", "evpick", "lsuv", "fut"], cust: ["mania", "photo", "matteowner", "newcar", "seller"] },
  { n: "하이엔드 빌라·아파트·타운하우스 단지", short: "하이엔드 단지", svc: [0.1, 0.35, 0.55], cap: [6, 9], dc: [65, 90], need: { und: 540, hands: 55, washes: 600 }, pool: ["gblack", "brit", "super", "rear", "conv", "lsuv", "evsport", "classic", "fut"], cust: ["newcar", "mania", "photo", "kids", "matteowner", "collector"] }, // 한 집에 차가 두세 대. 세컨드카·주말용 차. 관리인을 통해 들어간다. 임원 차량은 여기가 아니라 법인 계약의 임원 지정석
];
export const TIER_BLD = [null, ["강변 주상복합", "역세권 주상복합", "타워형 레지던스", "호수공원 주상복합"], ["일요일 아침 동호회 모임", "서킷 동호회 차고", "카페 주차장 정기 모임"], ["언덕 위 하이엔드 빌라", "숲길 타운하우스 단지", "한강 조망 하이엔드 아파트", "호숫가 타운하우스", "남산 자락 하이엔드 빌라", "공원 앞 하이엔드 아파트"]];

// ── 시대 흐름 ── y 게임 시작 뒤 햇수부터 · 동력별 비중 배율. 해가 갈수록 전기차가 늘고, 내연 고성능차(perf)는 수집가 쪽으로 넘어간다(collect: 수집가가 내연 고성능차를 들고 올 확률)
export const ERAS = [
  { y: 0, ice: 1, perf: 1, ev: 0.5, fut: 0, collect: 0 },
  { y: 4, ice: 0.95, perf: 0.9, ev: 0.9, fut: 0, collect: 0.05 },
  { y: 8, ice: 0.8, perf: 0.7, ev: 1.5, fut: 0.6, collect: 0.15 },
  { y: 13, ice: 0.6, perf: 0.45, ev: 2.2, fut: 1, collect: 0.3 },
  { y: 18, ice: 0.45, perf: 0.25, ev: 3, fut: 1.4, collect: 0.45 },
];

// ── 업의 이해도(세차·컨설팅·과외 공통 개념) ── 점수는 상한이 없다. 맞춘 처방(노트) 한 장마다 어려운 조합일수록 크게 더해지고, 장수가 늘수록 덜 오른다(slow 장마다 절반 쪽으로).
// ranks: 등급 이름과 문턱. 마지막 등급 뒤로는 dan 점마다 "○단". stale: 신형이 나와 구형이 된 노트가 치는 몫 · month: 일한 달마다(monthMax 달까지) · stage: 중반·후반으로 넘어가는 점수
// top: 업계 상위 %(게임 속 가상 순위) 곡선의 눈금 · hid: 전생에서 가져온 점수 이만큼마다 처음 보는 차의 ??? 하나가 덜 가려진다 · bid: 법인 입찰 관문에 필요한 점수
export const UND = { ranks: [["입문", 0], ["견습", 100], ["숙련", 300], ["전문", 600], ["장인", 1000], ["명인", 1500]], dan: 600, scale: 1.2, stale: 0.4, slow: 40, month: 0.5, monthMax: 240, stage: [180, 960], top: 400, hid: 180, bid: 36 };
// scale(11-28): 투잡마다 점수 눈금을 맞춘다. 기준은 "오토 봇 10년 차 가운데 값 ≈ 1,000점". 세차는 잰 값이 853점이라 쌓이는 양에 1.2를 곱하고, 문턱(상품 72·360, 거점 180·540, 단계 180·960, 입찰 36, 전생의 감 180, 임원 지정석 1,200, 실력 웃돈 3,600)도 같은 배수로 옮겼다. 밸런스는 그대로고 점수만 달라진다. 전생에서 받은 점수(undBase)는 새 눈금 그대로 더한다

// ── 시세와 내 단가 ── 값은 정해진 것이 아니다. 서비스 상품(기본·꼼꼼·프리미엄)마다 시세가 따로 움직이고, 내 가격 수준은 상품마다 "기준가의 몇 %"로 정한다(drift·rival 은 상품 순서. ref 는 화면에 보여 줄 기준 차 갈래).
// 시세가 움직이는 까닭(모두 게임 속 설정): drift 해마다 [변하는 폭, 닿는 끝] — 기본 세차는 예약 앱 업체가 늘어 내려가고 프리미엄은 맡길 손이 귀해져 오른다 · rival 주변 경쟁자(±, rivalLen 달쯤마다 바뀜)
// season 달별(봄·가을 먼지 철엔 오르고 장마·한겨울엔 내린다) · wet 그 달의 비·결빙 주 하나마다
// 문의 곡선: 체감 가격 x = 내 단가 ÷ 시세 ÷ (1 + 실력 웃돈) ÷ 고객의 지불 의사. x ≤ 1 이면 1 + cheap×(1−x) (cheapMax 까지), x > 1 이면 1 − dear×(x−1) (0 까지)
// tol 실력 웃돈: 업의 이해도(und 점에 1, undMax 까지) + 거점 평판((평판−50)÷sat, satLo~satHi) + 노트 가운데 S 비율×s
// churn 달마다 값 때문에 끊는 확률 = (x − from)×k (max 까지) · raise 값을 올린 순간 떠나는 몫 = 올린 폭×k + (big 넘게 올린 폭)×bigK, 올리고도 시세 아래면 ×under
// quote 처방 카드에서 그 고객에게 부르는 값(깎아 주기 · 내 단가 · 더 부르기 · 크게 부르기) · auto 오토: 시세의 k 배 + 실력 웃돈의 tol 몫만, lag 달 늦게, 한 달에 step %p 씩만 · ask 문의 감(문턱, 말) · ref 화면에 보여 줄 기준 차 갈래
export const MARKET = {
  step: 5, min: 50, max: 200, ref: "dom",
  drift: [[-0.006, 0.9], [0.003, 1.06], [0.006, 1.12]],
  rival: [0.07, 0.05, 0.04], rivalLen: 18,
  season: { 3: 0.03, 4: 0.05, 5: 0.03, 6: -0.04, 7: -0.06, 9: 0.02, 10: 0.03, 12: -0.03, 1: -0.05, 2: -0.03 }, wet: -0.01,
  cheap: 0.8, cheapMax: 1.35, dear: 1.6,
  tol: { und: 3600, undMax: 0.25, sat: 400, satLo: -0.1, satHi: 0.12, s: 0.08 },
  churn: { from: 1.1, k: 0.25, max: 0.3 }, raise: { k: 0.4, big: 0.1, bigK: 1.2, under: 0.5 },
  quote: [0.9, 1, 1.25, 1.5], overSat: [10, 6], // overSat: 지불 의사를 넘게 불렀을 때 깎이는 평판 = 넘은 폭 × 10 (6까지)
  auto: { k: 0.96, tol: 0.3, lag: 2, step: 2 },
  ask: [[1.15, "많음"], [0.8, "보통"], [0.35, "드묾"], [-1, "거의 없음"]],
};

// ── 날씨가 부르는 용품 ── 그 달에 가방에 있으면 덤, 고급 거점에서 없으면 흠
export const WX_NEED = { spot: { n: "비 온 뒤 물자국", tag: "spot" }, salt: { n: "겨울 염화칼슘", tag: "salt" } };
