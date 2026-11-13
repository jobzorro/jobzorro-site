// 내 상황 판단 엔진 (F 규칙) — v0.7 (2026-11-12 판단 로직 검토 반영: 자료 부족 상한·공기업 나이 규칙·연봉 역전·금융 회사 수준·평균만 있는 회사·나이 완충. rules/fit_rules.md 13장)
//   v0.6 (2026-10-31, 6회차 문답지: 연봉 낮은 회사는 협상 조건·문구 정리. 워라밸 강하게는 사이트 meWlb)
// 규칙 설명은 rules/fit_rules.md 6장. 숫자는 아래 FIT 한곳에만 둔다.
// 브라우저(사이트)와 node(fit_test.js) 둘 다에서 돈다. 입력은 서버로 보내지 않는다.
(function (root) {
  "use strict";

  // ── 기준값 (1회차 문답지 답) ─────────────────────────
  const FIT = {
    same_min_won: 500,          // F1 같은 급: 총액 +500만 이상
    prime_min_won: 700,         //    30대 초중반(만 30~35세, 황금기)은 +700만
    prime_age: [30, 35],
    down_min_won: 500,          // F3 아래 급: +500만 초과
    down_min_pct: 15,           //    그리고 15% 이상
    tenure_min: 2,              // F4 지금 회사 최소 근속(년)
    tenure_min_new: 3,          //    신입(첫 회사)
    moves_warn_10y: 4,          // F5 경력 10년 안 이직 횟수 경고
    job_change_max_years: 5,    // F6 직무 전환 가능 연차
    public_to_private_max: 7,   // F18 공공→민간 연차
    wlb_pct_per_step: 7.5,      // F8 야근 10시간 = 15% → 워라밸 한 단계(약 5시간) = 7.5%. 나빠지는 쪽도 같은 비율
    big_gain_pct: 20,           // F4 예외: 체감(연봉+워라밸) 20% 이상이면 신입 3년 기준 무시 (단, 2년은 채움)
    factory_won: 1000,          // F9 지방 공장·산단 근무 = 연봉 1천만 원 손해로 본다
    base_cut_max_pct: 10,       // F2 성과급 큰 회사: 계약연봉은 10%까지만 깎여도 되고, 총액은 올라야 함
    // F11 선퇴사 [경력 4년 이상?][공백 1년 넘음?] → 연봉 기준을 몇 배로 (1 그대로, 0.5 조금 낮춤, 0 깎이지만 않으면)
    left_factor: { "long,short": 1, "long,gap": 0.5, "short,short": 1, "short,gap": 0 },
    avg_tenure_apply_min: 2,    // F23 평균 근속이 이보다 짧고
    last_tenure_apply: 3,       //     마지막 회사 3년 전이면 지원 보류
    newbie_age: { "남": 30, "여": 28 }, // F21 만 나이 이 이상이면 신입으로 늦은 편 (5회차 A4, 중고신입은 경력만큼 1~2살 더)
    abs_size_ratio: 3,          // 11-14 사용자: 급 이름(대기업집단 계열·중견)과 실제 회사 크기가 반대로 3배 넘게 차이 나면 급이 오르내리는 이동으로 보지 않는다 (매출 먼저, 없으면 직원 수)
    tier_up_cut_pct: 10,        // 5회차 D4: 회사 급이 2단계 이상 오르거나 공기업이면 경력도 10%까지 삭감 허용
    spec_cut: [3.7, 3.4, 2.7, 2.0, 1.2],  // 신입 스펙 등급 SS·S·A·B·C 기준 평균 (그 아래는 D). 2026-10-28 사용자: 6단계, 수도권4년제·경영·토익850·인턴1=B, SKY·950·인턴2·전공일치=SS
    left_gap_cut_pct: 5,        // F11 3회차 C3: 선퇴사 + 공백 1년 넘은 4년 차 이상은 5%까지 삭감도 '조건 보고'
    down_cond_pct: 10,          // F3 4회차 C2: 아래 급 +500만 넘고 10~15%면 '조건 보고'(지금 회사 평점이 더 낮을 때)
    rating_min: 3.0,            // 조로 규칙 3.0 기준 — 갈 회사 평점이 이보다 낮으면 확인
    job_hop_avg: 2,             // 4회차 A4: 한 곳 평균 근속 2년 미만이면 '잦은 이직'
    pay_low_light_pct: 5,       // 6회차 B3: 갈 회사 연봉이 5%까지 낮으면 '조금 낮아요'로만 가볍게
    wlb_big_pay_pct: 20,        // 6회차 A6: 워라밸 중요한 사람도 연봉 20% 이상 오르면 한 단계 덜 내림
    pay_low_warn_pct: 15,       //           5~15%는 '협상이 관건', 15% 넘으면 '기대치가 높거나 빡셀 수 있어요' + 판정 '중립기어'까지
    est_same_pct: 5,            // 11-12 F8: 추정 연봉이 5%까지 낮은 건 '지금과 비슷'으로 본다 (추정치 1% 차이로 판정이 뛰지 않게)
    newbie_years_max: 4,        // 11-12 F11: 신입·중고신입 칸은 경력 4년까지만. 넘으면 경력 이직 기준으로 안내
    avg_low_pct: 30,            // 11-12 F8 보완: 평균만 있는 회사의 전 직원 평균이 내 연봉보다 이만큼(%) 이상 낮으면 '조건 보고 가세요'까지 (버거킹 평균 1,530만에 5,000만인 사람이 '가세요'가 나오던 것)
    lack_cap: 5,                // 11-12 F1: 판단자료 부족 회사는 '가세요'까지만 ('무조건 가세요' 없음)
    fin_avg: [7000, 5000],      // 11-12 F7: 금융사 회사 수준은 인원 말고 평균 연봉으로 — 7,000만 이상 대기업 수준(3), 5,000만 이상 중견 수준(2), 그 아래 1 (사이트 coLevel 이 씀). 중견 기준은 사용자 결정: 6,000만으로 했다가 같은 날 5,000만으로 넓힘
  };

  // 받침 따라 조사 고르기: j("건설", "은", "는") → "건설은"
  function j(w = "", a, b) { const c = w.charCodeAt(w.length - 1); const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; return w + (has ? a : b); }

  // 회사 급: 숫자가 클수록 위. 스타트업·외국계·공공은 따로 표시해 조건을 붙인다.
  function tier(size = "") {
    if (/스타트업/.test(size)) return { n: 1, kind: "startup" };
    if (/금융|은행|증권|보험|카드|캐피탈/.test(size)) return { n: 3, kind: "finance" };   // 금융권은 대기업과 따로 (2026-10-27 사용자)
    if (/외국계/.test(size)) return { n: 3, kind: "foreign" };
    if (/공기업|공공/.test(size)) return { n: 3, kind: "public" };
    if (/대기업/.test(size)) return { n: 3, kind: "" };
    if (/중견/.test(size)) return { n: 2, kind: "" };
    return { n: 1, kind: "" }; // 중소·모르면
  }
  // 11-12 F7: 사이트가 회사 자료로 정한 수준(tier_n)이 있으면 그 값을 쓴다 (금융사는 인원이 아니라 평균 연봉으로 수준을 본다)
  function tierOf(o = {}) { const t = tier(o.size); return o.tier_n != null ? { ...t, n: o.tier_n } : t; }

  // 워라밸 단계: 1 칼퇴 ~ 4 매일 야근
  function wlb(w = "") {
    if (/칼퇴/.test(w)) return 1;
    if (/매일/.test(w)) return 4;
    if (/야근/.test(w)) return 3;
    return 2; // 보통·모름
  }

  // 직무 묶음: 같은 묶음 안 이동은 '직무 전환'으로 안 본다
  const JOB_FAMILY = [
    // B5(2회차): 행정·인사·총무·노무는 다 따로 본다
    ["인사", /인사|HR/], ["행정", /행정/], ["총무", /총무/], ["노무", /노무/],
    ["재무", /재무|회계|세무|자금/],
    ["기획", /기획|전략/],
    ["영업", /영업/],
    ["구매", /구매|조달/],
    ["SCM", /SCM|물류|생산관리/],
    ["금융영업", /기업금융|리테일|WM/],
    ["금융미들", /리스크|심사/],
    ["마케팅", /마케팅|MD/],
    ["PM", /PM|PO|서비스기획/],
  ];
  function family(job = "") {
    const f = JOB_FAMILY.find(([, re]) => re.test(job));
    return f ? f[0] : job;
  }
  // 직무가 바뀌어도 쉬운 '가까운 직무' 짝 (3회차 A1·B2). [지금, 갈 곳] 한 방향만
  const CLOSE_JOBS = [[/행정/, /인사|HR/], [/재무|회계/, /기획/], [/영업관리/, /영업기획/]];
  function closeJob(a = "", b = "") { return CLOSE_JOBS.some(([x, y]) => x.test(a) && y.test(b)); }

  // F27 직무 가치 — 2회차 C3 '이직' 서열: 인사·기획·전략·연구개발 > 재무·마케팅·품질·생산관리 > 나머지
  // (신입 합격 난이도 서열은 따로 받았지만 방향이 헷갈려 아직 안 씀 → 3회차 확인)
  function jobValue(job = "") {
    if (/인사|기획|전략|연구개발|R&D/.test(job)) return 3;
    if (/재무|회계|마케팅|품질|QA|생산관리/.test(job)) return 2;
    return 1;
  }

  // F26 전망 나쁜 산업·직무 — 2회차 C1. 직무사전 'AI 영향 높음' 직무와 config.json industry_view는 나중에 합친다
  // 4회차: 은행 영업점(C5), 데이터 분석(C9 'AI에 가장 심하게 맞는 직무')
  const BAD_FIELD = [/오프라인 유통/, /유통.*MD|MD.*유통/, /의류.*OEM/, /게임/, /SaaS/, /IT.*운영|운영.*IT/, /은행.*영업점/, /데이터 ?분석/];
  function badField(o = {}) {
    const s = [o.industry, o.job].filter(Boolean).join(" ");
    return BAD_FIELD.some(re => re.test(s));
  }
  // 지금 업황이 꺾인 산업 (오르내림이 있어 자주 바꾼다) — 3회차 C1·B1
  const DOWN_INDUSTRY = [/화학/, /플라스틱·고무/, /건설/];   // 11-13 사용자: 플라스틱·고무 가공제품도 업황이 안 좋은 건 맞으니 넣되, 화학과 다른 이름('플라스틱·고무 제품')으로
  // 2026-10-27: 업황은 뉴스 자동 판정(industry_trend.py) → 조로 확인값(config industry_trend_confirm)을 build.py 가 아래 표로 넣는다. 표에 없는 업계만 위 정규식
  const IND_TREND = {"화학": "down", "플라스틱·고무 제품": "down", "건설": "down", "2차전지": "up", "반도체·전자": "up", "통신·미디어·광고": "down"};
  // 11-12 사용자: '화학·소재·에너지' 묶음을 통째로 '업황 꺾임'으로 보지 않는다 — 화학 회사에만. 사이트가 세부 업종으로 가른 값(ind_sub: 화학·소재·에너지·모름)을 넘기면 그걸로 본다
  //   모름(세부 업종을 알 수 없음)은 꺾임도 호황도 아닌 것으로. 문장에도 '화학·소재' 대신 '화학'이라고 쓴다(indName)
  const trendKey = o => o.ind_sub || o.industry || "";
  const indName = o => o.ind_sub && o.ind_sub !== "모름" ? o.ind_sub : o.industry;
  const trendOf = o => o.ind_sub === "모름" ? "flat" : IND_TREND[trendKey(o)];
  function downInd(o = {}) { const t = trendOf(o); return t ? t === "down" : DOWN_INDUSTRY.some(re => re.test(trendKey(o))); }
  // 꺾였다가 올라가는 / 호황인 산업 — 많이 뽑아 옮기기 쉽고, 있는 사람은 옮길 이유가 적다 (4회차 B2·B3·C1)
  // 4회차 A5: 나중엔 뉴스·채용 수로 자동 판단 후 조로가 확인
  const UP_INDUSTRY = [/2차전지|배터리/];
  function upInd(o = {}) { const t = trendOf(o); return t ? t === "up" : UP_INDUSTRY.some(re => re.test(trendKey(o))); }
  const FACTORY = /공장|산단|현장/;   // 4회차 C3: 지방 현장 순환에서 빠져나오는 것도 공장과 같이 본다
  const PLANT_JOB = /생산|공정|품질|설비|R&D|연구/;  // 공장에 있는 게 자연스러운 직무
  const lowRating = o => o.rating != null && o.rating < FIT.rating_min;

  // ── 워라밸 강하게 (6회차 문답지 A) ─────────────────
  // 워라밸이 중요한 사람(칼퇴 꼭 필요 = 가장 세게, 옮기는 이유 = 워라밸 = 한 단계 약하게)은 워라밸이 나빠지는 만큼 판정을 낮춘다.
  // 돌려주는 값: { drop: 낮출 단계, fix: 이 단계 위로 못 감, cap: 상한, first: 첫 줄에 넣을 말, lines: 이유 맨 위에 넣을 말 } — 나빠지지 않으면 null
  //   v = 판정 번호(6 무조건 가세요 … 0 비추예요), pct = 연봉 인상률. 하한은 '다시 생각해요'(1), 원래 '비추예요'면 그대로 (A3·A4)
  const TB = "다만 워라밸은 팀바팀, 케바케가 있을 수 있으니 들어갈 팀을 잘 확인해 보세요!";
  function wlbAdjust(now = {}, to = {}, pct = 0) {
    const wn = wlb(now.wlb), wt = wlb(to.wlb);
    if (!now.wlb || !to.wlb || wt <= wn) return null;
    const pri = now.must_off ? 2 : now.why === "워라밸" ? 1 : 0, big = pct >= FIT.wlb_big_pay_pct;
    const out = { drop: 0, fix: null, cap: null, first: "", lines: [] };
    const bigLine = "연봉이 크게 오르는 자리라 판정은 한 단계 덜 낮췄어요. 워라밸을 포기하실 수 있다면 가셔야 합니다. 단, 연봉 제안은 사람마다 다르게 올 수 있으니 연봉 협상을 잘 하셔야 해요!"; // A6
    if (pri === 2 && wt >= 3) {                         // 칼퇴 꼭 필요: F8이 이미 '이건 안 돼요'라고 말하니 첫 줄과 하한만
      out.fix = 1; out.first = "칼퇴가 꼭 필요하신데 야근이 많은 회사예요.";
    } else if (pri) {
      if (wt === 4) {                                   // A4: 매일 야근은 '다시 생각해요' 고정 (연봉 20%↑면 한 단계 덜)
        out.fix = big ? 2 : 1;
        out.first = "워라밸이 크게 나빠지는 자리예요.";
        out.lines.push(`${wn === 1 ? "칼퇴하던" : "지금보다 야근이 적던"} 분이 매일같이 야근해야 할지도 모르는 회사로 가는 거예요. 워라밸이 제일 중요하시면 연봉이 얼마든 이 카드는 접으세요.`); // A12
        if (big) out.lines.push(bigLine);
      } else if (wn === 1 && wt === 3) {                // A3: 칼퇴 → 야근 잦음 한 단계 내림 + '조건 보고' 위로 못 감 (D2)
        out.drop = big ? 0 : 1; out.cap = 4;
        out.first = `${pct > 0 ? "연봉은 오르지만 " : ""}워라밸이 크게 나빠지는 자리예요. 칼퇴가 가장 중요하시면 이곳은 힘드실 수 있어요.`;
        out.lines.push(`워라밸이 가장 중요하다고 하셨는데, 칼퇴하던 분이 '야근 잦음' 회사로 가는 거라 판정을 낮췄어요. 연봉이 올라도 저녁이 사라진다면, 1년 안에 다시 이직을 고민하게 될 겁니다. ${TB}`); // A11
        if (big) out.lines.push(bigLine);
      } else if (wn === 1 && wt === 2) {                // A2·A8: 칼퇴 → 보통은 판정 그대로, 경고만
        out.lines.push(pri === 2
          ? `칼퇴가 꼭 필요하신데 이 회사 현직자 워라밸은 '보통'이에요. 육아·건강 때문에 칼퇴가 필수라면 들어갈 팀 퇴근 문화를 면접에서 꼭 확인하세요. ${TB}`
          : `지금 칼퇴하시는데 이 회사 현직자 워라밸은 '보통'이에요. 워라밸이 제일 중요하시면 이 차이가 생각보다 크게 다가옵니다. 물론 팀바팀, 케바케긴 하니, 잘 확인하고 가셔야 해요!`); // A10
      } else if (pri === 1) {                           // A5: 보통 → 야근 잦음은 경고만 (칼퇴 꼭 필요는 F8에서 이미 '안 돼요')
        out.lines.push(`워라밸 때문에 옮기시는데 이 회사 현직자 워라밸은 '${to.wlb}' 쪽이라 지금('${now.wlb}')보다 나빠질 수 있어요. ${TB}`);
      }
    } else if (wn === 1 && wt === 4) {                  // D4: 워라밸을 안 골라도 칼퇴 → 매일 야근은 한 단계 내림
      out.drop = 1;
      out.lines.push("매일 야근이 예상되는 회사라 판정을 한 단계 내렸어요. 다른 조건이 괜찮다면 야근만 각오하고 가세요.");
    } else if (wt >= 3) {                               // A7: 판정은 그대로, 경고만
      out.lines.push(`지금${wn === 1 ? " 칼퇴하시는데" : "보다"} 이 회사 현직자 워라밸은 '${to.wlb}' 쪽이에요. 저녁 시간이 줄어드는 건 각오하고 가세요. ${TB}`);
    }
    return out.lines.length || out.first ? out : null;
  }
  // 판정 번호 v 에 wlbAdjust 결과를 씌운다
  function wlbApply(v, a) {
    if (!a || v <= 0) return v;
    let n = v - a.drop;
    if (a.fix != null) n = Math.min(n, a.fix);
    if (a.cap != null) n = Math.min(n, a.cap);
    return Math.max(n, a.drop || a.fix != null ? 1 : 0);
  }

  // ── A. 이직 결정 ───────────────────────────────────
  // 돌려주는 값: { verdict, reasons:[{rule, text}] }
  function judgeMove(c) {
    const now = c.now || {}, to = c.target || {};
    const R = [], cond = [];      // R: 이유, cond: '조건 보고'로 만드는 것
    let fail = false;             // 마요 사유
    let cap = null;               // 7단계 판정 상한 (6: 무조건 가세요 … 0: 비추예요). 사이트가 최종 판정에 씌운다
    // nSoft: 연봉 쪽 조건의 개수 (연봉 협상 조건 pay() + '돈 + 워라밸' 블록 안에서 붙은 조건). 조건이 이것뿐이면 soft → 사이트가 '조건 보고 가세요'를 지켜 준다 (11-12 F3)
    let nSoft = 0, money = false;
    const add = (rule, text, kind) => { R.push({ rule, text }); if (kind === "cond") { cond.push(rule); if (money) nSoft++; } if (kind === "fail") fail = true; };
    // 2026-11-07 사용자: 이직하면 연봉 협상을 새로 하니까 '연봉이 덜 오른다'로 '마요'를 박지 않는다
    //   → 협상 얘기를 붙여 '조건 보고'로, 판정은 '조건 보고 가세요'(7단계 4)까지
    const pay = (rule, text) => { const m = money; money = true; add(rule, text, "cond"); money = m; cap = cap == null ? 4 : Math.min(cap, 4); };

    const tn = tierOf(now), tt = tierOf(to);
    const noTier = !!(now.size_unknown || to.size_unknown);   // 11-12 F7: 규모를 모르면 급 비교를 건너뛴다 (전에는 '중견'으로 가정)
    let step = noTier ? 0 : tt.n - tn.n;            // +1 위 급, -1 아래 급
    // 2026-11-14 사용자: "대기업 하위 계열사에서 중견 큰 데 갈 때 … 절대적인 기업 크기가 차이 나면 급이 올라가는 것이 아닌 걸로"
    //   회사 급은 공정위 지정 집단 소속으로 가르기 때문에, 직원 50명 계열사(대기업)와 매출 2조 독립 회사(중견)처럼 이름과 실제 크기가 뒤집히는 짝이 생긴다.
    //   급 이름으로는 오르는데 갈 회사가 훨씬 작거나, 내려가는데 갈 회사가 훨씬 크면 → 같은 급으로 본다 (금융·공기업·외국계·스타트업 갈래는 그대로)
    const absRatio = now.abs_rev > 0 && to.abs_rev > 0 ? to.abs_rev / now.abs_rev : now.abs_n > 0 && to.abs_n > 0 ? to.abs_n / now.abs_n : null;   // 갈 회사 ÷ 지금 회사
    let absFlat = "";
    if (step && absRatio != null && !tn.kind && !tt.kind && now.tier_n == null && to.tier_n == null) {
      if (step > 0 && absRatio <= 1 / FIT.abs_size_ratio) absFlat = "up";
      else if (step < 0 && absRatio >= FIT.abs_size_ratio) absFlat = "down";
      if (absFlat) step = 0;
    }
    if (absFlat) add("F7", absFlat === "up" ? `회사 급 이름은 갈 회사가 위지만, 실제 회사 크기(${now.abs_rev > 0 && to.abs_rev > 0 ? "매출" : "직원 수"})는 지금 회사가 ${FIT.abs_size_ratio}배 넘게 커서 급이 오르는 이동으로 보지 않았어요.`
      : `회사 급 이름은 지금 회사가 위지만, 실제 회사 크기(${now.abs_rev > 0 && to.abs_rev > 0 ? "매출" : "직원 수"})는 갈 회사가 ${FIT.abs_size_ratio}배 넘게 커서 급이 내려가는 이동으로 보지 않았어요.`);
    const finTo = tt.kind === "finance";            // 11-12 F7: 금융사는 '급' 대신 '회사 수준(평균 연봉 기준)'으로 말한다
    const payUnknown = !!to.pay_unknown;            // 11-12 F8: 직급 연봉 없이 회사 평균만 있으면 연봉으로 판정을 움직이지 않는다
    let won = payUnknown ? 0 : (to.salary || 0) - (now.salary || 0);
    const est = /추정/.test(to.how || "");
    let nearGap = 0;                                // 11-12 F8: 추정 연봉이 5%까지 낮은 건 '비슷'으로 (0으로 놓고 본다)
    if (est && won < 0 && now.salary && -won / now.salary * 100 <= FIT.est_same_pct) { nearGap = -won; won = 0; }
    const rawWon = won;
    const upIn = upInd(to) && tt.n >= 3;                   // 4회차 C1: 호황 산업 대기업이면 공장 근무 손해를 따지지 않는다
    if (/공장|산단/.test(to.place || "") && !FACTORY.test(now.place || "") && !upIn && !payUnknown) won -= FIT.factory_won; // F9 (현장은 빠져나올 때만 본다)
    const outFactory = FACTORY.test(now.place || "") && !FACTORY.test(to.place || "");
    if (outFactory && !payUnknown) won += FIT.factory_won; // F9 반대: 지방 공장 → 본사는 +1천만 원으로 본다 (3회차 A5)
    const pct = now.salary ? won / now.salary * 100 : 0;
    // 11-12 F9: 워라밸 자료가 없는 쪽이 있으면 '보통'으로 단정하지 않고 워라밸 손익을 0으로 둔다
    const wlbGain = now.wlb_unknown || to.wlb_unknown ? 0 : (wlb(now.wlb) - wlb(to.wlb)) * FIT.wlb_pct_per_step; // +면 좋아짐
    const eff = pct + wlbGain;                      // 워라밸까지 친 체감 인상률

    // F11 선퇴사면 연봉 기준을 낮춘다
    let k = 1;
    if (now.left) k = FIT.left_factor[[(now.years || 0) >= 4 ? "long" : "short", (now.gap || 0) > 1 ? "gap" : "short"].join(",")];
    const outDown = downInd(now) && !downInd(to);          // 업황 꺾인 산업에서 나오기
    const escape = (badField(now) && !badField(to)) || outDown || (outFactory && /현장/.test(now.place || "")); // 빠져나오는 이동
    const prime = now.age >= FIT.prime_age[0] && now.age <= FIT.prime_age[1] && !outDown; // 3회차 C1: 빠져나오는 거면 황금기 기준 안 씀
    const sameMin = (prime ? FIT.prime_min_won : FIT.same_min_won) * k;

    // F2 성과급 큰 회사: 계약연봉 삭감 폭 + 총액 인상 둘 다 본다
    if (to.base && to.base < now.salary) {
      const cut = (now.salary - to.base) / now.salary * 100;
      if (cut > FIT.base_cut_max_pct) pay("F2", `계약연봉이 ${cut.toFixed(0)}% 깎여요. 성과급이 커도 ${FIT.base_cut_max_pct}%까지만 괜찮아요. 연봉 협상에서 계약연봉 삭감을 ${FIT.base_cut_max_pct}% 안쪽으로 줄이면 가셔도 돼요.`);
    }

    // 1) 돈 + 워라밸
    money = true;   // 이 블록에서 붙는 조건은 연봉 쪽 조건으로 센다 (연봉이 오를수록 판정이 나빠지는 역전을 막는다)
    const cutOk = step >= 2 || (tt.kind === "public" && tn.kind !== "public");   // 5회차 D4: 삭감도 10%까지 받아들이는 이동
    const sg = x => (x >= 0 ? "+" : "-") + Math.abs(x);
    const adj = won !== rawWon;   // 공장 근무 값을 쳤나
    // 11-12 F9: 문장엔 실제 차이를 쓰고, 공장 근무 값을 쳤으면 그 계산을 같이 보여 준다 (전에는 보정한 숫자만 말해 실제와 달랐음)
    const A = nearGap ? `지금과 비슷한 연봉(추정치로는 ${nearGap}만 원 낮지만, 추정치라 ${FIT.est_same_pct}% 안쪽 차이는 같다고 봤어요)`
      : adj ? `실제 연봉 ${sg(rawWon)}만 원(${won > rawWon ? "지방 공장·현장에서 나오는 값" : "지방 공장 근무 값"} ${FIT.factory_won}만 원을 치면 ${sg(won)}만 원)` : `연봉 +${won}만 원`;
    const A0 = nearGap || adj ? A : `+${won}만 원`;
    // 협상에서 받아 내야 할 실제 금액: 보정한 기준(th)을 실제 연봉 차이로 되돌린다
    const need = (th, more) => { const v = Math.round(th + rawWon - won); return v > 0 ? `+${v}만 원 ${more}` : v === 0 ? "지금 연봉 이상으로" : `삭감 폭을 ${-v}만 원 안쪽으로`; };
    // 11-12 F7: 금융사는 '급'이 아니라 '회사 수준(평균 연봉 기준)'으로, 규모를 모르면 급 얘기를 뺀다
    const T = finTo ? { up: "회사 수준(평균 연봉 기준)이 지금보다 높은 금융사", upBig: "회사 수준(평균 연봉 기준)이 훨씬 높은 금융사로 가는", downGo: "회사 수준(평균 연봉 기준)은 지금보다 낮은 금융사지만", downBut: "회사 수준(평균 연봉 기준)은 지금보다 낮은 금융사지만",
        downAt: "회사 수준(평균 연봉 기준)이 지금보다 낮은 금융사에", downMove: "회사 수준(평균 연봉 기준)이 지금보다 낮은 금융사로 옮길 땐", downTo: "회사 수준이 지금보다 낮은 금융사로", same: "회사 수준이 비슷한 금융사로 옮기면서", sameMove: "회사 수준이 비슷한 금융사로 옮기는데" }
      : { up: "한 단계 위 회사", upBig: "회사 급이 크게 오르는", downGo: "아래 급으로 가지만", downBut: "아래 급이지만", downAt: "아래 급에", downMove: "아래 급 회사로 옮길 땐", downTo: "아래 급으로",
        same: noTier ? "지금 회사 규모를 몰라 회사 급 비교는 빼고 보면" : "같은 급에서", sameMove: noTier ? "지금 회사 규모를 몰라 회사 급 비교는 뺐어요. 연봉만 보면" : "같은 급 이동에" };
    // 11-12 F8 보완: 평균이 내 연봉보다 크게 낮으면(avg_low_pct 이상) 내 연봉을 맞춰 줄 회사인지 알 수 없으니 '조건 보고 가세요'까지만.
    //   판정을 '다시 생각해요' 쪽으로 내리지는 않는다 (11-07: 연봉 숫자만으로는 말리지 않는다) — 조건·마요를 달지 않고 상한만 건다
    const avgLow = payUnknown && now.salary > 0 && to.salary > 0 && (now.salary - to.salary) / now.salary * 100 >= FIT.avg_low_pct;
    if (payUnknown) {
      add("F2", avgLow ? `이 회사는 직급별 연봉 자료가 없고 전 직원 평균만 있어요. 그 평균이 내 연봉보다 ${Math.round((now.salary - to.salary) / now.salary * 100)}% 낮아서, 내 연봉을 맞춰 줄 수 있는 자리인지 확인되기 전에는 '조건 보고 가세요'까지만 드려요. 제시받은 연봉을 넣으면 내 연봉과 비교해 드려요.`
        : "이 회사는 직급별 연봉 자료가 없고 전 직원 평균만 있어서, 연봉으로는 판정을 올리지도 내리지도 않았어요. 제시받은 연봉을 넣으면 내 연봉과 비교해 드려요.");
    } else if (won < 0 && now.left && (now.years || 0) >= 4 && (now.gap || 0) > 1 && -pct <= FIT.left_gap_cut_pct && !cutOk) {   // 11-12 F4: 10%까지 삭감을 받아들이는 이동(공기업·급 크게 오름)이면 그 규칙이 먼저 (5% 삭감이 6% 삭감보다 나쁜 판정을 받던 역전)
      add("F11", `이미 퇴사하고 공백이 ${now.gap}년 넘었으니 ${-won}만 원(${(-pct).toFixed(0)}%) 삭감은 받아들일 만해요. 갈 회사 평판이 나쁘지 않을 때만요.`, "cond"); // 3회차 C3
    } else if (won < 0 && -pct <= FIT.tier_up_cut_pct && cutOk) {
      add("F2", `${j(to.how || "갈 회사 연봉", "이", "가")} ${-won}만 원(${(-pct).toFixed(0)}%) 낮지만 ${tt.kind === "public" ? "공기업으로 가는" : T.upBig} 거라 ${FIT.tier_up_cut_pct}%까지는 받아들일 만해요. 연봉 협상으로 차이를 줄여 보세요.`); // 5회차 D4 · 6회차 문구
      cap = 5;   // 6회차 D8·D9: 연봉이 낮아지는데 '무조건 가세요'는 아니다 → '가세요'까지
    } else if (won < 0 && rawWon >= 0) {
      pay("F9", `연봉은 +${rawWon}만 원이지만 지방 공장 근무까지 치면 손해 보는 셈이에요. 공장 근무 값(1천만 원 안팎)까지 연봉 협상에서 더 받아 내면 가셔도 돼요.`);
    } else if (won < 0) {
      // 6회차 B1~B4: 갈 회사 연봉(대부분 직급별 추정치, 오퍼도 같게)이 낮아도 '깎이면 안 됨'으로 막지 않는다
      //   협상으로 비슷하거나 더 받으면 가도 되니 '조건 보고 가세요'까지, 15% 넘게 낮으면 '중립기어'까지 (cap = 7단계 번호)
      const p = -rawWon / now.salary * 100, how = j(to.how || "갈 회사 연봉", "은", "는");
      const w = `${how} 지금보다 ${-rawWon}만 원(${p.toFixed(0)}%) 낮아요.`;
      if (rawWon >= 0) add("F9", `지방 공장·현장에서 나오는 값(${FIT.factory_won}만 원)을 쳐도 손해예요.`, "cond");
      else if (p <= FIT.pay_low_light_pct) add("F2", `${how} 지금보다 조금 낮아요. 협상으로 충분히 맞출 수 있는 차이예요.`, "cond");
      else if (p <= FIT.pay_low_warn_pct) add("F2", `${w} 이직 시 연봉 협상이 관건이에요.`, "cond");
      else add("F2", `${w} 연봉 협상을 잘 하셔서 비슷하거나 더 높게 받으실 수 있다면 가셔도 됩니다. 다만 평균 연봉이 이 정도로 차이 난다면 역량 기대치가 너무 높거나 일을 빡세게 줄 수도 있어요.`, "cond");
      if (adj && won < rawWon) add("F9", `여기에 지방 공장 근무(연봉 ${FIT.factory_won}만 원 손해로 봐요)까지 겹쳐요.`, "cond");   // 11-12 F9
      cap = p > FIT.pay_low_warn_pct || step < 0 ? 3 : 4;   // 아래 급 회사에 연봉까지 낮으면 '중립기어'까지 (4회차 C6 '서울·업종 전환이 꼭 필요할 때만')
    } else if (step > 0) {
      if (eff >= 0) add("F2", `${T.up}에 ${A}${rawWon < 0 ? ", 이 정도는 받아들일 만해요" : ", 깎이지 않아요"}.`);
      // 11-12 F4: 삭감도 받아들이는 이동(급이 크게 오름)인데 연봉이 그대로·오르는 쪽이 더 나쁜 판정을 받던 역전을 없앤다
      else if (cutOk) { add("F2", `${T.up}에 ${A}. 워라밸은 나빠지지만 ${T.upBig} 거라 받아들일 만해요.`); cap = 5; }
      else pay("F8", `${A}인데 워라밸이 나빠져 체감으로는 손해 보는 셈이에요. 나빠지는 워라밸만큼 연봉 협상에서 더 받아 내면 가셔도 돼요.`);
    } else if (step < 0) {
      // D2: 연봉만으론 14%여도 워라밸까지 치면 기준을 넘을 수 있다
      // 4회차 C3: 업황 꺾인 산업·현장에서 빠져나오면 % 기준은 안 본다
      const pctOk = eff >= FIT.down_min_pct * k || (escape && !badField(now));
      if (won > FIT.down_min_won * k && pctOk) {
        add("F3", `${T.downGo} ${A0}${wlbGain > 0 ? "에 워라밸까지 좋아지면 " : "(" + pct.toFixed(0) + "%)이면 "}생각해 볼 만해요.`);
        // D5 중견 안정성: 빠져나오는 거면 평점·재무가 나쁠 때만 '조건 보고' (4회차 A1)
        if (tt.n === 2 && !finTo) add("F3", "중견도 중견 나름이에요. 갈 회사가 안정적인지 확인하세요.", !escape || lowRating(to) ? "cond" : "");
        else if (tt.n === 2) add("F3", "금융사도 회사마다 차이가 커요. 갈 회사가 안정적인지 확인하세요.", !escape || lowRating(to) ? "cond" : "");
      }
      else if (won > FIT.down_min_won * k && eff >= FIT.down_cond_pct * k) {   // 4회차 C2: 애매 구간은 평점으로 가른다
        if (now.rating != null && to.rating != null && to.rating > now.rating) add("F3", `${T.downBut} ${A0}에 평점도 지금 회사보다 좋아요. 가도 돼요.`);
        else add("F3", `${T.downAt} ${A0}은 애매해요. 지금 회사 평점이 갈 회사보다 낮다면 가도 돼요.`, "cond");
      }
      else if (won >= 0 && badField(now) && !badField(to))
        add("F3", `${T.downAt} 연봉도 그대로예요. ${now.left ? "전 직무로는 더 클 수 없었거나" : "지금 자리에서 더 클 수 없거나"}, 새 직무 의지·조직문화가 확실할 때만 가세요.`, "cond"); // 4회차 C5
      else pay("F3", `${T.downMove} 연봉이 확실히 올라야 값이 있어요. 지금 숫자(${A0})로는 조금 아쉬워요. 연봉 협상에서 ${need(FIT.down_min_won, "넘게")}(${FIT.down_min_pct}% 안팎) 받아 내면 가셔도 돼요.`); // 6회차 B8 · 11-07 협상
    } else {
      if (won >= sameMin || eff >= 15) add("F1", `${T.same} ${A0}${wlbGain > 0 ? ", 워라밸도 좋아져요" : ""}.`);
      // 11-12 F4: 공기업으로 가면 10% 삭감도 받아들이는데, 동결·소폭 인상이 그보다 나쁜 판정을 받던 역전을 없앤다
      else if (cutOk) { add("F2", `공기업으로 가는 거라 ${won === 0 && !nearGap && !adj ? "연봉이 그대로여도" : A + "이어도"} 받아들일 만해요. 연봉 협상으로 조금 더 받아 보세요.`); cap = 5; }
      else pay("F1", `${T.sameMove} ${nearGap || adj ? A : (est ? "추정치로는" : "연봉") + " +" + won + "만 원"}이에요. 이대로면 옮길 값으로는 약하지만, 이직할 땐 연봉 협상을 새로 하니까 ${need(sameMin, "이상")}${prime ? "(30대 초중반 기준)" : ""} 받아 내면 가셔도 돼요.`); // 6회차 B7 · 11-07 협상
    }
    money = false;
    if (wlbGain > 0 && step >= 0 && won >= 0) add("F8", `워라밸이 좋아지는 건 연봉이 ${wlbGain >= 15 ? "꽤" : "조금"} 오른 것만큼 값어치 있어요.`); // 6회차 C3: % 숫자 대신 말로
    // 5회차 C10: 육아 등으로 칼퇴가 꼭 필요하면 워라밸이 나빠지는 곳은 연봉이 올라도 안 된다
    if (now.must_off && wlb(to.wlb) >= 3) add("F8", `칼퇴가 꼭 필요하신데 갈 회사는 '${to.wlb}' 쪽이에요. 연봉이 올라도 이건 안 돼요.`, "fail");
    // 5회차 B4·C9: 팀장 자리. 아래 급으로 가면서 팀장을 다는 건 욕심이 있을 때만
    if (to.lead) {
      if (now.lead_want === "있음") add("F34", "팀장을 달고 싶다면 가야 할 자리예요. 회사가 건실한지만 확인하세요.", lowRating(to) ? "cond" : "");
      else if (step < 0) add("F34", now.lead_want === "없음" ? `팀장 욕심이 없다면 ${T.downTo} 옮길 이유가 약해요.` : `팀장 자리예요. 팀장 욕심이 있고 회사가 건실하면 가고, 아니면 ${now.left ? "다른 카드를 더 보세요" : "지금 자리를 추천해요"}.`, "cond");
      else add("F34", "팀장 자리로 가는 거라 커리어로도 한 단계 올라가요.");
    }
    if (outFactory) {
      add("F9", `지방 ${/현장/.test(now.place) ? "현장" : "공장"}에서 본사로 오는 건 연봉 1천만 원 오른 것과 같아요.`);
      if (rawWon < 0) add("F9", `다만 실제 연봉은 ${-rawWon}만 원 깎여요. 서울 근무를 정말 원할 때만 가세요.`, "cond"); // 3회차 C4
    }
    if (upIn) add("F26", `${j(indName(to), "은", "는")} 업황이 올라오는 중이고 대기업은 좋은 곳뿐이에요. 공장 근무여도 갈 만해요.`);
    else if (upInd(now) && !upInd(to)) add("F26", `${j(indName(now), "은", "는")} 지금 호황이라 옮길 이유가 적어요.`, "cond"); // 4회차 B3
    // 4회차 C2: 갈 회사 평점이 낮아도 지금 회사보다 높으면 괜찮다
    if (lowRating(to) && !(now.rating != null && to.rating >= now.rating)) add("F12", `갈 회사 평점 ${to.rating}은 ${FIT.rating_min} 아래예요. 지금 회사보다 나은지 확인하세요.`, "cond");
    if (outDown) add("F26", `${j(indName(now), "은", "는")} 지금 업황이 꺾여 있어요. 다른 조건이 더 좋다면 옮길 때예요.`);
    else if (downInd(to) && !downInd(now)) add("F26", `${j(indName(to), "은", "는")} 지금 업황이 안 좋아요. 회사 사정을 확인하세요.`, "cond");

    // 2) 사람마다 갈리는 조건 → 조건 보고
    const close = closeJob(now.job, to.job);
    const jobChange = family(now.job) !== family(to.job) && !close;
    if (close) add("F28", `${now.job}→${j(to.job, "은", "는")} 가까운 직무라 직무 전환으로 보지 않아요.`);
    // 3회차 C2: 회사 안에서만 쓰는 운영 직무 등 전망 어두운 직무에서 나오는 전환은 '될 때 가요'
    // 4회차 C3: 업황 꺾인 산업의 현장에서 빠져나오는 전환은 연차를 안 본다
    const hardEscape = outDown || (outFactory && /현장/.test(now.place || ""));
    const jobEscape = jobChange && escape && ((now.years || 0) <= FIT.job_change_max_years || hardEscape) && won >= 0 && !(step < 0 && rawWon <= 0 && !hardEscape);
    if (jobEscape) add("F28", hardEscape ? "업황 꺾인 산업·현장에서 빠져나오는 전환이라 연차가 있어도 갈 만해요." : "전망 어두운 직무에서 빠져나오는 전환이에요. 될 때 가세요.");
    else if (jobChange) {
      if ((now.years || 0) > FIT.job_change_max_years) add("F6", `총 ${now.years}년 차 직무 전환은 늦은 편이에요.`, "cond");
      add("F28", "직무가 바뀌어요. 지금 직무가 안 맞고 새 직무에 관심·스펙이 충분할 때만 가세요.", "cond");
      // 11-12 F5: 여기 있던 'if (won < 0) fail = false' 를 지움 — 삭감이 '마요'가 아니게 된 뒤(6회차) 남은 잔재라, 칼퇴 필수(F8)의 '마요'만 지우고 있었다
    }
    // 4회차 C4: 중소에서 투자 많이 받은(시리즈B 이상·흑자) 스타트업으로 가면 회사 상황이 더 나은 것
    if ((tn.kind === "finance") !== (tt.kind === "finance"))   // 금융권 ↔ 일반 기업: 연봉 구조가 다르다
      add("F33", "금융권과 일반 기업은 연봉 구조(성과급·현금성 복지)가 달라요. 총보상과 기본연봉을 함께 비교하세요.");
    const goodStartup = tt.kind === "startup" && tn.n === 1 && /시리즈 ?[B-Z]|흑자|상장/.test(to.extra || "") && !lowRating(to);
    const late = wlb(to.wlb) >= 3;   // 6회차 C4: 스타트업이라고 다 야근하진 않는다 → 현직자 워라밸이 야근 쪽일 때만 '각오하세요'
    if (goodStartup) add("F15", `투자를 충분히 받은 스타트업이라 지금보다 회사 상황이 나아요.${late ? " 야근은 각오하세요." : ""}`);
    else if (tt.kind === "startup") add("F15", `스타트업은 투자 규모·버틸 재무 여력·산업 가능성을 확인하세요.${late ? " 야근은 각오하고요." : ""}`, "cond");
    if (tt.kind === "foreign") add("F16", "외국계는 레이오프·한국 철수 가능성과 영어 업무량을 확인하세요.", "cond");
    if (tn.kind === "public" && tt.kind !== "public") {
      if ((now.years || 0) <= FIT.public_to_private_max) add("F18", `공공에서 민간으로는 ${FIT.public_to_private_max}년 차 전이 기회예요.`);
      else add("F18", `공공 ${now.years}년 차면 민간 적응이 어려워요.`, "cond");
    }
    const firstJob = (now.moves || 0) === 0;
    const tmin = firstJob ? FIT.tenure_min_new : FIT.tenure_min;
    const tenure = now.tenure != null ? now.tenure : now.years;
    const bigGain = step >= 0 && won >= 0 && eff >= FIT.big_gain_pct && tenure >= FIT.tenure_min;
    if (firstJob && bigGain && tenure < tmin) add("F4", `근속 ${tenure}년이지만 연봉·워라밸이 이만큼 좋아지면 3년 기준은 넘겨도 돼요.`);
    else if (tenure != null && tenure < tmin) {
      add(tenure < 1 ? "F19" : "F4", now.left   // 11-12 F9: 이미 퇴사한 사람에게 '지금 회사·옮기신다면'이라고 하지 않는다
        ? `전 회사 ${tenure}년은 짧은 편이에요(권장은 ${tmin}년). 이미 나오셨으니, 다음 회사는 4년 이상 다닐 각오로 가셔야 그 이후 이력이 버텨집니다.`
        : `지금 회사 ${tenure}년은 짧은 편이에요(권장은 ${tmin}년). 이번에 옮기신다면, 다음 회사는 4년 이상 다닐 각오로 가셔야 그 이후 이력이 버텨집니다.`, "cond"); // 6회차 C5
    }
    // 2026-10-27 사용자: 게임업계 → 게임업계, 게임기획 → 게임기획처럼 지금도 같은 판이면 '전망 어려워요'로 말리지 않는다
    if (badField(to) && badField(now)) add("F26", family(now.job) === family(to.job)
      ? `같은 판 안에서 옮기는 거라 업계 흐름은 지금 회사와 똑같이 타요. 이번 판단은 회사·조건으로 하시고, 길게 보면 ${j(to.job || "지금 직무", "을", "를")} 살릴 옆 분야도 가끔 둘러보세요.`
      : "같은 업계 안에서 옮기는 거라 업계 흐름은 지금과 같아요. 회사·조건으로 판단하세요.");
    else if (badField(to)) add("F26", "가려는 산업·직무의 전망이 어두워요.", "fail");
    else if (badField(now)) add("F26", "전망 어두운 산업에서 빠져나오는 기회예요. 다만 AI 시대 대비는 계속하세요."); // D2
    else if (now.industry && to.industry && now.industry !== to.industry && !jobChange && !bigGain && !outDown && !upIn)
      add("F30", `같은 ${j(to.job || "직무", "이라도", "라도")} ${j(indName(now), "과", "와")} ${j(indName(to), "은", "는")} 일하는 방식이 달라요. 어느 쪽이 맞는지 보고 정하세요.`, "cond"); // D1

    // F32 지금 회사와 갈 회사의 회사 자체 평가 비교 (2026-10-27 사용자: 지금 회사 이름을 알면 두 회사 평가를 같이 본다)
    //     grade = 일반 판정 단계 0(비추예요)~6(무조건 가세요), rating = 현직자 평점. 둘 다 있을 때만 본다
    if (now.grade != null && to.grade != null) {
      const d = to.grade - now.grade;
      if (d >= 2) add("F32", "회사 자체 평가도 지금 회사보다 확실히 좋아요.");
      else if (d <= -2) add("F32", "회사 자체 평가는 지금 회사가 더 좋아요. 옮겨서 얻는 게 그만큼 큰지 따져 보세요.", "cond");
    }
    if (now.rating != null && to.rating != null) {
      const d = to.rating - now.rating;
      if (d >= 0.3) add("F32", `현직자 평점이 지금 회사(${now.rating.toFixed(2)})보다 높아요(${to.rating.toFixed(2)}).`);
      else if (d <= -0.3) add("F32", `현직자 평점은 지금 회사(${now.rating.toFixed(2)})가 갈 회사(${to.rating.toFixed(2)})보다 높아요. 분위기를 꼭 확인하세요.`, "cond");
    }

    // 4회차 A4: 한 곳 평균 2년 미만으로 옮겨 다녔으면 다음 회사에서 오래 버텨야 한다
    const tl = (now.prev_tenures || []).concat(now.tenure != null ? [now.tenure] : []);
    if (tl.length >= 2 && tl.reduce((a, b) => a + b, 0) / tl.length < FIT.job_hop_avg) add("F5", "이직이 잦은 편이에요. 다음 회사에선 끝장을 본다는 생각으로 가세요.");

    if (payUnknown) cap = cap == null ? (avgLow ? 4 : 5) : Math.min(cap, avgLow ? 4 : 5);   // 11-12 F8: 내 연차에 맞는 연봉을 모르는 회사에 '무조건 가세요'는 아니다
    if (nearGap) cap = cap == null ? 5 : Math.min(cap, 5);   // 11-12 F8: 추정 연봉이 조금 낮은 걸 '비슷'으로 봐 줬어도 '무조건 가세요'는 아니다 (6회차 D8·D9와 같게)
    if (to.lack) cap = cap == null ? FIT.lack_cap : Math.min(cap, FIT.lack_cap);   // 11-12 F1: 판단자료 부족 회사는 '가세요'까지
    let verdict = fail ? "마요" : cond.length ? "조건 보고" : "가요";
    // soft: 조건이 연봉 쪽(11-07 협상 규칙·삭감·아래 급 애매 구간)뿐 → 사이트가 '조건 보고 가세요'를 지켜 준다. 그 밖의 조건이 있으면 판정을 낮춘다 (11-12 F3)
    return { verdict, reasons: R, cap, soft: cond.length > 0 && cond.length === nSoft, noTier, fin: finTo, payUnknown, avgLow, near: nearGap > 0, step, absFlat };
  }

  // ── B. 지원 결정 ───────────────────────────────────
  function judgeApply(c) {
    const me = c.me || {}, to = c.target || {};
    const R = [];
    // F23 잦은 이직자는 연차부터 쌓는다
    if ((me.companies || 0) >= 3 && (me.avg_tenure || 99) < FIT.avg_tenure_apply_min) {
      R.push({ rule: "F23", text: `평균 근속 ${me.avg_tenure}년이면 써도 어려워요. 지금 회사 ${FIT.last_tenure_apply}년을 채우고 지원하세요.` });
      return { verdict: "마요", reasons: R };
    }
    // F25 무경력 → 공기업은 긴 싸움
    if (!me.years && tier(to.size).kind === "public") {
      R.push({ rule: "F25", text: "공기업은 NCS·전공 준비에 반년~1년 걸려요. 지금 꺾기보다 사기업을 같이 보세요." });
      return { verdict: "조건 보고", reasons: R };
    }
    // 3회차 C9: 컨설팅·회계법인 쪽은 야근이 크게 늘어나는 걸 각오할 때만
    if (/컨설팅|펌|FAS|회계법인/.test([to.size, to.job].join(" "))) {
      R.push({ rule: "F31", text: "컨설팅펌·FAS는 야근이 크게 늘어요. 각오하고 간다면 써 보세요." });
      return { verdict: "조건 보고", reasons: R };
    }
    // 4회차 C9: 전망 어두운 직무로 새로 지원하는 건 말린다
    if (badField(to)) {
      R.push({ rule: "F26", text: `${j(to.job, "은", "는")} AI에 가장 크게 흔들리는 직무예요. 다른 직무를 보세요.` });
      return { verdict: "마요", reasons: R };
    }
    if (to.prefer) R.push({ rule: "F22", text: `'${to.prefer}'는 우대사항일 뿐이에요. 써 보세요.` });
    if (me.years) R.push({ rule: "F24", text: `${me.years}년 차면 경력 지원을 미룰 이유가 없어요.` });
    return { verdict: "가요", reasons: R };
  }

  // ── C. 신입·여러 합격 ─────────────────────────────
  function offerScore(o) {
    let s = tier(o.size).n * 3 + jobValue(o.job) * 2;          // 회사 급·직무 가치 (D9: 같은 조건이면 대기업)
    if (/지방 공장|산단/.test(o.place || "")) s -= 4;          // F27 지방 공장 재무 < 본사
    else if (/지방/.test(o.place || "")) s -= 1.5;
    if (/서울/.test(o.place || "")) s += 1;
    s += (o.salary || 0) / 1000;                               // 연봉 1천만 원 = 1점
    if (o.salary_diff) s += o.salary_diff * 10;                // -10% = -1점
    if (badField(o)) s -= 3;                                   // F26
    return s;
  }
  function judgeOffers(c) {
    const me = c.me || {};
    if (c.a && c.b) {
      const sa = offerScore(c.a), sb = offerScore(c.b);
      let pick = Math.abs(sa - sb) < 1 ? "상황 따라" : sa > sb ? "앞 회사" : "뒤 회사";
      const R = [{ rule: "F27", text: `점수 앞 ${sa.toFixed(1)} / 뒤 ${sb.toFixed(1)} (회사 급·직무 가치·근무지·연봉)` }];
      // 4회차 C10: 큰 회사가 지방 공장, 작은 회사가 서울이면 지방이 얼마나 먼지·직무 적합도로 갈린다
      const [hi, lo] = tier(c.a.size).n >= tier(c.b.size).n ? [c.a, c.b] : [c.b, c.a];
      if (tier(hi.size).n > tier(lo.size).n && FACTORY.test(hi.place || "") && PLANT_JOB.test(hi.job || "") && /서울/.test(lo.place || "") && !PLANT_JOB.test(lo.job || "")) {
        pick = "상황 따라";
        R.push({ rule: "F27", text: "회사 급과 근무지가 엇갈리고 직무도 완전히 달라요. 지방이 얼마나 먼지, 어느 직무에 스펙이 맞는지로 정하세요." });
      }
      return { verdict: pick, reasons: R };
    }
    // 합격 한 곳: 계속 준비할지
    const o = c.a || {}, R = [];
    const sex = /여/.test(me.sex || "") ? "여" : "남";
    const young = (me.age || 0) < newbieLimit({ ...me, sex });
    const weak = /하/.test(o.rep || "") || badField(o);
    if (young && weak && /가능성/.test(me.spec || "")) {
      R.push({ rule: "F21", text: `${me.age}세면 아직 신입 지원이 가능한 나이예요.` });
      if (badField(o)) R.push({ rule: "F26", text: "이 직무는 전망이 어두워요. 직무를 바꿔 지원하는 것도 고려하세요." });
      return { verdict: "계속 준비", reasons: R };
    }
    return { verdict: "가요", reasons: [{ rule: "-", text: "붙은 곳에 약점이 크지 않아요." }] };
  }

  // ── N. 신입·중고신입 합격 한 곳 (5회차, 2026-10-28) ─────────
  // 사이트 '내 상황' 신입 판정. 회사 일반 판정(base 0~6)에서 출발해 내 스펙·나이·취준 기간·다른 카드로 올리고 내린다.
  const STEPS = ["비추예요", "다시 생각해요", "스펙 보고 결정하세요", "중립기어", "조건 보고 가세요", "가세요", "무조건 가세요"];
  // 문과/이공계는 지원 직무가 먼저 (이공계 전공이 문과 직무를 쓰면 문과 기준), 직무가 없으면 학과로
  const SCI_JOB = /공정|설비|품질|생산|R&D|연구|개발|엔지니어|설계|반도체|회로|전기|전자|기계|화학|소재|IT|소프트웨어|SW|데이터|AI|기술영업|안전|환경|건축|토목|플랜트|QA/i;
  const LIB_JOB = /마케팅|기획|인사|HR|재무|회계|세무|총무|영업관리|사업개발|상품개발|MD|홍보|구매|법무|사무/i;
  const LANG_JOB = /해외|글로벌|무역|수출|통번역|외국어|외국계/;
  const RND_JOB = /R&D|연구/;
  const PLANT_SPEC_JOB = /생산관리|공정|품질|안전|설비/;   // 5회차 B2: 기사 자격증 여러 개·학점이 크게 먹히는 직무
  const FIN_JOB = /재무|회계|세무/;                          // 5회차 B2: 재경관리사
  function track(m = {}) {
    const jb = m.job || "";
    if (/영업|세일즈/.test(jb) && !/기술 ?영업|엔지니어/.test(jb)) return "lib";   // 11-12 F9: '반도체 영업'·'화학 영업'은 산업 이름일 뿐 문과 직무 (기술영업만 이공계)
    if (jb) return SCI_JOB.test(jb) && !LIB_JOB.test(jb) ? "sci" : "lib";
    return String(m.major || "").startsWith("sci") ? "sci" : "lib";
  }
  // 5회차 A1: 문과는 학교·학과 크게(외국어 쓰는 직무면 어학도), 이공계는 어학 작게·학교·학과·직무 적합도 크게
  function specWeights(m = {}) {
    const tr = track(m), jb = m.job || "", lang = LANG_JOB.test(jb), rnd = RND_JOB.test(jb), plant = PLANT_SPEC_JOB.test(jb) && !rnd;
    const w = tr === "sci"
      ? { school: 3, major: 1.5, lang: lang ? 2 : 0.5, exp: 2, fit: 3, gpa: plant ? 3 : 2, cert: plant ? 3 : 1, degree: rnd ? 3 : 0 }
      : { school: 4, major: 1.5, lang: lang ? 3 : 1, exp: 2, fit: 1.5, gpa: 1, cert: FIN_JOB.test(jb) ? 2 : 0.5, degree: 0 };
    // 2026-10-28 사용자 "스펙 등급이 후하다": 학과는 인기 학과면 거의 4점이라 무게를 3 → 1.5로 (학과는 직무와 맞는지 보는 정도)
    return { tr, lang, rnd, plant, w };
  }
  const SPEC_F = [["school", "학교"], ["major", "학과"], ["lang", "어학"], ["exp", "직무 경험"], ["fit", "직무 적합도"], ["gpa", "학점"], ["cert", "직무 자격증"], ["degree", "학위"]];
  const FILLABLE = new Set(["어학", "직무 경험", "직무 적합도", "직무 자격증"]);   // 2026-10-28 사용자: "이미 학교를 갔는데 학교를 왜 채워?"
  const SPEC_G = [["D", "낮은 편"], ["C", "보통 아래"], ["B", "보통"], ["A", "좋은 편"], ["S", "상위"], ["SS", "최상위"]];
  // 학교 값: 숫자 또는 해외대 'g4'(글로벌 탑 = SKY급)·'g3'(유명 = 중경외시급)·'g1'(그 밖 = 수도권 4년제급) (2026-10-28 사용자)
  const schoolV = m => { const v = parseFloat(String(m?.school ?? "").replace(/^g/, "")); return isNaN(v) ? null : v; };
  // 5회차 A6: 4.0·4.3·4.5 만점을 다 받고 4.5 기준으로 바꿔 본다
  function gpa45(m = {}) { const g = Number(m.gpa), mx = Number(m.gpaMax) || 4.5; return g > 0 ? Math.round(g * 4.5 / mx * 100) / 100 : null; }
  // 스펙 등급 S~D: 고른 항목(0~4)을 직무 기준 무게로 평균 (안 고른 항목은 뺀다). co 를 주면 공기업 가산(A7)까지
  function spec(m, co = {}) {
    if (!m) return null;
    const { tr, lang, rnd, plant, w } = specWeights(m), g = gpa45(m);
    const val = k => {
      if (k === "major") {
        const [kind, v] = String(m.major).split(":"), n = Number(v);
        // 학과가 직무와 안 맞으면 덜 쳐 준다: 문과 전공 → 이공계 직무는 1까지, 이공계 전공 → 문과 직무는 3까지
        return tr === "sci" && kind !== "sci" ? Math.min(n, 1) : tr === "lib" && kind === "sci" ? Math.min(n, 3) : n;
      }
      if (k === "gpa") {   // 5회차 A6: 3.0 이하는 둘 다 최악, 문과는 3.7 이상이면 문제없음, 이공계는 높을수록 좋고 3.5 이하는 공격받음
        if (g <= 3.0) return 0;
        const v = tr === "sci" ? (g >= 4.0 ? 4 : g >= 3.7 ? 3 : g > 3.5 ? 2 : 1) : (g >= 3.7 ? 3 : g >= 3.3 ? 2 : 1);
        return v < 3 && schoolV(m) >= 3 ? v + 1 : v;   // 학벌이 좋으면 조금 완화
      }
      if (k === "cert") return Math.min(3, Number(m.cert)) + 1;            // 0개 1 · 1개 2 · 2개 3 · 3개 이상 4
      if (k === "school") return schoolV(m);
      if (k === "degree") return { "학사": 1, "석사": 3, "박사": 4 }[m.degree];
      return Number(m[k]);
    };
    const has = k => k === "gpa" ? g != null : m[k] !== undefined && m[k] !== "";
    if (!SPEC_F.some(([k]) => w[k] > 0 && has(k))) return null;
    // 기본 5항목(학교·학과·어학·경험·적합도)은 안 고르면 1점(보통 아래)으로 친다 — 좋은 항목만 골라 S가 나오던 것 막기 (2026-10-28)
    // 학점·자격증·학위는 고른 사람만 (안 고르면 빼고 계산)
    const CORE = ["school", "major", "lang", "exp", "fit"];
    const got = SPEC_F.filter(([k]) => w[k] > 0 && (has(k) || CORE.includes(k))).map(([k, name]) => [name, has(k) ? val(k) : 1, w[k], !has(k)]).filter(([, v]) => v != null && !isNaN(v));
    let avg = got.reduce((a, [, v, wt]) => a + v * wt, 0) / got.reduce((a, [, , wt]) => a + wt, 0);
    const pub = !!m.gcert && tier(co.size).kind === "public";
    if (pub) avg += 0.3;                                                    // 5회차 A7: 직무 무관 자격증(컴활·한국사)은 공기업 지원일 때만
    // 등급 기준 (2026-10-28 반올림 대신 높인 기준): S 3.5 · A 2.8 · B 2.0 · C 1.2 이상
    let lv = FIT.spec_cut.findIndex(c => avg >= c); lv = lv < 0 ? 0 : FIT.spec_cut.length - lv;   // 0 D ~ 5 SS
    const gpaBad = g != null && g <= 3.0;
    if (gpaBad) lv = Math.min(lv, 1);                                       // 학점 3.0 이하는 학교와 관계없이 C 아래
    const big = got.filter(([, , wt]) => wt >= 3).map(([n]) => n);         // 이 직무에서 크게 보는 항목
    return { lv, g: SPEC_G[lv][0], word: SPEC_G[lv][1], strong: got.filter(([, v, , miss]) => v >= 3 && !miss).sort((a, b) => b[2] * b[1] - a[2] * a[1]).slice(0, 2).map(([n]) => n), weak: got.filter(([, v, , miss]) => v <= 1 && !miss).map(([n]) => n),
      fill: got.filter(([n, v]) => v <= 1 && FILLABLE.has(n)).sort((a, b) => b[2] - a[2]).slice(0, 2).map(([n]) => n),   // 학교·학과·학점·학위는 이미 정해진 것이라 '채우라'고 하지 않는다
      n: got.filter(x => !x[3]).length, miss: got.filter(x => x[3]).map(([n]) => n), avg: Math.round(avg * 100) / 100, tr, lang, rnd, plant, big, gpa: g, gpaBad, pub, how: `${tr === "sci" ? "이공계" : "문과"} 직무 기준으로 ${j(big.join("·"), "을", "를")} 크게` };
  }
  // 5회차 A2: '보통 붙는 스펙'은 회사 급 + 직무 난이도(2회차 합격 쉬운 순: 영업·생산관리 > 재무·연구개발·품질 > 기획·인사·환경안전 > 나머지 > 홍보·IT개발·데이터)
  //   좋은 스타트업·공기업·외국계는 회사마다 편차가 커서 C~A 폭으로 본다
  function specNeed(co = {}, jb = "") {
    const t = tierOf(co);
    if (t.kind === "public" || t.kind === "foreign" || (t.kind === "startup" && co.good)) return { lo: 1, hi: 3 };
    const ease = /영업|생산관리/.test(jb) ? -1 : /재무|회계|연구|R&D|품질|공정/.test(jb) ? -0.5 : /홍보|IT ?개발|개발자|데이터/.test(jb) ? 0.5 : 0;
    const n = (t.kind === "startup" ? 1 : t.n) + ease;
    return { lo: n, hi: n };
  }
  // 신입 나이 기준 (5회차 A4: 만 남 30·여 28 이상이면 '나이 있음', 중고신입은 경력 1년마다 1살, 최대 2살 더)
  function newbieLimit(me = {}) {
    const y = me.years || 0;
    return FIT.newbie_age[/여/.test(me.sex || "") ? "여" : "남"] + Math.min(2, Math.floor(y));
  }
  function judgeNewbie(c) {
    const me = c.me || {}, co = c.target || {}, R = [], tags = [];
    // go: '잡으세요·들어가서' 쪽 말 — 마지막 판정이 말리는 쪽(스펙 보고 이하)이면 빼거나 바꾼다 (2026-10-28 문장 검수)
    const add = (rule, text, go) => R.push(go ? { rule, text, go } : { rule, text });
    const base = co.base ?? 4, y = me.years || 0, age = me.age || 0, lim = newbieLimit(me), old = age > 0 && age >= lim;
    const t = tierOf(co), sp = spec(me, co);
    // 11-12 F11 나이 완충: '스펙이 아까우니 다음 시즌'(어린 쪽)과 '나이 있으니 잡으세요'(나이 든 쪽)가 한 살 차이로 맞붙어 3단계씩 뛰던 것을 계단으로 만든다
    //   기준 나이 한 살 전(near)은 '다음 시즌' 권유를 한 단계 약하게, 기준 나이 딱 그 해(half)는 올림을 절반만. 그 밖의 사람은 전과 같다
    const near = age > 0 && age === lim - 1;
    let half = false;
    let liftAt = -1, lifted = 0;   // 스펙으로 올린 말의 자리 (뒤에서 낮추는 규칙이 이기면 말을 바꾼다)
    let n = base, cap = 6;   // 올리는 규칙(나이·스펙)보다 낮추는 규칙(전망 어두운 직무·다음 시즌)이 늘 이긴다
    // F26 전망 어두운 직무 지원, F21 어리고 스펙 좋은데 회사가 약하면 계속 준비
    const apply = judgeApply({ me: { years: y }, target: { size: co.size, job: me.job } });
    const offerOf = (ind, a = age) => judgeOffers({ me: { sex: me.sex, age: a, years: y, spec: sp && sp.lv >= 3 ? "가능성" : "" },
      a: { size: co.size, industry: ind, job: me.job, rep: co.rating != null && co.rating < 2.8 ? "하" : "" } });
    let offer = offerOf(co.industry);
    // 게임사 ②안: 회사 판정 '가세요' 이상이면 업계 전망 때문에 '계속 준비'로 말리지 않고 '조건 보고 가세요'까지만
    const gameSoft = /게임/.test(co.industry || "") && base >= 5 && offer.verdict === "계속 준비" && offerOf("").verdict !== "계속 준비";
    if (gameSoft) offer = offerOf("");
    if (apply.verdict === "마요") { cap = 2; apply.reasons.forEach(x => add(x.rule, x.text.replace(/ 다른 직무를 보세요\.$/, " 합격했더라도 다른 직무를 같이 알아보세요."))); tags.push("직무 전망 주의"); }
    const prep = offer.verdict === "계속 준비";
    if (prep) {
      cap = near ? 3 : 2;   // 11-12 F11 완충: 기준 나이 한 살 전이면 '계속 준비' 권유를 한 단계 약하게
      offer.reasons.forEach(x => { if (!R.some(r => r.text === x.text)) R.push(x); });
      if (co.rating != null && co.rating < 2.8) add("F21", `현직자 평점이 ${co.rating.toFixed(2)}점으로 낮은 편이에요.`);   // 왜 '계속 준비'인지 말해 준다 (2026-10-28 문장 검수)
      add("F21", "급하지 않다면 더 좋은 카드를 노려 보세요."); tags.push("계속 준비 쪽");
    }
    // 11-12 F11 완충: 한 살만 어렸으면 '계속 준비'를 권했을 사람(스펙 좋은데 평점 낮은 회사·전망 어두운 직무)은 기준 나이 그 해엔 '가세요'까지만
    if (!prep && age > 0 && age === lim && offerOf(gameSoft ? "" : co.industry, age - 1).verdict === "계속 준비") {
      cap = Math.min(cap, 5);
      add("F21", `스펙에 비해 아쉬운 점(낮은 평점이나 직무 전망)이 있는 회사예요. ${age}세라 잡을 만하지만, 고민 없이 갈 자리까지는 아니에요.`);
    }
    // 스펙 vs 회사 수준
    if (sp) {
      const lv = Math.min(sp.lv, 4);   // 회사 수준과 비교할 땐 SS도 S로 (SS가 대기업 붙었다고 '아깝다'로 내리지 않게)
      const nd = specNeed(co, me.job || ""), gap = lv > nd.hi ? lv - nd.hi : lv < nd.lo ? lv - nd.lo : 0;
      const fill = sp.fill.length ? `${j(sp.fill.join("·"), "을", "를")} 채우고` : sp.lv >= 4 ? "" : sp.plant ? "기사 자격증을 더 따고" : "인턴·자격증을 더 쌓고";
      const tail = sp.fill.length ? ` ${j(sp.fill.join("·"), "을", "를")} 채우면 한 단계 위도 노려볼 수 있어요.` : "";
      half = age > 0 && age === lim && base === 3 && (gap >= 2 || (gap >= 1 && schoolV(me) >= 3));   // 한 살만 어렸으면 '다음 시즌'을 권했을 사람
      if (prep && gap >= 0) add("N1", `스펙 ${sp.g}(${sp.word})면 선택지가 많으니 서두를 필요 없어요.`);
      else if ((gap >= 2 || (gap >= 1 && schoolV(me) >= 3)) && !old && base <= 3) {   // 5회차 C3·C4: 아직 나이 여유 있고 회사가 약하면 한 시즌 더 (C3 "학벌이 좋으니까" → 학교 상위면 1단계 위로도)
        const nr = near && base === 3;
        cap = Math.min(cap, nr ? 2 : 1);
        add("N1", nr ? `스펙 ${sp.g}(${sp.word})면 이 회사는 아까워요. 다만 ${age}세면 신입으로 지원할 수 있는 시간이 많이 남진 않았어요. ${fill ? fill + " " : ""}한 시즌만 더 도전해 볼지, 이 카드를 잡고 경력으로 꺾을지 비교해서 정하세요.`
          : `스펙 ${sp.g}(${sp.word})면 이 회사는 아까워요. ${age}세면 아직 나이 여유가 있으니 ${fill ? fill + " " : ""}다음 시즌에 한 단계 위 회사에 지원해 보세요.`);
        tags.push(nr ? "한 시즌 더 볼지 비교" : "다음 시즌 추천");
      } else if (gap >= 2 && base <= 5) {
        n = Math.min(n, base - 1);
        add("N1", `스펙 ${sp.g}(${sp.word})면 이 회사보다 한두 단계 위도 충분히 노려볼 만해요.${sp.strong.length ? ` 특히 ${j(sp.strong.join("·"), "이", "가")} 강점이에요.` : ""}`);
        if (old) add("N1", `${age}세면 나이가 있는 편이니, 일단 들어가서 경력을 쌓고 이직으로 한 단계 위로 꺾으세요.`, true);   // 5회차 A3
      } else if (gap >= 1 && t.n >= 3 && base >= 5) {   // 대기업·금융·공기업인데 회사 자체도 좋으면 '더 위'가 없다 (삼성전자에 '위도 노려볼 만해요'는 이상함)
        add("N1", `스펙 ${sp.g}(${sp.word})에 걸맞은 회사예요.`);
      } else if (gap >= 1) {   // 1단계 위는 판정은 그대로, 말만
        if (old) { add("N1", `스펙 ${sp.g}(${sp.word})면 이 회사보다 위도 노려볼 만해요.`); add("N1", `${age}세면 일단 들어가서 3~4년 뒤 경력 이직으로 꺾는 쪽이 나아요.`, true); }
        else add("N1", `스펙 ${sp.g}(${sp.word})면 이 회사보다 위도 노려볼 만해요. 회사가 괜찮다면 잡아도 되고, 급하지 않다면 한 번 더 도전해도 돼요.`);
      } else if (gap <= -1 && base >= 2 && base <= 5) {
        n = Math.max(n, Math.min(6, base + (gap <= -2 ? 2 : 1)));
        liftAt = R.length; lifted = n;
        add("N1", `스펙 ${sp.g}(${sp.word}) 기준으로는 좋은 카드예요. 잡고 들어가서 경력을 쌓으세요.${tail}`, true);
      } else add("N1", `스펙 ${sp.g}(${sp.word})에 맞는 회사예요.${tail}`);
      if (sp.gpaBad) add("N2", `학점 ${sp.gpa}점(4.5 만점 기준)은 서류에서 크게 걸려요. 학교와 상관없이 약점으로 봐요.`);
      else if (sp.tr === "sci" && sp.gpa != null && sp.gpa <= 3.5) add("N2", `이공계는 학점 ${sp.gpa}점(4.5 만점 기준)이면 면접에서 공격받기 쉬워요. 답을 준비해 두세요.`);
      add("N1", `스펙은 ${sp.how} 봤어요.`);
    }
    // 5회차 B2: 직무별로 크게 먹히는 스펙
    const jb = me.job || "";
    if (FIN_JOB.test(jb) && !(Number(me.cert) > 0)) add("N3", "재무는 재경관리사 같은 자격증이 크게 먹혀요. 아직 없다면 따 두세요.");
    else if (/인사|HR/.test(jb)) add("N3", "인사는 업무 이해도와 HR 트렌드를 얼마나 아는지를 봐요.");
    else if (RND_JOB.test(jb) && !/석사|박사/.test(me.degree || "")) add("N3", "연구개발은 석사 이상이 크게 유리해요. 학사로 가는 거면 들어가서 맡는 일의 범위를 꼭 확인하세요.");
    else if (PLANT_SPEC_JOB.test(jb) && !(Number(me.cert) >= 2)) add("N3", "생산·공정·품질·안전은 기사 자격증이 여러 개(3기사·4기사)면 절대적으로 유리해요.");
    // 나이 (F21) · 공기업 (A8) · 취준 기간 (B5)
    if (old) {
      // 5회차 A8·C8 공기업은 나이 있으면 '무조건' — 11-12 F2: 회사 자체 판정이 '조건 보고 가세요' 이상일 때만 (나쁜 회사·중립기어는 안 올림)
      if (t.kind === "public" && base >= 4) { n = Math.max(n, 6); add("N4", `공기업은 안정성을 보고 가는 곳이에요. ${age}세면 고민 없이 잡으세요.`, true); }
      else {
        if (t.kind === "public") add("N4", "공기업이라도 회사 자체 판정이 낮으면 안정성만 믿고 가긴 어려워요. 재무·평판부터 확인하세요.");
        if (base >= 3 && base <= 4) n = Math.max(n, half ? base : base + 1);   // 조건 보고·중립기어만 한 단계 올린다 (기준 나이 딱 그 해는 스펙으로 내린 것만 되돌림)
        add("F21", y > 0 ? `${age}세면 신입 공채보다 경력 지원이 맞는 나이예요. 이 카드가 괜찮다면 잡고 경력을 이어 가세요.`
          : half ? `${age}세면 신입 지원이 어려워지기 시작하는 나이예요. 갈 만한 곳이면 잡는 쪽으로 보세요.` : `${age}세면 신입 지원이 점점 어려워져요. 갈 만한 곳이면 잡으세요.`, true);
      }
      tags.push("신입 나이 넘김");
    } else if (age && age <= lim - 3 && base <= 3 && liftAt < 0 && !(Number(me.search) >= 12) && !R.some(x => /나이 여유|지원이 가능한 나이/.test(x.text))) { add("F21", `${age}세면 아직 시간이 있어요. 서두르지 말고 더 맞는 곳을 찾아도 돼요.`); tags.push("시간 여유 있음"); }
    if (Number(me.search) >= 12) {
      if (base >= 3 && base <= 4) n = Math.max(n, base + 1);
      add("N5", "취업 준비가 1년을 넘었으면 갈 만한 곳은 잡고, 들어가서 경력으로 꺾는 게 나아요.", true);
    }
    // 중고신입: 지금 회사보다 위 급이면 올리고, 연봉이 깎이면 급·직무로 가른다 (5회차 A5·C7)
    if (y > 0 && me.salary && co.salary) {
      const up = me.prevSize ? t.n - tier(me.prevSize).n : 0, gap = co.salary - me.salary, cut = -gap / me.salary * 100, fin = t.kind === "finance";
      if (up >= 1 && gap >= 0) { n = Math.max(n, Math.min(6, base + 1)); add("N6", fin ? "지금 회사보다 회사 수준(평균 연봉 기준)이 높은 금융사로 다시 들어가는 거라 좋은 선택이에요." : "지금 회사보다 위 급 회사로 다시 들어가는 거라 좋은 선택이에요."); }
      if (gap < 0) {
        if (up >= 1) add("N6", fin ? "회사 수준(평균 연봉 기준)이 더 높은 금융사로 가는 거라 연봉이 좀 깎여도 괜찮아요." : "회사 급이 오르니 연봉이 좀 깎여도 괜찮아요.");
        else if (me.prevSame === "다른") add("N6", "직무를 바꾸는 거라, 그 직무로 가려는 의지가 확실하다면 깎여도 괜찮아요.");
        else { cap = Math.min(cap, 4); add("N6", me.prevSize ? "회사 급도 직무도 그대로인데 연봉이 깎여요. 이 회사를 꼭 가야 할 이유가 있을 때만 가세요." : "직무는 그대로인데 연봉이 깎여요. 이 회사를 꼭 가야 할 이유가 있을 때만 가세요."); }
        if (cut > 10) add("N6", `다만 ${Math.round(cut)}%나 깎이는 건 아쉬워요.`);
      }
    }
    // 다른 합격 카드 (5회차 A9): 더 좋은 카드가 있으면 회사가 좋을 땐 비교, 별로면 다시 생각
    if (me.cards === "better") {
      if (base >= 5) add("N7", "더 좋은 카드가 있다면 두 회사를 꼭 나란히 놓고 비교하세요.");
      else { cap = Math.min(cap, 1); add("N7", "이 회사보다 좋은 카드가 있다면 그쪽을 잡으세요."); }
    } else if (me.cards === "wait" || me.cards === "1") add("N7", "결과 기다리는 곳이 있다면 일단 이 카드를 쥐고, 더 좋은 결과가 나오면 그때 옮겨도 돼요.");   // 5회차 C6
    else if (me.cards === "same") add("N7", "비슷한 카드가 또 있다면 직무·근무지로 고르세요.");
    // 5회차 B3: 첫 회사로 피할 패턴
    if (t.kind === "startup" && !co.good) add("N8", "시리즈 A도 안 된 스타트업이면 첫 회사로는 주의하세요. 투자·매출부터 확인하세요.");
    if (/칼퇴/.test(co.wlb || "")) add("N8", "워라밸이 너무 좋은 회사는 신입 때 일을 배우기 어려울 수 있어요. 배울 수 있는 팀인지 확인하세요.");
    if (co.salary && co.salary < 3500 && t.kind !== "startup") add("N9", `신입 연봉 ${co.salary.toLocaleString()}만 원은 짠 편이에요.`);   // 5회차 C4
    if (/지방/.test(co.place || "") && !PLANT_JOB.test(jb)) add("N9", "근무지가 지방이에요. 사는 곳에서 다닐 만한지 먼저 보세요.");   // 5회차 C5
    if (gameSoft) { cap = Math.min(cap, 4); add("F26", "게임 업계는 전망이 밝은 편이 아니라 '조건 보고 가세요'까지만 드려요. 회사가 좋아서 잡아도 되지만, 다른 업계에서도 통하는 경력으로 키워 두세요."); tags.push("게임 업계 전망 주의"); }
    // 11-12 F11: 신입·중고신입 칸은 경력 4년까지. 넘는 값이 들어오면 '조건 보고 가세요'까지만 주고 경력 이직 쪽으로 안내
    if (y > FIT.newbie_years_max) { cap = Math.min(cap, 4); add("N10", `경력 ${y}년이면 신입이 아니라 경력 이직 기준으로 봐야 정확해요. '내 상황 고치기'에서 '경력 이직'으로 바꿔 다시 보세요.`); tags.push("경력 이직 기준으로 보세요"); }
    if (co.lack) cap = Math.min(cap, FIT.lack_cap);   // 11-12 F1: 판단자료 부족 회사는 '가세요'까지
    n = Math.max(0, Math.min(6, Math.min(n, cap)));
    if (liftAt >= 0 && n < Math.min(lifted, 5)) R[liftAt] = { rule: "N1", text: `스펙 ${sp.g}(${sp.word}) 기준으로는 좋은 회사지만, 다른 걸리는 점 때문에 판정을 올리지 않았어요.` };
    if (n <= 2) {   // 말리는 판정이면 '잡으세요·들어가서' 말을 빼고, 나이 있는 사람에겐 한 줄로 바꿔 준다
      const goes = R.filter(x => x.go).length;
      for (let i = R.length - 1; i >= 0; i--) if (R[i].go) R.splice(i, 1);
      if (goes && old) add("F21", `${age}세라 서두르고 싶겠지만, 이 카드는 아니에요. 갈 만한 다른 곳을 잡으세요.`);
    }
    return { verdict: STEPS[n], n, reasons: R, tags, spec: sp, lim, old, near, half, gameSoft };
  }

  function judge(c) {
    if (c.type === "A") return judgeMove(c);
    if (c.type === "B") return judgeApply(c);
    if (c.type === "N") return judgeNewbie(c);
    return judgeOffers(c);
  }

  const api = { FIT, STEPS, judge, tier, tierOf, track, downInd, family, badField, spec, specNeed, newbieLimit, wlbAdjust, wlbApply, TB };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FitEngine = api;
})(this);
;
// 회사 데이터는 data/index.json(검색용 이름 목록) + data/co/NNN.json(회사 상세 128조각)으로 나눠 필요할 때만 읽는다
const SHARDS = 128;
const PICKS = BOOT.PICKS || [];   // 많이 본 회사(/top)를 못 받을 때만 쓰는 기본 5곳
const BASIS = BOOT.BASIS || {};   // 판정 근거별 회사 수 (build.py, 2026-11-07: 국민연금 판정 켤 때만 채움)
const VDIST = BOOT.VDIST || {};   // 판정별 회사 수 (build.py, 2026-10-29 첫 화면 판정 분포 카드)
const SERIES = BOOT.SERIES || [];  // 첫 화면 시리즈 4개 (build.py series, 주마다 바뀜) — 맨 앞 '많이 본 TOP 10'은 /top 으로
const TS_KEY = "0x4AAAAAAFpHJtrOG8cQcwBZ";   // Cloudflare Turnstile 사이트 키 (공개값, config turnstile_sitekey). 하루 많이 본 사람에게만 봇 확인 (2026-10-28)
const API = "https://company-api.jobzorro.workers.dev";  // 비어 있지 않으면 회사 상세는 API에서 한 곳씩 (조각 파일은 사이트에 안 올림)
let IDX_S = new Map();   // 2026-11-04 이름 → 시도 (등록 주소, 없으면 국민연금 가장 큰 사업장)
const SIDO_L = ["", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
let DISP = new Map(Object.entries(BOOT.DISP || {}));   // 2026-11-05 화면에 보일 이름 (에스케이하이닉스 → SK하이닉스, （주）아모레퍼시픽 → 아모레퍼시픽). 열쇠는 등록명 그대로
const LEGAL_RE = /\s*(\(주\)|（주）|\(주）|（주\)|㈜|주식회사|\(유\)|（유）|\(유한\)|유한회사)\s*/g;
const dn = n => DISP.get(n) || (n || "").replace(LEGAL_RE, " ").replace(/\s+/g, " ").trim() || n;
let IDX = [];            // [이름, 판정 코드, 업계] — 판정 코드 0=판단자료 부족
const cache = {};        // 조각 번호 → 회사 상세
const VCODE = ["판단자료 부족","가세요","조건 보고 가세요","스펙 보고 결정하세요","다시 생각해요","무조건 가세요","중립기어","비추예요"];
function shardOf(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return h % SHARDS; }
async function getCo(name) {
  if (API) {
    if (!cache[name]) cache[name] = fetch(`${API}/co?n=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : r.status === 429 ? { __limit: true } : r.status === 401 ? { __limit: true, __challenge: true } : r.status === 410 ? { __hidden: true } : r.status >= 500 ? { __err: true } : null)
      .catch(() => ({ __err: true }));   // 서버 오류·연결 끊김은 '자료 없음'과 구분
    const c = await cache[name];
    if (c && (c.__limit || c.__err)) delete cache[name];  // 제한 풀리거나 서버가 돌아오면 다시 받을 수 있게
    return c;
  }
  const k = shardOf(name);
  if (!cache[k]) cache[k] = fetch(`data/co/${String(k).padStart(3, "0")}.json`).then(r => r.json()).catch(() => ({}));
  return (await cache[k])[name];
}
// ---- 2단계: 지표 보내기 (API 모드에서만). 개인정보는 보내지 않음, 기기 id는 하트 중복 막기용 무작위 값
const DEV = (() => { try { let d = localStorage.getItem("cc-dev"); if (!d) { d = crypto.getRandomValues(new Uint32Array(3)).join("").slice(0, 20); localStorage.setItem("cc-dev", d); } return d; } catch (e) { return "s" + Math.random().toString(36).slice(2, 14); } })();
const send = (path, body) => API ? fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null);
const ev = (k, n = "") => send("/ev", { k, n });
const hearted = { get: n => { try { return JSON.parse(localStorage.getItem("cc-hearts") || "[]").includes(n); } catch (e) { return false; } },
  add: n => { try { const a = JSON.parse(localStorage.getItem("cc-hearts") || "[]"); a.push(n); localStorage.setItem("cc-hearts", JSON.stringify(a.slice(-500))); } catch (e) {} } };
function toast(msg) { const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; el.setAttribute("role", "status"); document.body.append(el); setTimeout(() => el.remove(), 2200); }
let CUR = null;  // 지금 보고 있는 회사

// 카드 PICK: 7단계 판정을 한 단어로. 가운데(중립기어·스펙 보고 결정하세요)는 억지로 가르지 않고 '고민해 보세요'
function cardPick(c) {
  const g = { "무조건 가세요": 6, "가세요": 5, "조건 보고 가세요": 4, "중립기어": 3, "스펙 보고 결정하세요": 2, "다시 생각해요": 1, "비추예요": 0 }[c.verdict];
  const word = g >= 4 ? "가세요" : g <= 1 ? "가지 마세요" : "고민해 보세요";
  const L = k => c.grades?.[k]?.letter, ks = ["평판", "연봉", "성장성", "수익성", "안정성"];
  const good = ks.filter(k => /^(S|A\+|A)$/.test(L(k) || "")), bad = ks.filter(k => /^(C|D|F)$/.test(L(k) || ""));
  const why = [good.length ? "좋은 점 " + good.slice(0, 2).join("·") : "", bad.length ? "걸리는 점 " + bad.slice(0, 2).join("·") : ""].filter(Boolean).join("   /   ");
  return { word, why, bg: g >= 4 ? "#f3ffd6" : g <= 1 ? "#fff1ef" : "#f5f5f5", fg: g >= 4 ? "#0b0b0b" : g <= 1 ? "#d92d20" : "#3a3a3a" };
}
// 한마디 목록: 내 상황 한마디는 길어서 첫 줄 포함 4줄만 보이고 나머지는 '더 보기' (2026-10-28 사용자 요청). 일반 한마디는 그대로
function zList(z, my) {
  const li = (t, last) => `<li class="${last ? "last" : ""}">${esc(zEta(t))}</li>`, rest = z.slice(1);
  const ul = `<ul>${rest.map((t, i) => li(t, i === rest.length - 1)).join("")}</ul>`;
  if (rest.length <= 4) return ul;   // 2026-10-29: 일반 한마디도 4줄 + 더 보기
  // 2026-10-28 사용자: '더 보기'가 중간에 떠 있어 이상함 → 다른 사이트처럼 넷째 줄을 흐리게 비추고, 그 아래 카드 폭 버튼. 펼치면 맨 아래에서 '접기'
  return `<div class="zfold clip">${ul}<button type="button" class="zmore-btn" aria-expanded="false" data-n="${rest.length - 3}">더 보기 <small>${rest.length - 3}줄</small><i aria-hidden="true"></i></button></div>`;
}
document.addEventListener("click", e => { const b = e.target.closest(".zmore-btn"); if (!b) return;
  const f = b.closest(".zfold"), open = f.classList.toggle("clip") === false;
  b.setAttribute("aria-expanded", String(open)); b.innerHTML = open ? `접기<i aria-hidden="true"></i>` : `더 보기 <small>${b.dataset.n}줄</small><i aria-hidden="true"></i>`;
  if (!open) f.closest(".zorro")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); });   // 접으면 한마디가 화면 밖으로 안 나가게
// 2026-10-29 모바일: 회사 화면 칸 바로가기(스크롤하면 위에 붙음) + 아래 고정 버튼 3개(내 상황·VS·공유)
function coDock(c, my) {
  const out = $("#out"), board = out.querySelector(".board"); if (!board) return;
  const secs = [["s1", "평판"], ["s2", "연봉"], ["s3", "재무"], ["s6", "뉴스"], ["s7", "AI"]].filter(([id]) => document.getElementById(id));
  board.insertAdjacentHTML("afterend", `<nav class="secnav" aria-label="칸 바로가기">${secs.map(([id, t]) => `<a href="#${id}" data-s="${id}">${t}</a>`).join("")}</nav>`);
  const nav = out.querySelector(".secnav");
  nav.onclick = e => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); const t = document.getElementById(a.dataset.s);
    scrollTo({ top: t.getBoundingClientRect().top + scrollY - 54 - nav.offsetHeight - 8, behavior: "smooth" }); };
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) nav.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.s === x.target.id || (x.target.id === "s4" || x.target.id === "s5") && a.dataset.s === "s3")); }), { rootMargin: "-45% 0px -50% 0px" });
    ["s1", "s2", "s3", "s4", "s5", "s6", "s7"].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); }); }
  let d = document.getElementById("codock");
  if (!d) { d = document.createElement("div"); d.id = "codock"; d.className = "codock"; document.body.append(d); }
  d.innerHTML = `<button type="button" class="p" data-k="me">${my ? "내 상황 고치기" : "내 상황 넣기"}</button><button type="button" data-k="vs">VS 비교</button><button type="button" data-k="share">공유</button>`;
  d.onclick = e => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.k === "me") $("#meOpenBtn")?.click();
    else if (b.dataset.k === "vs") { $("#b-vs")?.click(); $("#vsq")?.scrollIntoView({ block: "center", behavior: "smooth" }); }
    else shareLink(); };
  const acts = out.querySelector(".acts");   // 맨 위 버튼 줄이 화면에 보일 땐 숨김 (같은 버튼 두 번 안 보이게)
  if (acts && "IntersectionObserver" in window) new IntersectionObserver(es => d.classList.toggle("on", !es[0].isIntersecting && es[0].boundingClientRect.top < 0)).observe(acts);
  else d.classList.add("on");
}
// 자료 기준일 (2026-10-28 사용자 요청): 칸마다 어느 자료·언제 것인지 한 줄
const mdOf = d => { const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}.${m[2]}.${m[3]}` : String(d || ""); };
function srcOf(c, k) {
  const f = c.fin, s = c.salary;
  if (k === "평판") return c.rep?.date ? `${mdOf(c.rep.date)} 잡플래닛·블라인드·캐치 공개 평점` : "";
  if (k === "연봉") return s ? `평균 연봉 ${s.avgSrc || "국민연금 기준"} · 직급별은 추정` : "";
  if (k === "주요 뉴스") return c.news?.date ? `${mdOf(c.news.date)}까지 기사` : "";
  if (k === "AI 영향") return c.ai ? "업종 기준 조로 판단" : "";
  if (f?.years?.length) return `${f.years[0]}~${f.years.at(-1)}년 ${f.source || "재무제표"}`;
  return "";
}
// 봇 확인: 하루 많이 본 사람에게 Turnstile 상자 하나 → 통과하면 /pass 로 알리고 그 회사를 다시 연다
function humanCheck(name) {
  $("#out").innerHTML = `<div class="sec">${empty("오늘 많이 보셨네요. 사람인지 한 번만 확인할게요.")}<div id="tsbox" style="display:flex;justify-content:center;margin:16px 0"></div></div>`;
  const draw = () => window.turnstile.render("#tsbox", { sitekey: TS_KEY, language: "ko",
    callback: async token => { const r = await send("/pass", { token }); if (r?.ok) render(name); else toast("확인에 실패했어요. 다시 시도해 주세요."); } });
  if (window.turnstile) return draw();
  const sc = document.createElement("script"); sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; sc.async = true; sc.onload = draw; document.head.append(sc);
}
// 결과 카드: 판정·등급·한마디 첫 줄을 1080×1350 이미지로 (카톡·인스타 공유용, 사이트 주소 박힘)
async function makeCard(c, my = null) {   // my = 내 상황 판정(meJudge 결과). 있으면 판정·PICK을 내 기준으로 (2026-10-28)
  const verdict = my ? my.v : c.verdict;
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d"), F = '"Noto Sans KR","Malgun Gothic",sans-serif', D = '"Archivo","Noto Sans KR",sans-serif';
  try { await document.fonts.ready; } catch (e) {}
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#0b0b0b"; x.fillRect(0, 0, W, 14);
  x.font = `700 30px ${F}`; x.fillStyle = "#3a3a3a"; x.fillText("회사 판단 연구소 · " + grpName(c.salary, c.name), 80, 120);
  let fs = 92; x.font = `900 ${fs}px ${F}`; while (x.measureText(dn(c.name)).width > W - 160 && fs > 48) { fs -= 4; x.font = `900 ${fs}px ${F}`; }
  x.fillStyle = "#0b0b0b"; x.fillText(dn(c.name), 80, 230);
  // 판정 알약
  const go = /가세요$/.test(verdict) && verdict !== "조건 보고 가세요", bad = verdict === "비추예요";
  x.font = `900 52px ${F}`; const vw = x.measureText(verdict).width + 80;
  x.fillStyle = bad ? "#d92d20" : go ? "#c6ff3d" : "#ffffff"; x.strokeStyle = bad ? "#d92d20" : go ? "#c6ff3d" : "#0b0b0b"; x.lineWidth = 4;
  x.beginPath(); x.roundRect(80, 290, vw, 96, 48); x.fill(); x.stroke();
  x.fillStyle = bad ? "#ffffff" : "#0b0b0b"; x.fillText(verdict, 120, 357);
  x.font = `800 28px ${F}`; x.fillStyle = "#3a3a3a"; x.fillText((c.tags || []).join("  ·  "), 80, 440);
  // 다섯 칸 등급
  const ks = ["평판", "연봉", "성장성", "수익성", "안정성"], cw = (W - 160) / 5;
  x.strokeStyle = "#0b0b0b"; x.lineWidth = 3; x.beginPath(); x.moveTo(80, 500); x.lineTo(W - 80, 500); x.moveTo(80, 720); x.lineTo(W - 80, 720); x.stroke();
  ks.forEach((k, i) => { const g = c.grades[k], L = g?.letter || (g?.grade == null ? "?" : ["하", "중", "상"][g.grade]), cx = 80 + i * cw;
    x.font = `700 28px ${F}`; x.fillStyle = "#3a3a3a"; x.fillText(k, cx + 18, 560);
    x.font = `900 104px ${D}`; x.fillStyle = L === "F" ? "#d92d20" : /^(S|A\+|A)$/.test(L) ? "#1b8f63" : /^(C|D)$/.test(L) ? "#c2410c" : L === "?" ? "#a3a3a3" : "#3a3a3a";
    x.fillText(L, cx + 14, 680); });
  // 조로의 PICK 칸: 가세요 / 가지 마세요 한 단어 + 좋은 점·걸리는 점 + 한마디 첫 줄 (2026-10-27 사용자 요청)
  const pk = cardPick({ ...c, verdict });
  // 내 상황 카드: 근거는 칩(연봉 %, 급, 직무)으로만 — 내 연봉 금액·나이는 카드에 안 싣는다 (남에게 보내는 이미지라서)
  if (my) pk.why = (my.chips || []).filter(t => !/^회사 판정/.test(t)).slice(0, 3).join("  ·  ");
  x.fillStyle = pk.bg; x.strokeStyle = "#0b0b0b"; x.lineWidth = 4; x.beginPath(); x.roundRect(80, 760, W - 160, 380, 28); x.fill(); x.stroke();
  x.font = `800 30px ${F}`; x.fillStyle = "#3a3a3a"; x.fillText(my ? "내 상황 기준 · 조로의 PICK" : "조로의 PICK", 124, 830);
  x.font = `900 84px ${F}`; x.fillStyle = pk.fg; x.fillText(pk.word, 124, 935);
  x.font = `700 32px ${F}`; x.fillStyle = "#3a3a3a"; if (pk.why) x.fillText(pk.why, 124, 1000);
  x.font = `700 34px ${F}`; x.fillStyle = "#0b0b0b";
  let line = "", y = pk.why ? 1062 : 1010; for (const ch of ((my ? ME_FIRST[verdict]?.replace("아래 ", "") : c.zorro?.[0]) || "")) { if (x.measureText(line + ch).width > W - 250) { x.fillText(line, 124, y); line = ch.trim(); y += 48; if (y > 1110) break; } else line += ch; }
  if (y <= 1110) x.fillText(line, 124, y);
  // 아래: 주소 + 로고
  x.fillStyle = "#c6ff3d"; x.fillRect(0, H - 150, W, 150);
  x.font = `900 38px ${F}`; x.fillStyle = "#0b0b0b"; x.fillText("job.jobzorro.kr/company", 80, H - 62);
  try { const img = new Image(); img.src = "assets/jobzorro_logo.png"; await img.decode(); const h = 56, w = img.width * h / img.height; x.drawImage(img, W - 80 - w, H - 103, w, h); } catch (e) {}
  x.font = `500 22px ${F}`; x.fillStyle = "#7a7a7a"; x.fillText(my ? `회사 일반 판정은 '${c.verdict}'예요. 위는 내 상황을 넣어 본 결과라 사람마다 달라요.` : "회사에 대한 일반적인 평가예요. 본인 스펙과 상황에 따라 판단하세요.", 80, H - 180);
  return new Promise(r => cv.toBlob(r, "image/png"));
}
async function saveCard() {
  const c = CUR; if (!c) return;
  meQuiet = true; let my = null; try { my = meJudge(c); } finally { meQuiet = false; }   // 카드용으로 다시 계산할 땐 기록 안 보냄
  const blob = await makeCard(c, my), file = new File([blob], `${c.name}_조로판정.png`, { type: "image/png" });
  ev("card", c.name);
  // 휴대폰은 공유창(카톡·갤러리), PC는 바로 저장
  if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: dn(c.name) + " · Zorro의 판정" }); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast("결과 카드를 저장했어요");
}
async function shareLink() {
  const c = CUR; if (!c) return; const url = location.origin + location.pathname + "#" + encodeURIComponent(c.name);
  ev("share", c.name);
  if (navigator.share) { try { await navigator.share({ title: dn(c.name) + " · 회사 판단 연구소", url }); return; } catch (e) { if (e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); toast("링크를 복사했어요"); } catch (e) { toast(url); }
}
async function heart(btn) {
  const c = CUR; if (!c || hearted.get(c.name)) return;
  btn.classList.add("on"); hearted.add(c.name);
  const r = await send("/heart", { n: c.name, d: DEV });
  btn.querySelector("b").textContent = (r?.hearts ?? (c._s?.hearts || 0) + 1).toLocaleString("ko-KR");
}
// PC에서 화면 캡처 키를 누르면 기록 (휴대폰 캡처는 브라우저가 알 수 없음)
addEventListener("keyup", e => { if (e.key === "PrintScreen" && CUR) ev("shot", CUR.name); });

const GR = {2:"상",1:"중",0:"하"};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const won = v => v == null ? "-" : v.toLocaleString("ko-KR");
const eok = v => v == null ? "-" : (Math.abs(v) >= 10000 ? (v/10000).toFixed(1) + "조" : Math.round(v).toLocaleString("ko-KR") + "억");
const gcls = g => g == null ? "gn" : "g" + g;
const gtxt = g => g == null ? "–" : GR[g];
// 7단계 등급(S·A+·A·B·C·D·F)이 있으면 그걸, 없으면 상중하
const lcls = x => x?.letter ? "l" + x.letter.replace("+", "p") : gcls(x?.grade);
const ltxt = x => x?.letter || gtxt(x?.grade);
const plain = s => s.replace(/[（(]\s*(주|유|유한)\s*[）)]|㈜|주식회사|유한책임회사|유한회사|[\s\-]/g, "");  // 띄어쓰기·하이픈·법인 표기 무시 (에쓰오일 → 에쓰-오일, 2026-11-08 '법무법인 세종' → 법무법인(유한) 세종)

// 다섯 칸 한 줄 설명 (근거는 접어 두고 핵심 하나만)
function oneLine(c, k) {
  const m = c.metrics || {}, it = (g, l) => (m[g]?.items || []).find(i => i.label.startsWith(l))?.value;
  if (k === "평판") { const r = c.rep || {}; const n = ["jobplanet","blind","catch"].filter(s => r[s]?.count).length, z = [["jobplanet","잡플래닛"],["blind","블라인드"],["catch","캐치"]].filter(([s, l]) => (r[s] && !r[s].count) || (c.repEmpty || []).includes(l)).map(x => x[1]); return n ? `평점 ${n}곳 종합` : z.length ? `${z.join("·")} 리뷰 0개` : "평점 자료 없음"; }   // 11-08 회사 페이지만 있고 리뷰 없음
  if (k === "연봉") { const s = c.salary; return !s ? "연봉 자료 없음" : s.industryTop ? `업계 상위 ${s.industryTop}% · 전체 ${s.allTop}%` : `전체 회사 상위 ${s.allTop}%`; }
  if (!c.fin) return "재무 공시 없음";
  if (k === "성장성") return `매출 연평균 ${it("성장성","매출 연평균")?.toFixed(1)}%`;
  if (k === "수익성") return `5년 평균 영업이익률 ${it("수익성","5년 평균")?.toFixed(1) ?? "-"}%`;
  if (k === "안정성" && m["안정성"]?.capimp) return "자본잠식 (자본총계 마이너스)";
  if (k === "안정성") return c.fin.finind ? `총자산레버리지 ${it("안정성","총자산레버리지")?.toFixed(1) ?? "-"}배 · ${c.fin.finind.key} 기준` : `부채비율 ${Math.round(it("안정성","부채비율") ?? NaN) || "-"}%` + (c.fin.indstab?.peer?.rank ? ` · ${c.fin.indstab.key} ${c.fin.indstab.peer.n}곳 중 ${c.fin.indstab.peer.rank}위` : c.fin.indstab ? ` · ${c.fin.indstab.key} 기준` : "");   // 금융업은 신평사 지표 (2026-11-01)
}

// 판단자료가 부족할 때 나오는 돋보기 든 꼬마 (인라인 SVG, 색은 테마 토큰)
const MASCOT = `<svg viewBox="0 0 120 110" aria-hidden="true"><ellipse cx="54" cy="100" rx="34" ry="5" fill="var(--mist)"/>
  <circle cx="54" cy="56" r="38" fill="#c6ff3d" stroke="var(--ink)" stroke-width="3"/>
  <circle cx="41" cy="52" r="4.5" fill="#0b0b0b"/><circle cx="66" cy="52" r="4.5" fill="#0b0b0b"/>
  <circle cx="42.5" cy="50.5" r="1.5" fill="#fff"/><circle cx="67.5" cy="50.5" r="1.5" fill="#fff"/>
  <ellipse cx="33" cy="64" rx="5" ry="3" fill="#ff9fb0" opacity=".8"/><ellipse cx="75" cy="64" rx="5" ry="3" fill="#ff9fb0" opacity=".8"/>
  <path d="M47 69 q7 -5 14 0" fill="none" stroke="#0b0b0b" stroke-width="3" stroke-linecap="round"/>
  <path d="M86 22 q6 9 0 13 q-6 -4 0 -13z" fill="#7cc8ff" stroke="var(--ink)" stroke-width="1.5"/>
  <circle cx="95" cy="78" r="13" fill="var(--paper)" stroke="var(--ink)" stroke-width="3.5"/><path d="M104 87 l10 10" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
  <text x="95" y="83.5" text-anchor="middle" font-size="15" font-weight="900" style="fill:var(--ink)">?</text></svg>`;
const empty = (what = "") => `<div class="empty">${MASCOT}<b>판단자료가 부족합니다</b><small>${esc(what)}</small></div>`;

function repCard(key, label, r, date, c) {
  if (!r && (c?.repEmpty || []).includes(label)) r = { score: 0, count: 0 };   // 회사 페이지만 있고 리뷰 0 (rep_empty)
  if (r && !r.count) return `<div class="rep zero"><p class="site">${label}<span>5점 만점</span></p>
    <p class="sc num">0.0<small> / 5</small></p>
    <p class="cnt">평가한 사람 0명 · 아직 아무도 리뷰를 안 썼어요</p>
    <p class="znote">회사 페이지는 있지만 리뷰가 없어서 판정 계산에는 넣지 않았어요.</p>
    <p class="src"><span>기준일 ${esc(date)}</span>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">원문 보기 ↗</a>` : ""}</p></div>`;   // 2026-11-09 사용자: 0점·0명 그대로 보여 주고 계산 제외만 안내
  if (!r) return `<div class="rep none">${empty(label + " 공개 평점을 찾지 못했어요")}</div>`;
  const low = r.count < 20;
  const subs = Object.entries(r.subs || {}).map(([k, v]) =>
    `<div class="sub"><span>${esc(k.replace("업무와 삶의 균형","워라밸"))}</span><span class="bar"><i style="width:${v/5*100}%"></i></span><b>${v.toFixed(1)}</b></div>`).join("");
  return `<div class="rep"><p class="site">${label}<span>5점 만점</span></p>
    <p class="sc num">${r.score.toFixed(1)}<small> / 5</small></p>
    <p class="cnt${low ? " low" : ""}">${won(r.count)}명 평가${low ? " · 표본 적음" : ""}</p>
    <div class="subs">${subs}</div>
    <p class="src"><span>기준일 ${esc(date)}</span><a href="${esc(r.url)}" target="_blank" rel="noopener">원문 보기 ↗</a></p></div>`;
}

// A안 (2026-11-07 사용자 결정): '판단자료 부족' 회사에 국민연금 숫자로 본 참고 신호. 판정은 그대로 둔다.
// 점수: 업계 연봉 ≤20 +2 · ≤40 +1 · ≤60 0 · ≤80 −1 · 그 아래 −2 / 퇴사율 <15% +1 · <35% 0 · 그 위 −1 / 근속 ≥8년 +1 · ≥3년 0 · 그 아래 −1
// 합 ≥2 좋음 · ≤−2 주의 · 나머지 보통. 세 숫자 중 하나라도 없으면 상자를 안 띄움.
function npsSig(c) {
  const s = c.salary;
  const byNps = c.basis === "nps";   // R40: 국민연금 숫자로 낸 판정 (2026-11-07)
  if ((c.verdict !== "판단자료 부족" && !byNps) || !s) return null;
  const top = s.industryTop ?? s.allTop;
  if (top == null || s.turnover == null || s.tenure == null) return null;
  const p = top <= 20 ? 2 : top <= 40 ? 1 : top <= 60 ? 0 : top <= 80 ? -1 : -2;
  const t = s.turnover < .15 ? 1 : s.turnover < .35 ? 0 : -1;
  const n = s.tenure >= 8 ? 1 : s.tenure >= 3 ? 0 : -1;
  const odd = s.turnover > 1;   // 11-12 C13: 퇴사율 100% 초과는 집계 이상값 → 그 때문에 '주의'가 되지는 않게 (score.py nps_sig 와 같게)
  const sum = p + t + n, lv = sum >= 2 ? "좋음" : (odd ? sum + 1 : sum) <= -2 ? "주의" : "보통";
  const cl = x => x > 0 ? "g" : x < 0 ? "b" : "m";
  const pw = ["많이 낮아요", "아래쪽", "중간", "좋은 편", "업계 위쪽"][p + 2];
  const say = [p > 0 ? "연봉은 업계 위쪽이고" : p < 0 ? "연봉은 업계 아래쪽이고" : "연봉은 업계 중간이고",
    t > 0 ? "사람이 잘 안 나가고" : t < 0 ? "사람이 많이 나가고" : "퇴사는 보통이고",
    n > 0 ? "오래 다니는 회사예요." : n < 0 ? "근속이 짧은 회사예요." : "근속은 보통인 회사예요."].join(", ");
  const html = `<div class="nps"><div class="top"><h4>국민연금으로 본 신호</h4><span class="sig ${{ 좋음: "g", 보통: "m", 주의: "b" }[lv]}">${lv}</span><span class="src">국민연금 가입자 자료</span></div>
    <div class="row"><div class="it"><p>${s.industryTop != null ? "업계 연봉" : "전체 연봉"}</p><b>상위 ${top}%</b><span class="${cl(p)}">${pw}</span></div>
      <div class="it"><p>연간 퇴사율</p><b>${Math.round(s.turnover * 100)}%</b><span class="${cl(t)}">${t > 0 ? "사람이 잘 안 나가요" : t < 0 ? "많이 나가요" : "보통"}</span></div>
      <div class="it"><p>평균 근속</p><b>${s.tenure}년</b><span class="${cl(n)}">${n > 0 ? "오래 다녀요" : n < 0 ? "짧아요" : "보통"}</span></div></div>
    <p class="say">${say}</p>
    <p class="fine">${c.repEmpty ? `${esc(c.repEmpty.join("·"))}에 회사 페이지는 있지만 리뷰가 0개예요. ` : ""}${byNps ? "평점·재무 자료가 없어 국민연금 숫자로만 낸 판정이에요" : "평점·재무 자료가 없어 판정 대신 보여 드리는 참고 신호예요"}. 국민연금 자료만으로 낸 판정은 맞는 비율이 66% 정도라, 신호가 아주 셀 때만 판정으로 내고 있어요. 참고로만 봐 주세요.</p></div>`;
  const z = { 좋음: "국민연금 신호는 좋아요. 그래도 면접에서 팀 분위기와 일하는 방식은 직접 확인하세요.",
    보통: "국민연금 신호는 보통이에요. 연봉 조건과 팀 분위기를 직접 확인하고 정하세요.",
    주의: "국민연금 신호는 주의예요. 사람이 왜 나가는지, 연봉이 왜 낮은지 면접에서 꼭 물어보세요." }[lv];
  return { html, z: byNps ? null : z };   // 국민연금 판정은 한마디를 score.py 가 이미 맞춰 씀
}
function salarySec(c) {
  const s = c.salary;
  if (!s) return empty("연봉 연구소에 아직 없는 회사예요");
  const R = ["사원","대리","과장","차장","부장"], max = s.ranks ? Math.max(...R.map(k => s.ranks[k])) : 1;
  const rows = !s.ranks ? `<p class="note">시간제·현장 인력 비중이 크거나 연봉 수준이 낮아 직급별 금액은 추정하지 않아요. 평균과 업계 위치만 봐 주세요.</p>` : R.map(k => `<div class="rk"><span class="n">${k}</span><span class="track"><i style="width:${s.ranks[k]/max*100}%"></i>${s.ranksBase ? `<i class="base" style="width:${s.ranksBase[k]/max*100}%"></i>` : ""}</span>
      <span class="v">${won(s.ranks[k])}<small>${s.ranksBase ? "기본 " + won(s.ranksBase[k]) : "만원"}</small></span></div>`).join("");
  const top = s.industryTop ?? s.allTop;
  return `<div class="sal"><div><div class="ranks">${rows}</div>
      <p class="legend"><span><i style="background:var(--ink)"></i>직급별 연봉 추정(만원)</span>${s.ranksBase ? `<span><i style="background:var(--acc)"></i>성과급 뺀 기본연봉</span>` : ""}</p></div>
    <div class="pos"><p class="big">${esc(grpName(s, c.name))}<br><mark>상위 ${top}%</mark></p>
      ${s.industryTop ? `<p class="big2">전체 회사 기준 <b>상위 ${s.allTop}%</b></p>` : ""}
      <p class="of">${s.peerN ? `비슷한 업종 ${won(s.peerN)}곳(직원 50명 이상) 중 평균 연봉 순위예요. 등급은 업계 순위 70%·전체 순위 30%를 섞어 매겨요.` : "업종 정보가 없어 전체 회사와 비교했어요."}</p>
      <div class="meter"><b style="left:${100 - top}%"></b></div><div class="meter-l"><span>업계 하위</span><span>업계 상위</span></div>
      <div class="facts"><div>평균 연봉<b>${won(s.avg)}만</b></div><div>입사자 평균 연봉<b>${won(s.hireAvg ?? s.newHire)}만</b></div>
        <div>평균 근속<b>${s.tenure}년</b></div><div>연간 퇴사율<b>${Math.round(s.turnover*100)}%</b></div></div>
      <a class="more" href="${esc(s.url || "https://job.jobzorro.kr/salary/")}" target="_blank" rel="noopener">연봉 연구소에서 자세히 보기 →</a></div></div>`;
}

// 막대 차트(SVG): 음수는 축 아래로
function bars(years, vals, opts = {}) {
  const W = 560, H = 210, pad = 26, bw = 54, n = vals.length;
  const vmax = Math.max(0, ...vals.map(v => v ?? 0)), vmin = Math.min(0, ...vals.map(v => v ?? 0));
  const span = (vmax - vmin) || 1, y0 = pad + (H - 2*pad) * vmax / span;
  const gap = (W - n*bw) / (n + 1);
  let g = `<line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--hairline-2)"/>`;
  vals.forEach((v, i) => {
    const x = gap + i*(bw + gap), h = Math.abs(v ?? 0) / span * (H - 2*pad), y = v >= 0 ? y0 - h : y0;
    const last = i === n - 1, col = v < 0 ? "var(--bad)" : last ? "var(--ink)" : "var(--hairline-2)";
    g += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h,1)}" rx="5" fill="${col}"/>`;
    // 2026-10-28 사용자: 제목이 '억원'이니 막대 숫자도 조로 줄이지 않고 억 단위 그대로 (긴 숫자는 글자를 조금 줄임)
    const lab = opts.fmt ? opts.fmt(v, i) : v == null ? "-" : Math.round(v).toLocaleString("ko-KR") + "억";
    g += `<text x="${x + bw/2}" y="${v >= 0 ? y - 7 : y + h + 15}" text-anchor="middle" font-size="${lab.length > 8 ? 12 : 13}" font-weight="800">${lab}</text>`;
    if (opts.sub) g += `<text x="${x + bw/2}" y="${H + 8}" text-anchor="middle" font-size="12" fill="var(--muted)" style="fill:var(--muted)">${opts.sub[i]}</text>`;
    g += `<text x="${x + bw/2}" y="${H + (opts.sub ? 26 : 12)}" text-anchor="middle" font-size="12" style="fill:var(--muted)">${years[i]}</text>`;
  });
  return `<svg viewBox="0 -6 ${W} ${H + (opts.sub ? 34 : 20)}" role="img">${g}</svg>`;
}

// 예정일은 연도 없는 '11월 6일' 꼴로 판정 때 굳는다 → 오늘보다 지났으면 '곧 채워져요' (2026-11-03)
function etaLive(s) { const m = /(\d+)월 (\d+)일/.exec(s || ""); if (!m) return !!s;
  const now = new Date(), t = new Date(now.getFullYear(), m[1] - 1, +m[2], 23, 59);
  if (t - now > 200 * 864e5) t.setFullYear(t.getFullYear() - 1); else if (now - t > 165 * 864e5) t.setFullYear(t.getFullYear() + 1);
  return t >= now; }
const etaSay = (s, tail) => s ? " · " + (etaLive(s) ? s + tail : "곧 채워져요") : "";
const zEta = t => String(t ?? "").replace(/\((\d+월 \d+일)까지 올라올 예정이에요\)/, (a, d) => etaLive(d) ? a : "(곧 채워져요)");
function finSec(c, key) {
  const f = c.fin, m = c.metrics?.[key];
  if (!f) return empty((c.pending || []).includes("fin") ? "재무 자료는 아직 모으는 중이에요" + etaSay(c.etaFin, "쯤 채워질 예정이에요 (DART 하루 조회 한도 기준 추정)") : (c.finWhy || "DART에 재무제표가 없는 회사예요 (외부감사 대상이 아닌 소규모 법인 등)"));
  const ys = f.years, d = ys.map(y => f.data[y]), col = k => d.map(x => x[k] ?? null);
  const it = l => m.items.find(i => i.label.startsWith(l));
  const fmtv = i => i.value == null ? (i.label.startsWith("이자보상") ? "이자 자료 없음" : i.label.endsWith("(자본잠식)") ? "자본잠식" : "-") : (i.unit === "%" ? i.value.toFixed(1) : i.value === 99 ? "무차입" : i.value) ;
  const basis = `<details class="basis" hidden><summary>판단 근거 보기 (상담용)</summary><table>${m.items.map(i =>
      `<tr><td>${esc(i.label)}</td><td>${fmtv(i)}${i.value === 99 || i.value == null ? "" : i.unit}</td><td class="dot${i.pts}">${"●".repeat(i.pts ?? 0)}${"○".repeat(2 - (i.pts ?? 0))}</td></tr>`).join("")}</table></details>`;
  let chart, keys;
  if (key === "성장성") {
    chart = `<div class="chart"><p class="ct">${f.rev_alt ? "영업수익" : "매출액"} <span>억원 · ${esc(f.source)}</span></p>${bars(ys, col("rev"))}${f.rev_alt ? `<p class="ct"><span>매출 줄이 없는 금융사라 ${esc(f.rev_alt)}를 매출 대신 썼어요</span></p>` : ""}</div>`;
    keys = [["매출 연평균 성장률", it("매출 연평균").value, "%"], ["최근 1년 매출 성장률", it("최근 1년").value, "%"], ["매출이 늘어난 해", it("매출 늘어난").value, it("매출 늘어난").unit]];
  } else if (key === "수익성") {
    const rev = col("rev"), op = col("op");
    const sus = m.suspect || [];   // 영업이익이 매출보다 크게 잡혀 믿기 어려운 해 (2026-11-03): 수익성 판단에서 뺐다
    chart = `<div class="chart"><p class="ct">영업이익 <span>억원 · 아래 숫자는 영업이익률</span></p>${bars(ys, op, {sub: op.map((v, i) => sus.includes(ys[i]) ? "확인 필요" : rev[i] ? (v / rev[i] * 100).toFixed(1) + "%" : "")})}${sus.length ? `<p class="ct"><span>${sus.join("·")}년은 영업이익이 매출보다 크게 잡혀 자료가 의심스러워 수익성 판단에서 뺐어요</span></p>` : ""}</div>`;
    keys = [["5년 평균 영업이익률", it("5년 평균").value, "%"], ["ROE(자기자본이익률)", it("ROE").value, "%"], ["영업적자 난 해", it("영업적자").value, it("영업적자").unit]];
  } else {
    const dr = d.map(x => x.liab != null && x.equity > 0 ? x.liab / x.equity * 100 : null), fi = f.finind;   // 자본총계 0 이하 = 자본잠식 (음수 부채비율을 그리지 않음, 2026-11-03)
    if (fi) {   // 금융업: 부채비율 대신 신용평가사 지표 (총자산레버리지·ROA)
      const lv = d.map(x => x.assets && x.equity > 0 ? x.assets / x.equity : null);
      chart = `<div class="chart"><p class="ct">총자산레버리지 <span>총자산 ÷ 자기자본 · ${esc(fi.key)}은 ${fi.lev[0]}배 이하면 튼튼</span></p>${bars(ys, lv, {fmt: v => v == null ? "-" : v.toFixed(1) + "배"})}<p class="ct"><span>금융업은 고객 돈·차입으로 영업해 부채비율이 원래 높아서, 신용평가사 금융업 기준으로 봤어요 (${esc(fi.src)})</span></p></div>`;
      keys = [["총자산레버리지", it("총자산레버리지").value ?? "자본잠식", it("총자산레버리지").value == null ? "" : "배"], ["ROA 3년 평균", it("ROA").value, "%"], ["부채비율(참고)", dr.at(-1) ?? "-", dr.at(-1) == null ? "" : "%"]];
    } else {
    const is = f.indstab;   // 항공·해운·유통·호텔·발전가스: 신평사 업종별 기준 (2026-11-01)
    const line = !is ? "100% 이하면 튼튼" : is.debt === "peer" ? `${esc(is.key)}끼리 비교` + (is.peer?.rank ? ` · ${is.peer.n}곳 중 ${is.peer.rank}위` : "") : Array.isArray(is.debt) ? `${esc(is.key)}은 ${is.debt[0]}% 이하면 튼튼` : `${esc(is.key)}은 판단에서 뺐어요`;
    chart = `<div class="chart"><p class="ct">부채비율 <span>부채총계 ÷ 자본총계 · ${line}</span></p>${bars(ys, dr, {fmt: (v, i) => v == null ? (d[i].equity != null && d[i].equity <= 0 ? "잠식" : "-") : Math.round(v) + "%"})}${is ? `<p class="ct"><span>${esc(is.key)} 업종은 구조상 부채가 커서 같은 업종 기준으로 봤어요 (${esc(is.src)})</span></p>` : ""}</div>`;
    keys = [["유동비율", it("유동비율").value ?? "-", it("유동비율").value == null ? "" : "%"], ["차입금 의존도", it("차입금").value, "%"], ["이자보상배율", it("이자보상").value === 99 ? "무차입" : it("이자보상").value ?? "이자 자료 없음", it("이자보상").value === 99 || it("이자보상").value == null ? "" : "배"]];   // 99 = 차입금 0 (2026-11-03: 차입금이 있는데 이자 자료가 없으면 '이자 자료 없음')
    }
  }
  if (c.finParent) chart = chart.replace(/<\/div>$/, `<p class="ct"><span>이 이름은 공장·지점 같은 사업장이라 본사(${esc(c.finParent)}) 재무를 보여 드려요. 이 사업장만의 숫자는 아니에요</span></p></div>`);
  const gnote = c.grades?.[key]?.note ? `<p class="gnote"><b>왜 이 등급인가요</b> ${esc(c.grades[key].note)}</p>` : "";   // 공공기관 안정성처럼 지표와 등급이 다를 때 이유를 따로 적는다 (2026-11-12)
  return gnote + `<div class="fin">${chart}<div><div class="key">${keys.map(([l, v, u]) =>
      `<div class="k"><small>${l}</small><b>${typeof v === "number" ? (u === "%" ? v.toFixed(1) : v) : esc(v)}<em>${u}</em></b></div>`).join("")}</div>${basis}</div></div>`;
}

const CATS = ["사고·리스크","사람·조직","실적·전망","신작·신제품","투자·확장","평판·수상"];
function newsSec(c) {
  const n = c.news;
  if (!n || !(n.items || []).length) return empty("최근 90일 안에 회사 이름이 제목에 들어간 기사가 없어요");
  const st = n.stats || {};
  const chips = CATS.filter(k => st[k]).map(k => `<span class="chip">${k} ${st[k].all}건${st[k].pos ? " · 호재 " + st[k].pos : ""}${st[k].neg ? " · 악재 " + st[k].neg : ""}</span>`).join("");
  return `<div class="nstat">${chips}</div><div class="news">${n.items.map(a => `<a class="nw" href="${esc(a.url)}" target="_blank" rel="noopener">
      <span class="c"><i class="t${a.tone}"></i>${esc(a.cat)}</span>
      <span class="h">${esc(a.title)}<small>${esc(a.src)} · ${esc(a.date)}${a.own ? " · 회사 발표" : ""}</small></span>
      <span class="n">${a.n > 1 ? a.n + "곳 보도" : ""}</span></a>`).join("")}</div>`;
}
function aiSec(c) {
  const a = c.ai;
  if (!a) return empty("업종 정보가 없어 AI 영향을 판단하지 못했어요");
  const lv = {"높음":3,"중간":2,"낮음":1}[a.level], col = {"높음":"g0","중간":"g1","낮음":"g2"}[a.level];
  return `<div class="ai"><div class="${col}"><p class="lv">${a.level}</p><div class="scale">${[1,2,3].map(i => `<span class="${i <= lv ? "on" : ""}"></span>`).join("")}</div></div>
    <p><b>${esc(c.salary?.industry || "")}</b><br>${esc(a.why)}.</p></div>`;
}


// ── J 레드플래그 체크 (2026-10-22 사용자 OK): 이미 모은 자료만, 판정 점수와 무관한 보여주기용. 자료 없는 항목은 개수에서 뺀다
function redFlags(c) {
  const f = c.fin, s = c.salary, ys = f?.years || [], d = ys.map(y => f.data[y]).filter(Boolean), L = d.at(-1);
  const st = k => (c.metrics?.["안정성"]?.items || []).find(i => i.label.startsWith(k))?.value;
  const R = [
    ["자본잠식 (자본총계 마이너스)", L && L.equity != null ? [L.equity < 0, "자본 " + eok(L.equity)] : null],
    ["3년 연속 영업적자", d.length >= 3 ? (x => { const n = x.filter(v => v < 0).length; return [n === 3, n === 3 ? "3년 모두 적자" : n ? `최근 3년 중 ${n}년 적자` : "적자 없음"]; })(d.slice(-3).map(x => x.op ?? 0)) : null],
    ["매출 2년 연속 감소", d.length >= 3 && d.slice(-3).every(x => x.rev != null) ? (x => [x[2] < x[1] && x[1] < x[0], x[2] < x[1] && x[1] < x[0] ? "2년째 감소" : x[2] >= x[1] ? "최근 증가" : "1년 감소"])(d.slice(-3).map(x => x.rev)) : null],
    f?.finind ? [`총자산레버리지 ${f.finind.lev[1]}배 넘음 (${f.finind.key} 기준)`, L && L.assets && L.equity > 0 ? (v => [v > f.finind.lev[1], v.toFixed(1) + "배"])(L.assets / L.equity) : null]
      : f?.indstab && !Array.isArray(f.indstab.debt) ? ["부채비율 (같은 업종끼리 비교라 기준선 없음)", null]
      : (lim => [`부채비율 ${lim}% 넘음` + (f?.indstab ? ` (${f.indstab.key} 기준)` : ""), L && L.liab != null && L.equity != null ? (L.equity > 0 ? (v => [v > lim, Math.round(v) + "%"])(L.liab / L.equity * 100) : [true, "자본잠식"]) : null])(f?.indstab ? f.indstab.debt[1] * 2 : 400),
    ["유동비율 100% 밑 (1년 안에 갚을 빚이 더 많음)", L && L.ca != null && L.cl > 0 && !f?.indstab?.drop?.includes("current_ratio") ? (v => [v < 100, Math.round(v) + "%"])(L.ca / L.cl * 100) : null],
    ["이자보상배율 1배 밑 (번 돈으로 이자를 못 냄)", st("이자보상") != null ? (v => [v !== 99 && v < 1, v === 99 ? "무차입" : v + "배"])(st("이자보상")) : null],
    ["연간 퇴사율 35% 넘음", s?.turnover != null ? [s.turnover > .35, Math.round(s.turnover * 100) + "%"] : null],
    ["평균 근속 2년 미만", s?.tenure != null ? [s.tenure < 2, s.tenure + "년"] : null],
    ["최근 90일 큰 악재 뉴스", c.news_ai ? [c.news_ai.risk === "높음", c.news_ai.risk === "높음" ? "있음" : "없음"] : null],
    ["평점 관리·뻥튀기 신호", c.rep ? (x => [x, x ? "있음" : "없음"])(!!((c.abuse || []).length || c.grades?.["평판"]?.flags?.inflation)) : null],
  ];
  const known = R.filter(r => r[1]), hit = known.filter(r => r[1][0]);
  if (known.length < 4) return "";   // 자료가 너무 적으면 칸을 안 띄운다
  const list = `<ul>${R.map(([l, r]) => `<li class="${!r ? "na" : r[0] ? "hit" : ""}"><span class="x">${!r ? "–" : r[0] ? "✕" : "·"}</span><span>${l}</span><em>${r ? r[1] : "확인 못 함"}</em></li>`).join("")}</ul>`;
  if (!hit.length) return `<div class="rf ok"><div class="sum"><b>걸린 레드플래그 없음 <small style="font-weight:500;color:var(--muted)">· ${known.length}개 항목 확인</small></b></div><details><summary>항목 전부 보기</summary>${list}</details></div>`;
  const money = hit.filter(r => R.indexOf(r) < 6).length, people = hit.length - money;
  const sum = money && people ? `돈 쪽 ${money}개, 사람·평판 쪽 ${people}개예요.` : money ? "모두 '빚과 실적' 쪽이에요." : "모두 '사람·평판' 쪽이에요.";
  return `<div class="rf"><p class="cnt">${hit.length}<small> / ${known.length}</small></p><div class="sum"><b>레드플래그 ${hit.length}개가 걸렸어요</b><span>${sum} 판정 점수와는 별개로, 입사 전에 알고 가면 좋은 신호예요.</span></div>
    <details${hit.length >= 3 ? " open" : ""}><summary>항목 전부 보기</summary>${list}</details></div>`;
}

// ── G 내 연봉 넣어보기: 입력값은 화면에서만 계산 (어디에도 안 보냄)
function myPay(c) {
  const s = c.salary; if (!s?.ranks) return "";
  return `<div class="my"><h4>내 연봉이랑 비교해 볼까요?</h4>
    <div class="in"><label>지금 직급 <select id="myr">${["사원","대리","과장","차장","부장"].map(k => `<option${k === "대리" ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>지금 연봉 <input id="mys" inputmode="numeric" placeholder="4,000" aria-label="지금 연봉(만원)"> 만원</label></div>
    <div class="res" id="myres"></div><p class="say" id="mysay">지금 연봉을 만원 단위로 넣어 주세요.</p>
    <p class="priv">입력한 연봉은 이 화면에서만 계산하고 어디에도 보내거나 저장하지 않아요.</p></div>`;
}
function myPayWire(c) {
  const r = $("#myr"), i = $("#mys"); if (!r || !i) return;
  const calc = () => { const v = Number(i.value.replace(/[^0-9]/g, "")), t = c.salary.ranks[r.value];
    if (!v) { $("#myres").innerHTML = ""; $("#mysay").textContent = "지금 연봉을 만원 단위로 넣어 주세요."; return; }
    if (v < 1000 || v > 100000) { $("#myres").innerHTML = ""; $("#mysay").textContent = "만원 단위로 넣어 주세요 (예: 4,000)."; return; }
    const dd = Math.round((t - v) / v * 100);   // 보여 주는 % 와 문구 기준을 같은 반올림 값으로
    $("#myres").innerHTML = `<div>${esc(dn(c.name))} ${r.value} 추정<b>${won(t)}만</b></div><div class="${dd >= 0 ? "up" : "dn"}">지금보다<b>${dd >= 0 ? "+" : ""}${dd.toFixed(0)}%</b></div>`;
    $("#mysay").textContent = dd >= 20 ? "연봉으로는 확실히 오르는 자리예요. 나머지(평판·안정성)만 따져 보세요."
      : dd >= 10 ? "오르긴 해요. 오퍼가 추정치보다 낮게 오면 협상 여지가 있어요."
      : dd >= 0 ? "연봉만 보고 옮길 이유는 약해요. 지금 회사가 나쁘지 않다면 STAY도 좋은 선택이에요."
      : "추정치가 지금보다 낮아요. 연봉 협상으로 비슷하거나 더 받을 수 있다면 가도 되지만, 평균이 이만큼 낮으면 기대치가 높거나 일이 빡셀 수 있어요."; };
  r.onchange = calc; i.oninput = calc;
}


// ── F 면접 때 이렇게 물어보세요 (2026-10-22 사용자 OK, 톤 다운 버전): 걸리는 숫자를 직접 묻지 않고 돌려 묻는다. 걱정 큰 순서로 최대 4개
// ask 는 2가지 표현 중 회사 이름으로 하나를 골라 회사마다 같은 문장이 반복되지 않게
const ASK = {
  news: { tag: "최근 기사 확인용", ask: ["최근에 조직문화나 일하는 방식을 바꾸려고 시도하신 게 있다면 들어 보고 싶어요.", "요즘 팀 안에서 일하는 방식이 달라진 부분이 있을까요? 입사하면 빨리 맞추고 싶어서요."],
    g: "구체적인 제도·프로세스 변화가 바로 나와요.", b: "\"특별히 바뀐 건 없어요\"로 끝나요." },
  people: { tag: "퇴사율·근속 확인용", ask: ["이 자리는 새로 생긴 자리인가요, 아니면 기존에 계시던 분의 업무를 이어받는 자리인가요? 함께 일하게 될 팀 분들 이야기도 조금 듣고 싶어요.", "제가 합류하면 함께 일하게 될 분들은 어떤 분들인지 궁금해요. 이 자리는 새로 생긴 자리인가요?"],
    g: "사업이 커져서 생긴 자리, 팀원 연차가 고르게 섞여 있다는 설명.", b: "\"전임자가 갑자기 그만둬서\", 팀원 대부분이 입사 1년 안쪽." },
  money: { tag: "재무 부담 확인용", ask: ["회사가 앞으로 1~2년 동안 가장 힘을 싣는 방향이 궁금해요. 그 안에서 이 팀은 어떤 역할을 맡게 되나요?", "앞으로 1~2년 회사의 우선순위가 궁금해요. 이 팀이 거기서 맡는 일은 어떤 건가요?"],
    g: "우리 팀이 그 방향의 중심에 있고, 앞으로 할 일이 구체적으로 나와요.", b: "\"효율화\", \"비용 관리\" 이야기만 반복돼요." },
  loss: { tag: "적자 확인용", ask: ["올해 회사가 가장 기대하는 성과는 무엇인가요? 이 팀이 거기에 어떻게 기여하는지도 궁금해요.", "올해 회사 전체가 꼭 이루고 싶은 목표가 있다면 듣고 싶어요. 이 팀은 그 안에서 어떤 역할인가요?"],
    g: "흑자 전환 계획이나 수익을 내는 구체적인 방법이 나와요.", b: "목표가 \"성장\", \"확장\"처럼 막연해요." },
  shadow: { tag: "모회사와의 관계 확인용", ask: ["모회사와 함께 진행하는 프로젝트가 많은지, 교류하거나 옮겨 갈 기회도 있는지 궁금해요.", "그룹 안에서 이 회사가 맡는 역할이 궁금해요. 모회사와 함께 일할 기회도 있나요?"],
    g: "모회사와 같이 하는 일·이동 사례가 구체적으로 나와요.", b: "\"하는 일이 달라서\"로 선을 긋거나 사례가 없어요." },
  boss: { tag: "의사결정 방식 확인용", ask: ["최근 이 팀에서 진행한 일 중에, 실무자 아이디어에서 시작된 사례가 있으면 들어 보고 싶어요.", "팀에서 새로운 제안이 나오면 보통 어떤 과정을 거쳐 실행되나요? 최근 사례가 있으면 듣고 싶어요."],
    g: "구체적인 사례가 바로 나와요.", b: "한참 생각하다가 \"위에서 방향이 정해지면…\"으로 넘어가요." },
  wlb: { tag: "업무 강도 확인용", ask: ["팀이 가장 바쁜 시기는 언제인가요? 그때는 보통 어떻게 일을 나눠서 하시는지 궁금해요.", "일 년 중 이 팀이 특히 바쁜 때가 있나요? 그 시기를 어떻게 넘기시는지 듣고 싶어요."],
    g: "바쁜 시기가 정해져 있고, 그 외엔 여유 있다는 설명.", b: "\"늘 바빠요\" 또는 시기를 딱 못 집어요." },
  decline: { tag: "성장 동력 확인용", ask: ["요즘 회사에서 가장 기대를 받는 새 사업이나 프로젝트는 무엇인가요?", "앞으로 회사를 이끌 새 사업이나 프로젝트가 있다면 듣고 싶어요."],
    g: "새 먹거리가 구체적이고, 이미 사람·돈이 들어가고 있어요.", b: "\"검토 중\"이거나 예전 사업 이야기만 나와요." },
  fast: { tag: "급성장 적응 확인용", ask: ["입사하면 첫 3개월 동안 어떤 걸 기대하시나요? 적응을 돕는 과정이 따로 있는지도 궁금해요.", "새로 오신 분들은 보통 어떤 과정을 거쳐 적응하나요? 첫 3개월에 기대하시는 것도 듣고 싶어요."],
    g: "온보딩 과정과 첫 과제가 구체적이에요.", b: "\"오자마자 바로 투입\", 업무 범위가 흐릿해요." },
  turn: { tag: "처우 반영 확인용", ask: ["요즘 회사 분위기가 좋아졌다는 기사를 봤어요. 안에 계신 분들은 그 변화를 어떤 식으로 느끼고 계신가요?", "최근 실적이 좋아졌다는 소식을 봤어요. 팀 안에서는 어떤 변화가 느껴지시나요?"],
    g: "보상·채용·복지처럼 손에 잡히는 변화 이야기가 먼저 나와요.", b: "\"아직은 투자 단계라서\"만 나와요." },
  startup: { tag: "스타트업 확인용", ask: ["다음 1년 동안 회사가 꼭 달성하고 싶은 목표는 무엇이고, 이 팀은 거기서 어떤 역할을 하나요?", "회사의 다음 1년 목표가 궁금해요. 그 목표에서 이 팀이 맡는 부분은 무엇인가요?"],
    g: "목표가 숫자로 나오고, 자금·다음 단계 계획까지 이어져요.", b: "목표가 계속 바뀌었거나 \"일단 버티는 중\"이란 느낌." },
  base: { tag: "기대치 확인용 (공통)", ask: ["이 자리에서 1년 뒤 \"잘 뽑았다\"는 말을 들으려면 어떤 성과를 내야 할까요?", "1년 뒤 이 자리에서 잘하고 있다고 평가받는 분은 어떤 모습인가요?"],
    g: "기대 성과가 구체적이고 현실적이에요.", b: "기대치가 너무 막연하거나, 혼자 감당하기 어려운 수준이에요." },
};
function askSec(c) {
  const f = c.fin, s = c.salary, d = (f?.years || []).map(y => f.data[y]).filter(Boolean), L = d.at(-1);
  if (!f && !s) return "";
  const it = (g, k) => (c.metrics?.[g]?.items || []).find(i => i.label.startsWith(k))?.value;
  const avg = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const r = c.rep || {}, ib = it("안정성", "이자보상");
  const ops = d.slice(-3).map(x => x.op), revs = d.slice(-3).map(x => x.rev);
  const wlb = c.subsMix?.["워라밸"] ?? avg([r.jobplanet?.subs?.["워라밸"], r.blind?.subs?.["업무와 삶의 균형"]]), boss = avg([r.jobplanet?.subs?.["경영진"], r.blind?.subs?.["경영진"]]);
  const on = {
    news: c.news_ai?.risk === "높음",
    people: (s?.turnover ?? 0) > .3 || (s?.tenure != null && s.tenure < 3),
    money: (L && L.equity != null && L.equity <= 0) || (L && L.equity > 0 && L.liab / L.equity > 3) || (ib != null && ib !== 99 && ib < 1) || (L && L.cl > 0 && L.ca / L.cl < 1),
    loss: ops.length === 3 && ops.every(v => v != null && v < 0),
    shadow: !!c.shadow,
    boss: boss != null && boss <= 2.6,
    wlb: wlb != null && wlb <= 2.8,
    decline: (revs.length === 3 && revs.every(v => v != null) && revs[2] < revs[1] && revs[1] < revs[0]) || ["C", "D", "F"].includes(c.grades?.["성장성"]?.letter),
    fast: (it("성장성", "매출 연평균") ?? 0) >= 25,
    turn: ops.length >= 2 && ops.at(-1) > 0 && ops.at(-2) < 0,
    startup: c.type === "스타트업",
  };
  const keys = Object.keys(on).filter(k => on[k]).slice(0, 4);
  if (keys.length < 2) keys.push("base");
  let h = 0; for (const ch of c.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<section class="sec" id="s8"><div class="sec-h"><span class="no">08</span><h3>면접 때 이렇게 물어보세요</h3><p class="why">"질문 있으세요?" 때 꺼내면 좋은 질문이에요.</p></div>
    <div class="qs">${keys.map((k, i) => { const q = ASK[k];
      return `<div class="q"><p class="tag"><span>${q.tag}</span></p><p class="ask">${esc(q.ask[(h + i) % q.ask.length])}</p>
        <div class="hear"><div class="g"><small>이러면 안심</small>${esc(q.g)}</div><div class="b"><small>이러면 한 번 더 확인</small>${esc(q.b)}</div></div></div>`; }).join("")}</div>
    <p class="qtip"><b>Zorro 팁</b> · 1~2개만 고르세요. 숫자·평점 이야기는 꺼내지 마세요.</p></section>`;
}

// ── 함께 보기 (2026-11-11 사용자: 직무·연봉·회사가 서로 이어지게, 깔끔하게): 직급별 연봉 · 이 업종에서 많이 하는 일 · 회사 목록 — 알약 한 줄
// JOBS = { r: [[업종 정규식, [직무 id…]]…], d: 기본 직무, n: { id: 이름 } } — 연봉 연구소 회사 페이지와 같은 규칙 (salary-lab/build_site.py JOB_RULES 를 빌드가 읽어 넣음)
const JOBS = {"r": [["반도체|전자 ?부품|디스플레이|인쇄회로|전자집적", ["device-rnd", "process-tech", "equipment-eng"]], ["축전지|전지 제조|이차전지", ["battery-dev", "production-tech", "quality"]], ["화장품", ["cosmetic-rnd", "brand-marketer", "online-md"]], ["의약|제약|바이오|생물학적", ["rnd-bio", "gmp-qa", "pharma-sales"]], ["의료용 기기|의료기기|의료용품", ["medical-device-sales", "ra", "quality"]], ["병원|의원|요양|보건", ["general-affairs", "hr", "accounting"]], ["자동차|트레일러", ["vehicle-test", "production-tech", "sq"]], ["선박|조선", ["naval-design", "production-mgmt", "quality"]], ["항공기|우주|무기|총포", ["system-eng", "mechanical-design", "quality"]], ["화학|플라스틱|고무|도료|합성|섬유|비료|접착|세제|젤라틴", ["rnd-chem", "production-mgmt", "quality"]], ["철강|제철|제강|금속|주조|압연|절연선|케이블", ["production-mgmt", "quality", "overseas-sales"]], ["식품|음료|제과|제분|육류|낙농|사료|주류|조미료|도시락", ["rnd-food", "sales-management", "quality"]], ["로봇", ["robotics-automation", "mechanical-design", "production-tech"]], ["검사|측정|분석", ["quality", "reliability", "analysis-eng"]], ["기계|장비 제조|기기 제조|전기장비|변압기|전동기|금형|공구|기어|동력전달|야금", ["mechanical-design", "production-tech", "technical-sales"]], ["엔지니어링|플랜트", ["plant-epc", "civil-eng", "cost-estimating"]], ["부동산|임대업", ["real-estate", "re-am", "re-pm"]], ["토목|측량", ["civil-eng", "construction-mgmt", "safety"]], ["건설|건축|공사업|건물", ["construction-mgmt", "cost-estimating", "safety"]], ["발전|전기업|송전|배전|가스|에너지|석유", ["power-plant-ops", "electrical-design", "safety"]], ["은행|저축기관|신용조합|여신", ["bank", "corporate-finance", "risk-management"]], ["증권|투자 중개|선물", ["ib", "analyst", "wm-pb"]], ["보험|손해 사정", ["underwriting", "actuary", "claims"]], ["자산 운용|집합 투자|신탁|투자기관", ["fund-manager", "fund-ops", "risk-management"]], ["금융", ["corporate-finance", "risk-management", "compliance"]], ["게임", ["game-planning", "backend", "service-planning"]], ["소프트웨어|정보서비스|컴퓨터|포털|데이터베이스|시스템 통합|자료처리|호스팅", ["backend", "service-planning", "data-analyst"]], ["통신", ["network-eng", "saas-sales", "service-planning"]], ["방송|영화|광고|출판|음악|오디오|공연|연예", ["content-pd", "ad-planner", "pr"]], ["전자상거래|통신 판매", ["online-md", "ecommerce-sales", "performance-marketer"]], ["백화점|대형 마트|체인화 편의점|슈퍼마켓|면세", ["md", "store-sv", "channel-kam"]], ["의복|의류|신발|가방|섬유제품|패션", ["md", "vmd", "brand-marketer"]], ["음식점|주점|커피|제과점|급식|구내식당", ["store-sv", "md", "rnd-food"]], ["소매|도매|상품 중개", ["md", "sales-management", "scm"]], ["해운|해상|항만", ["shipping", "forwarding", "scm"]], ["항공 운송|항공 여객|항공 화물", ["cabin-crew", "ground-staff", "scm"]], ["운송|물류|창고|택배|화물|보관", ["scm", "fulfillment", "forwarding"]], ["호텔|숙박|여행|레저|리조트|카지노|골프|유원지", ["hotel-ops", "cx", "sales-management"]], ["회계|세무", ["accounting", "tax", "consulting"]], ["법무|변호사", ["legal", "compliance", "consulting"]], ["컨설팅|연구개발|시장 조사", ["consulting", "strategy", "data-analyst"]], ["공공|행정|공단|진흥|사회보장|국방", ["public-admin", "hr", "accounting"]], ["인력|고용 알선|파견", ["recruiter", "hr", "labor"]], ["교육|학교|학원", ["hrd-culture", "general-affairs", "public-admin"]]], "d": ["biz-planning", "hr", "accounting"], "n": {"accounting": "회계·결산", "actuary": "보험계리", "ad-planner": "광고기획 (AE)·미디어플래닝", "analysis-eng": "분석 엔지니어 (소재·성분 분석)", "analyst": "리서치 애널리스트", "backend": "백엔드 개발", "bank": "은행원 (금융일반)", "battery-dev": "배터리 셀·소재 개발", "biz-planning": "경영기획·경영관리·경영분석", "brand-marketer": "브랜드 마케팅", "cabin-crew": "객실승무원", "channel-kam": "유통 채널 영업 (KAM)", "civil-eng": "토목 설계·시공", "claims": "손해사정·보상", "compliance": "준법감시·내부감사", "construction-mgmt": "건축 시공관리", "consulting": "경영 컨설팅", "content-pd": "콘텐츠 PD·에디터 (웹툰·출판)", "corporate-finance": "기업금융·여신", "cosmetic-rnd": "화장품 제형·처방 연구", "cost-estimating": "공무·견적", "cx": "CX·고객경험", "data-analyst": "데이터 분석", "device-rnd": "반도체·디스플레이 소자 연구개발", "ecommerce-sales": "이커머스·온라인 영업", "electrical-design": "전기·전장 설계", "equipment-eng": "설비·장비 엔지니어", "forwarding": "포워딩 (국제물류)", "fulfillment": "물류센터 운영·풀필먼트", "fund-manager": "운용역 (펀드매니저·대체투자)", "fund-ops": "자산운용 백오피스·펀드회계", "game-planning": "게임 기획", "general-affairs": "총무", "gmp-qa": "제약 품질보증 (GMP QA/QC)", "ground-staff": "항공 지상직·운항관리", "hotel-ops": "호텔·리조트 운영", "hr": "인사 (HR)·인사기획", "hrd-culture": "HRD·조직문화", "ib": "증권 IB (ECM·DCM·인수금융)", "labor": "노무 (노사관계)", "legal": "법무", "md": "MD (상품기획·바잉)", "mechanical-design": "기계 설계", "medical-device-sales": "의료기기 영업", "naval-design": "선박 설계 (조선)", "network-eng": "통신 네트워크 엔지니어", "online-md": "온라인 MD (이커머스·홈쇼핑)", "overseas-sales": "해외영업·상사", "performance-marketer": "퍼포먼스·그로스 마케팅", "pharma-sales": "제약영업", "plant-epc": "플랜트 EPC 엔지니어링", "power-plant-ops": "발전설비 운영·정비", "pr": "홍보 (PR)", "process-tech": "공정기술·공정설계 (반도체·소재)", "production-mgmt": "생산관리", "production-tech": "생산기술·양산기술", "public-admin": "공공기관·공기업 행정", "quality": "품질관리·품질보증 (QC/QA)", "ra": "인허가 (RA)", "re-am": "부동산 AM (자산운용)", "re-pm": "PM (프로퍼티 매니지먼트)", "real-estate": "부동산 개발·금융 (시행·신탁)", "recruiter": "채용 담당 (리크루터)", "reliability": "신뢰성·시험평가", "risk-management": "리스크관리", "rnd-bio": "바이오·제약 연구개발", "rnd-chem": "화학·소재 연구개발", "rnd-food": "식품 연구개발·메뉴개발", "robotics-automation": "로봇·자동화·제어", "saas-sales": "SaaS·IT 솔루션 영업", "safety": "안전·보건·환경 (EHS)", "sales-management": "영업관리 (대리점·소비재)", "scm": "SCM·수요관리·물류기획", "service-planning": "서비스 기획 (PM/PO)", "shipping": "해운 영업·선박 운항", "sq": "협력사·고객 품질 (SQ·CQ)", "store-sv": "점포 운영·SV (슈퍼바이저)", "strategy": "전략기획", "system-eng": "방산·항공 체계 엔지니어", "tax": "세무", "technical-sales": "기술영업·FAE (세일즈 엔지니어)", "underwriting": "언더라이팅 (보험 심사)", "vehicle-test": "자동차 차량개발·시험평가", "vmd": "VMD (비주얼 머천다이저)", "wm-pb": "WM·PB (자산관리)"}};
function jobsOf(c) {
  const s = c.salary || {}, hit = t => t && (JOBS.r || []).find(([re]) => new RegExp(re).test(t));
  return ((hit(s.industry) || hit(s.group) || [0, JOBS.d || []])[1]).filter(j => JOBS.n?.[j]).slice(0, 3);
}
function alsoSec(c) {
  const u = c.salary?.url;   // 연봉 연구소에 이 회사 페이지가 있을 때만 (없는 곳은 빌드가 주소를 뺀다)
  const a = [u ? `<a href="${esc(u)}">직급별 연봉</a>` : "", ...jobsOf(c).map(j => `<a href="../jobs/${j}/">${esc(JOBS.n[j])}</a>`), `<a href="list/">회사 목록</a>`].filter(Boolean);
  return `<nav class="also" aria-label="함께 보기"><b>함께 보기</b>${a.join("")}</nav>`;
}

// ── I 고민 중이면 여기도 보세요 (build.py add_alts 가 고른 3곳)
function altSec(c) {
  const a = c.alts; if (!a?.length) return "";
  const me = c.grades || {}, P = LETTER_PTS;
  return `<section class="sec" id="s9"><div class="sec-h"><span class="no">+</span><h3>${esc(dn(c.name))} 고민 중이면, 여기도 보세요</h3><p class="why">같은 업종에서 판정이 더 좋은 곳이에요.</p></div>
    <div class="alts">${a.map(x => `<a class="alt" href="#${encodeURIComponent(x.n)}"><h4>${esc(dn(x.n))}<span>${esc(x.v)}</span></h4>
      <div class="gr">${["평판","연봉","성장성","수익성","안정성"].filter(k => x.g?.[k]).map(k => `<span class="${me[k]?.letter && P[x.g[k]] > P[me[k].letter] ? "up" : ""}">${k.replace("성장성","성장").replace("수익성","수익").replace("안정성","안정")} ${x.g[k]}</span>`).join("")}</div>
      <p>${esc(x.why)}</p><small>직원 ${won(x.m)}명</small></a>`).join("")}</div></section>`;
}

// 2026-10-29: 칸 설명은 화면에서 뺐다 (Simple is Best). 문구는 기록용으로 남겨 둠
const WHY = {
  "평판": "잡플래닛·블라인드·캐치를 평가 인원 수대로 합쳤어요. 캐치는 최소 8%, 점수가 후하게 나오는 편이라 최대 30%까지만 넣어요. 평가자가 30명 미만이면 3.0점 쪽으로 살짝 당기고, 회사 성격(보수적·일반·스타트업)마다 기준을 달리 봅니다.",
  "주요 뉴스": "최근 90일 기사 중 같은 사건을 묶어 중요한 것만 골랐어요. 초록 점은 호재, 빨간 점은 악재예요.",
  "AI 영향": "이 업종의 일이 AI로 얼마나 빨리 바뀌는지 Zorro 기준으로 봤어요.",
  "연봉": "같은 업계 회사들 사이에서 평균 연봉이 어디쯤인지 봤어요.",
  "성장성": "매출이 얼마나, 얼마나 꾸준히 크는지와 이익·자본이 같이 느는지 다섯 가지로 봤어요.",
  "수익성": "이익률, ROE, 적자 여부, 실제로 들어오는 현금까지 다섯 가지로 봤어요.",
  "안정성": "부채비율, 유동비율, 빚 의존도, 이자 갚을 힘, 현금흐름까지 다섯 가지로 봤어요.",
};

async function render(name) {
  $("#out").innerHTML = `<div class="skel" aria-label="불러오는 중"><i class="w40"></i><i class="h1"></i><i class="pill"></i><i></i><i class="w80"></i><i class="box"></i></div>`;   // 2026-10-29 모바일: '불러오는 중…' 글자 대신 뼈대 화면
  const c = await getCo(name);
  if (c && c.__hidden) { $("#out").innerHTML = `<div class="sec">${empty("정정 요청을 검토하느라 이 회사는 잠시 내렸어요.")}</div>`; return; }
  if (c && c.__challenge && TS_KEY) { humanCheck(name); return; }
  if (c && c.__limit) { $("#out").innerHTML = `<div class="sec">${empty("조회가 너무 많아요. 잠시 후 다시 시도해 주세요.")}</div>`; return; }
  if (c && c.__err) { $("#out").innerHTML = `<div class="sec">${empty("잠시 연결이 불안정해요. 잠시 후 다시 시도해 주세요.")}</div>`; return; }
  if (ME) await loadIdx();   // 내 상황 판정은 근무지(시도)·지금 회사 찾기에 검색 목록을 쓴다 (2026-11-11 목록을 늦게 받게 되면서)
  if (ME?.co) await meLoadNow();   // 내 상황의 지금 회사 정보 (한 번만)
  if (c) c.name = name;  // 조각 파일에는 이름 칸을 빼고 저장(용량) → 여기서 채움
  if (!c) { $("#hint").textContent = ""; document.querySelectorAll(".pill").forEach(p => p.classList.remove("on"));
    $("#out").innerHTML = `<div class="sec">${empty("'" + name + "'은(는) 아직 모은 자료가 없어요. 직원 30명 이상 회사만 들어 있어요.")}</div>`; return; }
  $("#hint").textContent = "";
  document.querySelectorAll(".pill").forEach(p => p.classList.toggle("on", p.dataset.n === name));
  const my = meJudge(c);   // 내 상황을 넣었으면 판정·한마디 전체를 내 기준으로 (2026-10-27 사용자 결정: 일반 판정은 숨김)
  const V = my ? my.v : c.verdict;
  const vcls = {"무조건 가세요":"v-go v-must","가세요":"v-go","조건 보고 가세요":"v-cond","중립기어":"v-neu","스펙 보고 결정하세요":"v-spec","다시 생각해요":"v-stop","비추예요":"v-no","판단자료 부족":"v-none"}[V];
  const s = c.salary, f = c.fin, date = c.rep?.date || "";
  const nps = my ? null : npsSig(c);
  const z = my ? my.z : nps?.z ? [...c.zorro, nps.z] : c.zorro;
  const order = ["평판","연봉","성장성","수익성","안정성"];
  const board = order.map((k, i) => { const x = c.grades[k], g = x?.grade;
    return `<a class="cell" href="#s${i+1}"><p class="t">${k}<em>0${i+1}</em></p><p class="g ${g == null ? "gq" : lcls(x)}">${g == null ? "?" : ltxt(x)}</p><p class="s">${g == null ? "판단자료 부족" : esc(oneLine(c, k) || "")}</p></a>`; }).join("");
  const rg = c.grades["평판"] || {}, fl = rg.flags || {};
  const abuse = c.abuse || [];
  const warn = (c.type === "스타트업" || abuse.length) ? `<div class="warn"><b>${abuse.length ? "평점에 눈여겨볼 신호가 있어요 · 실제로 좋아졌거나, 평점 관리를 했거나" : "스타트업 평점은 한 번 더 의심하고 보세요"}</b>
      ${abuse.length ? `<ul>${abuse.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      <p style="margin-top:6px">스타트업은 인사팀이 리뷰 작성을 독려하거나 관리하는 경우가 있어요. 원문 링크에서 ① 최근 몇 달 사이 5점 리뷰가 몰렸는지 ② 장점만 길고 단점이 '없음'·'딱히'로 끝나는 리뷰가 많은지 ③ 인사·채용 직군 리뷰가 유독 후한지 ④ 블라인드와 잡플래닛·캐치 점수 차이가 큰지 직접 확인해 보세요.</p></div>` : "";
  const repsum = rg.score == null ? "" : `<div class="repsum"><span>종합 <b>${rg.score.toFixed(2)}</b> / 5</span><span>${esc(c.type)} 회사 기준 · A ${rg.good} 이상 · B ${rg.ok} 이상 · F 2.0 미만</span>${fl.inflation ? `<span class="flag">점수 뻥튀기 의심 (블라인드보다 ${fl.inflation}점 높음)</span>` : ""}${fl.few ? `<span class="flag">평가 ${fl.few}명뿐 · ${fl.w != null ? `평판 ${Math.round(fl.w * 100)}%만 반영` : "참고만"}</span>` : ""}</div>`;
  const secH = (i, k) => { const x = c.grades[k], g = x?.grade, has = k in c.grades, src = srcOf(c, k);
    return `<div class="sec-h"><span class="no">0${i}</span><h3>${k}</h3>${has ? `<span class="gr ${g == null ? "gq" : lcls(x)}">${g == null ? "?" : ltxt(x)}</span>` : ""}${src ? `<p class="why"><small class="asof">자료 기준 · ${esc(src)}</small></p>` : ""}</div>`; };   // 2026-10-29 Simple is Best: 칸 설명(WHY)은 빼고 기준일만
  $("#out").innerHTML = `
    <div class="head"><div><p class="kicker"><i></i>${esc(grpName(s, c.name))}</p><h2>${esc(dn(c.name))}</h2>
      <div class="chips"><span class="chip">${esc(c.type)} 회사${c.age != null ? " · 업력 " + c.age + "년" : ""}</span>${c.ai ? `<span class="chip ai-${c.ai.level}">AI 영향 ${c.ai.level}</span>` : ""}</div>
      <div class="meta">${s ? `<span>직원 <b>${won(s.members)}명</b></span>` : ""}${f ? `<span>재무 <b>${f.years[0]}~${f.years.at(-1)}</b> ${esc(f.source)}</span>` : ""}${date ? `<span>평점 <b>${esc(mdOf(date))}</b></span>` : ""}${c.news?.date ? `<span>뉴스 <b>${esc(mdOf(c.news.date))}</b></span>` : ""}</div></div>
      <p class="disc1">회사에 대한 일반적인 평가예요. 내 스펙·상황에 따라 달라요.</p><div class="verdict ${vcls}"><small>${my ? "내 상황 기준 · " : ""}Zorro's Verdict</small><strong>${V}</strong>${!my && (V === "중립기어" || V === "스펙 보고 결정하세요") ? `<span class="tier" title="중립기어와 스펙 보고 결정하세요는 같은 급이에요. 회사가 보수적이라 성향에 따라 갈리면 중립기어, 내 스펙·다른 카드에 따라 갈리면 스펙 보고예요.">가운데 급 · 중립기어 = 스펙 보고</span>` : ""}${!my && c.basis === "nps" ? `<span class="nofin" title="평점·재무가 없어 국민연금 숫자(업계 연봉·퇴사율·근속)로만 낸 판정이에요">국민연금 기준</span>` : !my && !c.fin && V !== "판단자료 부족" ? `<span class="nofin" title="재무 자료 없이 평점·연봉으로만 낸 판정이에요">재무 미반영</span>` : ""}${!my && (c.tags || []).length ? `<div class="vtags">${c.tags.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}${my?.chips?.length ? `<div class="vtags mchips" title="이 판정이 나온 근거">${my.chips.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div></div>
    ${API ? `<div class="acts"><button class="act heart${hearted.get(c.name) ? " on" : ""}" type="button" id="b-heart" aria-label="이 회사 하트">♥ <b>${(c._s?.hearts || 0).toLocaleString("ko-KR")}</b></button>
      <details class="sharebox"><summary class="act">공유</summary><div class="sharemenu"><button type="button" id="b-share">링크 공유</button><button type="button" id="b-card">결과 카드 저장</button></div></details>
      ${(c._s?.views7 || 0) >= 10 ? `<span class="seen">최근 7일 ${c._s.views7.toLocaleString("ko-KR")}명이 확인했어요</span>` : ""}</div>` : ""}
    ${nps ? nps.html : ""}
    ${meStrip(c, my)}
    ${meCmp(c, my)}
    ${meRankSlot(c, my)}
    ${vsEntry(c)}
    <div class="zorro"><div class="who">Z</div><div><p class="lbl">${my ? "내 상황에 맞춘 " : ""}Zorro의 한마디</p><p class="first">${esc(zEta(z[0]))}</p>
      ${zList(z, my)}</div></div>
    ${my ? meFb(c, my) : ""}
    ${c.divisions ? `<p class="divh">부문마다 달라요${c.divSrc ? ` <small>${esc(c.divSrc)}</small>` : ""}</p><div class="divs">${c.divisions.map(d => `<div class="div"><h4>${esc(d.name)}<span class="${(/가세요$/.test(d.verdict) && d.verdict !== "조건 보고 가세요") || d.verdict === "처우 위쪽" ? "go" : ""}">${esc(d.verdict)}</span></h4>${d.lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>`).join("")}</div>` : ""}
    <div class="board">${board}</div>
    <p class="legend"><span><b class="lS">S</b><b class="lAp">A+</b><b class="lA">A</b>좋음</span><span><b class="lB">B</b>보통</span><span><b class="lC">C</b><b class="lD">D</b>아쉬움</span><span><b class="lF">F</b>심각</span></p>
    ${redFlags(c)}
    <section class="sec" id="s1">${secH(1,"평판")}${repsum}${warn}${c.rep?.via ? `<div class="via"><b>공장·지점 단위 이름이라 ${esc(c.rep.via.name)} 평점을 보여 드려요.</b> ${esc(c.rep.via.note)}</div>` : ""}${(c.rep && (c.rep.jobplanet || c.rep.blind || c.rep.catch)) || (c.repEmpty || []).length ? `<div class="reps">${repCard("jobplanet","잡플래닛",c.rep?.jobplanet,date,c)}${repCard("blind","블라인드",c.rep?.blind,date,c)}${repCard("catch","캐치",c.rep?.catch,date,c)}</div>` : empty((c.pending || []).includes("rep") ? "평점은 아직 모으는 중이에요" + etaSay(c.etaRep, "까지 올라올 예정이에요") : c.rep ? "세 사이트 모두 공개 평점을 찾지 못했어요" : "평점을 모으지 않는 곳이에요 (공사 현장·관공서·학교 등)")}</section>
    <section class="sec" id="s2">${secH(2,"연봉")}${salarySec(c)}${myPay(c)}</section>
    <section class="sec" id="s3">${secH(3,"성장성")}${finSec(c,"성장성")}</section>
    <section class="sec" id="s4">${secH(4,"수익성")}${finSec(c,"수익성")}</section>
    <section class="sec" id="s5">${secH(5,"안정성")}${finSec(c,"안정성")}</section>
    <section class="sec" id="s6">${secH(6,"주요 뉴스")}${newsSec(c)}</section>
    <section class="sec" id="s7">${secH(7,"AI 영향")}${aiSec(c)}</section>
    ${askSec(c)}
    ${altSec(c)}
    ${alsoSec(c)}
    ${API ? `<details class="fixbox"><summary>정보가 틀렸거나 문제가 있나요? 정정 요청하기</summary>
      <form id="fixform"><p>회사 관계자·현직자 누구나 보낼 수 있어요. 확인 후 고치거나 내립니다.</p>
        <label class="sr" for="fixmsg">요청 내용</label><textarea id="fixmsg" maxlength="1000" placeholder="어떤 내용이 왜 틀렸는지 적어 주세요" required></textarea>
        <label class="sr" for="fixcontact">답변 받을 연락처</label><input id="fixcontact" maxlength="100" placeholder="답변 받을 이메일 (선택)">
        <button type="submit">요청 보내기</button></form></details>` : ""}`;
  history.replaceState(null, "", "#" + encodeURIComponent(name));
  CUR = c; VS = null;
  vsEntryWire(c);
  myPayWire(c);
  if (API) $("#fixform").onsubmit = async e => { e.preventDefault();
    const r = await send("/fix", { n: c.name, msg: $("#fixmsg").value, contact: $("#fixcontact").value });
    if (r?.ok) { e.target.closest("details").innerHTML = `<p style="margin:0;font-size:14px;font-weight:700">요청을 받았어요. 확인 후 반영할게요.</p>`; } else toast("보내지 못했어요. 내용을 5자 이상 적었는지 확인해 주세요."); };
  if (API) { $("#b-heart").onclick = e => heart(e.currentTarget); $("#b-card").onclick = e => { e.target.closest("details").open = false; saveCard(); }; $("#b-share").onclick = e => { e.target.closest("details").open = false; shareLink(); }; }
  // 2026-10-28 모바일: 회사 화면에선 검은 띠·위 안내 상자를 숨기고(판정 밑 한 줄로), 결과 머리(회사 이름·판정)로 바로 내려 준다
  document.body.classList.add("has-co");
  if (matchMedia("(max-width:640px)").matches) { const h = document.querySelector("#out .head"); if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); }
  coDock(c, my);
}

// ── VS 비교 (2026-10-20 사용자 결정: 결과 화면 버튼·같은 업계 칩으로 진입, 무승부 허용, 우선순위 버튼, 지금 회사 vs 옮길 회사)
// 주소: #회사A~회사B   (#회사A~회사B~now 면 왼쪽이 지금 다니는 회사 → 웬만큼 확 뛰지 않으면 STAY)
const LETTER_PTS = { "S": 7, "A+": 6, "A": 5, "B": 4, "C": 3, "D": 2, "F": 1 };
const GRADE_PTS = { 2: 5, 1: 4, 0: 2 };
const VLEVEL = { "무조건 가세요": 7, "가세요": 6, "조건 보고 가세요": 5, "중립기어": 4, "스펙 보고 결정하세요": 4, "다시 생각해요": 2, "비추예요": 1, "판단자료 부족": 0 };   // 중립기어 = 스펙 보고 (같은 급, 2026-11-03)
const VS_MAIN = ["평판", "연봉", "성장성", "수익성", "안정성"];
const VS_PRIO = {
  base: { label: "균형있게", w: { 평판: 2, 연봉: 1.5, 성장성: 1, 수익성: 1, 안정성: 1 } },   // 평판에 힘을 더 (2026-10-20 사용자)
  pay: { label: "연봉", w: { 평판: 1, 연봉: 3, 성장성: 1, 수익성: .5, 안정성: .5 } },
  wlb: { label: "워라밸", w: { 평판: 1, 연봉: .5, 성장성: .5, 수익성: .5, 안정성: 1, 워라밸: 3 } },
  stab: { label: "안정성", w: { 평판: 1, 연봉: .5, 성장성: .5, 수익성: 1, 안정성: 3 } },
  stay: { label: "오래 다니기", w: { 평판: 1, 연봉: .5, 성장성: .5, 수익성: .5, 안정성: 1, 근속: 3 } },
};
// 받침 있으면 앞, 없으면 뒤 (영문은 L·M·N·R·숫자 일부가 받침 소리)
const jo = (w, a, b) => { const ch = String(w).replace(/\s*\([^)]*\)\s*$/, "").slice(-1);
  if (ch >= "가" && ch <= "힣") return w + ((ch.charCodeAt(0) - 0xAC00) % 28 ? a : b);
  return w + ("LMNR0136".includes(ch.toUpperCase()) ? a : b); };
const vsItem = (c, g, l) => (c.metrics?.[g]?.items || []).find(i => i.label.startsWith(l))?.value;
const wlbOf = c => { if (c.subsMix?.["워라밸"] != null) return c.subsMix["워라밸"];   // 2026-11-05 세 곳 종합(평판과 같은 비율)
  const r = c.rep || {}, v = [r.jobplanet?.subs?.["워라밸"], r.blind?.subs?.["업무와 삶의 균형"]].filter(x => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
function vsPts(c) {
  const p = {};
  for (const k of VS_MAIN) { const x = c.grades?.[k]; if (!x || x.grade == null) continue; p[k] = x.letter ? LETTER_PTS[x.letter] : GRADE_PTS[x.grade]; }
  const w = wlbOf(c); if (w != null) p["워라밸"] = 1 + (w - 1) / 4 * 6;
  const t = c.salary?.turnover; if (t != null) p["근속"] = Math.max(1, Math.min(7, 7 - t * 100 / 3));
  return p;
}
const vsLetter = (c, k) => { const x = c.grades?.[k]; return !x || x.grade == null ? null : x.letter || GR[x.grade]; };

// 판정: 같은 항목만 비교, 판정 단계 차이를 조금 더함. now=true 면 왼쪽(A)이 지금 회사
function vsJudge(A, B, prio, now) {
  const w = VS_PRIO[prio].w, pa = vsPts(A), pb = vsPts(B);
  const dims = Object.keys(w).filter(k => pa[k] != null && pb[k] != null);
  const avg = p => dims.length ? dims.reduce((s, k) => s + p[k] * w[k], 0) / dims.reduce((s, k) => s + w[k], 0) : 0;
  const la = VLEVEL[A.verdict] || 0, lb = VLEVEL[B.verdict] || 0, vd = la && lb ? la - lb : 0;
  const gap = avg(pa) - avg(pb) + Math.max(-2, Math.min(2, vd)) * .4;   // + 면 A 쪽
  let wa = 0, wb = 0, ev = 0;
  VS_MAIN.forEach(k => { if (pa[k] == null || pb[k] == null) return; pa[k] > pb[k] ? wa++ : pa[k] < pb[k] ? wb++ : ev++; });
  const fatal = (c, o) => [VLEVEL[c.verdict] === 1 || VLEVEL[c.verdict] === 2 ? "판정이 '" + c.verdict + "'" : null,
    vsLetter(c, "평판") === "F" ? "평판 F" : null, c.shadow ? "모회사 그림자 계열사" : null,
    o && ["C", "D", "F", "하"].includes(vsLetter(c, "연봉")) && ["S", "A+", "A", "상"].includes(vsLetter(o, "연봉")) ? "연봉이 업계 하위권" : null].filter(Boolean);
  let kind, win;
  if (!now) {
    win = gap > 0 ? A : B;
    kind = Math.abs(vd) >= 2 && Math.sign(vd) === Math.sign(gap || vd) ? "big" : Math.abs(gap) < .35 ? "tie" : Math.abs(gap) < 1 ? "edge" : "clear";
    if (kind === "big") win = vd > 0 ? A : B;
  } else {
    const fa = fatal(A, B), fb = fatal(B);
    if (fb.length && !fa.length) kind = "stay-bad";
    else if (-gap >= 1 && !fb.length) kind = "move";
    else if (fa.length && -gap > .2) kind = "move-fatal";
    else if (-gap > 0) kind = "stay-soft";
    else kind = "stay";
    win = kind.startsWith("move") ? B : A;
  }
  return { kind, win, lose: win === A ? B : A, gap, wa, wb, ev, pa, pb, dims, fatalA: fatal(A, B), fatalB: fatal(B) };
}

// 근거 문장: 차이가 큰 항목부터, 실제 숫자로
function vsReasons(A, B, j) {
  const W = j.win, L = j.lose, out = [];
  const diffs = VS_MAIN.filter(k => j.pa[k] != null && j.pb[k] != null && j.pa[k] !== j.pb[k])
    .sort((x, y) => Math.abs(j.pb[y] - j.pa[y]) - Math.abs(j.pb[x] - j.pa[x]));
  for (const k of diffs) {
    const hi = (W === A ? j.pa[k] > j.pb[k] : j.pb[k] > j.pa[k]) ? W : L, lo = hi === W ? L : W;
    if (k === "평판") { const sh = hi.grades.평판.score, sl = lo.grades.평판.score; if (sh == null || sl == null) continue;
      out.push(`평점은 ${hi.name} ${sh.toFixed(1)}, ${lo.name} ${sl.toFixed(1)}.` + (sh >= 3 && sl < 3 ? " 3.0을 넘는 쪽이 확실히 덜 괴로워요." : "")); }
    if (k === "연봉" && hi.salary?.ranks && lo.salary?.ranks) { const d = hi.salary.ranks.과장 - lo.salary.ranks.과장;
      out.push(`연봉은 과장 기준 ${won(Math.abs(d))}만원 차이예요(${hi.name} ${won(hi.salary.ranks.과장)} vs ${lo.name} ${won(lo.salary.ranks.과장)}만원).` +
        (hi.salary.group === lo.salary.group ? ` 업계 상위 ${hi.salary.industryTop ?? hi.salary.allTop}% vs ${lo.salary.industryTop ?? lo.salary.allTop}%예요.` : "")); }
    // 숫자 한 개가 등급 방향과 어긋나면(다른 지표 때문에 등급이 앞선 경우) 숫자 대신 등급으로 말한다
    const num = (g, l, better) => { const a = vsItem(hi, g, l), b = vsItem(lo, g, l); return a != null && b != null && better(a, b) ? [a, b] : null; };
    const byGrade = () => out.push(`${k}은 ${jo(hi.name, "이", "가")} 앞서요(${vsLetter(hi, k)} vs ${vsLetter(lo, k)}, 지표 다섯 개 종합).`);
    if (k === "성장성") { const v = num("성장성", "매출 연평균", (a, b) => a > b); v ? out.push(`매출은 ${hi.name} 연 ${v[0].toFixed(1)}%, ${lo.name} 연 ${v[1].toFixed(1)}%씩 커요.`) : byGrade(); }
    if (k === "수익성") { const v = num("수익성", "5년 평균", (a, b) => a > b); v ? out.push(`5년 평균 영업이익률 ${v[0].toFixed(1)}% vs ${v[1].toFixed(1)}%. 돈 버는 힘은 ${jo(hi.name, "이", "가")} 앞서요.`) : byGrade(); }
    if (k === "안정성") { const v = num("안정성", "부채비율", (a, b) => a < b); v ? out.push(`부채비율 ${Math.round(v[0])}% vs ${Math.round(v[1])}%. 재무 체력은 ${jo(hi.name, "이", "가")} 한 수 위예요.`) : byGrade(); }
    if (out.length >= 3) break;
  }
  [A, B].forEach(c => { if (c.shadow) out.push(`${jo(dn(c.name), "은", "는")} ${c.shadow.parent}의 ${c.shadow.role} 계열사예요. 숫자보다 모회사 그림자를 먼저 보세요.`); });
  [A, B].forEach(c => { if (c.news_ai?.risk === "높음" && c.news_ai.line) out.push(`${dn(c.name)} 최근 뉴스: ${c.news_ai.line}`); });
  return out.slice(0, 5);
}
// 진 쪽(또는 STAY 때 옮길 회사)이 맞는 사람
function vsOther(j, A, B, now) {
  const L = now && !j.kind.startsWith("move") ? B : j.lose, W = L === A ? B : A, pl = L === A ? j.pa : j.pb, pw = L === A ? j.pb : j.pa;
  if (pl["근속"] != null && pw["근속"] != null && pl["근속"] > pw["근속"] + .3)
    return `오래 다닐 생각이면 ${jo(L.name, "이", "가")} 사람이 덜 나가요(퇴사율 ${Math.round(L.salary.turnover * 100)}% vs ${Math.round(W.salary.turnover * 100)}%).`;
  if (pl["워라밸"] != null && pw["워라밸"] != null && pl["워라밸"] > pw["워라밸"] + .3) return `워라밸 점수는 ${jo(L.name, "이", "가")} 높아요(${wlbOf(L).toFixed(1)} vs ${wlbOf(W).toFixed(1)}).`;
  const k = VS_MAIN.find(k => pl[k] != null && pw[k] != null && pl[k] > pw[k]);
  if (k) return `${k}만 보면 ${jo(L.name, "이", "가")} 앞서요(${vsLetter(L, k)} vs ${vsLetter(W, k)}). 이게 제일 중요한 분이면 ${L.name}도 답이에요.`;
  if ((L.salary?.members || 0) > (W.salary?.members || 0) * 1.5) return `이름값·규모는 ${jo(L.name, "이", "가")} 커요(직원 ${won(L.salary.members)}명 vs ${won(W.salary?.members)}명).`;
  return `솔직히 ${jo(L.name, "을", "를")} 고를 이유는 잘 안 보여요. 처우 협상으로 차이를 메울 수 있을 때만 다시 보세요.`;
}
function vsHead(j, A, B) {
  const W = j.win.name, n = Math.max(j.wa, j.wb), tot = j.wa + j.wb + j.ev;
  return {
    big: `이건 ${jo(W, "이에요", "예요")}. 고민할 차이가 아니에요.`,
    clear: `${jo(W, "이", "가")} 낫지 않을까요? ${tot}판 중 ${n}판을 이겼어요.`,
    edge: `${W} 쪽이 조금 앞서요. 다만 큰 차이는 아니라 우선순위에 따라 바뀔 수 있어요.`,
    tie: `무승부예요. 장단점이 비슷해서, 내가 뭘 더 중요하게 보는지로 고르세요.`,
    move: `옮기세요. ${jo(B.name, "이", "가")} 확실히 앞서요.`,
    "move-fatal": `옮기는 게 맞아요. 지금 회사(${A.name})에 치명적인 약점이 있어요: ${j.fatalA.join(", ")}.`,
    "stay-soft": `STAY 하세요. ${jo(B.name, "이", "가")} 앞서긴 하는데, 치명적인 단점이 없다면 그냥 다녀도 될 정도의 차이예요.`,
    stay: `STAY! 지금 회사가 더 나아요. 옮길 이유가 없어요.`,
    "stay-bad": `STAY! ${jo(B.name, "은", "는")} 옮겨 갈 곳이 아니에요(${j.fatalB.join(", ")}).`,
  }[j.kind];
}

let VS = null;   // {A, B, now, prio}
async function renderVS(a, b, now) {
  $("#out").innerHTML = `<div class="skel" aria-label="불러오는 중"><i class="w40"></i><i class="h1"></i><i class="pill"></i><i></i><i class="w80"></i><i class="box"></i></div>`;
  if (ME) await loadIdx();
  const [A, B] = await Promise.all([getCo(a), getCo(b)]);
  const bad = [[a, A], [b, B]].find(([, c]) => !c || c.__hidden || c.__limit || c.__err);
  if (bad) { $("#out").innerHTML = `<div class="sec">${empty(bad[1]?.__limit ? "조회가 너무 많아요. 잠시 후 다시 시도해 주세요." : bad[1]?.__err ? "잠시 연결이 불안정해요. 잠시 후 다시 시도해 주세요." : "'" + bad[0] + "'은(는) 아직 모은 자료가 없어요.")}</div>`; return; }
  A.name = a; B.name = b; CUR = null;
  VS = { A, B, now: !!now, prio: (VS && VS.A.name === a && VS.B.name === b && VS.prio) || "base" };
  history.replaceState(null, "", "#" + encodeURIComponent(a) + "~" + encodeURIComponent(b) + (now ? "~now" : ""));
  try { const k = "cc-vs:" + [a, b].sort().join("~"); if (API && !sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); send("/vs", { a, b }); } } catch (e) {}   // 최근 7일 매치업 집계 (같은 탭에서 같은 대결은 한 번)
  drawVS();
  document.getElementById("codock")?.classList.remove("on");   // 회사 화면의 아래 버튼은 VS 에선 안 씀
  document.body.classList.add("has-co");   // 2026-10-29 모바일: VS 도 회사 화면처럼 띠·안내 상자 숨기고 비교 머리로 바로
  if (matchMedia("(max-width:640px)").matches) { const h = document.querySelector("#out .vs-head"); if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); }
}
function drawVS() {
  const { A, B, now, prio } = VS, j = vsJudge(A, B, prio, now), reasons = vsReasons(A, B, j);
  const side = (c, r) => { const won1 = (now ? (j.kind.startsWith("move") ? B : A) : j.kind === "tie" ? null : j.win) === c;
    return `<div class="vs-side${r ? " r" : ""}"><p class="kicker"><i></i>${now ? (c === A ? "지금 회사" : "옮길 회사") + " · " : ""}${esc(grpName(c.salary, c.name) || c.type + " 회사")}</p>
      <h2><a href="#${encodeURIComponent(c.name)}">${won1 ? `<mark>${esc(dn(c.name))}</mark>` : esc(dn(c.name))}</a></h2>
      <span class="vs-pill${/가세요$/.test(c.verdict) && c.verdict !== "조건 보고 가세요" ? " go" : /다시|비추/.test(c.verdict) ? " stop" : ""}">${esc(c.verdict)}</span>
      <p class="meta">${c.salary ? `<span>직원 <b>${won(c.salary.members)}명</b></span>` : ""}${c.age != null ? `<span>업력 <b>${c.age}년</b></span>` : ""}</p></div>`; };
  const row = k => { const la = vsLetter(A, k), lb = vsLetter(B, k), x = j.pa[k], y = j.pb[k], both = x != null && y != null;
    const cell = (l, me, ot, left, c) => { const w = both && me > ot;
      return `<div class="vs-c${left ? " l" : ""}">${left ? `<span class="d">${esc(oneLine(c, k) || "")}</span>` : ""}<span class="vs-g${w ? " w" : ""}${l == null ? " na" : ""}">${l ?? "?"}</span>${left ? "" : `<span class="d">${esc(oneLine(c, k) || "")}</span>`}${!left && w ? `<span class="vs-win">WIN</span>` : ""}</div>`; };
    return `<div class="vs-row">${cell(la, x, y, true, A)}<div class="mid">${k}<small>${!both ? "한쪽 자료 없음" : x === y ? "무승부" : ""}</small></div>${cell(lb, y, x, false, B)}</div>`; };
  const R = ["사원", "대리", "과장", "차장", "부장"];
  const salBox = A.salary?.ranks && B.salary?.ranks ? `<div class="vs-box"><h4>직급별 연봉 <small>연봉 연구소 추정 · 만원</small></h4><div class="vs-tw"><table>
      <thead><tr><th>직급</th><th>${esc(dn(A.name))}</th><th>${esc(dn(B.name))}</th><th>차이</th></tr></thead><tbody>${R.map(k => { const d = B.salary.ranks[k] - A.salary.ranks[k];
        return `<tr><td>${k}</td><td>${won(A.salary.ranks[k])}</td><td>${won(B.salary.ranks[k])}</td><td><span class="${d > 0 ? "up" : d < 0 ? "dn" : ""}">${d > 0 ? "+" : ""}${won(d)}</span></td></tr>`; }).join("")}</tbody></table></div>
      <p style="font-size:12.5px;color:var(--muted)">차이 = ${esc(dn(B.name))} − ${esc(dn(A.name))} · 평균 근속 ${A.salary.tenure}년 vs ${B.salary.tenure}년 · 퇴사율 ${Math.round(A.salary.turnover * 100)}% vs ${Math.round(B.salary.turnover * 100)}%</p></div>` : "";
  const subs = [["워라밸(블)", "blind", "업무와 삶의 균형"], ["급여·복지(블)", "blind", "급여 및 복지"], ["사내 문화(블)", "blind", "사내 문화"], ["커리어(블)", "blind", "커리어 향상"],
    ["경영진(블)", "blind", "경영진"], ["워라밸(잡플)", "jobplanet", "워라밸"], ["승진 기회(잡플)", "jobplanet", "승진 기회"]]
    .map(([l, s, k]) => [l, A.rep?.[s]?.subs?.[k], B.rep?.[s]?.subs?.[k]]).filter(x => x[1] != null && x[2] != null);
  const repBox = subs.length ? `<div class="vs-box"><h4>평판 세부 <small>블라인드·잡플래닛 항목 점수</small></h4><div class="vs-key"><span><i></i>${esc(dn(A.name))}</span><span><i class="n"></i>${esc(dn(B.name))}</span></div>
      <div class="vs-bars">${subs.map(([l, x, y]) => `<div class="vs-bl"><span>${l}</span><div class="tr"><div class="b"><i style="width:${x / 5 * 100}%"></i></div><div class="b n"><i style="width:${y / 5 * 100}%"></i></div><span class="v">${x.toFixed(1)} vs ${y.toFixed(1)}</span></div></div>`).join("")}</div></div>` : "";
  const fins = [["매출 연평균 성장률", "성장성", "매출 연평균", 1, "%"], ["영업이익 추세", "성장성", "영업이익 추세", 1, "%"], ["5년 평균 영업이익률", "수익성", "5년 평균", 1, "%"], ["부채비율", "안정성", "부채비율", -1, "%"]]
    .map(([l, g, k, s, u]) => [l, vsItem(A, g, k), vsItem(B, g, k), s, u]).filter(x => x[1] != null && x[2] != null);
  const finBox = fins.length ? `<div class="vs-box"><h4>재무 핵심 <small>DART 별도재무제표 · 5년</small></h4><div class="vs-tw"><table>
      <thead><tr><th>지표</th><th>${esc(dn(A.name))}</th><th>${esc(dn(B.name))}</th><th></th></tr></thead><tbody>${fins.map(([l, x, y, s, u]) =>
        `<tr><td>${l}</td><td>${x.toFixed(1)}${u}</td><td>${y.toFixed(1)}${u}</td><td>${x === y ? "" : `<span class="up">${esc(dn((x - y) * s > 0 ? A.name : B.name))}</span>`}</td></tr>`).join("")}</tbody></table></div></div>` : "";
  const newsLine = c => c.news_ai?.line || (c.news?.items?.[0] ? `${c.news.items[0].title} (${c.news.items[0].src})` : "최근 90일 안에 눈에 띄는 기사가 없어요.");
  const newsBox = `<div class="vs-box"><h4>최근 90일 뉴스 <small>한 줄씩</small></h4><div class="vs-news">
      <div><b>${esc(dn(A.name))}</b>${esc(newsLine(A))}</div><div><b>${esc(dn(B.name))}</b>${esc(newsLine(B))}</div>
      ${A.ai && B.ai ? `<div><b>AI 영향</b>${esc(dn(A.name))} ${A.ai.level} · ${esc(dn(B.name))} ${B.ai.level}</div>` : ""}</div></div>`;
  const tally = j.kind === "tie" ? "무승부" : `${esc(dn(A.name))} ${j.wa} : ${j.wb} ${esc(dn(B.name))}`;
  const stayTip = now && j.kind.startsWith("stay") ? ["환승 이직은 '확실히 좋아질 때'만 하는 거예요. 애매하면 지금 회사에서 성과 하나 더 쌓고 다음 카드를 보세요."] : [];
  const moveTip = now && j.kind.startsWith("move") ? ["그래도 선퇴사는 금지! 합격 카드 손에 쥐고 처우 협상까지 끝낸 다음 옮기세요."] : [];
  $("#out").innerHTML = `
    <div class="vs-head">${side(A, false)}<div class="vs-x" aria-hidden="true">VS</div>${side(B, true)}</div>
    <label class="vs-mode"><input type="checkbox" id="vs-now"${now ? " checked" : ""}> 왼쪽(${esc(dn(A.name))})이 지금 다니는 회사예요 <small>이직 고민이면 체크</small></label>
    <div class="zorro vs-z"><div class="who">Z</div><div><p class="lbl">Zorro의 한마디 · ${now ? "이직" : "VS"}</p><p class="first">${esc(vsHead(j, A, B))}</p>
      <ul>${[...reasons, ...stayTip, ...moveTip].map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      <p class="other"><b>${now && !j.kind.startsWith("move") ? `그래도 ${jo(B.name, "이", "가")} 끌린다면:` : `그래도 ${jo(j.lose.name, "이", "가")} 맞는 사람:`}</b> ${esc(vsOther(j, A, B, now))}</p></div></div>
    <div class="vs-tally"><b class="num">${tally}</b>${j.ev ? `<span>무승부 ${j.ev}</span>` : ""}<span>· ${VS_PRIO[prio].label} 기준</span></div>
    <div class="vs-prio"><p>내가 제일 중요하게 보는 건? <small>누르면 다시 판정해요</small></p><div class="opts" role="group" aria-label="우선순위">${Object.entries(VS_PRIO).map(([k, v]) =>
      `<button type="button" data-k="${k}" aria-pressed="${k === prio}">${v.label}</button>`).join("")}</div></div>
    <div class="vs-duel">${VS_MAIN.map(row).join("")}</div>
    <div class="vs-detail">${salBox}${repBox}${finBox}${newsBox}</div>
    <div class="vs-acts"><button class="act" type="button" id="vs-share">링크 공유</button><button class="act" type="button" id="vs-swap">↔ 좌우 바꾸기</button>
      <button class="act" type="button" id="vs-other">다른 회사로 바꾸기</button><a class="act" href="#${encodeURIComponent(A.name)}">${esc(dn(A.name))} 전체 판단</a><a class="act" href="#${encodeURIComponent(B.name)}">${esc(dn(B.name))} 전체 판단</a></div>
    <div class="vsq" id="vsq" hidden><span class="tagvs">${esc(dn(A.name))} VS</span><div class="qbox"><input id="q2" placeholder="어디랑 붙여 볼까요?" aria-label="비교할 회사" autocomplete="off"><ul id="sug2" class="sug" hidden></ul></div></div>`;
  document.querySelectorAll(".vs-prio button").forEach(b => b.onclick = () => { VS.prio = b.dataset.k; drawVS(); });
  $("#vs-now").onchange = e => { VS.now = e.target.checked; history.replaceState(null, "", "#" + encodeURIComponent(A.name) + "~" + encodeURIComponent(B.name) + (VS.now ? "~now" : "")); drawVS(); };
  $("#vs-swap").onclick = () => { location.hash = encodeURIComponent(B.name) + "~" + encodeURIComponent(A.name) + (VS.now ? "~now" : ""); };
  $("#vs-other").onclick = () => { $("#vsq").hidden = false; $("#q2").focus(); };
  $("#vs-share").onclick = async () => { const url = location.origin + location.pathname + location.hash;
    if (navigator.share) { try { await navigator.share({ title: A.name + " VS " + B.name + " · 회사 판단 연구소", url }); return; } catch (e) { if (e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast("링크를 복사했어요"); } catch (e) { toast(url); } };
  vsSug(A.name);
}
// VS 상대 검색칸 (결과 화면·VS 화면 공용): 고르면 #왼쪽~고른회사
function vsSug(left) {
  const q = $("#q2"), ul = $("#sug2"); if (!q) return;
  const go = n => { if (n && n !== left) location.hash = encodeURIComponent(left) + "~" + encodeURIComponent(n); };
  q.oninput = () => { const rows = find(q.value).filter(r => r[0] !== left);
    ul.innerHTML = rows.map(r => `<li role="option" data-n="${esc(r[0])}"><span>${esc(dn(r[0]))}${r[3] ? ` <small>${esc(r[3])}</small>` : ""}${r[6] ? ` <small class="dupx">${esc(r[6])}</small>` : ""}</span><small class="${r[1] ? "vd" : "vn"}">${r[1] ? "판정 있음" : "자료 모으는 중"}</small></li>`).join("");
    ul.hidden = !rows.length; };
  q.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); const r = find(q.value, 3).filter(r => r[0] !== left)[0]; if (r) go(r[0]); } if (e.key === "Escape") ul.hidden = true; };
  ul.onclick = e => { const li = e.target.closest("li"); if (li) go(li.dataset.n); };
}
// 결과 화면의 VS 진입줄: 버튼 + 같은 업계 큰 회사 4곳 칩 (index 는 판정 있는 회사·직원 많은 순)
function vsInHtml(c, P) {   // P = peers.json 의 { 업계: [큰 회사 5곳] } (검색 목록을 아직 안 받았을 때)
  let me = IDX.find(r => r[0] === c.name), peers = me && me[2] ? IDX.filter(r => r[2] === me[2] && r[1] && r[0] !== c.name).slice(0, 4) : [];
  if (!me && P && c.salary?.group) { me = [c.name, 1, c.salary.group]; peers = (P[me[2]] || []).filter(n => n !== c.name).slice(0, 4).map(n => [n]); }
  return `<button class="act vs" type="button" id="b-vs">VS 다른 회사랑</button>${peers.length ? `<small>${esc(me[2])}에서 붙여 보기</small>` + peers.map(r =>
      `<button class="peer" type="button" data-n="${esc(r[0])}">VS ${esc(dn(r[0]))}</button>`).join("") : ""}`;
}
function vsEntry(c) {
  return `<div class="vsin">${vsInHtml(c)}</div>
    <div class="vsq" id="vsq" hidden><span class="tagvs">${esc(dn(c.name))} VS</span><div class="qbox"><input id="q2" placeholder="어디랑 붙여 볼까요?" aria-label="비교할 회사" autocomplete="off"><ul id="sug2" class="sug" hidden></ul></div></div>`;
}
function vsEntryWire(c) {
  const wire = () => { const b = $("#b-vs"); if (!b) return false;
    b.onclick = () => { $("#vsq").hidden = false; $("#q2").focus(); };
    document.querySelectorAll(".vsin .peer").forEach(p => p.onclick = () => { location.hash = encodeURIComponent(c.name) + "~" + encodeURIComponent(p.dataset.n); });
    return true; };
  if (!wire()) return;
  vsSug(c.name);
  // 검색 목록을 아직 안 받았으면 작은 peers.json 으로 같은 업계 칩을 채운다 (2026-11-11)
  if (!IDX.length) loadPeers().then(P => { const el = document.querySelector(".vsin"); if (el && CUR === c && !VS && !el.querySelector(".peer")) { el.innerHTML = vsInHtml(c, P); wire(); } });
}
function route(h) {
  const p = h.split("~");
  if (p.length >= 2 && p[0] && p[1]) renderVS(p[0], p[1], p[2] === "now"); else if (h) render(h);
}

// 한글 자모 맞추기 (2026-10-28 사용자: 'ㄱ' 누르면 ㄱ으로, '기' 치면 기로 시작하는 회사가 치는 대로 따라오게)
//   글자를 자음·모음으로 쪼개 앞부분을 비교한다: '깅'(기아 치는 중) = ㄱㅣㅇ → 기아(ㄱㅣㅇㅏ)와 맞음. 'ㅅㅅㅈㅈ'처럼 초성만 쳐도 삼성전자
const HG = { cho: "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", jung: ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅗㅏ","ㅗㅐ","ㅗㅣ","ㅛ","ㅜ","ㅜㅓ","ㅜㅔ","ㅜㅣ","ㅠ","ㅡ","ㅡㅣ","ㅣ"],
  jong: ["","ㄱ","ㄲ","ㄱㅅ","ㄴ","ㄴㅈ","ㄴㅎ","ㄷ","ㄹ","ㄹㄱ","ㄹㅁ","ㄹㅂ","ㄹㅅ","ㄹㅌ","ㄹㅍ","ㄹㅎ","ㅁ","ㅂ","ㅂㅅ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],
  pair: { "ㄳ":"ㄱㅅ","ㄵ":"ㄴㅈ","ㄶ":"ㄴㅎ","ㄺ":"ㄹㄱ","ㄻ":"ㄹㅁ","ㄼ":"ㄹㅂ","ㄽ":"ㄹㅅ","ㄾ":"ㄹㅌ","ㄿ":"ㄹㅍ","ㅀ":"ㄹㅎ","ㅄ":"ㅂㅅ","ㅘ":"ㅗㅏ","ㅙ":"ㅗㅐ","ㅚ":"ㅗㅣ","ㅝ":"ㅜㅓ","ㅞ":"ㅜㅔ","ㅟ":"ㅜㅣ","ㅢ":"ㅡㅣ" } };
function jamo(s) {
  let o = "";
  for (const ch of s) { const c = ch.charCodeAt(0) - 0xac00;
    if (c >= 0 && c < 11172) o += HG.cho[Math.floor(c / 588)] + HG.jung[Math.floor(c % 588 / 28)] + HG.jong[c % 28];
    else o += HG.pair[ch] || ch; }
  return o;
}
const choOf = s => [...s].map(ch => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? HG.cho[Math.floor(c / 588)] : ch; }).join("");
const onlyCho = q => /^[ㄱ-ㅎ]+$/.test(q);
// 검색: 정확히 같은 이름 → 앞부분 일치(자모·초성 포함) → 포함 순, 판정이 있는 회사 먼저
function find(q, n = 8) {
  q = plain(q); if (!q) return [];
  const exact = [], head = [], jhead = [], part = [];   // jhead = 글자로는 아직 안 맞지만 치는 중인 자모로 맞는 것 ('기' → 길·김), 진짜 앞부분 일치 뒤에
  q = q.toLowerCase();
  const qj = jamo(q), qc = onlyCho(q);
  let full = false;   // 후보가 충분히 모이면 그 뒤로는 '정확히 같은 이름'만 끝까지 찾는다
  // (2026-11-11 정정 요청: 예전엔 여기서 멈춰서 '케이씨'가 목록 뒤쪽에 있으면 앞에서 모인 케이씨씨(KCC)가 뽑혔음 — 한화 → 한화오션도 같은 문제)
  for (const row of IDX) { const p = plain(row[0]).toLowerCase(), al = row[3] ? row[3].split(" · ").map(x => plain(x).toLowerCase()) : [];
    if (DISP.has(row[0])) al.push(plain(DISP.get(row[0])).toLowerCase());   // 화면 이름(스타벅스코리아·SM엔터테인먼트 등)으로 쳐도 찾게 (2026-11-08)
    // 별칭(SK하이닉스·버거킹 같은 브랜드·영문 이름)도 이름과 똑같이 찾는다
    if (p === q || al.includes(q)) exact.push(row);
    else if (full) continue;
    else if (p.startsWith(q) || al.some(x => x.startsWith(q))) head.push(row);
    else if ((row[4] ??= jamo(p)).startsWith(qj) || (qc && (row[5] ??= choOf(p)).startsWith(q))) jhead.push(row);
    else if (p.includes(q) || (q.length >= 2 && al.some(x => x.includes(q))) || (qc && q.length >= 2 && (row[5] ??= choOf(p)).includes(q))) part.push(row);
    if (exact.length + head.length >= n * 4) full = true; }
  const by = (a, b) => (b[1] > 0) - (a[1] > 0);
  return [...exact, ...head.sort(by), ...jhead.sort(by), ...part.sort(by)].slice(0, n);
}
let sel = -1;
function showSug() {
  const rows = find($("#q").value), ul = $("#sug"); sel = -1;
  ul.innerHTML = rows.map(r => `<li role="option" data-n="${esc(r[0])}"><span>${esc(dn(r[0]))}${r[3] ? ` <small>${esc(r[3])}</small>` : ""}${r[6] ? ` <small class="dupx">${esc(r[6])}</small>` : ""}</span><small class="${r[1] ? "vd" : "vn"}">${r[1] ? (API ? "판정 있음" : esc(VCODE[r[1]])) : "자료 부족"}${r[2] ? " · " + esc(r[2]) : ""}</small></li>`).join("");
  ul.hidden = !rows.length; $("#q").setAttribute("aria-expanded", String(!ul.hidden));
}
function pick(name) { $("#q").value = name; $("#sug").hidden = true; render(name); }
$("#q").addEventListener("input", showSug);
$("#q").addEventListener("compositionupdate", () => setTimeout(showSug, 0));   // 한글 조합 중('ㄱ'→'기')에도 바로 따라오게
$("#q").addEventListener("keydown", e => { const li = [...$("#sug").children]; if (!li.length || $("#sug").hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + li.length) % li.length; li.forEach((x, i) => x.classList.toggle("on", i === sel)); }
  if (e.key === "Enter" && sel >= 0) { e.preventDefault(); pick(li[sel].dataset.n); }
  if (e.key === "Escape") $("#sug").hidden = true; });
$("#sug").addEventListener("click", e => { const li = e.target.closest("li"); if (li) pick(li.dataset.n); });
document.addEventListener("click", e => { if (!e.target.closest(".qbox")) $("#sug").hidden = true; });
// 검색창 아래: 이번 주 많이 본 회사 TOP 5 (2026-10-28 사용자: '이런 회사부터' 대신). /top 이 없거나 5곳이 안 되면 기본 목록으로 채움
const pillsOf = ns => ns.map((n, i) => `<button class="pill" type="button" data-n="${esc(n)}"><i>${i + 1}</i>${esc(dn(n))}</button>`).join("");
function heroTop(top) {
  const ns = [...new Set([...(top || []).map(r => r[0]), ...PICKS])].slice(0, 5);
  $("#picks").querySelectorAll(".pill").forEach(b => b.remove()); $("#picks").insertAdjacentHTML("beforeend", pillsOf(ns));
}
$("#picks").addEventListener("click", e => { const b = e.target.closest(".pill"); if (b) render(b.dataset.n); });
$("#f").addEventListener("submit", async e => { e.preventDefault(); await loadIdx(); const r = find($("#q").value, 1)[0]; $("#sug").hidden = true;
  if (r) render(r[0]); else if ($("#q").value.trim()) render($("#q").value.trim()); });
addEventListener("hashchange", () => { const h = decodeURIComponent(location.hash.slice(1)); if (h) route(h); });
// 검색 목록은 두 번에 나눠 받는다 (2026-10-28 속도): 판정 있는 회사 먼저, 판단자료 부족 회사는 검색창을 누르거나 칠 때만 (2026-11-03)
// 2026-11-11 첫 로딩 줄이기: 판정 있는 회사 목록(index.json, 받는 크기 400KB)도 첫 화면에서는 안 받는다.
//   받는 때 = 검색창에 손을 댈 때(올리기·누르기·치기) · 회사 화면이 뜬 뒤 한가할 때 · 내 상황을 넣은 사람이 회사를 열 때
//   숫자판(회사 수·판정 수)과 자주 보이는 회사의 화면 이름은 빌드가 페이지에 미리 넣는다 (BOOT.NUM · BOOT.DISP)
let IDX_G = [], moreP = null, idxP = null;
function afterIdx() {   // 목록이 도착했을 때 치는 중이던 칸을 다시 그린다
  const a = document.activeElement;
  if (a?.id === "q" && a.value) showSug();
  if (a?.id === "q2" && a.value) a.oninput?.();
  if (document.getElementById("me_co")?.value) meCoHint();
}
function loadIdx() {
  return idxP = idxP || fetch("data/index.json").then(r => r.json()).then(d => { IDX_G = d.g; Object.entries(d.d || {}).forEach(([k, v]) => DISP.set(k, v)); IDX_S = new Map(d.s ? d.r.map((x, i) => [x[0], SIDO_L["-abcdefghijklmnopq".indexOf(d.s[i])] || ""]) : []); IDX = d.r.map(([n, v, g, a, x]) => [n, v, d.g[g], a, undefined, undefined, x]);
    afterIdx(); }).catch(() => { idxP = null; });
}
// 회사 화면의 '같은 업계 VS 칩'만을 위해 400KB 목록을 받지 않게, 업계마다 큰 회사 5곳만 담은 작은 파일(data/peers.json)을 쓴다 (2026-11-11)
let peersP = null;
const loadPeers = () => peersP = peersP || fetch("data/peers.json").then(r => r.json()).then(d => { Object.entries(d.d || {}).forEach(([k, v]) => { if (!DISP.has(k)) DISP.set(k, v); }); return d.g || {}; }).catch(() => { peersP = null; return {}; });
function loadMore() {
  return moreP = moreP || loadIdx().then(() => fetch("data/index_more.json")).then(r => r.json()).then(d => {
    Object.entries(d.d || {}).forEach(([k, v]) => DISP.set(k, v));
    IDX = IDX.concat(d.r.map(([n, v, g, a, x]) => [n, v, IDX_G[g], a, undefined, undefined, x]));
    afterIdx();
  }).catch(() => { moreP = null; });
}
document.addEventListener("focusin", e => { if (e.target.matches?.("#q, #q2, #me_co")) loadMore(); });
document.addEventListener("input", e => { if (e.target.matches?.("#q, #q2")) loadMore(); });
$("#f").addEventListener("pointerenter", () => loadIdx(), { once: true });
$("#f").addEventListener("touchstart", () => loadIdx(), { once: true, passive: true });
// 검은 띠: 숫자판과 같은 숫자로 자동 갱신 (직무사전·연봉 연구소와 같은 모양)
const TK = {};
function tick() { const f = v => v.toLocaleString("ko-KR");
  const row = [TK.co && `검색 가능 회사 ${f(TK.co)}곳`, TK.judged && `S~F 판정 ${f(TK.judged)}곳`, TK.people && (TK.pu === "번" ? `누적 회사 조회 ${f(TK.people)}번` : `현재까지 ${f(TK.people)}명이 검색`), TK.vs && `최근 7일 매치업 ${TK.vs[0]} vs ${TK.vs[1]} (${f(TK.vs[2])}명)`,
    "잡플래닛·블라인드·캐치 평점", "직급별 연봉 추정", "DART 5개년 재무", "최근 뉴스·AI 영향", "컨설턴트 관점의 Zorro 한마디", "매일 자동 갱신"]
    .filter(Boolean).map(t => `<span>${t}</span>`).join("");
  $("#tick").innerHTML = row + row; }   // 두 번 이어 붙여 끊김 없이 흐르게
{ const N = BOOT.NUM || {};   // 2026-11-11 검색 목록을 안 기다리고 바로 채운다
  if (N.total) { $("#stCo").innerHTML = N.total.toLocaleString("ko-KR") + "<small>곳</small>"; $("#stJudged").innerHTML = N.judged.toLocaleString("ko-KR") + "<small>곳</small>"; TK.co = N.total; TK.judged = N.judged; } }
tick(); basisFill();
// 숫자판 윗선을 제목 둘째 줄('가도 될까요?') 윗선에 맞춘다. 한 단으로 쌓이는 폭(900px 이하)에서는 맞추지 않는다.
function alignStats() { const st = $(".hero .stats"), m = $("#h1m"); if (!st || !m) return;
  st.style.marginTop = "0px"; if (innerWidth <= 900) return;
  st.style.marginTop = Math.max(0, m.getBoundingClientRect().top - st.getBoundingClientRect().top) + "px"; }
alignStats(); addEventListener("resize", alignStats); document.fonts?.ready.then(alignStats);
// 숫자판 '현재까지 검색한 사람' = 누적 (2026-10-20 사용자: 5명 미만이어도 숨기지 않음)
// /top 은 한 번만 부르고 숫자판·많이 본 회사가 같이 쓴다 (2026-10-21)
const topP = API ? fetch(API + "/top").then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null);
topP.then(d => heroTop(d?.top)).catch(() => heroTop(null));
// 2026-11-09 사용자: '검색한 사람' 대신 누적 회사 조회 수 (API 가 아직 옛 버전이면 사람 수 그대로)
topP.then(d => { if (d) { const v = d.views || d.total || d.today, u = d.views ? "번" : "명"; $("#stPeople").innerHTML = v.toLocaleString("ko-KR") + `<small>${u}</small>`; TK.people = v; TK.pu = u; TK.vs = d.vs?.[0]; tick(); } }).catch(() => {});
// 첫 화면 시리즈 (2026-10-28 사용자: 옆으로 넘기는 시리즈물 5개): ① 이번 주 많이 본 TOP 10 ② 무조건 가세요 ③ 가세요 ④ 워라밸 ⑤ 숨은 알짜 중견
// 화면에 보이는 이름은 검색 별칭 첫 번째(에이치디현대중공업 → HD현대중공업)가 있으면 그걸로
//   '삼전'·'현대차' 같은 줄임말은 안 쓰고, 영문이 들어간 정식 표기(SK하이닉스·LG유플러스)일 때만
const serName = n => DISP.get(n) || (BOOT.SER || {})[n] || (IDX.find(r => r[0] === n)?.[3] || "").split(" · ").find(a => /[A-Za-z]/.test(a)) || dn(n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function seriesHtml(top) {
  const all = [...(top.length >= 3 ? [{ k: "hot", t: "이번 주 많이 본 회사 TOP 10", d: "최근 7일 사람들이 가장 많이 찾아본 회사", r: top.slice(0, 10).map(([n, v]) => [n, `이번 주 ${v.toLocaleString("ko-KR")}번 봤어요`]) }] : []),
    ...SERIES.filter(x => x.r.length >= 3).map(x => x.rand ? { ...x, r: shuffle(x.r).slice(0, x.rand) } : x)];   // 2026-11-09 숨은 알짜 중견: 볼 때마다 무작위
  if (!all.length) return "";
  const card = (x, i) => `<article class="ser ser-${x.k}"><p class="no">${String(i + 1).padStart(2, "0")} / ${String(all.length).padStart(2, "0")}</p><h3>${esc(x.t)}</h3><p class="d">${esc(x.d)}</p>
    <ol>${x.r.map(([n, info], j) => `<li><button type="button" data-n="${esc(n)}"><b>${j + 1}</b><span>${esc(serName(n))}${info ? `<small>${esc(info)}</small>` : ""}</span></button></li>`).join("")}</ol></article>`;
  return `<div class="series"><div class="ser-h"><small>조로의 회사 시리즈 · 매주 바뀌어요</small><span class="ser-nav"><button type="button" data-d="-1" aria-label="이전">‹</button><button type="button" data-d="1" aria-label="다음">›</button></span></div>
    <div class="ser-track" tabindex="0">${all.map(card).join("")}</div><div class="ser-dots">${all.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div></div>`;
}
// 카드는 1~8번만 (2026-10-28 사용자): 8번에서 다음 → 1번으로 날아가고, 1번에서 이전 → 8번으로 날아간다 (복사본 카드 없이)
function seriesWire(el) {
  const tr = el.querySelector(".ser-track"); if (!tr) return;
  const dots = [...el.querySelectorAll(".ser-dots i")], cards = [...tr.children], n = cards.length;
  const x0 = () => cards[0].offsetLeft, at = k => cards[k].offsetLeft - x0();
  // 2026-10-29: 카드가 여러 장 보이거나 마지막 카드 위치가 스크롤 끝보다 멀면 8번에서 멈추던 문제 → 끝에 닿으면 마지막 카드로 친다
  const max = () => tr.scrollWidth - tr.clientWidth;
  const cur = () => tr.scrollLeft >= max() - 4 ? n - 1 : cards.reduce((b, c, i) => Math.abs(at(i) - tr.scrollLeft) < Math.abs(at(b) - tr.scrollLeft) ? i : b, 0);
  tr.addEventListener("scroll", () => { const k = cur(); dots.forEach((d, i) => d.classList.toggle("on", i === k)); }, { passive: true });
  const go = d => { const k = cur(), m = max(), t = (k + d + n) % n;
    tr.scrollTo({ left: t === n - 1 ? m : Math.min(at(t), m), behavior: "smooth" }); };   // 8 → 1, 1 → 8 (끝 카드는 스크롤 끝으로)
  let seen = true, pause = 0;
  const hold = () => { pause = Date.now() + 8000; };
  el.querySelectorAll(".ser-nav button").forEach(b => b.onclick = () => { go(Number(b.dataset.d)); hold(); });
  // 저절로 돌기 (2026-10-28 사용자: "1로 돌아가서 2 3 4 5 계속 팽이 돌듯"): 4초마다 다음 카드.
  //   손대면(터치·마우스·키보드) 멈췄다가 8초 뒤 다시, 화면에서 안 보이거나 다른 탭이면 쉰다. '움직임 줄이기' 설정한 사람은 안 돌림
  if (n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ["pointerdown", "wheel", "keydown", "focusin"].forEach(e => tr.addEventListener(e, hold, { passive: true }));
  tr.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") pause = Infinity; });
  tr.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hold(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(tr);
  const timer = setInterval(() => {
    if (!tr.isConnected) return clearInterval(timer);   // 회사 화면으로 넘어가면 끝
    if (seen && !document.hidden && Date.now() > pause) go(1);
  }, 4000);
}
// 첫 화면 두 번째 카드: 판정 분포 + '무조건 가세요' 회사 하나 뽑기 (2026-10-29 사용자: 대결 말고 재밌는 것 하나 더) — 검색 목록(IDX)이 오면 채운다
// 판정별 회사 수는 빌드가 넣는다(VDIST, 숫자만), 뽑기는 이번 주 '무조건 가세요' 시리즈 10곳에서
function basisFill() {   // 2026-11-07 판정 근거 (국민연금 판정이 켜져 있을 때만 BASIS 가 찬다)
  const b = BASIS, box = document.getElementById("stJudgedBox"); if (!box || !b || !Object.keys(b).length || box.classList.contains("jd")) return;
  const rows = [["both", "k1", "재무 + 평점", ""], ["repnps", "k2", "평점 + 국민연금 숫자", "재무 공시 없는 회사"], ["rep", "k6", "평점만", ""], ["finnps", "k3", "재무 + 국민연금 숫자", "공개 평점 없는 회사"], ["fin", "k7", "재무만", ""],
    ["nps", "k4", "국민연금 숫자", "연봉·퇴사율·근속"], ["none", "k5", "판단자료 부족", ""]];
  const etc = b.etc || 0, tot = rows.reduce((a, r) => a + (b[r[0]] || 0), 0) + etc; if (!tot) return;
  const f = x => (x || 0).toLocaleString("ko-KR");
  box.classList.add("jd");
  const dt0 = box.querySelector("dt"), jb = document.createElement("button");   // 2026-11-11 접근성: 펼침 상태(aria-expanded)는 div 가 아니라 단추에
  jb.type = "button"; jb.className = "jdb"; jb.textContent = dt0.textContent; jb.setAttribute("aria-label", "판정 나온 회사, 무엇으로 판정했나 보기"); dt0.textContent = ""; dt0.append(jb);
  box.insertAdjacentHTML("beforeend", `<aside class="basisbox" role="tooltip"><h4>무엇으로 판정했나</h4>
    <span class="bar" aria-hidden="true">${rows.map(r => `<i class="${r[1]}" style="width:${((b[r[0]] || 0) / tot * 100).toFixed(1)}%"></i>`).join("")}</span>
    <ul>${rows.map(r => `<li><i class="${r[1]}"></i><span>${r[2]}${r[3] ? ` <small>${r[3]}</small>` : ""}</span><b>${f(b[r[0]])}</b></li>`).join("")}${etc ? `<li><i></i><span>그 밖 <small>연봉만 등</small></span><b>${f(etc)}</b></li>` : ""}</ul></aside>`);
  // 2026-11-08 사용자(폰): 누르면 숫자판 아래로 펼쳐지며 아래 내용이 밀리고, 스크롤로 화면에서 벗어나면 닫힘. 다시 누르면 접힘
  const mob = document.createElement("div");
  mob.className = "basisbox basismob"; mob.hidden = true; mob.id = "basisMob";
  mob.innerHTML = box.querySelector(".basisbox").innerHTML;
  box.closest("dl").after(mob);
  jb.setAttribute("aria-controls", "basisMob"); jb.setAttribute("aria-expanded", "false");
  const narrow = () => matchMedia("(max-width:900px)").matches;
  box.addEventListener("click", () => { if (!narrow()) return; mob.hidden = !mob.hidden; jb.setAttribute("aria-expanded", String(!mob.hidden)); });
  addEventListener("scroll", () => { if (mob.hidden) return; const r = mob.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) { mob.hidden = true; jb.setAttribute("aria-expanded", "false"); } }, { passive: true });
}
const FUN_ORDER = ["무조건 가세요", "가세요", "조건 보고 가세요", "중립기어", "스펙 보고 결정하세요", "다시 생각해요", "비추예요"];
const FUN_ROWS = [["무조건 가세요"], ["가세요"], ["조건 보고 가세요"], ["중립기어", "스펙 보고 결정하세요"], ["다시 생각해요"], ["비추예요"]];   // 가운데 급은 한 줄 (2026-11-03)
function funFill() {
  const el = document.getElementById("fun"); if (!el) return;
  const c = VDIST, tot = FUN_ORDER.reduce((a, k) => a + (c[k] || 0), 0); if (!tot) { el.remove(); document.querySelector(".hi2")?.classList.add("one"); return; }
  const rc = r => r.reduce((a, k) => a + (c[k] || 0), 0), rl = r => r.length > 1 ? "중립기어 · 스펙 보고" : r[0];
  const mx = Math.max(...FUN_ROWS.map(rc), 1), best = (SERIES.find(x => x.k === "must")?.r || []).map(x => x[0]);
  el.innerHTML = `<small>판정 받은 ${tot.toLocaleString("ko-KR")}곳 중</small><p class="big" style="margin:0"><mark>무조건 가세요</mark>는 단 ${(c["무조건 가세요"] || 0).toLocaleString("ko-KR")}곳</p>
    <ol>${FUN_ROWS.map(r => `<li class="${r[0] === "무조건 가세요" ? "s" : ""}"><span>${esc(rl(r))}</span><span><i style="width:${Math.max(2, rc(r) / mx * 100).toFixed(1)}%"></i></span><em>${rc(r).toLocaleString("ko-KR")}</em></li>`).join("")}</ol>
    ${best.length ? `<button class="roll" type="button">무조건 가세요 회사 하나 뽑기</button>` : ""}`;
  const b = el.querySelector(".roll"); if (b) b.onclick = () => pick(best[Math.floor(Math.random() * best.length)]);
}
// 대결이 4개보다 적으면 이번 주 많이 본 회사끼리 붙여 보기를 채운다 (2026-10-29: 옆 카드와 높이 맞추기)
function sugVs(vs, top) {
  const have = new Set(vs.map(x => [x[0], x[1]].sort().join("~"))), out = [];
  for (let i = 0; i + 1 < top.length && vs.length + out.length < 5; i++) {
    const a = top[i][0], b = top[i + 1][0];
    if (!have.has([a, b].sort().join("~"))) { out.push([a, b]); have.add([a, b].sort().join("~")); i++; }
  }
  return out.length ? `<small class="mu-s">이런 대결도 붙여 보세요</small><ol>${out.map(([a, b]) => `<li><button type="button" data-a="${esc(a)}" data-b="${esc(b)}"><span>${esc(serName(a))} vs ${esc(serName(b))}</span><span>비교 →</span></button></li>`).join("")}</ol>` : "";
}
// 첫 화면은 비워 두고 검색을 유도한다 (주소에 #회사명 이 있을 때만 바로 보여 줌)
const intro = () => { document.body.classList.remove("has-co"); document.getElementById("codock")?.classList.remove("on"); $("#out").innerHTML = `<div class="intro"><div class="pulse" id="pulse"></div></div>`;
  if (!API) { const el = $("#pulse"); if (el) { el.innerHTML = seriesHtml([]); seriesWire(el); el.querySelectorAll("button[data-n]").forEach(b => b.onclick = () => pick(b.dataset.n)); } return; }
  topP.then(d => { const el = $("#pulse"); if (!d || !el) return;
    const vs = d.vs || [], go = (a, b) => { location.hash = encodeURIComponent(a) + "~" + encodeURIComponent(b); };
    const mu = vs.length ? `<div class="mu"><small>최근 7일 가장 많이 붙은 대결</small>
      <button class="vs1" type="button" data-a="${esc(vs[0][0])}" data-b="${esc(vs[0][1])}"><span>${esc(vs[0][0])}</span><i>VS</i><span>${esc(vs[0][1])}</span></button>
      <p>최근 7일 동안 <b>${vs[0][2].toLocaleString("ko-KR")}명</b>이 이 두 회사를 놓고 고민했어요. 눌러서 바로 비교해 보세요.</p>
      ${vs.length > 1 ? `<ol>${vs.slice(1).map((x, i) => `<li><button type="button" data-a="${esc(x[0])}" data-b="${esc(x[1])}"><span><b>${i + 2}</b>${esc(x[0])} vs ${esc(x[1])}</span><span>${x[2].toLocaleString("ko-KR")}명</span></button></li>`).join("")}</ol>` : ""}${sugVs(vs, d.top || [])}</div>` : "";
    el.innerHTML = `<div class="hi2${mu ? "" : " one"}">${mu}<div class="fun" id="fun"></div></div>` + seriesHtml(d.top || []);
    funFill();
    seriesWire(el);
    el.querySelectorAll("button[data-n]").forEach(b => b.onclick = () => pick(b.dataset.n));
    el.querySelectorAll("button[data-a]").forEach(b => b.onclick = () => go(b.dataset.a, b.dataset.b)); }).catch(() => {}); };
// 오늘 처음 들어온 방문만 한 번 기록
try { if (API && !sessionStorage.getItem("cc-visit")) { sessionStorage.setItem("cc-visit", "1"); ev("visit"); } } catch (e) {}
// ---- 내 상황 (2026-10-27) ------------------------------------------------
// 왼쪽 창에 한 번 넣어 두면(이 기기 localStorage 'cc-me') 회사 화면마다 '내 상황이라면' 카드가 붙는다.
// 판정은 fit_engine.js(F 규칙, 조로 상담 사례 45개로 맞춤). 갈 회사 쪽 값은 이 회사 자료에서 채운다:
//   규모 = 직원 수(1천 명 이상 대기업·300명 이상 중견), 업종 = 업계 묶음, 연봉 = 내 연차에 맞는 직급 추정 연봉, 평점 = 평판 종합 점수
const ME_SIZES = ["대기업", "금융", "중견", "중소", "외국계", "공기업·공공", "스타트업"];
const ME_INDS = ["반도체·전자", "자동차·부품", "조선·기계·장비", "화학·소재·에너지", "2차전지", "제약·바이오·의료기기", "식품 제조", "화장품·생활용품", "섬유·의복·패션",
  "건설·부동산", "유통·커머스", "물류·운송·항공", "은행·증권·보험", "게임", "게임·소프트웨어", "통신·미디어·광고", "컨설팅·전문서비스", "인력·사업지원 서비스",
  "호텔·외식·레저", "병원·의료", "교육", "공공기관·공단", "기타"];
const ME_WLB = ["칼퇴", "보통", "야근 잦음", "매일 야근"];
const ME_PLACES = ["서울 본사", "수도권", "지방 본사", "지방 공장·산단", "지방 현장 순환"];   // 2026-11-04 사용자: 본사를 서울·지방 두 가지로 ('지방' → '지방 본사')
let ME = (() => { try { return JSON.parse(localStorage.getItem("cc-me") || "null"); } catch (e) { return null; } })();
if (ME?.place === "지방") ME.place = "지방 본사";   // 예전에 저장한 값
let meCo = null;           // 지금 화면의 회사
const meOver = {};         // 회사별로 카드에서 고친 값 {salary, place, size}

// 엔진에 넘길 업종 말: 업계 묶음 이름을 F 규칙이 알아듣는 말로 (예: 게임·소프트웨어 → 게임만 전망 나쁨이라 '소프트웨어'로)
const GAME_CO = new Set(["111퍼센트", "게임덱스", "게임듀오", "그라비티", "그레이게임즈", "네오위즈", "네오플", "넥슨게임즈", "넥슨네트웍스", "넥슨코리아", "넵튠", "넷마블", "넷마블네오", "넷마블넥서스", "넷마블몬스터", "넷마블에프앤씨", "넷마블엔투", "니즈게임즈", "님블뉴런", "더블유게임즈", "데브시스터즈 (Devsisters Corp.)", "데브캣", "드래곤플라이", "라이엇게임즈코리아", "라이온하트스튜디오", "라이징윙스", "라인게임즈", "레드랩게임즈", "레드징코게임즈", "렐루게임즈", "로드컴플릿", "룬샷게임즈", "링게임즈", "매드엔진", "모비릭스", "미스틸게임즈(Mistil Games. LTD.)", "민트로켓", "밸로프", "붐잇게임즈", "블루포션게임즈", "블루홀스튜디오", "블리자드엔터테인먼트", "빅게임스튜디오", "빅파이어게임즈", "빌리네어게임즈", "세븐티세븐스트리트게임즈", "슈퍼캣", "스마일게이트", "시프트업", "신지게임즈", "아이덴티티게임즈", "아이엠씨게임즈", "액토즈소프트", "어썸피스", "에이블게임즈", "에이시티게임즈", "에이엔게임즈", "엑스엘게임즈", "엔드림", "엔씨", "엔씨큐에이", "엔엑스쓰리게임즈", "엔픽셀", "엠게임", "오븐게임즈", "웹젠", "웹젠레드스타", "위메이드맥스", "위메이드커넥트", "위메이드플레이", "이스트게임즈", "이안게임즈", "조이시티", "카카오게임즈", "컴투스", "컴투스플랫폼", "컴투스홀딩스", "코그노스피어코리아", "쿡앱스", "크래프톤", "파우게임즈", "퍼스트스파크게임즈", "펄어비스", "폴스타게임즈", "플라이웨이게임즈", "플레이위드게임즈", "하운드13", "한빛소프트", "（주）공게임즈", "（주）나딕게임즈", "（주）아름게임즈", "（주）에피드게임즈"]);   // 게임사 이름 (config game_companies, build.py 가 넣음)
function engInd(g, detail, name) {
  if (/전지|축전/.test(detail || "") || g === "2차전지") return "2차전지";
  if (g === "게임" || GAME_CO.has(name)) return "게임";
  if (g === "게임·소프트웨어") return /게임/.test(detail || "") ? "게임" : "소프트웨어";
  if (g === "화학·소재·에너지") return "화학·소재";
  if (g === "건설·부동산") return "건설";
  return g || "";
}
// 11-12 사용자 "업황 꺾임은 화학에만, 소재랑 에너지는 빼기": '화학·소재·에너지' 묶음 안 회사를 세부 업종 이름(국민연금 업종)으로 가른다
//   화학 = 화학물질·화학제품을 만드는 곳(기초 유기·무기화학, 합성수지·합성고무, 도료, 비료·농약, 산업용 가스, 세제 등)
//   에너지 = 발전·원자력·연료용 가스·원유·정제·연료 판매, 발전 설비 정비
//   소재 = 그 밖 전부(철강·비철·금속 가공, 유리·시멘트, 플라스틱·고무 가공제품, 화학섬유 직조 등)
//   돌려주는 값: 이 묶음이 아니면 undefined, 세부 업종을 모르면 "모름"(업황을 말하지 않음)
const IND_CHEM = /화학|합성수지|합성고무|플라스틱 (소재 )?물질|도료 및 관련|비료|농업용 약제|산업용 가스|세제|감광|안료/, IND_CHEM_NOT = /직조|방적|성형기|연구개발/;
const IND_ENERGY = /발전업|발전 설비|원자력|연료용 가스|가스집단|가스 충전|원유|천연가스|연료 소매|송전|배전|정제/;
function indSub(g, detail) {
  if (g !== "화학·소재·에너지") return undefined;
  if (!detail || /업종 정보 없음/.test(detail)) return "모름";
  // 11-13 사용자: 플라스틱·고무 가공제품(포장 용기·창호·합성피혁 등)은 화학은 아니지만 업황이 안 좋은 건 같으니 따로 '플라스틱·고무 제품'으로 두고 업황 꺾임을 건다
  return IND_CHEM.test(detail) && !IND_CHEM_NOT.test(detail) ? "화학" : /플라스틱|고무|합성피혁/.test(detail) && !IND_CHEM_NOT.test(detail) ? "플라스틱·고무 제품" : IND_ENERGY.test(detail) ? "에너지" : "소재";
}
// 화면에 보이는 업계 이름: '게임·소프트웨어' 묶음을 그대로 쓰면 IT 솔루션 회사도 게임사처럼 보여서 (트러스테이 2026-10-27) 게임사만 '게임'
function grpName(s, name) {
  if (s?.group !== "게임·소프트웨어") return s?.group || "";
  return engInd(s.group, s.industry, name) === "게임" ? "게임" : "IT·소프트웨어";
}
// 2026-11-13 사용자: "대기업의 기준은 직원이 아니야 … 상호출자제한기업집단" → 회사 급을 공정위 지정 기업집단으로 가른다
//   FTC = build.py 가 넣는 표 { m: 상호출자제한기업집단 마지막 순위(2026년 47), asof: 지정일, g: {순위: 집단 이름}, c: {회사 이름: 집단 순위} }
//         (data/ftc_groups_2026.json 의 계열회사 3,538곳을 ftc_groups.py 가 우리 회사 이름과 맞춘 것)
//   대기업 = 상호출자제한기업집단(자산 12조 원 이상, 1~47위) 계열사 — 직원이 30명이어도 대기업, 직원이 1만 명이어도 계열사가 아니면 대기업 아님
//   중견   = 공시대상기업집단(자산 5조 원 이상, 48위~) 계열사 / 그 밖에는 최근 매출 1,000억 원 이상이거나 자산 5,000억 원 이상(중견기업 기준에 가깝게)
//            재무 자료가 없는 회사는 전처럼 직원 300명 이상
//   중소   = 나머지.  공기업·금융(평균 연봉 기준)·스타트업 갈래는 그대로
//   표가 비어 있으면(옛 빌드) 예전 직원 수 기준으로 돌아간다
// 2026-11-14 사용자: "공시기업집단 … 그것도 대기업으로" → 대기업 = 공시대상기업집단(1~102위) 계열사 전부. 집단 밖 회사는 매출이 아무리 커도 중견까지
//   FTC.p = 알리오에 경영 공시를 하는 공공기관 이름 { 이름: 1 } — 업계 묶음이 '공공'이 아니어도 공기업·공공 갈래로 (한국수력원자력·한전KPS·강원랜드·한국마사회, 사용자 11-14)
const FTC = {"m":47,"asof":"2026-05-01","g":{"1":"삼성","2":"에스케이","3":"현대자동차","4":"엘지","5":"한화","6":"롯데","7":"포스코","8":"HD현대","9":"농협","10":"지에스","11":"신세계","12":"한진","13":"케이티","14":"엘에스","15":"씨제이","16":"카카오","17":"에이치엠엠","18":"두산","19":"셀트리온","20":"네이버","21":"중흥건설","22":"쿠팡","23":"에쓰-오일","24":"DL","25":"영풍","26":"미래에셋","27":"현대백화점","28":"효성","29":"하림","30":"부영","31":"한국앤컴퍼니그룹","32":"장금상선","33":"호반","34":"케이씨씨","35":"에이치디씨","36":"SM","37":"DB","38":"케이티앤지","39":"코오롱","40":"넥슨","41":"두나무","42":"교보생명보험","43":"엘엑스","44":"오씨아이","45":"넷마블","46":"세아","47":"다우키움","48":"태광","49":"한국지엠","50":"이랜드","51":"에코프로","52":"소노인터내셔널","53":"한국항공우주산업","54":"대방건설","55":"금호석유화학","56":"태영","57":"삼천리","58":"동원","59":"HL","60":"KG","61":"라인","62":"크래프톤","63":"엘아이지","64":"아모레퍼시픽","65":"엠디엠","66":"글로벌세아","67":"BS","68":"동국제강","69":"대신","70":"애경","71":"유진","72":"삼양","73":"중앙","74":"한국교직원공제회","75":"고려에이치씨","76":"빗썸","77":"BGF","78":"웅진","79":"반도홀딩스","80":"오케이금융그룹","81":"대광","82":"현대해상화재보험","83":"농심","84":"쉴더스","85":"DN","86":"사조","87":"파라다이스","88":"하이트진로","89":"하이브","90":"대명화학","91":"한솔","92":"신영","93":"삼표","94":"토스","95":"유코카캐리어스","96":"한국콜마","97":"원익","98":"희성","99":"오리온","100":"QCP그룹(舊 큐로홀딩스)","101":"아이에스지주","102":"일진글로벌"},"c":{"CJ CGV":15,"CJ씨푸드(주）":15,"CJ푸드빌":15,"DBCSI손해사정":37,"DB생명보험（주）":37,"DB캐피탈":37,"DB하이텍":37,"DL케미칼":24,"GS구미열병합발전":10,"GS글로벌":10,"GS리테일":10,"GS반월열병합발전":10,"GS스포츠":10,"GS엠비즈":10,"GS칼텍스":10,"GS풍력발전":10,"HDC현대EP":35,"HD현대마린엔진":8,"HD현대에너지솔루션":8,"HD현대크랭크샤프트":8,"KG제로인":60,"LG스포츠":4,"LG헬로비전":4,"LS오토모티브테크놀로지스":14,"LS증권":14,"LX 엠엠에이":43,"LX인터내셔널":43,"NH저축은행":9,"OCISE":44,"PNR":7,"SBI 저축은행":42,"SK":2,"SKC":2,"SK네트웍스":2,"SK네트웍스서비스":2,"SK네트웍스（주）워커힐":2,"SK바이오텍":2,"SK바이오팜（주）":2,"SK브로드밴드":2,"SK쉴더스":84,"SK에너지":2,"SK이노베이션":2,"SK인천석유화학":2,"SK인텔릭스":2,"SM벡셀배터리사업부문":36,"가온전선":14,"강원도시가스":2,"강원여객자동차":37,"강원일보":37,"갤럭시아머니트리":28,"갤럭시아에스엠":28,"게티이미지코리아":47,"경기관광개발":81,"경남기업":36,"경원건설":10,"경평물류":32,"고려사일로（주）":75,"고려아연":25,"고려에프앤에프":90,"고려저축은행":48,"고려종합국제운송":75,"고려해운":75,"고메드갤러리아":5,"공영홈쇼핑":9,"광양항서부컨테이너터미널":32,"광영토건":30,"광주신세계":11,"광주일보사":28,"교보다솜케어":42,"교보디티에스":42,"교보라이프플래닛생명보험":42,"교보리얼코":42,"교보문고":42,"교보생명보험":42,"교보악사자산운용":42,"교보에이아이엠자산운용":42,"교보자산신탁":42,"교보증권":42,"국양로지텍":32,"굿닥":97,"굿앤파트너스":71,"그린가스솔루션이앤씨":14,"그린나래":39,"그린누리":43,"그린산업":33,"그린에어":3,"그린웹서비스":20,"그린위드":6,"그린카":6,"그린파트너즈":64,"글래드 호텔앤리조트 글래드호텔 여의도":24,"글래드 호텔앤리조트 메종 글래드 제주":24,"글래드호텔앤리조트 글래드코엑스센터":24,"글로벌세아":66,"글링크미디어":16,"금강레저":34,"금성개발":57,"금호리조트":55,"금호리조트 설악":55,"금호리조트 화순":55,"금호리조트（주）":55,"금호미쓰이화학":55,"금호석유화학":55,"금호석유화학（주）LATEX공장":55,"금호티앤엘":55,"금호폴리켐":55,"금호폴리켐 여수공장":55,"금호피앤비화학":55,"기아":3,"기아타이거즈":3,"김포골드라인에스알에스":3,"나눔누리":4,"나래에너지서비스":2,"나인비스튜디오":62,"나주관광개발":21,"나주관광개발 중흥골드스파&리조트":21,"남도일보":21,"남부산업":71,"남선알미늄":36,"내트럭":2,"네오트랜스":100,"네오플":40,"네이버":20,"네이버랩스":20,"네이버아이앤에스":20,"네이버웹툰":20,"네이버제트":20,"네이버클라우드":20,"네이버파이낸셜":20,"네이버핸즈":20,"넥스트로":58,"넥슨게임즈":40,"넥슨네트웍스":40,"넥슨스페이스":40,"넥슨에이치큐":40,"넥슨유니버스":40,"넥슨코리아":40,"넵튠":62,"넷마블":45,"넷마블네오":45,"넷마블넥서스":45,"넷마블몬스터":45,"넷마블에프앤씨":45,"넷마블엔투":45,"녹색자원":97,"농심":83,"농심개발":83,"농심미분":83,"농심엔지니어링":83,"농심이스포츠":83,"농심태경":83,"농업협동조합자산관리회사":9,"농업회사법인 농협식품":9,"농업회사법인 농협양곡":9,"농업회사법인 사조원":86,"농업회사법인 사조원 나주공장":86,"농업회사법인 사조프레시미트":86,"농업회사법인 순우리":29,"농업회사법인 엔에이치농우바이오":9,"농업회사법인 오설록농장":64,"농업회사법인 팜스코바이오인티":29,"농업회사법인오리온농협":9,"농협경제지주":9,"농협금융지주":9,"농협네트웍스":9,"농협목우촌":9,"농협물류":9,"농협사료":9,"농협생명보험":9,"농협손해보험":9,"농협유통":9,"농협은행":9,"농협정보시스템":9,"농협케미컬":9,"농협파트너스":9,"농협홍삼":9,"뉴런엔지니어링":37,"님블뉴런":62,"다온크리에이티브":16,"다우기술":47,"다우데이타":47,"대광건영":81,"대농어패럴":92,"대림":24,"대명건설":52,"대명화학":90,"대방건설":54,"대방산업개발":54,"대신경제연구소":69,"대신에이엠씨":69,"대신에프앤아이":69,"대신자산신탁":69,"대신자산운용":69,"대신저축은행":69,"대신증권":69,"대아청과":33,"대우건설":21,"대우송도호텔":21,"대우에스티":21,"대원강업":27,"대원정밀공업":27,"대일시스템":54,"대전신세계":11,"대한상선":36,"대한송유관공사":2,"대한저축은행":81,"대한전선":33,"대한항공":12,"대한해운":36,"대한해운엘엔지":36,"대한화섬":48,"대홍기획":6,"대화도시가스":30,"더금융서비스":90,"더블유제이노체앤코-TM웨딩시티":78,"더블유제이노체앤코-그랜드힐컨벤션":78,"더블유제이노체앤코":78,"더블저축은행":61,"더케이교직원나라":74,"더케이소피아그린":74,"더케이예다함":74,"더케이저축은행":74,"더케이제주호텔":74,"더케이호텔앤리조트":74,"더프라자":86,"데브캣":40,"돌고래유괴단":16,"동국시스템즈":68,"동국씨엠":68,"동국제강":68,"동국홀딩스":68,"동성제약":48,"동아건설산업":36,"동양":71,"동양건설산업":61,"동양관광레저":61,"동원건설산업":58,"동원글로벌터미널부산":58,"동원로엑스":58,"동원로엑스 _PL지사":58,"동원로엑스냉장":58,"동원로엑스냉장투":58,"동원산업":58,"동원시스템즈 양재사무소":58,"동원씨앤에스":58,"동원에프앤비":58,"동원에프앤비 광주공장":58,"동원에프앤비 진천2공장":58,"동원에프앤비아산공장":58,"동원에프앤비진천공장":58,"동원에프앤비창원공장":58,"동원팜스":58,"동원페이퍼 정읍공장":66,"동원홈푸드":58,"동원홈푸드 FS":58,"동주":34,"동화기업":71,"두나무":41,"두나무씨엑스 (DunamuCX Inc.)":41,"두산":18,"두산건설":100,"두산경영연구원":18,"두산로보틱스":18,"두산로지스틱스솔루션":18,"두산모트롤":18,"두산밥캣":18,"두산밥캣코리아":18,"두산베어스":18,"두산에너빌리티":18,"두산에이치투이노베이션":18,"두산전자사업부":18,"두산큐벡스":18,"두산큐벡스 FM사업부":18,"두산큐벡스 서울BSC":18,"두산테스나":18,"두산퓨얼셀 (DoosanFuelCellCo. Ltd.)":18,"드림에이지":89,"드림위더스":16,"디렉스폴리머":24,"디비건설":54,"디비글로벌칩":37,"디비손해보험":37,"디비씨앤에스자동차손해사정":37,"디비씨에이에스손해사정":37,"디비아이엔씨(DB Inc.)":37,"디비월드":37,"디비자동차보험손해사정":37,"디비자산운용":37,"디비저축은행":37,"디비증권":37,"디아이웨어":15,"디앤디인베스트먼트":2,"디앤디프라퍼티솔루션":2,"디앤오":4,"디앤오씨엠":4,"디앤케이켐텍":55,"디어유":16,"디에이피":90,"디엑스이":15,"디엔솔루션즈":85,"디엔오토모티브":85,"디엔오토모티브 양산2공장":85,"디엔오토모티브 양산3공장":85,"디엔오토모티브 양산4공장":85,"디엔오토모티브 울산1공장":85,"디엔오토모티브 울산2공장":85,"디엔오토모티브 진주공장":85,"디엘":24,"디엘건설":24,"디엘모터스":24,"디엘에프엔씨":24,"디엘이앤씨":24,"디엠씨미디어":56,"디케이관광개발":81,"디케이씨":14,"디케이테크인":16,"디코드컴퍼니":90,"디티알":85,"디플래닉스":42,"딜로퀘스트":40,"딜리박스중앙":73,"떠나요":22,"라이온하트스튜디오":16,"라이징윙스":62,"라이트브레인":4,"라인건설":61,"라인게임즈":20,"라인넥스트":20,"라인산업":61,"라인스튜디오":20,"라인파이낸셜":20,"라인페이플러스":20,"라인프렌즈스퀘어":20,"라인플러스":20,"람다256":41,"레디엔터테인먼트":16,"레시피그룹（recipegroupco．，ltd）":90,"레이어":90,"레진엔터테인먼트（LEZHINEnt．）":47,"렉스필드컨트리클럽":78,"렐루게임즈":62,"로보스타":4,"로제비앙건설":81,"로젠":90,"로템에스알에스":3,"로템에스알에스 신림선":3,"롯데건설":6,"롯데광주씨케이":6,"롯데글로벌로지스":6,"롯데렌탈":6,"롯데멤버스":6,"롯데면세점제주":6,"롯데물산":6,"롯데미래전략연구소":6,"롯데바이오로직스":6,"롯데베르살리스 엘라스토머스":6,"롯데부산씨케이":6,"롯데상사":6,"롯데쇼핑":6,"롯데아사히주류":6,"롯데알미늄":6,"롯데알미늄 기공사업본부":6,"롯데에너지머티리얼즈":6,"롯데에코월":6,"롯데엔지니어링플라스틱":6,"롯데엠시시":6,"롯데오토리스":6,"롯데오토케어":6,"롯데용인씨케이":6,"롯데웰푸드":6,"롯데이노베이트":6,"롯데인프라셀":6,"롯데자이언츠":6,"롯데정밀화학":6,"롯데제이티비":6,"롯데지알에스":6,"롯데지알에스 KKD사업부문":6,"롯데지알에스 빌라드샬롯":6,"롯데지에스화학":6,"롯데지에프알":6,"롯데지주":6,"롯데칠성음료":6,"롯데칠성음료(주）주류비지":6,"롯데캐피탈":6,"롯데컬처웍스":6,"롯데케미칼":6,"롯데테크":6,"롯데패키징솔루션즈":6,"롯데평택씨케이":6,"롯데하이마트":6,"롯데호텔에이치엠":6,"룬샷게임즈":62,"리가켐바이오사이언스":99,"링키지랩":16,"마뗑킴":90,"마이금융파트너":82,"마이스터모터스":28,"마인드노크":2,"마켓보로":15,"만도브로제":59,"멀티캠퍼스":1,"메가마트":83,"메가박스중앙":73,"메가슈플렉스에스마켓코리아":90,"메인트란스":3,"메타보라":16,"명성라이픽스":63,"모다이노칩":90,"모델솔루션（주）":31,"모두락":70,"모멘티브테크놀로지스코리아":97,"모보":14,"모비언트":3,"모아빛":3,"모트라스":3,"목포신항만운영（주）":59,"무주덕유산리조트":30,"문피아":20,"미디어로그":4,"미디어웹":45,"미디어프린팅넷（주）":73,"미라콤아이앤씨":1,"미래":34,"미래로시스템":1,"미래에셋금융서비스":26,"미래에셋생명보험":26,"미래에셋자산운용":26,"미래에셋증권":26,"미래에셋캐피탈":26,"미래에셋컨설팅（주）서울지점":26,"미래엠":4,"민트로켓":40,"민팃":2,"바비톡":97,"바스칸바이오제약":99,"바운스":101,"바이버":41,"반도건설":79,"반도홀딩스":79,"밝은누리":4,"백학음료":6,"베러스쿱크리머리":5,"베스트엔지니어링":93,"베스트토요타":14,"베어로보틱스코리아":4,"베어링아트":102,"보령엘엔지터미널":10,"보문개발":67,"보이스루":16,"부광약품":44,"부국사료":86,"부산글로벌빌리지":21,"부산도시가스":2,"부산롯데호텔":6,"부산롯데호텔 (기간제)":6,"부산이앤이":7,"부산컨테이너터미널":35,"부영":30,"분크":90,"브랜드웍스코리아 (BRANDWORKS KOREA INC.)":15,"브랜드유니버스":90,"브이씨엔씨":94,"브이엔티지":46,"브이피":13,"블랑제리길":63,"블루원":56,"블루월넛":3,"블루헤런":88,"블루홀스튜디오":62,"비렉스테크 (BEREX Tech co. Ltd)":45,"비바웨이브":4,"비씨카드":13,"비아이디씨":58,"비에스산업":67,"비에스엠":10,"비에스지파트너스 (BSG PARTNERS Co. Ltd.)":43,"비에스한양":67,"비에이엔터테인먼트":73,"비에이치엔터테인먼트":16,"비이피씨탄젠트":15,"비즈테크아이":4,"비즈테크온":4,"비지에프":77,"비지에프리테일":77,"비지에프에코머티리얼즈":77,"비지에프에코사이클":77,"비지에프에코스페셜티":77,"비지에프푸드":77,"비지에프휴먼넷":77,"빅히트뮤직(BIGHITMUSICCO. LTD)":89,"빌리프랩":89,"빗썸":76,"빗썸서비스":76,"사람인":47,"사람인에이치에스":47,"사조대림":86,"사조대림안산공장":86,"사조대림인천공장":86,"사조대림칠서공장":86,"사조동아원":86,"사조산업":86,"사조시스템즈":86,"사조씨앤씨":86,"사조씨푸드":86,"사조씨피케이":86,"사조오양":86,"사조오양양산공장":86,"사조오양평택공장":86,"사조푸디스트":86,"산청음료":6,"삼강에스앤씨":2,"삼남석유화학 여수공장":72,"삼동흥산":37,"삼성SDI":1,"삼성글로벌리서치":1,"삼성금거래소":33,"삼성노블라이프":1,"삼성디스플레이":1,"삼성라이온즈":1,"삼성메디슨":1,"삼성물산":1,"삼성바이오로직스":1,"삼성바이오에피스":1,"삼성벤처투자":1,"삼성생명금융서비스":1,"삼성생명보험":1,"삼성생명서비스손해사정":1,"삼성선물":1,"삼성액티브자산운용":1,"삼성에스디에스":1,"삼성에스알에이자산운용":1,"삼성웰스토리 FS":1,"삼성웰스토리（주）":1,"삼성이앤에이":1,"삼성자산운용":1,"삼성전기":1,"삼성전자":1,"삼성전자로지텍":1,"삼성전자서비스":1,"삼성전자서비스씨에스":1,"삼성전자판매":1,"삼성중공업":1,"삼성증권":1,"삼성카드":1,"삼성카드고객서비스":1,"삼성코닝어드밴스드글라스":1,"삼성화재금융서비스보험대리점":1,"삼성화재서비스손해사정":1,"삼성화재애니카손해사정":1,"삼성화재해상보험":1,"삼아벤처":86,"삼양데이타시스템":72,"삼양바이오팜":72,"삼양씨앤씨":16,"삼양엔씨켐":72,"삼양이노켐":72,"삼양인터내셔날":10,"삼양케이씨아이":72,"삼양패키징광혜원공장":72,"삼양패키징대전2공장":72,"삼양홀딩스":72,"삼양화성":72,"삼양화인테크놀로지":72,"삼원강재":27,"삼척블루파워":7,"삼천리":57,"삼천리모터스":57,"삼천리이브이":57,"삼천리이에스":57,"삼천리이엔지":57,"삼천리자산운용":57,"삼표레미콘":93,"삼표레일웨이":93,"삼표시멘트":93,"삼표에스앤씨":93,"삼표자원개발":93,"삼표피앤씨":93,"삼표해운":93,"삼해상사":15,"삼환기업":36,"상지해운":10,"서비스에이스":2,"서비스탑":2,"서영이앤티":88,"서울레이크사이드":1,"서울복합물류자산관리":6,"서울신문사":33,"서울아레나":16,"서울제약":100,"선우":14,"선진":29,"선진FS":29,"선진햄":29,"성경식품(1공장)":57,"성경식품제2공장":57,"세메스":1,"세아네트웍스":46,"세아베스틸":46,"세아베스틸지주":46,"세아상역":66,"세아씨엠":46,"세아엘앤에스":46,"세아엠앤에스":46,"세아제강":46,"세아제강지주":46,"세아창원특수강":46,"세아특수강":46,"세아특수강충주2공장":46,"세아항공방산소재":46,"세아홀딩스":46,"세우":83,"세종전선":14,"센트럴모터스（주）":10,"셀론텍":79,"셀트리온":19,"셀트리온스킨큐어":19,"셀트리온제약":19,"소노스퀘어":52,"소노스테이션":52,"소노인터내셔널":52,"소노인터내셔널 거제지점":52,"소노인터내셔널 경주지점":52,"소노인터내셔널 고양지점":52,"소노인터내셔널 남해지점":52,"소노인터내셔널 단양지점":52,"소노인터내셔널 변산지점":52,"소노인터내셔널 삼척지점":52,"소노인터내셔널 서울지점":52,"소노인터내셔널 양양지점":52,"소노인터내셔널 양평지점":52,"소노인터내셔널 여수지점":52,"소노인터내셔널 제주지점":52,"소노인터내셔널 진도지점":52,"소노인터내셔널 천안지점":52,"소노인터내셔널 청송지점":52,"소노인터내셔널서귀포지점":52,"소노인터내셔널설악지점":52,"소노파트너스":52,"소프트원":63,"솔머티리얼즈":91,"송도개발피엠씨":7,"송림에프에스":15,"쇼노트":16,"쇼박스":99,"수소에너지네트워크":3,"숲엔터테인먼트":16,"슈퍼어썸":20,"슈퍼코믹스스튜디오":16,"슈퍼트레인":39,"스노우":20,"스마일위드":6,"스마일페이먼츠":11,"스마트로":13,"스위트위드":6,"스타쉽엔터테인먼트":16,"스타트럭코리아":28,"스테코":1,"스튜디오드래곤":15,"스튜디오리코":20,"스튜디오슬램":73,"스튜디오에스":56,"스튜디오일육일":56,"스튜디오제이에이치에스":20,"스튜디오좋":16,"스튜디오프리즘 제작사업부문":56,"스틸싸이클":25,"스틸싸이클에스씨":25,"스푼":6,"시그네틱스":25,"시노코쉽매니지먼트":32,"시노코페트로케미컬":32,"시큐아이":1,"신공항하이웨이":74,"신도":61,"신동진":28,"신라에이치엠":1,"신선대감만터미널":32,"신성자동차":28,"신세계":11,"신세계건설":11,"신세계까사":11,"신세계까사(자주본부)":11,"신세계디에프":11,"신세계라이브쇼핑":11,"신세계사이먼":11,"신세계센트럴":11,"신세계아이앤씨":11,"신세계야구단":11,"신세계인터내셔날":11,"신세계톰보이":11,"신세계푸드":11,"신영":92,"신영씨앤디":92,"신원산업":61,"신한벽지":34,"신화인터텍":28,"십일번가":2,"싱그린에프에스":29,"쌍용건설":66,"써브라임":73,"쏘스뮤직":89,"쓰리에이미디어":78,"씨마크서비스":8,"씨브이네트":1,"씨브이파트너스":4,"씨에스리더":4,"씨에스리더 대전고객센터":4,"씨에스에코":71,"씨에스원 파트너":4,"씨에이치음료":6,"씨엑스솔루션":14,"씨엔에스푸드시스템":27,"씨엠에스랩":97,"씨제이":15,"씨제이대한통운":15,"씨제이대한통운(주）건설부문":15,"씨제이메조미디어":15,"씨제이바이오사이언스":15,"씨제이씨지브이":15,"씨제이올리브네트웍스":15,"씨제이올리브영":15,"씨제이올리브영 -비정규":15,"씨제이웰케어":15,"씨제이이엔엠":15,"씨제이이엔엠스튜디오스":15,"씨제이제일제당（주）":15,"씨제이텔레닉스":15,"씨제이포디플렉스":15,"씨제이프레시웨이":15,"씨케이":25,"씨텍":4,"씨티씨":46,"씨피엘비":22,"아름누리":4,"아름덴티스트리":31,"아름일렉트로닉스":31,"아모레퍼시픽홀딩스":64,"아모스프로페셔널":64,"아비커스":8,"아시아나IDT":12,"아시아나에어포트":12,"아시아나항공":12,"아영":67,"아워홈":5,"아이샵케어":94,"아이앤에스":101,"아이앤케이신항만":68,"아이에스동서":101,"아이에스시":2,"아이에스에코솔루션":101,"아이에프씨그룹":5,"아이지에스":45,"아이파크현대산업개발":35,"아이파킹":2,"아이피엑스":20,"아인텔레서비스":4,"아주스틸":68,"아쿠아플라넷":5,"아쿠아플라넷 광교":5,"아쿠아플라넷 여수":5,"아쿠아플라넷 일산":5,"아쿠아플라넷 제주":5,"아크로스":10,"아프로신용정보":80,"아프로에프앤아이대부":80,"안산도시개발":57,"안테나":16,"알리익스프레스코리아":11,"애경바이오팜":70,"애경산업":48,"애경스페셜티":70,"애경케미칼":70,"애그리로보텍":29,"애드이피션시":47,"애드커넥스":82,"애커튼테크놀로지서비스":2,"앤유":67,"야나두":16,"어도어(ADORCo. Ltd.)":89,"어뮤즈코리아":11,"어센틱금융그룹":90,"언코어":73,"에너지머티리얼즈 (Energy Materials Corp.)":10,"에뛰드":64,"에비오시스 테크놀러지스":53,"에스디플렉스":1,"에스비에스":56,"에스비에스미디어넷":56,"에스비에스아이":56,"에스비에스엠앤씨":56,"에스비티엠 (SBTMCorporation)":1,"에스씨에스":78,"에스씨케이컴퍼니":11,"에스아이티테크":5,"에스앤에이":66,"에스앤케이항공（주）":53,"에스에스지닷컴":11,"에스에스지페이먼츠":11,"에스에이치피코퍼레이션":1,"에스엔에이시스템":66,"에스엔엔씨":7,"에스엘엘중앙":73,"에스엠라이프디자인그룹":16,"에스엠벡셀":36,"에스엠상선":36,"에스엠상선 부산영업소":36,"에스엠상선 한국지점":36,"에스엠스틸 -신촌사업장":36,"에스엠스틸 제조부문":36,"에스엠신용정보":36,"에스엠엔터테인먼트":16,"에스엠인더스트리":36,"에스엠인더스트리 오토모티브사업부":36,"에스엠인더스트리 케미칼사업부":36,"에스엠중공업":36,"에스엠컬처앤콘텐츠":16,"에스엠컬처앤콘텐츠 광고사업부문":16,"에스엠컬처앤콘텐츠 에스엠타운트래블":16,"에스엠피엠씨":11,"에스엠하이플러스":36,"에스엠화진":36,"에스와이티에스 (SYTS Corp.)":10,"에스원":1,"에스원씨알엠（주）":1,"에스지생활안전":15,"에스지서비스":47,"에스지씨그린파워":44,"에스지씨솔루션":44,"에스지씨솔루션 논산공장":44,"에스지씨솔루션 천안유리공장":44,"에스지씨에너지 군산사업부문":44,"에스지씨이앤씨":44,"에스케이가스":2,"에스케이가스（주）지허브":2,"에스케이넥실리스":2,"에스케이넥실리스 정읍공장":2,"에스케이디스커버리":2,"에스케이디앤디":2,"에스케이레조낙":2,"에스케이리비오":2,"에스케이머티리얼즈제이엔씨":2,"에스케이머티리얼즈퍼포먼스":2,"에스케이멀티유틸리티":2,"에스케이바이오사이언스":2,"에스케이스퀘어":2,"에스케이스토아":2,"에스케이스피드메이트":2,"에스케이실트론":2,"에스케이씨":2,"에스케이아이이테크놀로지":2,"에스케이어드밴스드":2,"에스케이어스온":2,"에스케이에어코어":2,"에스케이에어플러스":2,"에스케이에코엔지니어링":2,"에스케이에코플랜트":2,"에스케이오션플랜트":2,"에스케이오앤에스":2,"에스케이온":2,"에스케이온테크플러스":2,"에스케이이터닉스":2,"에스케이인텔릭스서비스":2,"에스케이임업":2,"에스케이지오센트릭":2,"에스케이케미칼":2,"에스케이키파운드리":2,"에스케이텔레콤":2,"에스케이텔레콤씨에스티원":2,"에스케이텔링크":2,"에스케이트리켐":2,"에스케이플라즈마":2,"에스케이플라즈마 (안동)":2,"에스케이플래닛（주）":2,"에스케이피아이씨글로벌":2,"에스케이핀크스":2,"에스케이하이닉스":2,"에스케이하이닉스시스템아이씨":2,"에스케이하이닉스시스템아이씨우시솔루션스":2,"에스케이하이스텍":2,"에스케이하이이엔지":2,"에스코어":1,"에스티에이씨":2,"에스티엠":1,"에스티인터내셔널코퍼레이션":57,"에스파워":57,"에스피네이처":93,"에스피레미콘":93,"에쓰-오일":23,"에쓰-오일토탈에너지스윤활유":23,"에어로케이항공":90,"에어부산":12,"에어서울":12,"에어코리아":12,"에이스냉동공조":4,"에이아이디":70,"에이엠시사이언스":8,"에이엠플러스자산개발":70,"에이오엠지（주）":15,"에이제이피":48,"에이치그린파워":3,"에이치디건설기계":8,"에이치디씨":35,"에이치디씨랩스":35,"에이치디씨자산운용":35,"에이치디씨폴리올":35,"에이치디하이드로젠":8,"에이치디한국조선해양":8,"에이치디현대":8,"에이치디현대로보틱스":8,"에이치디현대마린솔루션":8,"에이치디현대마린솔루션테크":8,"에이치디현대사이트솔루션":8,"에이치디현대삼호":8,"에이치디현대오씨아이":8,"에이치디현대오일뱅크":8,"에이치디현대이엔티":8,"에이치디현대일렉트릭":8,"에이치디현대중공업":8,"에이치디현대케미칼 (대산공장)":8,"에이치씨":25,"에이치아이엠":30,"에이치앤지케미칼":5,"에이치에스머티리얼즈":91,"에이치에스애드":4,"에이치에스효성":28,"에이치에스효성더클래스":28,"에이치에스효성더프리미엄":28,"에이치에스효성인포메이션시스템":28,"에이치에스효성첨단소재":28,"에이치에스효성첨단소재 울산공장":28,"에이치에스효성첨단소재 전주공장":28,"에이치에스효성토요타":28,"에이치엘디앤아이한라":59,"에이치엘디앤아이한라 (현대아울렛)":59,"에이치엘로보틱스":59,"에이치엘만도":59,"에이치엘에코텍":59,"에이치엘엘중앙":73,"에이치엘위코":59,"에이치엘클레무브":59,"에이치엘홀딩스":59,"에이치엠엠":17,"에이치엠엠오션서비스":17,"에이치엠엠오션서비스 (해상)":17,"에이치케이금융파트너스":48,"에이치케이이노엔":96,"에이케이아이에스":70,"에이케이플라자 노보텔수원":70,"에이케이플라자 분당점":70,"에이케이홀딩스（주）":70,"에이텍":70,"에코에너지솔루션":7,"에코이앤오":5,"에코프로":51,"에코프로머티리얼즈":51,"에코프로비엠":51,"에코프로씨엔지":51,"에코프로에이치엔":51,"에코프로에이피":51,"에코프로이노베이션":51,"에코프로이엠":51,"에프알엘코리아":6,"에프앤씨시스템":5,"에프에스케이엘앤에스":2,"에프엠지":4,"에프엠케이":28,"에프지코리아":5,"엑스엘게임즈":16,"엑시스아이티":25,"엔글":16,"엔디에스":83,"엔미디어플랫폼":40,"엔바이콘":29,"엔비전스":20,"엔솔브":2,"엔아이티서비스":20,"엔에스쇼핑":29,"엔에이치농협무역":9,"엔에이치농협캐피탈":9,"엔에이치선물":9,"엔에이치씨엠에스":28,"엔에이치아문디자산운용":9,"엔에이치테크":28,"엔에이치투자증권":9,"엔에이치헤지자산운용":9,"엔이에스머티리얼즈":9,"엔젤위드":6,"엔코아":2,"엔탑자산관리":45,"엔테크서비스":20,"엔투비":7,"엘아이지디펜스앤에어로스페이스":63,"엘아이지시스템":63,"엘아이지정밀기술":63,"엘아이지정밀기술 -구미사무소":63,"엘아이지정밀기술 /성남사무소":63,"엘아이지풍산프로테크":63,"엘아이지홈앤밀":63,"엘아이지휴세코":63,"엘에스":14,"엘에스네트웍스":14,"엘에스마린솔루션":14,"엘에스머트리얼즈":14,"엘에스메카피온":14,"엘에스메탈":14,"엘에스빌드윈":14,"엘에스사우타":14,"엘에스아이티씨":14,"엘에스알스코":14,"엘에스에코첨단소재":14,"엘에스엘앤에프배터리솔루션":14,"엘에스엠앤엠":14,"엘에스엠트론（주）":14,"엘에스이링크":14,"엘에스이모빌리티솔루션":14,"엘에스이브이코리아":14,"엘에스이엔엠":14,"엘에스일렉트릭":14,"엘에스전선（주）":14,"엘엑스글라스":43,"엘엑스세미콘":43,"엘엑스판토스":43,"엘엑스하우시스":43,"엘엑스홀딩스":43,"엘지":4,"엘지경영개발원":4,"엘지디스플레이":4,"엘지마그나이파워트레인":4,"엘지생활건강":4,"엘지씨엔에스":4,"엘지에너지솔루션":4,"엘지에니바이오리파이닝":4,"엘지에이치와이비씨엠":4,"엘지유플러스":4,"엘지유플러스(영업)":4,"엘지유플러스볼트업":4,"엘지이노텍":4,"엘지전자":4,"엘지화학":4,"엘티메탈 (LTMetalCo. Ltd.)":98,"엘티삼보":98,"엘티소재":98,"엘티정밀":98,"엠디엠자산운용":65,"엠디엠플러스":65,"엠비케이코퍼레이션":14,"엠엔비":45,"엠티엘컴퍼니":90,"여주에너지서비스":2,"연우":96,"영남에너지서비스":2,"영진약품":38,"영풍":25,"영풍문고":25,"영풍전자":25,"영흥산업환경":101,"예가람저축은행":48,"예스코":14,"오리온":99,"오리콤":18,"오버데어코리아":62,"오설록":64,"오션드라이브스튜디오":16,"오션디앤씨":101,"오씨아이":44,"오씨아이드림":44,"오씨아이정보통신":44,"오씨아이파워":44,"오씨아이파워 (본점)":44,"오씨아이홀딩스":44,"오오티비":16,"오케이에이엑스":80,"오케이저축은행":80,"오케이캐피탈":80,"오케이홀딩스대부":80,"오투리조트":30,"오픈핸즈":1,"온가드":76,"올품":29,"옴니크래프트랩스":62,"와이엘피":2,"와이제이씨":32,"와이즈버즈":47,"와이케이디벨롭먼트":26,"와이티엔":71,"와이피씨":25,"우리":72,"우리홈쇼핑":6,"우전":28,"우전지앤에프":28,"울산방송":36,"울산지피에스":2,"웅진":78,"웅진북센":78,"웅진씽크빅":78,"웅진컴퍼스":78,"웅진프리드라이프":78,"웅진플레이도시":78,"원스토어":2,"원익":97,"원익디투아이":97,"원익로보틱스":97,"원익머트리얼즈":97,"원익아이피에스":97,"원익엘앤디 강릉지점":97,"원익큐브":97,"원익큐엔씨":97,"원익피앤이":97,"원익홀딩스":97,"원지":15,"웨이크원":15,"위드림":64,"위드유":4,"위드인천에너지":10,"위버스컴퍼니":89,"윈플러스마트 서부":86,"윈플러스마트":86,"윈플러스마트동부":86,"윈플러스마트중부":86,"윈플러스마트중부 성남점":86,"유니드":44,"유니드글로벌상사":44,"유니드비티플러스":44,"유니투스":3,"유성산업":71,"유엔에이디지탈":2,"유엔에이엔지니어링":2,"유진기업":71,"유진레저":71,"유진로지스틱스":71,"유진소닉(EUGENESONICCo. Ltd.)":71,"유진아이티서비스":71,"유진엠":71,"유진자산운용":71,"유진투자선물":71,"유진투자증권":71,"유진한일합섬":71,"유진한일합섬 의령지점":71,"유진홈센터":71,"유코카캐리어스":95,"유플러스홈서비스":4,"은화삼컨트리클럽":61,"이노션":3,"이노션에스":3,"이노위드":4,"이노폴리텍":10,"이데일리":60,"이데일리씨앤비":60,"이데일리엠":60,"이디비(주）":97,"이랜드건설":50,"이랜드리테일":50,"이랜드서비스":50,"이랜드월드":50,"이랜드이노플":50,"이랜드이츠":50,"이랜드파크":50,"이랜드팜앤푸드":50,"이마트":11,"이마트(에브리데이사업부)":11,"이마트24":11,"이비뉴스산업경제":33,"이스턴웰스":83,"이월드":50,"이음":3,"이지건설":61,"이크루즈":50,"이키즈랜드":50,"인디스에어":45,"인디에프":66,"인베니":14,"인선ENT":101,"인선모터스":101,"인제스피디움":56,"인조이스튜디오":62,"인천일보":30,"인천종합에너지":10,"인컴즈":20,"인크로스":2,"인터지스":68,"인터플렉스":25,"일신이앤씨":101,"일신정밀":97,"일진":102,"일진글로벌":102,"일진글로벌홀딩스":102,"일진베어링":102,"자이가이스트 (XiGEIST)":10,"자이씨앤에이":10,"자이에스앤디":10,"자이에스텍":10,"작가컴퍼니":20,"장금상선":32,"잼팟":45,"전남도시가스":2,"전북에너지서비스":2,"전북현대모터스에프씨":3,"전주원파워":66,"전주페이퍼":66,"정상북한산리조트":5,"정석기업":12,"제이씨엔":73,"제이에이에스":70,"제이월드":10,"제이티비씨":73,"제이티비씨미디어컴":73,"제이티비씨미디어텍":73,"제일기획":1,"제일사료":29,"제일종합관리서비스":42,"제일패션리테일":1,"제일폴리캠":28,"제일폴리캠 새만금공장":28,"제주항공":70,"조선호텔앤리조트":11,"조선호텔앤리조트 레저":11,"조선호텔앤리조트 부산":11,"조인핸즈네트워크":45,"중앙모터스":28,"중앙일보":73,"중앙일보에스":73,"중앙일보엠앤피":73,"중앙홀딩스":73,"중흥건설":21,"중흥토건":21,"지누스":27,"지마린서비스":3,"지마켓":11,"지씨에스":10,"지아이티":3,"지알엠":14,"지앤피":14,"지에스":10,"지에스건설":10,"지에스네오텍":10,"지에스네트웍스":10,"지에스동해전력":10,"지에스바이오":10,"지에스에너지":10,"지에스에코메탈":10,"지에스엔텍":10,"지에스이앤알":10,"지에스차지비":10,"지에스파워":10,"지에스포천그린에너지":10,"지엔코":100,"지엠아시아퍼시픽지역본부":49,"지엠테크니컬센터코리아":49,"지투지(G2G)":61,"지피씨":10,"진로소주":88,"진에어":12,"진흥기업":28,"참트레이딩":29,"초록뱀미디어":100,"충북소주":6,"충청에너지서비스":2,"카카오":16,"카카오게임즈":16,"카카오모빌리티":16,"카카오뱅크":16,"카카오브이엑스(KAKAOVX)":16,"카카오스타일 (Kakao Style Corp.)":16,"카카오엔터테인먼트":16,"카카오엔터프라이즈":16,"카카오페이":16,"카카오페이손해보험":16,"카카오페이증권":16,"칼호텔네트워크(그랜드하얏트인천)":12,"캐논코리아":6,"캐처스":83,"캡스텍":84,"커넥트중앙":73,"컴파트너스":20,"케어랩스 (Carelabs Co .Ltd)":97,"케이더블유북스":16,"케이드라이브":16,"케이뱅크":13,"케이씨씨":34,"케이씨씨건설":34,"케이씨씨글라스":34,"케이씨씨글라스덕소공장":34,"케이씨씨글라스여주공장":34,"케이씨씨글라스전의공장":34,"케이씨씨김천공장":34,"케이씨씨실리콘":34,"케이씨씨실리콘 대죽공장":34,"케이씨씨실리콘 전주공장":34,"케이씨씨여천공장":34,"케이씨에이서비스":42,"케이씨에이손해사정":42,"케이씨티시":75,"케이앤웍스":16,"케이에비에이션":12,"케이엘씨에스엠":36,"케이엘씨에스엠 선원":36,"케이엠티씨로지스틱스":75,"케이엠파크":16,"케이오지 엔터테인먼트":89,"케이원":100,"케이잼 (KZAMCorporation)":25,"케이젯정밀":25,"케이지그린텍":25,"케이지모빌리티":60,"케이지모빌리티일산서비스센터":60,"케이지모빌리티커머셜":60,"케이지모빌리티커머셜 군산제2공장":60,"케이지스틸":60,"케이지써닝라이프":60,"케이지씨예본":38,"케이지아이씨티":60,"케이지에듀원":60,"케이지에코솔루션":60,"케이지에프앤비":60,"케이지엑스":25,"케이지이니시스":60,"케이지캐피탈":60,"케이지케미칼":60,"케이지트레이딩":25,"케이지파이낸셜":60,"케이티":13,"케이티나스미디어":13,"케이티넷코어":13,"케이티디에스":13,"케이티리빙":13,"케이티샛":13,"케이티서비스남부":13,"케이티서비스북부":13,"케이티스카이라이프":13,"케이티스튜디오지니":13,"케이티스포츠":13,"케이티씨에스":13,"케이티아이에스":13,"케이티알티미디어":13,"케이티알파":13,"케이티앤지":38,"케이티에스테이트":13,"케이티에이치씨엔":13,"케이티에이치씨엔 경북방송":13,"케이티에이치씨엔 동작방송":13,"케이티에이치씨엔 새로넷방송":13,"케이티에이치씨엔 서초방송":13,"케이티에이치씨엔 충북방송":13,"케이티에이치에스":13,"케이티엔지니어링":13,"케이티엠모바일":13,"케이티엠앤에스":13,"케이티엠오에스남부":13,"케이티엠오에스북부":13,"케이티이엔에이":13,"케이티지니뮤직":13,"케이티커머스":13,"케이티클라우드":13,"케이티텔레캅":13,"케이티투자운용":13,"케이티피앤엠":13,"케이티희망지음":13,"케이플러스홀딩스":100,"켐가스코리아":7,"켐코":25,"코드":40,"코리아세븐":6,"코리아신탁":67,"코리아써키트":25,"코스모코스":38,"코스파":70,"코어테크놀로지":64,"코오롱":39,"코오롱글로벌":39,"코오롱글로벌（주）스포렉스서초점":39,"코오롱글로텍":39,"코오롱모빌리티그룹":39,"코오롱모터스":39,"코오롱바스프이노폼":39,"코오롱바이오텍":39,"코오롱베니트":39,"코오롱베니트 서울본부":39,"코오롱생명과학":39,"코오롱생명과학（주）김천제2공장":39,"코오롱스페이스웍스":39,"코오롱스페이스웍스 서울지점":39,"코오롱오토모티브":39,"코오롱인더스트리 구미2공장":39,"코오롱인더스트리 구미공장":39,"코오롱인더스트리 김천2공장":39,"코오롱인더스트리 김천3공장":39,"코오롱인더스트리 김천4공장":39,"코오롱인더스트리 김천공장":39,"코오롱인더스트리 여수공장":39,"코오롱인더스트리 울산공장":39,"코오롱인더스트리 천안공장":39,"코오롱인더스트리（주）":39,"코오롱인더스트리（주）FnC부문":39,"코오롱인더스트리（주）경산공장":39,"코오롱인더스트리（주）대산공장":39,"코오롱인더스트리（주）유화부문":39,"코오롱제약":39,"코오롱제약 대전공장":39,"코오롱하우스비전":39,"코원에너지서비스":2,"코웨이":45,"코웨이갤러리":45,"코웨이엔텍":45,"코카콜라음료":4,"콘텐츠웨이브":15,"콘텐트리중앙":73,"콜마비앤에이치":96,"콜마스크":96,"콜마유엑스":96,"콜마홀딩스":96,"쿠팡":22,"쿠팡로지스틱스서비스":22,"쿠팡이츠서비스":22,"쿠팡파이낸셜":22,"쿠팡페이":22,"쿠팡풀필먼트 고양센터":22,"쿠팡풀필먼트 대구센터":22,"쿠팡풀필먼트 동탄센터":22,"쿠팡풀필먼트 목천센터":22,"쿠팡풀필먼트 부천센터":22,"쿠팡풀필먼트 안성센터":22,"쿠팡풀필먼트 용인센터":22,"쿠팡풀필먼트 인천센터":22,"쿠팡풀필먼트서비스":22,"큐로홀딩스":100,"큐브리펀드":6,"큐앤드비인터내셔날":90,"크래프톤":62,"크레오에스지":100,"크림":20,"큰희망":48,"키다리스튜디오":47,"키움에셋플래너":47,"키움에프앤아이":47,"키움예스저축은행":47,"키움인베스트먼트":47,"키움저축은행":47,"키움증권":47,"키움캐피탈":47,"키움투자자산운용":47,"키위바인":16,"키이스트":16,"키즈노트":16,"타운보드중앙":73,"탑서브":37,"탑스텐동강시스타":36,"태광산업":48,"태극제약":4,"태림판지":66,"태림페이퍼":66,"태림페이퍼 마산공장":66,"태림페이퍼 의령공장":66,"태림포장":66,"태아산업":38,"태아산업김천공장":38,"태영건설":56,"테이팩스":91,"테크젠":3,"토리컴":14,"토스모바일 (TossMobileCo. Ltd.)":94,"토스뱅크":94,"토스씨엑스":94,"토스인슈어런스":94,"토스인컴":94,"토스증권":94,"토스페이먼츠":94,"토스플레이스":94,"토파스여행정보":12,"통영에코파워":35,"트라닉스":3,"트리니티항공":52,"티더블유바이오매스에너지":4,"티맵모빌리티":2,"티빙":15,"티시스":48,"티시스아이티콜센타":48,"티씨이":101,"티알엔":48,"티앤에이":31,"티에스엠":91,"티에스이엔씨":19,"티엔엔터테인먼트":100,"티엘아이":97,"티케이케미칼":36,"파괴연구소":16,"파라다이스":87,"파라다이스부산카지노지점":87,"파라다이스세가사미":87,"파라다이스워커힐지점":87,"파라다이스투어":87,"파라다이스호텔부산":87,"파르나스호텔":10,"파이넥스":6,"파인비치":67,"파주에너지서비스":2,"팜스코":29,"팜한농":4,"팬오션":29,"팬코텍":10,"팬텀":62,"팬트랙":93,"퍼시픽엔지니어링":32,"퍼플아이오":39,"페이머스스튜디오":20,"편안한이동1":94,"편안한이동2":94,"평택국제자동차부두（주）":95,"평택당진중앙부두":75,"평택에너지앤파워":14,"포스에스엠":29,"포스코":7,"포스코MC머티리얼즈":7,"포스코경영연구원":7,"포스코기술투자":7,"포스코디엑스":7,"포스코리튬솔루션":7,"포스코모빌리티솔루션":7,"포스코모빌리티솔루션 포항2공장":7,"포스코스틸리온":7,"포스코아이에이치":7,"포스코에스피":7,"포스코에스피 포항공장":7,"포스코에이앤씨건축사사무소":7,"포스코에이치와이클린메탈":7,"포스코엠텍":7,"포스코와이드":7,"포스코이앤씨":7,"포스코인재창조원":7,"포스코인터내셔널":7,"포스코지와이솔루션":7,"포스코지와이알테크":7,"포스코지와이에스테크":7,"포스코퓨처엠":7,"포스코플로우":7,"포스코피알테크":7,"포스코피에스테크":7,"포스코피에이치솔루션":7,"포스코필바라리튬솔루션":7,"포스코홀딩스":7,"포승그린파워（주）":43,"포천파워":24,"포항항7부두운영":12,"포항항8부두운영":93,"폰드그룹":90,"푸르웰":21,"푸른저축은행":86,"푸른파트너스자산운용":86,"퓨어플러스":5,"퓨쳐위즈":41,"프레시플러스":15,"프레시플러스 공주제2공장":15,"프레시플러스 공주제3공장":15,"프레시플러스 음성공장":15,"프롭티어":2,"플그림":11,"플라이웨이게임즈":62,"플레디스엔터테인먼트":89,"플레이리스트":20,"플레이스앤":20,"플레이타임중앙":73,"플레이하드":62,"피앤에쓰":10,"피에스앤마케팅":2,"피엘에스":10,"하고하우스(HAGOHAUS Inc.)":90,"하누리":4,"하림":29,"하림지주":29,"하림펫푸드":29,"하만인터내셔널코리아":1,"하이라이트브랜즈":90,"하이버스":2,"하이브":89,"하이엠솔루텍":4,"하이케어솔루션":4,"하이트 진로":88,"하이트진로산업 진주공장":88,"하이트진로음료":88,"하이프라자":4,"한강식품":29,"한국공항":12,"한국네트웍스":31,"한국넥슬렌":2,"한국동그라미파트너스":31,"한국복합물류":15,"한국썸벧":29,"한국앤컴퍼니":31,"한국엔지니어링웍스":31,"한국오션플랫폼":65,"한국음료":4,"한국의료환경":9,"한국인삼공사":38,"한국인프라관리":21,"한국자산신탁":65,"한국전구체":25,"한국전기차충전서비스":3,"한국정보인증":47,"한국지엠":49,"한국케이블텔레콤":48,"한국콜마":96,"한국타이어앤테크놀로지":31,"한국프리시전웍스":31,"한국항공서비스":53,"한국항공우주산업 본점":53,"한국후지필름":6,"한덕철광산업":36,"한덕화학":6,"한라일보사":30,"한무쇼핑":27,"한섬":27,"한솔PNS ITS부문":91,"한솔로지스유":91,"한솔로지스틱스":91,"한솔아이원스":91,"한솔에너지온":91,"한솔에코패키징":91,"한솔에코패키징 우천지점":91,"한솔오리온텍":91,"한솔제지（주）":91,"한솔케미칼":91,"한솔케미칼울산공장":91,"한솔케미칼익산공장":91,"한솔테크닉스":91,"한솔티씨에스":91,"한솔페이퍼텍":91,"한솔피엔에스":91,"한솔홀딩스":91,"한솔홈데코":91,"한솔홈데코익산공장":91,"한스인테크":36,"한온시스템":31,"한온시스템이에프피":31,"한울사랑":10,"한울타리":43,"한진":12,"한진부산컨테이너터미널":12,"한진세이버":12,"한진인천컨테이너터미널":12,"한진정보통신":12,"한진트래블":12,"한진평택컨테이너터미널(주）":12,"한컴":18,"한화":5,"한화/건설 부문":5,"한화갤러리아":5,"한화갤러리아타임월드":5,"한화라이프랩":5,"한화로보틱스":5,"한화모멘텀":5,"한화비전":5,"한화생명금융서비스":5,"한화생명보험":5,"한화세미텍":5,"한화손해보험":5,"한화손해사정":5,"한화솔루션":5,"한화시스템":5,"한화에너지":5,"한화에너지(컨버전스)":5,"한화에스테이트서비스":5,"한화에어로스페이스":5,"한화에어로스페이스보은사업장":5,"한화엔엑스엠디":5,"한화엔진":5,"한화오션":5,"한화오션에코텍":5,"한화오션엔지니어링":5,"한화이글스":5,"한화이센셜":5,"한화이센셜 세종사업장":5,"한화임팩트":5,"한화자산운용":5,"한화저축은행":5,"한화첨단소재":5,"한화첨단소재 -세종사업장":5,"한화커넥트":5,"한화컴파운드":5,"한화컴파운드 서울":5,"한화토탈에너지스":5,"한화투자증권":5,"한화파워":5,"한화푸드테크":5,"한화푸드테크 더플라자 사업본부":5,"한화피플라이프":5,"한화호텔 앤드리조트":5,"한화호텔앤드리조트":5,"해비치컨트리클럽":3,"해비치호텔앤드리조트":3,"해태HTB":4,"행복나래":2,"행복두드리미":28,"행복마루":4,"행복모아":2,"행복채움":2,"행복한울":2,"허스트중앙":73,"헤럴드":21,"헬로커넥트앤(Hello Connect N Co. Ltd.)":4,"현대건설":3,"현대그린푸드":27,"현대글로비스":3,"현대드림투어":27,"현대디에프":27,"현대로템":3,"현대리바트":27,"현대머티리얼":3,"현대모비스":3,"현대무브":3,"현대바이오랜드":27,"현대백화점":27,"현대비앤지스틸":3,"현대스틸산업":3,"현대스틸파이프":3,"현대씨앤알":82,"현대아이에스씨":3,"현대아이에이치엘":3,"현대아이엠씨":3,"현대아이이씨":3,"현대아이티씨":3,"현대에버다임":27,"현대에이치디에스":82,"현대엔지니어링":3,"현대엔지비":3,"현대엘앤씨":27,"현대엠시트":3,"현대엠시트 울산공장":3,"현대오토에버":3,"현대위아":3,"현대이지웰":27,"현대자동차":3,"현대제철":3,"현대종합특수강":3,"현대지에프홀딩스":27,"현대차증권":3,"현대첨단소재":3,"현대카드":3,"현대캐피탈":3,"현대커머셜":3,"현대케피코":3,"현대트랜시스":3,"현대파텍스":3,"현대퓨처넷":27,"현대하이라이프손해사정":82,"현대하이카손해사정":82,"현대해상화재보험":82,"현대홈쇼핑":27,"호라이즌":97,"호반건설":33,"호반산업":33,"호반서서울":33,"호반써밋":33,"호반티비엠":33,"호반프라퍼티":33,"호반호텔앤리조트":33,"호반호텔앤리조트-제천지점":33,"호텔롯데":6,"호텔롯데(롯데월드)":6,"호텔신라":1,"호텔탑스텐":36,"홈앤서비스":2,"화인":63,"환경에너지솔루션":101,"환경에너지솔루션 /(상용)파주환경관리센터(소각로)":101,"효성":28,"효성ITX":28,"효성굿스프링스":28,"효성네오켐":28,"효성네오켐 옥산공장":28,"효성네오켐 용연1공장":28,"효성에프엠에스":28,"효성중공업":28,"효성티앤씨":28,"효성티앤에스":28,"효성화학":28,"후레쉬서브":10,"휘닉스중앙":73,"휘닉스중앙제주":73,"휘닉스평창":73,"휘찬":2,"휴먼티에스에스":1,"휴세스":57,"휴젤":10,"흥국생명보험":48,"흥국자산운용":48,"흥국증권":48,"흥국화재해상보험":48,"흥아라인":32,"흥아로지스틱스":32,"흥아해운":32,"흥업":14,"희망별숲":1,"희성전자":98,"희성촉매":98,"희성피브이씨":98,"희성피엠텍":98,"히어로손해사정":5,"힐러비":45,"남선알미늄자동차사업부문":36,"（주）넥슨커뮤니케이션즈":40,"（주）농협하나로유통":9,"다현테크":85,"（주）더블유컨셉코리아":11,"（주）동광주택":30,"（주）동원에프앤비강진공장":58,"（주）동원에프앤비수원공장":58,"（주）동원에프앤비정읍공장":58,"（주）미디어캔":97,"（주）발맥스기술":66,"（주）부영주택":30,"（주）비바리퍼블리카":94,"（주）빌텍":37,"（주）삼양사":72,"（주）삼양패키징":72,"（주）삼우종합건축사사무소":1,"（주）삼표산업":93,"（주）서빅":63,"（주）선진":29,"세광패션대구사업소":48,"（주）셀트리온제약진천공장":19,"（주）신세계동대구복합환승센터":11,"（주）신세계프라퍼티":11,"（주）씨제이이엔엠(이앤엠 부문)":15,"（주）씨텍":4,"（주）아모레퍼시픽":64,"（주）에스쁘아":64,"（주）에스엠브랜드마케팅":16,"（주）우방":36,"（주）이니스프리":64,"（주）지에스넷비전":10,"（주）케이씨씨안성공장":34,"（주）코스비전":64,"（주）코스알엑스":64,"테이팩스유니랩공장":91,"（주）트레이딩포스트":90,"（주）티캐스트":48,"（주）포스코휴먼스 포항지점":7,"（주）하이텔레서비스":4,"（주）현대캐터링시스템":27},"p":{"88관광개발":1,"가덕도신공항건설공단":1,"가축위생방역지원본부":1,"가평군시설관리공단":1,"강릉관광개발공사":1,"강북구도시관리공단":1,"강서구시설관리공단":1,"강원개발공사":1,"강원대학교병원":1,"강원랜드":1,"강화군시설관리공단":1,"거제해양관광개발공사":1,"건강보험심사평가원":1,"건설근로자공제회":1,"건축공간연구원":1,"게임물관리위원회":1,"경기관광공사":1,"경기교통공사":1,"경기주택도시공사":1,"경기평택항만공사":1,"경남개발공사":1,"경북대학교병원":1,"경북대학교치과병원":1,"경상국립대학교병원":1,"경상북도개발공사":1,"경상북도문화관광공사":1,"경제.인문사회연구회":1,"경주시시설관리공단":1,"공간정보산업진흥원":1,"공무원연금공단":1,"공영홈쇼핑":1,"과천도시공사":1,"과학기술정책연구원":1,"광명도시공사":1,"광양환경공사":1,"광주광역시관광공사":1,"광주광역시도시공사":1,"광주광역시서구시설관리공단":1,"광주교통공사":1,"광주환경공단":1,"광진구시설관리공단":1,"구리도시공사":1,"구미도시공사":1,"국가과학기술인력개발원":1,"국가생명윤리정책원":1,"국가수리과학연구소":1,"국가아동권리보장원":1,"국가유산진흥원":1,"국가철도공단":1,"국가평생교육진흥원":1,"국립공원공단":1,"국립광주과학관":1,"국립낙동강생물자원관":1,"국립농업박물관":1,"국립대구과학관":1,"국립박물관문화재단":1,"국립부산과학관":1,"국립생태원":1,"국립아시아문화전당재단":1,"국립암센터":1,"국립울진해양과학관":1,"국립인천해양박물관":1,"국립중앙의료원":1,"국립항공박물관":1,"국립해양박물관":1,"국립해양생물자원관":1,"국립호남권생물자원관":1,"국민건강보험공단":1,"국민건강보험공단일산병원":1,"국민연금공단":1,"국방과학연구소":1,"국방기술진흥연구소":1,"국방기술품질원":1,"국방전직교육원":1,"국악방송":1,"국제방송교류재단":1,"국제식물검역인증원":1,"국토교통과학기술진흥원":1,"국토안전관리원":1,"국토연구원":1,"군포도시공사":1,"그랜드코리아레저":1,"근로복지공단":1,"기술보증기금":1,"기장군도시관리공단":1,"기초과학연구원":1,"김천시시설관리공단":1,"김포도시공사":1,"김해시도시개발공사":1,"남양주도시공사":1,"노사발전재단":1,"농림수산식품교육문화정보원":1,"농림식품기술기획평가원":1,"농업정책보험금융원":1,"단양관광공사":1,"달성군시설관리공단":1,"당진도시공사":1,"대구공공시설관리공단/시설공단":1,"대구공공시설관리공단/환경공단":1,"대구교통공사":1,"대구도시개발공사":1,"대외경제정책연구원":1,"대전관광공사":1,"대전광역시시설관리공단":1,"대전교통공사":1,"대전도시공사":1,"대한건설기계안전관리원":1,"대한무역투자진흥공사":1,"대한법률구조공단":1,"대한장애인체육회":1,"대한적십자사":1,"대한체육회":1,"독립기념관":1,"동남권원자력의학원":1,"동대문구시설관리공단":1,"동두천시 시설관리공단":1,"동작구시설관리공단":1,"동해시시설관리공단":1,"무역안보관리원":1,"문경관광공사":1,"민주화운동기념사업회":1,"밀양시시설관리공단":1,"보령시시설관리공단":1,"부산관광공사":1,"부산광역시기장군도시관리공단":1,"부산광역시남구시설관리공단":1,"부산교통공사":1,"부산대학교병원":1,"부산도시공사":1,"부산시설공단":1,"부산항만공사":1,"부산환경공단":1,"부여군시설관리공단":1,"부천도시공사":1,"북한이탈주민지원재단":1,"분당서울대학교병원":1,"사단법인남북교류협력지원협회":1,"사립학교교직원연금공단":1,"사천시시설관리공단":1,"산업연구원":1,"새만금개발공사":1,"서민금융진흥원":1,"서산시시설관리공단":1,"서울교통공사":1,"서울대학교병원":1,"서울대학교치과병원":1,"서울물재생시설공단":1,"서울시강남구도시관리공단":1,"서울시설공단":1,"서울시용산구시설관리공단":1,"서울에너지공사":1,"서울올림픽기념국민체육진흥공단":1,"서울주택도시개발공사":1,"서울특별시강동구도시관리공단":1,"서울특별시관악구시설관리공단":1,"서울특별시구로구시설관리공단":1,"서울특별시금천구시설관리공단":1,"서울특별시노원구시설관리공단":1,"서울특별시도봉구시설관리공단":1,"서울특별시마포구시설관리공단":1,"서울특별시서대문구도시관리공단":1,"서울특별시성동구도시관리공단":1,"서울특별시송파구시설관리공단":1,"서울특별시영등포구시설관리공단":1,"서울특별시은평구시설관리공단":1,"서울특별시종로구시설관리공단":1,"서울특별시중구시설관리공단":1,"성남도시개발공사":1,"성북구도시관리공단":1,"세종도시교통공사":1,"세종특별자치시시설관리공단":1,"세종학당재단":1,"소상공인시장진흥공단":1,"속초시시설관리공단":1,"수도권매립지관리공사":1,"수원도시공사":1,"시청자미디어재단":1,"시흥도시공사":1,"식품안전정보원":1,"신용보증기금":1,"신용보증재단중앙회":1,"아산시시설관리공단":1,"아시아 태평양경제협력체 기후센터":1,"안동시시설관리공단":1,"안산도시공사":1,"안성시시설관리공단":1,"안양도시공사":1,"양산시시설관리공단":1,"양육비이행관리원":1,"양주도시공사":1,"양천구시설관리공단":1,"에스알":1,"여수광양항만공사":1,"여수시도시관리공단":1,"여주도시공사":1,"연구개발특구진흥재단":1,"연천군시설관리공단":1,"영상물등급위원회":1,"영월군시설관리공단":1,"영화진흥위원회":1,"예금보험공사":1,"예술의전당":1,"오산도시공사":1,"완도해양치유관리공단":1,"완주군 시설관리공단":1,"용인도시공사":1,"우체국금융개발원":1,"우체국물류지원단":1,"우체국시설관리단":1,"울산광역시남구도시관리공단":1,"울산광역시도시공사":1,"울산광역시북구시설관리공단":1,"울산광역시중구도시관리공단":1,"울산시설공단":1,"울산항만공사":1,"울주군시설관리공단":1,"원주시시설관리공단":1,"육아정책연구소":1,"의료기관평가인증원":1,"의왕도시공사":1,"의정부도시공사":1,"이천시시설관리공단":1,"익산시도시관리공단":1,"인천관광공사":1,"인천광역시 미추홀구시설관리공단":1,"인천광역시계양구시설관리공단":1,"인천광역시남동구도시관리공단":1,"인천광역시부평구시설관리공단":1,"인천광역시서구시설관리공단":1,"인천광역시서해구시설관리공단":1,"인천광역시제물포구시설관리공단":1,"인천교통공사":1,"인천국제공항공사":1,"인천도시공사":1,"인천시설공단":1,"인천시설공단(청사관리)":1,"인천항만공사":1,"인천환경공단":1,"재단법인 과학기술사업화진흥원":1,"재단법인 대구경북첨단의료산업진흥재단":1,"재단법인 스포츠윤리센터":1,"재단법인 에너지경제연구원":1,"재단법인 오송첨단의료산업진흥재단":1,"재단법인 한국공예디자인문화진흥원":1,"재단법인 한국농촌경제연구원":1,"재단법인 한국데이터산업진흥원":1,"재단법인 한국보건의료정보원":1,"재단법인 한국연구재단":1,"재단법인 한국우편사업진흥원":1,"재단법인 한국자활복지개발원":1,"재단법인 한국저작권보호원":1,"재단법인 한국지식재산보호원":1,"재단법인공간정보품질관리원":1,"재단법인동북아역사재단":1,"재단법인예술경영지원센터":1,"재단법인자동차손해배상진흥원":1,"재단법인축산환경관리원":1,"재단법인한국공공조직은행":1,"재단법인한국나노기술원":1,"재단법인한국로봇산업진흥원":1,"재단법인한국수자원조사기술원":1,"재단법인한국장기조직기증원":1,"재단법인한국통계정보원":1,"재외동포협력센터":1,"전국재해구호협회":1,"전남개발공사":1,"전남광주통합특별시광산구시설관리공단":1,"전남광주통합특별시북구시설관리공단":1,"전남대학교병원":1,"전북개발공사":1,"전북대학교병원":1,"전쟁기념사업회":1,"전주시시설관리공단":1,"정보통신기획평가원":1,"정보통신산업진흥원":1,"정보통신정책연구원":1,"정부법무공단":1,"정선군시설관리공단":1,"제주관광공사":1,"제주국제자유도시개발센터":1,"제주대학교병원":1,"제주에너지공사":1,"제주특별자치도개발공사":1,"주택관리공단":1,"주택도시보증공사":1,"중랑구시설관리공단":1,"중소기업기술정보진흥원":1,"중소기업은행":1,"중소벤처기업연구원":1,"중소벤처기업진흥공단":1,"중앙사회서비스원":1,"진주시 시설관리공단":1,"창녕군시설관리공단":1,"창업진흥원":1,"창원시설공단":1,"천안도시공사":1,"청주도시공사":1,"축산물품질평가원":1,"충남대학교병원":1,"충북개발공사":1,"충북대학교병원":1,"충주시시설관리공단":1,"충청남도개발공사":1,"코레일관광개발":1,"코레일네트웍스":1,"코레일로지스":1,"코레일유통":1,"코레일테크":1,"태권도진흥재단":1,"태백시시설관리공단":1,"통영관광개발공사":1,"통일연구원":1,"파주도시공사":1,"평창군시설관리공단":1,"평택도시공사":1,"포천도시공사":1,"포항시시설관리공단":1,"하남도시공사":1,"한국가스공사":1,"한국가스기술공사":1,"한국가스안전공사":1,"한국개발연구원":1,"한국건강가정진흥원":1,"한국건강증진개발원":1,"한국고용노동교육원":1,"한국고용정보원":1,"한국고전번역원":1,"한국공정거래조정원":1,"한국공항공사":1,"한국과학기술기획평가원":1,"한국과학창의재단":1,"한국관광공사":1,"한국관세정보원":1,"한국광해광업공단":1,"한국교육개발원":1,"한국교육과정평가원":1,"한국교육학술정보원":1,"한국교통안전공단":1,"한국교통연구원":1,"한국국제교류재단":1,"한국국제보건의료재단":1,"한국국제협력단":1,"한국국토정보공사":1,"한국기상산업기술원":1,"한국기술교육대학교":1,"한국남동발전":1,"한국남부발전":1,"한국노동연구원":1,"한국노인인력개발원":1,"한국농수산식품유통공사":1,"한국농어촌공사":1,"한국농업기술진흥원":1,"한국도로공사":1,"한국도로공사서비스":1,"한국도로교통공단":1,"한국도박문제예방치유원":1,"한국동서발전":1,"한국등산트레킹지원센터":1,"한국디자인진흥원":1,"한국마사회":1,"한국마약퇴치운동본부":1,"한국무역보험공사":1,"한국문학번역원":1,"한국문화관광연구원":1,"한국문화예술교육진흥원":1,"한국문화예술위원회":1,"한국문화정보원":1,"한국문화진흥":1,"한국물기술인증원":1,"한국발명진흥회":1,"한국방송광고진흥공사":1,"한국방송통신전파진흥원":1,"한국법무보호복지공단":1,"한국법제연구원":1,"한국벤처투자":1,"한국보건복지인재원":1,"한국보건사회연구원":1,"한국보건산업진흥원":1,"한국보건의료연구원":1,"한국보건의료인국가시험원":1,"한국보훈복지의료공단":1,"한국부동산원":1,"한국사학진흥재단":1,"한국사회보장정보원":1,"한국사회적기업진흥원":1,"한국산림복지진흥원":1,"한국산업기술기획평가원":1,"한국산업기술시험원":1,"한국산업기술진흥원":1,"한국산업단지공단":1,"한국산업안전보건공단":1,"한국산업은행":1,"한국산업인력공단":1,"한국상하수도협회":1,"한국생명존중희망재단":1,"한국서부발전":1,"한국석유공사":1,"한국석유관리원":1,"한국세라믹기술원":1,"한국소방산업기술원":1,"한국소비자원":1,"한국수력원자력":1,"한국수목원정원관리원":1,"한국수산자원공단":1,"한국수자원공사":1,"한국수출입은행":1,"한국수치모델개발원":1,"한국스포츠레저":1,"한국승강기안전공단":1,"한국식품산업클러스터진흥원":1,"한국식품안전관리인증원":1,"한국양성평등교육진흥원":1,"한국어촌어항공단":1,"한국언론진흥재단":1,"한국에너지공단":1,"한국에너지기술평가원":1,"한국여성과학기술인육성재단":1,"한국여성인권진흥원":1,"한국여성정책연구원":1,"한국영상자료원":1,"한국영유아보육교육진흥원":1,"한국예술인복지재단":1,"한국원산지정보원":1,"한국원자력안전기술원":1,"한국원자력안전재단":1,"한국원자력의학원":1,"한국원자력통제기술원":1,"한국원자력환경공단":1,"한국의료기기안전정보원":1,"한국의료분쟁조정중재원":1,"한국의약품안전관리원":1,"한국인터넷진흥원":1,"한국임업진흥원":1,"한국자산관리공사":1,"한국잡월드 (Korea JobWorld)":1,"한국장애인개발원":1,"한국장애인고용공단":1,"한국재정정보원":1,"한국저작권위원회":1,"한국전기안전공사":1,"한국전력거래소":1,"한국전력공사":1,"한국전력기술":1,"한국제품안전관리원":1,"한국조세재정연구원":1,"한국조폐공사":1,"한국주택금융공사":1,"한국중부발전":1,"한국중소벤처기업유통원":1,"한국지능정보사회진흥원":1,"한국지식재산연구원":1,"한국지역난방공사":1,"한국직업능력연구원":1,"한국철도공사":1,"한국청소년상담복지개발원":1,"한국청소년정책연구원":1,"한국청소년활동진흥원":1,"한국체육산업개발":1,"한국출판문화산업진흥원":1,"한국콘텐츠진흥원":1,"한국탄소산업진흥원":1,"한국토지주택공사":1,"한국통계진흥원":1,"한국투자공사":1,"한국특허전략개발원":1,"한국특허정보원":1,"한국학중앙연구원":1,"한국한의약진흥원":1,"한국항로표지기술원":1,"한국해양과학기술원":1,"한국해양교통안전공단":1,"한국해양수산개발원":1,"한국해양수산연수원":1,"한국해양조사협회":1,"한국해양진흥공사":1,"한국해외인프라도시개발지원공사":1,"한국행정연구원":1,"한국형사·법무정책연구원":1,"한국환경공단":1,"한국환경보전원":1,"한국환경산업기술원":1,"한국환경연구원":1,"한식진흥원":1,"한전엠씨에스":1,"한전원자력연료":1,"한전케이디엔":1,"한전케이피에스":1,"합천군시설관리공단":1,"항공안전기술원":1,"해양수산과학기술진흥원":1,"해양환경공단":1,"화성도시공사":1,"（재）장애인기업종합지원센터":1,"（재）한국에너지재단":1,"（재）한국에너지정보문화재단":1,"（재）한국장학재단":1}};
const ME_MID_REV = 1000, ME_MID_ASSET = 5000;   // 억 원
const coRank = c => (c && FTC.c && FTC.c[c.name]) || null;
const coGroup = c => { const r = coRank(c); return r ? FTC.g?.[r] || "" : ""; };
const coMutual = c => { const r = coRank(c); return !!r && r <= FTC.m; };
function coSize(c) {
  const n = c.salary?.members || 0, r = coRank(c), big = !!r;   // 11-14: 공시대상기업집단(48위~)도 대기업
  if (c.type === "스타트업" && !big) return "스타트업";   // 스타트업 꼴 회사여도 대기업집단 계열사면 아래 갈래로
  if (/공공|공단/.test(c.salary?.group || "")) return "공기업·공공";
  if (c.salary?.group === "은행·증권·보험" || (/은행|증권|보험|카드|캐피탈|저축은행|자산운용/.test(c.name || "") && !FIN_NOT.test(c.name || ""))) return "금융";   // 금융권은 대기업과 따로
  if (FTC.p?.[c.name]) return "공기업·공공";            // 11-14: 알리오 공시 공공기관 (은행·보험 이름의 금융 공공기관은 위에서 금융으로)
  if (big) return "대기업";
  if (!FTC.m) return n >= 1000 ? "대기업" : n >= 300 ? "중견" : "중소";   // 표 없음 → 예전 기준
  const y = (c.fin?.years || []).filter(k => c.fin.data?.[k]).at(-1), f = y ? c.fin.data[y] : null;
  if (f && f.rev != null) return f.rev >= ME_MID_REV || (f.assets || 0) >= ME_MID_ASSET ? "중견" : "중소";
  return n >= 300 ? "중견" : "중소";
}
// 칩에 붙일 말: '삼성 계열(대기업집단)' / '이랜드 계열(공시대상기업집단)'
const coGroupChip = c => { const g = coGroup(c); return g ? `${g} 계열(대기업집단)` : ""; };
// 11-14: 급 이름과 실제 회사 크기가 뒤집힌 짝을 가리려고 엔진에 넘기는 절대 크기 — 최근 매출(억 원)과 직원 수
const coAbs = c => { if (!c) return {}; const y = (c.fin?.years || []).filter(k => c.fin.data?.[k]).at(-1), f = y ? c.fin.data[y] : null; return { abs_rev: f?.rev > 0 ? f.rev : undefined, abs_n: c.salary?.members || undefined }; };
// 2026-11-13 사용자: "내 상황 판정 내지 말자. 이유를 달아줘" — 판단자료가 부족하고, 회사라기보다 관청·군부대·조합·협회·위원회인 곳
//   지역 농협·축협·수협·신협·새마을금고·공제조합과 '…공사'(공기업)는 회사로 본다(전에 정한 대로). 국민연금 숫자로 판정이 난 곳과 대기업집단 계열사도 그대로 판정
const ME_ORG = /시청|군청|구청|도청|교육청|교육지원청|국세청|세무서|경찰|소방|우체국|법원|검찰|의회|사무처|주민센터|행정복지센터|(지방|병무|관세|조달|통계|기상|산림|특허|보훈|국토관리|고용노동|환경|해양수산)청|주한미군|미군|미공군|미육군|육군|해군|공군|국군|부대(?!학)|사령부|군단|경리단|협회|연합회|위원회|노동조합|노조(?=$|[\s(（\/지])|조합|체육회|상공회의소|특별시|광역시|특별자치|[시군구]\/|동행일자리/;
const ME_ORG_NOT = /(농업|축산업|수산업|원예농업|인삼|낙농업|양돈|양계|산림|임업|원예|과수|화훼|채소|농축산|축산|신용)\s*협동조합|산림조합|영농조합|농협|축협|수협|신협|새마을금고|공제조합|공사\s*(\(.*\))?$/;
const meNoJudge = c => !!c && c.verdict === "판단자료 부족" && c.basis !== "nps" && ME_ORG.test(c.name || "") && !ME_ORG_NOT.test(c.name || "") && !coRank(c);
const ME_NOJUDGE_WHY = "일반 회사가 아니라 관청·군부대·조합·협회 같은 곳이라, 연봉이나 회사 급을 내 회사와 견주는 게 맞지 않아요.";
// 11-12 F7: 이름에 '은행·보험·카드'가 들어가도 금융사가 아닌 곳 (은행고등학교, 건강보험 어린이집, 조직은행, 카드 고객센터 등)
const FIN_NOT = /어린이집|요양원|병원|학교|협회|연수원|재단|고객서비스|손해사정|개발원|조직은행|건강보험|카드밴/;
// 11-12 F7: 금융사의 회사 수준은 인원이 아니라 평균 연봉으로 본다 (사용자: "금융 중에는 인원수가 적어도 좋은 곳이 있어")
//   평균 연봉 7,000만 이상 = 대기업 수준(3), 5,000만 이상 = 중견 수준(2), 그 아래 = 1. 추정 연봉뿐인 300명 미만 회사는 2까지만 (추정치만 믿고 '급이 크게 오른다'고 하지 않게)
//   돌려주는 값: 금융사가 아니면 undefined(인원 기준 그대로), 연봉 자료가 없으면 null(수준 모름 → 급 비교를 건너뜀)
function coLevel(c) {
  if (!c || coSize(c) !== "금융") return undefined;
  const a = c.salary?.avg; if (!a) return null;
  const [hi, mid] = FitEngine.FIT.fin_avg, lv = a >= hi ? 3 : a >= mid ? 2 : 1;
  return /추정/.test(c.salary.avgSrc || "") && (c.salary.members || 0) < 300 ? Math.min(lv, 2) : lv;
}
// 제시 연봉·내 연봉 입력 범위 (만 원): 원 단위(65000000)나 58 같은 값을 걸러 낸다 (11-12 F9)
const ME_PAY_MIN = 1000, ME_PAY_MAX = 99999;
const mePayOk = v => typeof v === "number" && v >= ME_PAY_MIN && v <= ME_PAY_MAX;
function coSido(c) {
  const a = c.fin?.addr || "";
  return (a && SIDO_L.find(k => k && a.startsWith(k))) || (a && ({ 충청북: "충북", 충청남: "충남", 전라북: "전북", 전라남: "전남", 경상북: "경북", 경상남: "경남" })[a.slice(0, 3)]) || IDX_S.get(c.name) || "";
}
// 근무지: DART 등록 주소 → 없으면 국민연금 사업장 시도 (2026-11-04: 전에는 주소 없는 58%가 전부 '수도권'이었다)
const ME_REAL_PLACE = { "카카오": "수도권" };   // 등록 주소(제주)와 실제 근무지(판교)가 다른 큰 회사
function coPlace(c) {
  if (ME_REAL_PLACE[c.name]) return ME_REAL_PLACE[c.name];
  const s = coSido(c);
  return s === "서울" ? "서울 본사" : /^(경기|인천)$/.test(s) ? "수도권" : s ? "지방 본사" : "수도권";
}
const RANK_BY_YEARS = [[4, "사원"], [8, "대리"], [12, "과장"], [16, "차장"], [99, "부장"]];
function coSalary(c, years) {
  const s = c.salary; if (!s) return null;
  const rank = RANK_BY_YEARS.find(([y]) => (years || 0) < y)[1];
  const v = s.ranks?.[rank];
  return v ? { v, how: `이 회사 ${rank}급 추정 연봉` } : s.avg ? { v: s.avg, how: "이 회사 평균 연봉", avg: true } : null;   // avg: 직급 연봉 없이 전 직원 평균뿐 (11-12 F8)
}
// 회사 워라밸 점수(잡플래닛·블라인드·캐치를 평판과 같은 비율로 종합) → 워라밸 단계
function coWlb(c) {
  const r = c?.rep || {}, v = [r.jobplanet?.subs?.["워라밸"], r.blind?.subs?.["업무와 삶의 균형"], r.catch?.subs?.["워라밸"]].filter(x => x != null);
  if (!v.length && c?.subsMix?.["워라밸"] == null) return null;
  const a = c?.subsMix?.["워라밸"] ?? v.reduce((x, y) => x + y, 0) / v.length;   // 2026-11-05 세 곳 종합 점수 우선
  return a >= 3.8 ? "칼퇴" : a >= 3.0 ? "보통" : a >= 2.5 ? "야근 잦음" : "매일 야근";
}
const ME_GRADE = { "무조건 가세요": 6, "가세요": 5, "조건 보고 가세요": 4, "중립기어": 3, "스펙 보고 결정하세요": 2, "다시 생각해요": 1, "비추예요": 0 };
// 지금 회사 정보 (이름을 적었을 때만 한 번 불러 둔다). 못 찾으면 null → 넣은 내용으로만 판단
let meNow = { key: "", c: null };
async function meLoadNow() {
  const q = (ME?.co || "").trim();
  if (!q) { meNow = { key: "", c: null }; return; }
  if (meNow.key === q) return;
  await loadIdx();   // 검색 목록이 있어야 이름을 찾는다
  // 정확히 같은 이름(정식 이름·별칭·화면 이름)이 딱 한 곳일 때만 그 회사 정보를 쓴다.
  // 비슷한 이름으로 짐작하면 다른 회사 정보가 섞인다 (2026-11-11 정정 요청: '케이씨'를 넣었는데 KCC 정보가 나옴) → 못 찾으면 넣은 내용으로만 판단
  const hit = meExact(q);
  const c = hit ? await getCo(hit[0]).catch(() => null) : null;
  meNow = { key: q, c: c && !c.__err && !c.__limit && !c.__hidden ? { ...c, name: hit[0] } : null };
}
function meExact(q) {
  if (typeof find !== "function" || !IDX.length) return null;
  const k = plain(q).toLowerCase(), ex = find(q, 8).filter(r => plain(r[0]).toLowerCase() === k
    || (r[3] || "").split(" · ").some(x => plain(x).toLowerCase() === k) || (DISP.has(r[0]) && plain(DISP.get(r[0])).toLowerCase() === k));
  const own = ex.filter(r => plain(r[0]).toLowerCase() === k);   // 정식 이름이 같은 곳이 있으면 그곳 (이름은 겹치지 않음)
  return own.length === 1 ? own[0] : ex.length === 1 ? ex[0] : null;   // 별칭이 여러 회사에 걸리면 고르지 않음
}
// 지금 회사 칸 아래: 어느 회사로 알아들었는지 보여 주고, 정확히 같은 이름이 없으면 비슷한 회사를 눌러 고르게
function meCoHint() {
  const inp = document.getElementById("me_co"), box = document.getElementById("meCoHit"); if (!inp || !box) return;
  const q = inp.value.trim(); if (!q || !IDX.length) { box.innerHTML = ""; return; }   // 목록 받는 중이면 비워 둔다 (도착하면 afterIdx 가 다시 부름)
  const hit = meExact(q);
  if (hit) { box.innerHTML = `<b>✓ ${esc(dn(hit[0]))}</b>${hit[6] ? ` <span>${esc(hit[6])}</span>` : hit[2] ? ` <span>${esc(hit[2])}</span>` : ""} 정보를 불러와요`; return; }
  const near = find(q, 4);
  box.innerHTML = near.length ? `정확히 같은 이름이 없어서 회사 정보는 안 불러와요. 이 중에 있으면 눌러 주세요: ` + near.map(r => `<button type="button" data-co="${esc(r[0])}">${esc(dn(r[0]))}${r[6] ? ` <small>${esc(r[6])}</small>` : ""}</button>`).join("")
    : "이 이름의 회사는 못 찾았어요. 넣은 내용으로만 판단해요.";
}
document.addEventListener("input", e => { if (e.target.id === "me_co") { loadMore?.(); meCoHint(); } });
document.addEventListener("click", e => { const b = e.target.closest("#meCoHit [data-co]"); if (!b) return;
  const inp = document.getElementById("me_co"); inp.value = b.dataset.co; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); });
// 사람이 넣은 값이 먼저, 안 넣은 것만 회사 정보로 채운다 (2026-10-27 사용자: 회사 워라밸이 나빠도 그 사람 워라밸은 좋을 수 있다)
function meCase(c) {
  const o = meOver[c.name] || {}, est = coSalary(c, ME.years), nc = meNow.c;
  const offer = mePayOk(o.salary) ? o.salary : undefined;   // 범위 밖 값은 안 쓴다 (11-12 F9)
  // 11-12 F7: 규모를 모르면 '중견'으로 가정하지 않고 급 비교를 건너뛴다. 금융사는 평균 연봉으로 본 회사 수준(coLevel)을 넘긴다
  const nowSize = ME.size || (nc ? coSize(nc) : ""), nowLv = nc && (!ME.size || ME.size === coSize(nc)) ? coLevel(nc) : undefined, toLv = o.size ? undefined : coLevel(c);
  const nowWlb = ME.wlb || coWlb(nc) || "보통", toWlb = coWlb(c) || "";   // 11-12 F9: 갈 회사 워라밸 자료가 없으면 '보통'으로 단정하지 않는다 (내 쪽은 안 넣으면 전처럼 보통)
  const now = { sex: ME.sex, age: ME.age, years: ME.years, tenure: ME.tenure, moves: ME.moves, left: !!ME.left, gap: ME.left ? ME.gap : undefined,
    size: nowSize, size_unknown: !nowSize || nowLv === null, tier_n: nowLv ?? undefined, ...coAbs(nc),
    industry: ME.industry ? engInd(ME.industry) : engInd(nc?.salary?.group, nc?.salary?.industry, nc?.name),
    ind_sub: indSub(ME.industry || nc?.salary?.group, nc && (!ME.industry || ME.industry === nc.salary?.group) ? nc.salary?.industry : ""),   // 내가 고른 업종이 '화학·소재·에너지'인데 회사 이름을 못 찾았으면 '모름'
    job: ME.job, salary: offer && ME.contract ? ME.contract : ME.salary,   // E2: 제시 연봉(계약연봉)은 내 계약연봉과 비교
    wlb: nowWlb, place: ME.place || (nc ? coPlace(nc) : "수도권"),
    rating: nc?.grades?.["평판"]?.score ?? undefined, grade: nc ? ME_GRADE[nc.verdict] : undefined,
    must_off: !!ME.mustOff, lead_want: ME.leadWant || "", why: ME.why || "" };
  const target = { size: o.size || coSize(c), size_unknown: toLv === null, tier_n: toLv ?? undefined, ...coAbs(c), industry: engInd(c.salary?.group, c.salary?.industry, c.name), ind_sub: indSub(c.salary?.group, c.salary?.industry), job: ME.want || ME.job,
    salary: offer || est?.v, pay_unknown: !offer && !!est?.avg,   // 11-12 F8: 직급 연봉 없이 평균만 있으면 연봉으로 판정을 움직이지 않는다
    wlb: toWlb, wlb_unknown: !toWlb, place: o.place || coPlace(c),   // 옮길 회사 워라밸은 그 회사 현직자 점수로 (입력 안 받음)
    rating: c.grades?.["평판"]?.score ?? undefined, grade: nc ? ME_GRADE[c.verdict] : undefined, lead: !!ME.lead,
    lack: c.verdict === "판단자료 부족",   // 11-12 F1: 자료 부족 회사는 '가세요'까지
    how: offer ? "제시 연봉" : est?.how, basis: offer && ME.contract ? "계약" : "" };   // 6회차: 연봉 문구에 '이 회사 대리급 추정 연봉은 …'
  return { c: { type: "A", now, target }, est, offer };
}
// 이유 문장을 + ? ! 로 나눠 보이게
function meTone(t) {
  if (/깎이면 안|못 미쳐|손해예요|올라야 해요|어두워요\.$|다른 직무를 보세요|어려워요/.test(t)) return "fail";
  if (/확인하세요|확인해 보세요|때만|각오|애매|따라|정하세요|달라요|늦은 편|짧아요|짧은 편|낮아요|관건|아쉬워요|힘드실|접으세요|낮췄어요|내렸어요/.test(t)) return "cond";
  if (/좋아|기회|갈 만|올라|오른|않아요|돼요|없어요/.test(t)) return "plus";
  return "";
}
let meGeneral = false;     // '일반 판정 보기'를 누르면 이번 접속 동안만 내 상황을 빼고 본다
// 판정 단계는 일반 판정과 같은 7단계로. 회사 자체 판정 × 내 상황(F 규칙) × 얼마나 좋아지는지로 사람마다 다르게 (2026-10-27)
const ME_STEPS = ["비추예요", "다시 생각해요", "스펙 보고 결정하세요", "중립기어", "조건 보고 가세요", "가세요", "무조건 가세요"];
// up: 내 위치(지금 회사 급·연봉)가 이 회사보다 낮을수록 올려 줄 단계 수 (0~2)
//   2026-10-27 사용자: "내 스펙이 낮으면 기존 판정보다 높아져야 정상. 연봉 2천 오르는데 중립기어 박으면 어떡해"
// 11-12 F3: '조건 보고'는 판정을 실제로 낮춘다 — '조건 보고 가세요'까지 (ME_COND_CAP = [연봉 20% 이상일 때 상한, 그 밖의 상한])
//   전에는 뒤 항(Math.min(5, base + lift))이 늘 이겨서 문구만 붙고 판정은 그대로였다. 올림은 내 위치보다 좋은 자리(lift > 0)일 때만
//   o.soft: 조건이 연봉 협상뿐(11-07 규칙) → '조건 보고 가세요'를 지킨다.  o.noPay: 연봉을 비교할 수 없는 회사(평균만 있음, F8) → 연봉으로 올리지 않는다
const ME_COND_CAP = [4, 4];   // 11-12 사용자 "한 단계 약하게": 처음엔 [4, 3](연봉 20% 미만이면 중립기어)였으나, 조건이 붙으면 연봉과 관계없이 '조건 보고 가세요'까지로
function meLevel(v, gen, gain, up = 0, o = {}) {
  const base = { "무조건 가세요": 6, "가세요": 5, "조건 보고 가세요": 4, "중립기어": 3, "스펙 보고 결정하세요": 2, "다시 생각해요": 1, "비추예요": 0 }[gen] ?? 4;   // 판단자료 부족은 중간
  const lift = base >= 2 ? up : 0;   // 회사 자체가 나쁘면(다시 생각해요·비추) 내 조건으로 끌어올리지 않는다
  let n;
  if (v === "가요") n = o.noPay ? (base <= 1 ? base : Math.min(6, base + lift))
    : Math.max(Math.max(base, 4) + (gain >= 30 ? 1 : 0) - (base <= 1 ? 1 : 0), Math.min(6, base + lift));   // 내 조건이 좋으면 회사 판정보다 올라가거나 그대로, 크게 오르면 한 단계 더
  else if (v === "조건 보고") {                                                                                                  // 사람마다 갈림. 내 위치보다 한참 좋은 자리면 회사 판정보다 올린다(최대 '가세요')
    n = Math.min(base, o.soft || gain >= 20 ? ME_COND_CAP[0] : ME_COND_CAP[1]);
    if (lift > 0) n = Math.max(n, Math.min(5, base + lift));
  }
  else n = Math.min(base, base >= 2 ? 1 : 0);                                                                                    // 마요: 다시 생각해요, 회사도 나쁘면 비추
  return ME_STEPS[Math.max(0, Math.min(6, n))];
}
const ME_FIRST = { "무조건 가세요": "고민할 이유가 없어요. 무조건 가세요.", "가세요": "갈 만한 자리예요.", "조건 보고 가세요": "아래 조건이 맞을 때 가세요.",
  "중립기어": "가도 되고 안 가도 되는 자리예요. 뭘 더 원하는지에 따라 갈려요.", "스펙 보고 결정하세요": "내 다른 카드와 꼭 비교해 보고 정하세요.",
  "다시 생각해요": "지금 조건으로는 말리고 싶어요.", "비추예요": "내 상황에서도, 회사로 봐도 비추예요." };
const meNew = () => ME?.kind === "new";
const meWho = () => meNew()
  ? [ME.age && `${ME.age}세`, (ME.years || 0) > 0 ? `중고신입(경력 ${ME.years}년)` : "신입", ME.job, meSpec(ME) && `스펙 ${meSpec(ME).g}`].filter(Boolean).join(" · ")
  : [ME.years != null && `${ME.years}년 차`, ME.job, ME.salary && `${won(ME.salary)}만 원`].filter(Boolean).join(" · ");
// 신입·중고신입 판정: 회사 일반 판정(합격자 기준)에서 출발해, 내 나이·스펙·직무·다른 카드로 올리고 내린다 (2026-10-27)
//   F21 신입 나이(남 31·여 29) 넘으면 '잡을 만하면 잡기', 어리고 스펙 좋은데 회사가 약하면 '계속 준비', 전망 어두운 직무(F26)는 낮춤
// 익명 자료 보내기 (/me): 나이는 2살 나이대로만, 같은 내용은 이 탭에서 하루 한 번, 기기 번호는 안 보냄
let meQuiet = false;       // 후보 비교처럼 화면 밖에서 판정만 계산할 때는 기록을 보내지 않는다
function meSend(x) {
  if (!ME || meQuiet) return;
  const a = ME.age || 0, sp = meSpec(ME), nw = ME.kind === "new";
  const body = { ...x, mode: nw ? "new" : "career", sex: ME.sex || "", ageband: a ? `${a - a % 2}~${a - a % 2 + 1}` : "", years: ME.years || 0, job: ME.job || "",
    nstat: nw ? ME.nstat || "" : (ME.left ? "퇴사" : "재직"), school: ME.school ?? "", major: ME.major ?? "", lang: ME.lang ?? "", exp: ME.exp ?? "", fit: ME.fit ?? "", grade: sp ? sp.g : "",
    size: nw ? "" : ME.size || "", industry: nw ? "" : ME.industry || "", salary: ME.salary || "", wlb: nw ? "" : ME.wlb || "", fb: x.fb || "", went: x.went || "" };
  const key = "cc-me-" + new Date().toISOString().slice(0, 10) + JSON.stringify(body);
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) {}
  send("/me", body);
}
function meJudgeNew(c) {
  const o = meOver[c.name] || {}, sl = c.salary || {}, rg = c.grades?.["평판"]?.score;
  const est0 = mePayOk(o.salary) ? { v: o.salary, how: "제시 연봉" } : sl.newHire ? { v: sl.newHire, how: "이 회사 신입 추정 연봉" } : coSalary(c, 0);
  // 11-12 F8: 신입 연봉도 직급 연봉도 없이 전 직원 평균만 있으면 그 평균을 '신입 연봉' 자리에 쓰지 않는다
  const avgOnly = !!est0?.avg, est = avgOnly ? null : est0, lack = c.verdict === "판단자료 부족", lv = coLevel(c);
  // 판정은 엔진(fit_engine.js judgeNewbie, 5회차 문답지 기준)에서 — 사례 검사(node fit_test.js)와 같은 계산
  const r = FitEngine.judge({ type: "N", me: { ...ME, salary: ME.nstat === "재직 중" ? ME.salary : undefined },
    target: { size: coSize(c), tier_n: lv ?? undefined, industry: engInd(sl.group, sl.industry, c.name), base: ME_GRADE[c.verdict] ?? 4, rating: rg, wlb: coWlb(c) || "", place: coPlace(c), salary: est?.v, lack } });
  const V = r.verdict, n = r.n, age = ME.age || 0;
  const why = r.reasons.map(x => x.text);
  if (/비추예요|다시 생각해요/.test(c.verdict)) why.push(`회사 자체 판정은 '${c.verdict}'예요. 재무·평판을 꼭 확인하세요.`);
  else if (c.verdict === "판단자료 부족") why.push("이 회사는 재무·평판 자료가 부족해요. 회사 자체는 따로 확인하세요.");
  const guess = est && /추정/.test(est.how) ? " (추정이라 실제 오퍼와 다를 수 있어요)" : "";   // 6회차 C2
  let pay = est ? `${est.how} ${won(est.v)}만 원이에요.${guess}`
    : avgOnly ? `이 회사는 신입 연봉 자료가 없어요. 전 직원 평균 연봉은 ${won(est0.v)}만 원인데, 신입 연봉은 보통 이보다 낮아요. 제시 연봉을 넣어 보세요.` : "이 회사는 연봉 자료가 없어요. 제시 연봉을 넣어 보세요.";
  if (est && ME.salary && ME.nstat === "재직 중") {
    const g = est.v - ME.salary;
    pay = `${est.how} ${won(est.v)}만 원 — 지금보다 ${g >= 0 ? "+" : ""}${won(g)}만 원이에요.${guess}`;
  }
  meSend({ t: "v", co: c.name, v: V, gen: c.verdict });
  const z = meCompose(c, V, why, pay, { y: ME.years || 0, age, v: n >= 5 ? "가요" : n >= 3 ? "조건 보고" : "마요", est, left: false, newbie: true,
    working: ME.nstat === "재직 중", wlb: "", tenure: sl.tenure, sameInd: false }, rg != null ? [`현직자 평점은 종합 ${rg.toFixed(2)}점이에요.`] : [], { newbie: true, working: ME.nstat === "재직 중", lack, fin: coSize(c) === "금융" });
  const sp = r.spec;
  // 11-12 F7·F8: 금융사는 '급' 대신 평균 연봉 수준으로, 평균만 있는 회사는 '신입 ○○만'이 아니라 '회사 평균'으로 적는다
  const chips = [sp && `스펙 ${sp.g}`, coSize(c) === "금융" ? `금융${sl.avg ? ` · 평균 연봉 ${won(sl.avg)}만` : ""}` : `회사 급 ${coSize(c)}`, coGroupChip(c), ...r.tags,
    est && `${/제시/.test(est.how) ? "제시" : "신입"} ${won(est.v)}만`, avgOnly && `회사 평균 ${won(est0.v)}만(신입 연봉 아님)`, `회사 판정 ${c.verdict}`].filter(Boolean);
  return { v: V, z, est, chips };
}
// 회사 일반 한마디를 내 연차·나이·상황에 맞게 고친다 (2026-10-27 사용자: "그대로 붙이지 말고 15년 차면 '인생 마지막 회사'처럼")
// 각 규칙: 문장이 re 에 걸리면 fn(문장) 결과로 바꾼다. null 은 빼기, undefined 는 그대로
function meAdapt(lines, x) {
  const { y, age, v, est } = x;
  const late = y >= 15 || age >= 45, senior = y >= 10, exp = y >= 3;
  const RULES = [
    [/정년까지 여기라고 생각하기보단/, () => late ? (v === "가요" ? `${y}년 차에 이 정도 처우·분위기면 여기가 인생 마지막 회사예요. 정년까지 다닐 생각으로 가세요.` : `조건만 맞으면 ${y}년 차에 정년까지 그림을 그려도 되는 회사예요.`)
      : senior ? `${y}년 차면 다음 이직이 점점 어려워져요. 여기서 오래 다닐 수 있을지를 기준으로 보세요.`
      : x.newbie ? "신입으로 들어가 3~4년 일을 배우고 몸값을 키워 다음 점프를 준비하기 딱 좋아요."
      : y <= 5 ? `${y}년 차면 여기서 3~4년 몸값을 키워 다음 점프를 준비하기 딱 좋아요.` : undefined],
    [/이 회사 밖에서도 통하는 경력을/, () => late ? `${y}년 차면 밖으로 다시 나가기보다 이 회사 안에서 입지를 다지는 게 중요해요.` : undefined],
    [/2~3년.*(이직|환승|발판)|발판으로 쓰는|다음 이직의 무기|다음 이직 카드|다음 이직 때 든든/, () => late ? "이 연차엔 발판이 아니라 종착지로 볼 회사인지가 핵심이에요. 오래 다닐 팀인지 꼭 확인하세요."
      : senior ? `${y}년 차 이직은 기회가 점점 줄어요. 다음 이직보다 여기서 직급을 올리는 쪽으로 보세요.` : undefined],
    [/첫 1년|첫해|첫 평가/, () => exp && !x.newbie ? "경력직은 첫 6개월이 평판을 정해요. 전 회사 방식은 내려놓고 빨리 녹아드세요." : undefined],
    [/먼저 그만두지 마|선퇴사는 절대 금지/, () => x.newbie && !x.working ? "취업 준비 중이시니 이 합격 카드는 일단 쥐고, 남은 결과까지 보고 정하세요." : x.left ? "이미 퇴사하셨으니 공백이 길어지기 전에 정하는 게 좋아요. 그래도 이 카드 하나만 보고 서두르진 마세요." : undefined],
    [/징검다리|경력 한 줄 만들|오래 다닐 곳은 아니에요|오래 밟고/, () => late ? `${y}년 차엔 징검다리로 쓸 시간이 없어요. 오래 다닐 곳이 아니면 다른 카드를 보세요.` : undefined],
    [/승진(은| 자리| 속도)/, t => senior ? `${t} ${y}년 차 경력직은 입사 직급부터 확실히 정하고 가세요.` : undefined],
    [/지금 칼퇴하는 회사 다니시면[^.]*\.|워라밸 (있던|있는) 회사 다니던 분[^.]*\./, t => x.wlb === "칼퇴" ? t.replace(/지금 칼퇴하는 회사 다니시면[^.]*\.|워라밸 (있던|있는) 회사 다니던 분[^.]*\./, "지금 칼퇴하는 회사에서 오시는 거라 차이가 크게 느껴질 거예요. 저녁을 내줄 만큼 얻는 게 있는지 따져 보세요.")
      : /야근/.test(x.wlb || "") ? t.replace(/지금 칼퇴하는 회사 다니시면[^.]*\.|워라밸 (있던|있는) 회사 다니던 분[^.]*\./, "지금도 야근이 잦은 곳에서 오시니 적응은 되겠지만, 나아지진 않아요.") : undefined],
    [/경력직이면 평균 말고 직급별 금액을 보세요|내 연차 기준 오퍼를 보세요/, t => x.newbie && est ? t.replace(/(경력직이면 평균 말고 직급별 금액을 보세요|숫자보다 내 연차 기준 오퍼를 보세요)/, `신입은 평균 말고 ${est.how} ${won(est.v)}만 원을 보세요`) : est && y >= 1 ? t.replace(/(경력직이면 평균 말고 직급별 금액을 보세요|숫자보다 내 연차 기준 오퍼를 보세요)/, `${y}년 차시니 ${est.how} ${won(est.v)}만 원을 기준으로 보세요`) : undefined],
    [/다른 업계에서 넘어오는 거라면/, t => x.sameInd ? t.replace(/\s*다른 업계에서 넘어오는 거라면[^.]*\./, "") : t.replace(/다른 업계에서 넘어오는 거라면/, "다른 업계에서 넘어오시는 거라")],
  ];
  const out = [], mine = [];   // mine: 내 상황에 맞게 바꾼 말 → 앞쪽(회사 첫 줄 바로 뒤)에 둔다
  lines.forEach((line, i) => {
    let t = line;
    for (const [re, fn] of RULES) if (re.test(t)) { const r = fn(t); if (r !== undefined) t = r; if (t === null) break; }
    if (!t || out.includes(t) || mine.includes(t)) return;
    (t !== line ? mine : out).push(t);
  });
  out.unshift(...mine);
  // 상황에 따라 덧붙이는 말 (회사 앞날이 흔들리면 '마지막 회사'는 말하지 않는다)
  const shaky = lines.some(t => /앞날|미래|5년 뒤|흐릿|적자|걱정돼요/.test(t));
  if (late && v === "가요" && !shaky && !out.some(t => /마지막 회사|정년/.test(t))) out.unshift(`${y}년 차에 이런 조건이면 오래 다닐 마지막 회사로 생각하고 가도 돼요.`);
  if (age >= 40 && x.tenure != null && x.tenure < 5) out.push(`평균 근속 ${x.tenure}년의 젊은 조직이에요. ${age}세면 팀장·동료가 나보다 어릴 수 있어요. 그 분위기가 괜찮은지 생각해 보세요.`);
  return out;
}
// 내 상황 판정: F 규칙 엔진 + 회사 자체 판정(재무·평판)을 합친다. 계산할 수 없으면 null
function meJudge(c) {
  meCo = c;
  if (!ME || meGeneral) return null;
  if (meNoJudge(c)) return null;   // 11-13: 관청·군부대·조합·협회는 내 상황 판정을 내지 않는다 (이유는 meStrip 이 보여 준다)
  if (meNew()) return meJudgeNew(c);
  const { c: kase, est, offer } = meCase(c);
  if (!kase.now.salary || !kase.target.salary) return null;
  if (!mePayOk(kase.now.salary)) return null;   // 11-12 F9: 예전에 저장된 이상한 연봉(58 등)으로는 판정하지 않는다
  const noPay = !!kase.target.pay_unknown, fin = FitEngine.tier(kase.target.size).kind === "finance";
  let r = FitEngine.judge(kase);
  // 게임사 ②안 (2026-10-27 사용자 결정): 회사 자체 판정이 '가세요' 이상인 게임사는 업계 전망만으로 말리지 않고 '조건 보고 가세요'까지만 낮춘다
  const gameSoft = kase.target.industry === "게임" && (ME_GRADE[c.verdict] ?? 0) >= 5 && r.reasons.some(x => x.rule === "F26" && /전망이 어두워요\.$/.test(x.text));
  const kj = gameSoft ? { ...kase, target: { ...kase.target, industry: "", ind_sub: undefined } } : kase;   // 엔진에만 업계를 빼고 넘긴다 (칩·문구는 그대로 게임)
  if (gameSoft) r = FitEngine.judge(kj);
  // 직무를 바꾸는 사람은 이미 바꾸기로 하고 가는 것 → 직무 전환은 판정에서 덜 본다 (2026-10-27 사용자: "일반 판정 무조건 가세요인데 직무 바뀐다고 죽여 놓냐")
  //   같은 직무로 옮긴다고 치고 다시 봐서 그쪽이 더 좋으면 그 판정을 쓰고, 직무 전환은 '알고 가세요' 한 줄로만 남긴다
  const jobMove = FitEngine.family(kase.now.job) !== FitEngine.family(kase.target.job);
  if (jobMove && !FitEngine.badField({ job: kase.target.job })) {
    const r2 = FitEngine.judge({ ...kj, target: { ...kj.target, job: kase.now.job } }), rk = { "마요": 0, "조건 보고": 1, "가요": 2 };
    if (rk[r2.verdict] > rk[r.verdict]) r = { ...r, verdict: r2.verdict, soft: r2.soft, reasons: r.reasons.filter(x => !/^F(6|28)$/.test(x.rule) || !x.text.includes("직무")) };
  }
  let v = r.verdict;
  const why = r.reasons.map(x => x.rule === "F28" && /직무가 바뀌어요/.test(x.text) ? "직무가 바뀌는 건 이미 정하고 가시는 거라 판정엔 크게 넣지 않았어요." : x.text);
  const wlbWorse = FitEngine.wlbAdjust(kase.now, kase.target, 0) != null;
  if (jobMove && !why.some(t => /직무/.test(t))) why.push(wlbWorse
    ? `${meJ(ME.want, "으로", "로")} 직무도 바뀌고 야근도 늘어서 처음 몇 년은 힘드실 거예요. 죽었다 생각하고 몇 년 버티면 길이 보입니다.`   // 6회차 D5
    : `${meJ(ME.want, "으로", "로")} 직무를 바꾸시는 거라, 첫 1년은 새 직무를 배운다는 마음으로 가세요.`);
  // 회사 자체가 나쁘면 내 조건이 좋아도 한 단계 낮춘다 (엔진은 재무를 안 봄)
  if (/비추예요|다시 생각해요/.test(c.verdict)) {
    why.push(`회사 자체 판정은 '${c.verdict}'예요. 재무·평판을 꼭 확인하고 가세요.`);
  } else if (c.verdict === "판단자료 부족") why.push("이 회사는 재무·평판 자료가 부족해요. 회사 자체는 따로 확인하세요.");
  // 내 연봉과 비교한 숫자 한 줄
  // 11-12 F8: 평균만 있는 회사는 내 연봉과 비교하지 않는다 (15년 차도 전 직원 평균과 비교돼 크게 깎이는 것처럼 나오던 문제)
  const gap = noPay ? 0 : kase.target.salary - kase.now.salary, pct = noPay ? 0 : Math.round(gap / kase.now.salary * 100);
  const tg = kase.target.salary - ME.salary, tp = Math.round(tg / ME.salary * 100);   // E2: 계약연봉끼리 비교했을 때 원천징수 총액 기준도 함께
  const pay = noPay ? `이 회사 평균 연봉은 ${won(kase.target.salary)}만 원이에요. 전 직원 평균이라 ${ME.years != null ? `${ME.years}년 차인 ` : ""}내 연봉과 바로 비교하긴 어려워요. 제시받은 연봉을 넣으면 정확히 비교해 드려요.${r.avgLow ? " 다만 전 직원 평균이 내 연봉보다 많이 낮은 회사라, 내 연봉을 맞춰 줄 수 있는 곳인지는 미리 확인하세요." : ""}`
    : `${offer ? "제시 연봉" : est.how} ${won(kase.target.salary)}만 원 — 지금${kase.target.basis ? ` 계약연봉(${won(kase.now.salary)}만 원)` : ""}보다 ${gap >= 0 ? "+" : ""}${won(gap)}만 원(${pct >= 0 ? "+" : ""}${pct}%)이에요.${kase.target.basis ? ` 원천징수 총액(${won(ME.salary)}만 원)과 비교하면 ${tp >= 0 ? "+" : ""}${tp}%${tp < 10 ? "라, 성과급이 얼마나 나오는지는 꼭 확인해 보세요." : "예요."}` : offer ? "" : " (추정이라 실제 오퍼와 다를 수 있어요)"}`;
  // 회사 일반 판정의 한마디를 이어 붙여 최소 5줄 (2026-10-27 사용자 요청)
  const sl = c.salary || {}, rg = c.grades?.["평판"]?.score;
  const facts = [];
  if (rg != null) facts.push(`현직자 평점은 종합 ${rg.toFixed(2)}점이에요${rg < 3 ? ". 3.0 아래라 분위기를 꼭 확인하세요" : ""}.`);
  if (sl.tenure != null) facts.push(`직원 ${won(sl.members)}명, 평균 근속 ${sl.tenure}년인 회사예요.`);
  if (sl.newHire && (ME.years || 0) <= 1) facts.push(`신입 추정 연봉은 ${won(sl.newHire)}만 원이에요.`);
  // 내 위치가 낮을수록 올린다: 한 단계 위 회사(또는 회사 판정이 지금 회사보다 2단계 이상 좋음) +1, 연봉 25% 이상 오름 +1
  const step = r.step ?? (r.noTier ? 0 : FitEngine.tierOf(kase.target).n - FitEngine.tierOf(kase.now).n);   // 11-12 F7: 규모·수준을 모르면 급 비교 없음 · 11-14: 크기 차이로 같은 급이 된 것까지 엔진 값을 따른다
  const better = step >= 1 || (kase.now.grade != null && kase.target.grade != null && kase.target.grade - kase.now.grade >= 2);
  const up = (better ? 1 : 0) + (pct >= 25 ? 1 : 0);
  // 올린 까닭 말: 금융사는 '급'이 아니라 회사 수준(평균 연봉 기준)으로 말한다 (11-12 F7)
  const upWhy = step >= 1 ? (fin ? "지금 회사보다 회사 수준(평균 연봉 기준)이 높은 금융사라" : "지금 내 자리보다 위 급이라") : better ? "지금 회사보다 회사 자체 평가가 확실히 좋아서" : "연봉이 크게 오르는 자리라";
  let V = meLevel(v, c.verdict, pct, up, { soft: r.soft, noPay });
  // 업계 전망만으로 말리는데 다른 조건이 압도적이면(연봉 +1,000만 원 이상·+25% 이상·위 급) 한 단계만 올린다 (2026-10-27 사용자: "연봉 1000 이상 차이나는데 가지 말라는 건 이상")
  //   업계를 빼고 다시 본 판정이 더 좋을 때만 = 업계가 원인일 때만. 업계 뺀 판정보다 높이 올리지는 않는다
  if (!gameSoft && (gap >= 1000 || pct >= 25 || better)) {
    const r0 = FitEngine.judge({ ...kj, target: { ...kj.target, industry: "", ind_sub: undefined } });
    const V0 = meLevel(r0.verdict, c.verdict, pct, up, { soft: r0.soft, noPay }), i = ME_STEPS.indexOf(V), i0 = ME_STEPS.indexOf(V0);
    if (i0 > i) {
      V = ME_STEPS[i + 1];
      // 11-12: 이 줄은 업황·전망 때문이 아니라 그냥 업계가 바뀌는 조건(F30)일 때도 나온다 → 그때는 '전망이 밝지 않지만'이라고 하지 않는다 (소재·에너지·유통 등에 잘못 붙던 말)
      const indNm = (kase.target.ind_sub && kase.target.ind_sub !== "모름" ? kase.target.ind_sub : kase.target.industry) || "이 업계", dim = FitEngine.downInd(kase.target) || FitEngine.badField(kase.target);
      why.push(`${dim ? meJ(indNm, "은", "는") + " 전망이 밝지 않지만" : "업계가 바뀌는 이동이지만"}, ${gap >= 1000 ? `연봉이 ${won(gap)}만 원 오르는` : step >= 1 ? (fin ? "회사 수준(평균 연봉 기준)이 지금보다 높은" : "지금보다 위 급인") : better ? "회사 자체 평가가 지금 회사보다 좋은" : "연봉이 크게 오르는"} 조건이라 ${dim ? "업계 걱정만으로" : "그것만으로"} 말리진 않고 한 단계 올렸어요.`);
    }
  }
  if (gameSoft) {
    V = ME_STEPS[Math.min(ME_STEPS.indexOf(V), 4)];
    why.push("게임 업계는 전망이 밝은 편이 아니라 '조건 보고 가세요'까지만 드려요. 회사 자체가 좋아서 가도 되지만, 길게 보면 다른 업계에서도 통하는 경력으로 키워 두세요.");
  }
  const upLine = `회사 일반 판정은 '${c.verdict}'지만, ${upWhy} 내 기준에선 더 좋은 카드예요.`;
  if (ME_GRADE[V] > (ME_GRADE[c.verdict] ?? 4)) why.unshift(upLine);
  // 옮기려는 가장 큰 이유: 그 이유를 이 회사가 풀어 주는지 회사 자료로 본다. 못 풀어 주면 '조건 보고 가세요'까지만
  const reason = meReason(c, kase, pct);
  if (reason) {
    if (reason.text) why.unshift(reason.text);
    if (reason.cap) V = ME_STEPS[Math.min(ME_STEPS.indexOf(V), reason.cap === true ? 4 : reason.cap)];
  }
  // 6회차 B2: 갈 회사 연봉이 낮으면 협상이 조건 → 엔진이 정한 상한('조건 보고 가세요' 또는 '중립기어')
  if (r.cap != null) V = ME_STEPS[Math.min(ME_STEPS.indexOf(V), r.cap)];
  // E2: 원천징수 총액 기준 10% 미만이어도 판정은 막지 않는다 (2026-10-31 사용자: 회사 좋으면 '무조건 가세요'까지)
  // 6회차 A: 워라밸이 나빠지면 (워라밸 중요한 사람은 세게) 판정을 낮추고, 그 얘기를 첫 줄·이유 맨 위에
  const wa = FitEngine.wlbAdjust(kase.now, kase.target, pct);
  if (wa) {
    V = ME_STEPS[Math.min(FitEngine.wlbApply(ME_STEPS.indexOf(V), wa), 5)];   // 워라밸이 나빠지는데 '고민할 이유가 없어요'는 아니다 (6회차 D1)
    why.unshift(...wa.lines);
  } else if (ME.mustOff && ME.why !== "워라밸" && kase.target.wlb === "칼퇴" && kase.now.wlb !== "칼퇴") why.push(`칼퇴가 꼭 필요하시면 맞는 방향이에요(현직자 워라밸 '칼퇴' 쪽). ${FitEngine.TB}`);   // 6회차 D3
  else if (ME.mustOff && kase.target.wlb_unknown) why.push("칼퇴가 꼭 필요하신데 이 회사는 현직자 워라밸 자료가 없어요. 들어갈 팀의 퇴근 문화를 면접에서 꼭 확인하세요.");   // 11-12 F9: 자료 없음을 '보통'으로 단정하지 않는다
  // 워라밸이 중요한 사람(칼퇴 필수·이유=워라밸)인데 갈 회사 워라밸을 모르면 '무조건 가세요'는 아니다 (전에는 '보통'으로 쳐서 같은 상한이 걸렸음)
  if (!wa && kase.target.wlb_unknown && (ME.mustOff || ME.why === "워라밸")) V = ME_STEPS[Math.min(ME_STEPS.indexOf(V), 5)];
  // 마지막에: 낮춘 뒤 '더 좋은 카드' 말은 빼고, 이유=연봉 말과 겹치는 연봉 낮음 말은 하나만
  if (ME_GRADE[V] <= (ME_GRADE[c.verdict] ?? 4)) { const i = why.indexOf(upLine); if (i >= 0) why.splice(i, 1); }
  if (reason?.cap === 2) { const i = why.findIndex(t => /낮아요\. (이직 시|협상으로|연봉 협상을)/.test(t)); if (i >= 0) why.splice(i, 1); }
  meSend({ t: "v", co: c.name, v: V, gen: c.verdict });
  //   연봉을 비교 못 한 회사(noPay)에는 '이런 조건이면 마지막 회사'처럼 조건이 좋다는 전제의 말을 붙이지 않는다
  const z = meCompose(c, V, why, pay, { y: ME.years || 0, age: ME.age || 0, v: ME_GRADE[V] >= 5 && !noPay ? "가요" : ME_GRADE[V] >= 3 ? "조건 보고" : "마요", est: noPay ? null : est, left: !!ME.left,
    wlb: kase.now.wlb, tenure: sl.tenure, sameInd: kase.now.industry === kase.target.industry }, facts,
    { pct, cap: reason?.cap, now: kase.now.salary, first: wa?.first, wlbTop: wa?.lines, left: !!ME.left, offer: !!offer, lack: !!kase.target.lack, fin, noPay, avgLow: !!r.avgLow });
  const chips = [r.noTier ? (kase.now.size_unknown ? "지금 회사 규모 모름" : "회사 수준 모름") : fin ? (step > 0 ? "회사 수준 높음(평균 연봉 기준)" : step < 0 ? "회사 수준 낮음(평균 연봉 기준)" : "회사 수준 비슷(평균 연봉 기준)")
      : step > 0 ? "한 단계 위 회사" : step < 0 ? "아래 급 회사" : "같은 급", coGroupChip(c), noPay ? "연봉 비교 안 함(평균만 있음)" : `연봉 ${pct >= 0 ? "+" : ""}${pct}%`,
    kase.now.industry && kase.target.industry ? (kase.now.industry === kase.target.industry ? "같은 업계" : "업계 바뀜") : "",
    FitEngine.family(kase.now.job) === FitEngine.family(kase.target.job) ? "같은 직무" : "직무 전환",
    reason ? `이유(${ME.why}) ${reason.cap || reason.wlb ? "안 풀림" : "풀림"}` : "", wa && wa.drop + (wa.fix != null ? 1 : 0) > 0 ? "워라밸로 낮춤" : wa ? "워라밸 나빠짐" : "", `회사 판정 ${c.verdict}`].filter(Boolean);
  return { v: V, z, kase, est, chips };
}
// ── 내 상황 한마디 다시 짜기 (2026-10-27 사용자: "밑은 칭찬 일색인데 위 판정은 '다시 생각해요'" → 회사 말을 그대로 긁지 말고 사람에 맞춰)
//   1) 회사 한마디에서 판정에 묶인 말(첫 줄·맺음·꼬리표)은 버린다 → 내 판정 머리말·맺음으로 바꾼다
//   2) 남은 회사 말은 좋은 점(+)·걸리는 점(-)·사실(0)로 나눠, 내 판정 방향에 맞게 고른다
//      말리는 판정이면 걸리는 점 위주·좋은 점은 1줄, 가라는 판정이면 좋은 점 위주·걸리는 점은 '알고 가세요'로
//   3) 회사 자체 판정과 내 판정이 2단계 넘게 다르면 왜 다른지 한 줄로 이어 준다
const ZK = [["이건\\ 고민할\\ 질문이\\ 아니라\\ 축하할\\ 일이에요\\ ㅎㅎ", "v"], ["합격했다면\\ 무조건\\ 가세요\\.\\ 지금\\ 다니는\\ 회사엔\\ 감사\\ 인사만\\ 남기고\\ 오세요\\.", "v"], ["올해\\ 성과급\\ 시즌에\\ 웃고\\ 계실\\ 거예요\\.\\ 당장\\ 사인하세요!", "v"], ["이\\ 카드\\ 놓치면\\ 두고두고\\ 이불킥합니다\\.\\ 가세요\\.", "v"], ["제가\\ 말릴\\ 이유를\\ 하나도\\ 못\\ 찾았어요\\.\\ 축하드려요!", "v"], ["여긴\\ '갈까\\ 말까'가\\ 아니라\\ '언제\\ 출근하지'를\\ 고민하실\\ 곳이에요\\ ㅎㅎ", "v"], ["이\\ 정도\\ 회사는\\ 커리어에\\ 오래\\ 남는\\ 이름이에요\\.\\ 망설이지\\ 마세요\\.", "v"], ["합격\\ 문자\\ 캡처해\\ 두세요\\.\\ 무조건\\ 가셔야\\ 하는\\ 곳이에요\\.", "v"], ["돈도\\ 챙겨주고\\ 사람들\\ 평가도\\ 좋아요\\.\\ 이\\ 정도면\\ 고민은\\ 사치예요\\ ㅎㅎ", "v"], ["연봉도\\ 평판도\\ 위쪽이에요\\.\\ 둘\\ 다\\ 잡기\\ 쉽지\\ 않은데\\ 이\\ 회사는\\ 잡았어요\\.", "v"], ["주는\\ 만큼\\ 갈아\\ 넣는\\ 회사가\\ 아니라,\\ 많이\\ 주고\\ 다닐\\ 만한\\ 회사예요\\.", "v"], ["통장도\\ 멘탈도\\ 덜\\ 털릴\\ 회사예요\\.\\ 고민\\ 끝\\.", "v"], ["오래\\ 다닐\\ 회사를\\ 찾으셨다면\\ 여기예요\\.\\ 크게\\ 튀진\\ 않아도\\ 크게\\ 흔들리지도\\ 않는\\ 곳이에요\\.", "v"], ["롱런하기\\ 좋은\\ 회사예요\\.\\ 체력\\ 좋은\\ 회사에\\ 평판까지\\ 받쳐\\ 주네요\\.", "v"], ["회사가\\ 쉽게\\ 안\\ 무너지고,\\ 안에서도\\ 나쁜\\ 소리가\\ 적어요\\.\\ 안정\\ 원하시면\\ 정답이에요\\.", "v"], ["화려하진\\ 않아도\\ 든든한\\ 회사예요\\.\\ 이런\\ 곳이\\ 길게\\ 보면\\ 남는\\ 장사예요\\.", "v"], ["꺼지지\\ 않고\\ 조금씩\\ 크는\\ 회사,\\ 제가\\ 제일\\ 좋아하는\\ 타입이에요\\.", "v"], ["급하게\\ 크지도,\\ 멈춰\\ 있지도\\ 않아요\\.\\ 딱\\ 다니기\\ 좋은\\ 속도로\\ 크는\\ 회사예요\\.", "v"], ["규모\\ 갖추고\\ 꾸준히\\ 크는\\ 회사예요\\.\\ 자리도\\ 조금씩\\ 늘어나는\\ 곳이에요\\.", "v"], ["타이밍이\\ 좋아요\\.\\ 올라가는\\ 엘리베이터에\\ 타는\\ 느낌이에요\\.", "v"], ["지금\\ 들어가면\\ 좋은\\ 흐름에\\ 올라타는\\ 거예요\\.\\ 지금\\ 합류할\\ 수\\ 있다면\\ 합류하세요!", "v"], ["요즘\\ 분위기가\\ 좋은\\ 회사예요\\.\\ 이럴\\ 때\\ 들어가는\\ 사람이\\ 성과급\\ 덕을\\ 봐요\\.", "v"], ["바람이\\ 등\\ 뒤에서\\ 불고\\ 있는\\ 회사예요\\.\\ 가세요\\.", "v"], ["고민할\\ 시간에\\ 사인하세요\\ ㅎㅎ", "v"], ["이\\ 카드는\\ 쥐고\\ 가셔도\\ 돼요\\.", "v"], ["합격\\ 축하드려요\\.\\ 이건\\ 가는\\ 게\\ 맞아요\\.", "v"], ["숫자도\\ 평판도\\ 크게\\ 걸리는\\ 게\\ 없어요\\.\\ 가세요\\.", "v"], ["제\\ 기준표에서\\ 대부분\\ 통과한\\ 회사예요\\.\\ 자신\\ 있게\\ 가셔도\\ 돼요\\.", "v"], ["좋은\\ 회사\\ 맞아요\\.\\ 들어가서\\ 잘\\ 버티기만\\ 하면\\ 돼요\\.", "v"], ["회사는\\ 괜찮아요\\.\\ 문제는\\ 돈이에요\\.", "v"], ["다닐\\ 만한데\\ 연봉이\\ 발목\\ 잡아요\\.\\ 협상에서\\ 승부\\ 보세요\\.", "v"], ["회사\\ 점수는\\ 되는데\\ 연봉\\ 점수가\\ 박해요\\.\\ 여긴\\ 협상이\\ 반이에요\\.", "v"], ["좋은\\ 회사\\ 조건에서\\ '돈'만\\ 쏙\\ 빠져\\ 있어요\\.\\ 그걸\\ 감수할지가\\ 관건이에요\\.", "v"], ["갈\\ 만은\\ 한데,\\ 저녁\\ 있는\\ 삶은\\ 내려놓고\\ 가셔야\\ 해요\\.", "v"], ["회사는\\ 좋은데\\ 일\\ 많기로\\ 유명한\\ 쪽이에요\\.\\ 체력\\ 자신\\ 없으면\\ 비추\\.", "v"], ["배우는\\ 건\\ 많을\\ 거예요\\.\\ 대신\\ 퇴근\\ 시간은\\ 회사가\\ 정해요\\ ㅎㅎ", "v"], ["크는\\ 회사라\\ 배울\\ 건\\ 많아요\\.\\ 대신\\ 체력이랑\\ 멘탈\\ 다\\ 털릴\\ 각오\\ 하세요\\.", "v"], ["성장\\ 속도가\\ 빨라서\\ 기회도\\ 많고\\ 혼돈도\\ 많아요\\.", "v"], ["로켓은\\ 맞는데\\ 안전벨트는\\ 없어요\\.\\ 본인이\\ 매고\\ 타셔야\\ 해요\\.", "v"], ["나쁘진\\ 않아요\\.\\ 근데\\ '좋다'까진\\ 아니에요\\.\\ 팀\\ 분위기\\ 따로\\ 꼭\\ 알아보세요\\.", "v"], ["평판\\ 딱\\ 중간이에요\\.\\ 이런\\ 데는\\ 회사보다\\ 어느\\ 팀\\ 가느냐가\\ 전부예요\\.", "v"], ["회사\\ 전체로는\\ 무난해요\\.\\ 결국\\ 내\\ 팀장이\\ 누구냐가\\ 반이에요\\.", "v"], ["갈\\ 만한\\ 회사예요\\.\\ 다만\\ 조건은\\ 꼼꼼히\\ 보세요\\.", "v"], ["70점짜리\\ 회사예요\\.\\ 나머지\\ 30점은\\ 들어갈\\ 팀과\\ 연봉이\\ 채워요\\.", "v"], ["가도\\ 되는\\ 회사예요\\.\\ 다만\\ '무조건'은\\ 아니에요\\.", "v"], ["괜찮은\\ 회사인데\\ 한두\\ 군데\\ 걸리는\\ 게\\ 있어요\\.\\ 아래\\ 내용\\ 보고\\ 판단하세요\\.", "v"], ["합격은\\ 잘하셨어요\\.\\ 사인\\ 전에\\ 체크리스트\\ 한\\ 번만\\ 돌려\\ 보세요\\.", "v"], ["여긴\\ 중립기어\\ 박을게요\\.\\ 회사는\\ 탄탄한데,\\ 사람마다\\ 맞고\\ 안\\ 맞고가\\ 갈리는\\ 곳이에요\\.", "v"], ["저는\\ 깜빡이만\\ 켜\\ 둘게요\\.\\ 안정이냐\\ 연봉\\ 상승이냐,\\ 뭘\\ 더\\ 원하시냐에\\ 따라\\ 답이\\ 갈려요\\.", "v"], ["이\\ 회사는\\ 좋다,\\ 나쁘다보다\\ '나랑\\ 맞냐'의\\ 문제예요\\.", "v"], ["추천도\\ 비추도\\ 아니에요\\.\\ 이건\\ 본인\\ 성향이\\ 정답을\\ 정하는\\ 회사예요\\.", "v"], ["브레이크도\\ 액셀도\\ 안\\ 밟을게요\\.\\ 아래\\ 특성\\ 읽어\\ 보고\\ 끌리면\\ 가세요\\.", "v"], ["스타트업은\\ 회사보다\\ 사람\\ 보고\\ 가는\\ 곳이에요\\.\\ 대표랑\\ 팀\\ 직접\\ 안\\ 보고\\ 가면\\ 후회해요\\.", "v"], ["평점\\ 낮은\\ 스타트업이에요\\.\\ 지분·연봉\\ 확실하지\\ 않으면\\ 절대\\ 서두르지\\ 마세요\\.", "v"], ["스타트업\\ 롤러코스터\\ 제대로\\ 타는\\ 곳이에요\\.\\ 버틸\\ 이유가\\ 분명할\\ 때만\\ 가세요\\.", "v"], ["회사\\ 체력은\\ 괜찮은데,\\ 다니는\\ 사람들\\ 평가가\\ 별로예요\\.", "v"], ["회사는\\ 멀쩡한데\\ 안에서\\ 들리는\\ 얘기가\\ 안\\ 좋아요\\.\\ 지금\\ 쥔\\ 카드랑\\ 꼭\\ 비교하세요\\.", "v"], ["경력\\ 한\\ 줄\\ 만들기엔\\ 괜찮아요\\.\\ 오래\\ 다닐\\ 곳은\\ 아니에요\\.", "v"], ["급하면\\ 가세요\\.\\ 급하지\\ 않으면\\ 한\\ 템포\\ 쉬어\\ 가세요\\.", "v"], ["이\\ 회사가\\ 지금\\ 내\\ 최선인지가\\ 먼저예요\\.\\ 회사만\\ 보면\\ 추천\\ 못\\ 해요\\.", "v"], ["징검다리로는\\ 써도\\ 돼요\\.\\ 오래\\ 밟고\\ 서\\ 있을\\ 돌은\\ 아니에요\\.", "v"], ["회사\\ 체력이\\ 약해요\\.\\ 업황\\ 한\\ 번\\ 꺾이면\\ 제일\\ 먼저\\ 휘청할\\ 곳이에요\\.", "v"], ["빚이\\ 많아요\\.\\ 좋을\\ 땐\\ 모르는데\\ 나빠지면\\ 사람부터\\ 자릅니다\\.", "v"], ["재무\\ 안전벨트가\\ 헐렁해요\\.\\ 입사\\ 전에\\ 다시\\ 생각하세요\\.", "v"], ["성장이\\ 멈췄어요\\.\\ 들어가서\\ 키울\\ 커리어가\\ 안\\ 보여요\\.", "v"], ["매출이\\ 뒷걸음질\\ 중이에요\\.\\ 줄어드는\\ 회사에선\\ 승진도\\ 성과급도\\ 같이\\ 줄어요\\.", "v"], ["내리막\\ 회사예요\\.\\ 반등\\ 신호\\ 보일\\ 때까지\\ 기다리는\\ 게\\ 나아요\\.", "v"], ["몇\\ 년째\\ 적자예요\\.\\ 성과급\\ 얘기는\\ 당분간\\ 없다고\\ 보세요\\.", "v"], ["돈을\\ 못\\ 버는\\ 회사예요\\.\\ 적자가\\ 길면\\ 복지부터\\ 깎여요\\.", "v"], ["적자가\\ 반복돼요\\.\\ 월급은\\ 나와도\\ 성장\\ 얘기는\\ 듣기\\ 힘들어요\\.", "v"], ["합격은\\ 축하드리지만,\\ 사인은\\ 잠깐\\ 미뤄\\ 두세요\\.", "v"], ["한\\ 번\\ 더\\ 생각해\\ 보세요\\.\\ 이대로\\ 가면\\ 후회할\\ 확률\\ 높아요\\.", "v"], ["급하게\\ 결정할\\ 회사\\ 아니에요\\.\\ 다른\\ 카드부터\\ 확인하세요\\.", "v"], ["제\\ 기준표에서\\ 빨간불이\\ 여러\\ 개\\ 켜졌어요\\.\\ 아래\\ 꼭\\ 보세요\\.", "v"], ["가지\\ 말란\\ 건\\ 아닌데,\\ '여기가\\ 최선이다'\\ 확신\\ 있을\\ 때만\\ 가세요\\.", "v"], ["솔직히\\ 말립니다\\.\\ 회사는\\ 크는데\\ 사람이\\ 못\\ 버티는\\ 곳이에요\\.", "v"], ["숫자는\\ 화려한데\\ 평판이\\ 박살\\ 나\\ 있어요\\.\\ 사람\\ 갈아서\\ 크는\\ 전형적인\\ 패턴이에요\\.", "v"], ["성장\\ 그래프에\\ 속지\\ 마세요\\.\\ 그\\ 그래프\\ 밑에\\ 사람들이\\ 깔려\\ 있어요\\.", "v"], ["숫자도\\ 평판도\\ 다\\ 빨간불이에요\\.\\ 저라면\\ 안\\ 갑니다\\.", "v"], ["이\\ 카드는\\ 버리셔도\\ 돼요\\.\\ 더\\ 좋은\\ 카드\\ 충분히\\ 나와요\\.", "v"], ["들어가는\\ 날부터\\ 탈출\\ 계획\\ 세워야\\ 하는\\ 곳이에요\\.", "v"], ["냉정하게\\ 말할게요\\.\\ 비추예요\\.", "v"], ["여기\\ 가려고\\ 지금\\ 회사\\ 그만두는\\ 거면\\ 무조건\\ 말립니다\\.", "v"], ["회사는\\ 괜찮은데\\ 워라밸은\\ 시망이에요\\.\\ 엄청\\ 빡셀\\ 각오\\ 하셔야\\ 해요\\.", "v"], ["숫자는\\ 좋은데\\ 사람이\\ 갈려요\\.\\ 워라밸\\ 있는\\ 회사\\ 다니던\\ 분이면\\ 포기도\\ 고려하세요\\.", "v"], ["여긴\\ 커리어\\ 받고\\ 저녁을\\ 내주는\\ 회사예요\\.\\ 그\\ 거래가\\ 괜찮으면\\ 가세요\\.", "v"], ["숫자만\\ 보면\\ 괜찮아\\ 보여요\\.\\ 근데\\ 이\\ 회사는\\ '누구의\\ 계열사인지'부터\\ 봐야\\ 해요\\.", "v"], ["점수표는\\ 나쁘지\\ 않아요\\.\\ 문제는\\ 점수표에\\ 안\\ 나오는\\ 모회사\\ 그림자예요\\.", "v"], ["겉보기\\ 성적은\\ 괜찮은데,\\ 고스펙이라면\\ 한\\ 번\\ 멈춰서\\ 보세요\\.", "v"], ["지금\\ 조건만\\ 보면\\ 무조건\\ 가세요\\.\\ 다만\\ 미래는\\ 쪼끔\\ 걱정돼요\\.", "v"], ["돈도\\ 평판도\\ 최상급이에요\\.\\ 고민\\ 말고\\ 가세요\\.\\ 근데\\ 10년\\ 뒤까지\\ 장담하긴\\ 어려워요\\.", "v"], ["들어가면\\ 행복할\\ 회사예요\\.\\ 가세요\\.\\ 다만\\ 회사의\\ 앞날은\\ 살짝\\ 지켜봐야\\ 해요\\.", "v"], ["이\\ 조건이면\\ 안\\ 갈\\ 이유가\\ 없어요\\.\\ 미래\\ 걱정은\\ 들어가서\\ 해도\\ 늦지\\ 않아요\\.", "v"], ["지금\\ 이\\ 회사는\\ 꿀이에요\\.\\ 무조건\\ 가세요\\.\\ 단,\\ 이\\ 꿀이\\ 영원할지는\\ 조금\\ 물음표예요\\.", "v"], ["가세요\\.\\ 지금\\ 처우와\\ 분위기는\\ 확실한데,\\ 앞날은\\ 조금\\ 걱정돼요\\.", "v"], ["돈도\\ 주고\\ 다니기도\\ 좋은\\ 회사예요\\.\\ 가세요\\.\\ 다만\\ 회사\\ 성장\\ 쪽은\\ 살짝\\ 불안해요\\.", "v"], ["지금\\ 기준으론\\ 충분히\\ 갈\\ 만한\\ 회사예요\\.\\ 미래까지\\ 꽃길인지는\\ 조금\\ 지켜봐야\\ 해요\\.", "v"], ["현재만\\ 보면\\ 좋은\\ 카드예요\\.\\ 가세요\\.\\ 근데\\ 5년\\ 뒤\\ 그림은\\ 조금\\ 흐릿해요\\.", "v"], ["평점·연봉은\\ 좋은데\\ 회사\\ 지갑이\\ 비어\\ 있어요\\.\\ 그래서\\ '가세요'까진\\ 못\\ 드려요\\.", "v"], ["다니기\\ 좋다는\\ 평은\\ 많은데\\ 숫자가\\ 빨간불이에요\\.\\ 조건부로만\\ 추천해요\\.", "v"], ["사람들\\ 평가는\\ 괜찮아요\\.\\ 문제는\\ 회사가\\ 아직\\ 돈을\\ 못\\ 번다는\\ 거예요\\.", "v"], ["좋은\\ 카드처럼\\ 보여도\\ 재무가\\ 받쳐\\ 주질\\ 않아요\\.\\ 감수할\\ 수\\ 있을\\ 때만\\ 가세요\\.", "v"], ["회사\\ 분위기는\\ 나쁘지\\ 않은데\\ 연봉이\\ 아쉬워요\\.\\ 내\\ 스펙이면\\ 더\\ 받을\\ 수\\ 있는지가\\ 관건이에요\\.", "v"], ["다니기엔\\ 괜찮은\\ 회사인데\\ 돈이\\ 약해요\\.\\ 지금\\ 쥔\\ 카드보다\\ 나은지\\ 꼭\\ 비교하세요\\.", "v"], ["사람들\\ 평가는\\ 무난해요\\.\\ 연봉을\\ 감수할\\ 이유가\\ 있으면\\ 가셔도\\ 돼요\\.", "v"], ["평점·연봉은\\ 그럭저럭인데\\ 회사\\ 체력이\\ 걸려요\\.\\ 내\\ 스펙으로\\ 더\\ 탄탄한\\ 곳이\\ 가능한지\\ 먼저\\ 보세요\\.", "v"], ["다니는\\ 사람\\ 평가는\\ 괜찮은데\\ 숫자가\\ 약해요\\.\\ 오래\\ 다닐\\ 곳인지는\\ 따져\\ 보고\\ 정하세요\\.", "v"], ["딱\\ 중간\\ 회사예요\\.\\ 내\\ 스펙이\\ 이보다\\ 높으면\\ 더\\ 보고,\\ 비슷하면\\ 가셔도\\ 돼요\\.", "v"], ["좋다\\ 나쁘다\\ 하기\\ 애매한\\ 곳이에요\\.\\ 결국\\ 내\\ 다른\\ 카드가\\ 답을\\ 정해요\\.", "v"], ["무난한\\ 회사예요\\.\\ 더\\ 나은\\ 카드가\\ 나올\\ 스펙인지\\ 냉정하게\\ 보고\\ 정하세요\\.", "v"], ["평점\\ 자료가\\ 없어\\ 회사\\ 숫자로만\\ 봤어요\\.\\ 좋다\\ 나쁘다보다\\ 내\\ 스펙과\\ 다른\\ 카드가\\ 답을\\ 정하는\\ 자리예요\\.", "v"], ["다니는\\ 사람\\ 평가를\\ 못\\ 찾았어요\\.\\ 숫자는\\ 중간이라,\\ 지금\\ 쥔\\ 카드와\\ 비교해\\ 보고\\ 정하세요\\.", "v"], ["들어가서\\ 이\\ 회사\\ 이름값을\\ 최대한\\ 이력서에\\ 녹이세요\\.\\ 다음\\ 이직\\ 때\\ 든든한\\ 무기예요\\.", "v"], ["입사\\ 전까지\\ 건강\\ 챙기시고,\\ 들어가선\\ 첫\\ 1년\\ 평가만\\ 잘\\ 받으세요\\.\\ 나머진\\ 회사가\\ 해\\ 줘요\\ ㅎㅎ", "v"], ["이런\\ 회사는\\ 오래\\ 다녀도\\ 손해\\ 없어요\\.\\ 자리\\ 잡고\\ 길게\\ 보세요\\.", "v"], ["들어가서\\ 2\\~3년\\ 제대로\\ 경력\\ 쌓으면\\ 다음\\ 이직\\ 카드도\\ 좋아져요\\.", "v"], ["입사\\ 첫해에\\ 굵직한\\ 프로젝트\\ 하나\\ 잡으세요\\.\\ 그게\\ 다음\\ 이직의\\ 무기예요\\.", "v"], ["좋은\\ 회사일수록\\ 첫\\ 평가가\\ 중요해요\\.\\ 첫\\ 1년은\\ 전력\\ 질주하세요\\.", "v"], ["들어가면\\ 사내\\ 네트워크부터\\ 넓히세요\\.\\ 좋은\\ 회사는\\ 사람이\\ 자산이에요\\.", "v"], ["들어가신다면\\ 2\\~3년\\ 확실히\\ 경력\\ 쌓고,\\ 더\\ 좋은\\ 곳으로\\ 환승\\ 이직하는\\ 발판으로\\ 쓰세요\\.", "v"], ["연봉\\ 협상은\\ 사인\\ 전이\\ 제일\\ 세요\\.\\ 한\\ 번\\ 더\\ 밀어\\ 보세요\\.", "v"], ["면접\\ 역질문으로\\ 팀\\ 분위기랑\\ 야근\\ 문화는\\ 꼭\\ 확인하세요\\.", "v"], ["여기서\\ 버티는\\ 게\\ 목표가\\ 아니라,\\ 여기를\\ 발판으로\\ 쓰는\\ 게\\ 목표예요\\.", "v"], ["결국\\ '내가\\ 회사에서\\ 뭘\\ 제일\\ 원하냐'에\\ 답하면\\ 이\\ 회사\\ 답도\\ 나와요\\.", "v"], ["현직자\\ 한\\ 명만\\ 만나\\ 보셔도\\ 판단이\\ 확\\ 쉬워질\\ 거예요\\.", "v"], ["안정을\\ 원하면\\ 가고,\\ 빠른\\ 연봉\\ 상승을\\ 원하면\\ 다른\\ 카드를\\ 기다리세요\\.", "v"], ["지금\\ 회사가\\ 있다면\\ 먼저\\ 그만두지\\ 마시고,\\ 합격\\ 카드를\\ 들고\\ 환승\\ 이직으로\\ 움직이세요\\.", "v"], ["선퇴사는\\ 절대\\ 금지!\\ 합격\\ 카드\\ 쥐고\\ 다른\\ 회사\\ 결과까지\\ 보고\\ 정하세요\\.", "v"], ["가신다면\\ 경력\\ 한\\ 줄\\ 만들고\\ 빠르게\\ 다음\\ 카드를\\ 준비하세요\\.", "v"], ["내\\ 연차·스펙에서\\ 이보다\\ 나은\\ 카드가\\ 나올지\\ 냉정하게\\ 따져\\ 보세요\\.", "v"], ["지금\\ 회사가\\ 있다면\\ 먼저\\ 그만두지\\ 마시고,\\ 더\\ 나은\\ 카드가\\ 나올\\ 때까지\\ 환승\\ 이직\\ 원칙\\ 지키세요\\.", "v"], ["선퇴사는\\ 절대\\ 금지!\\ 이\\ 카드는\\ 보험으로만\\ 들고\\ 계세요\\.", "v"], ["합격했다는\\ 건\\ 시장에서\\ 통한다는\\ 뜻이에요\\.\\ 더\\ 좋은\\ 곳도\\ 충분히\\ 노려\\ 보세요\\.", "v"], ["급할수록\\ 돌아가세요\\.\\ 다음\\ 시즌에\\ 더\\ 좋은\\ 카드가\\ 나올\\ 수\\ 있어요\\.", "v"], ["합격했다는\\ 건\\ 실력이\\ 된다는\\ 뜻이에요\\.\\ 그\\ 실력이면\\ 더\\ 좋은\\ 곳\\ 갑니다\\.", "v"], ["지금\\ 회사가\\ 있다면\\ 절대\\ 먼저\\ 그만두지\\ 마세요\\.\\ 여긴\\ 버티는\\ 회사보다\\ 나을\\ 게\\ 없어요\\.", "v"], ["정\\ 가셔야\\ 한다면\\ 1년\\ 안에\\ 나올\\ 계획까지\\ 세우고\\ 들어가세요\\.", "v"], ["회사는\\ 합격점인데\\ 연봉이\\ 업계\\ 아래쪽이에요\\.\\ 여긴\\ 협상이\\ 반이에요\\.\\ 사인\\ 전에\\ 무조건\\ 한\\ 번\\ 더\\ 미세요\\.", "v"], ["들어갈\\ 만한\\ 회사인데\\ 숫자가\\ 아쉬워요\\.\\ 입사\\ 후엔\\ 올리기\\ 어려우니\\ 지금\\ 협상에서\\ 끝을\\ 보세요\\.", "v"], ["연봉만\\ 빼면\\ 다\\ 괜찮아요\\.\\ 직전\\ 연봉·경쟁\\ 오퍼를\\ 근거로\\ 처우부터\\ 끌어올리고\\ 가세요\\.", "v"], ["이름값과\\ 규모가\\ 있는\\ 회사라\\ 경력\\ 한\\ 줄로는\\ 확실해요\\.\\ 2\\~3년\\ 쌓고\\ 환승\\ 이직하는\\ 발판으로\\ 쓰세요\\.", "v"], ["오래\\ 다닐\\ 곳이라기보다\\ 커리어를\\ 한\\ 단계\\ 올려\\ 주는\\ 돌다리예요\\.\\ 밟고\\ 다음으로\\ 건너가세요\\.", "v"], ["이력서에\\ 남는\\ 이름이\\ 좋은\\ 회사예요\\.\\ 여기서\\ 굵직한\\ 프로젝트\\ 하나\\ 들고\\ 다음\\ 카드를\\ 노리세요\\.", "v"], ["요즘\\ 신작·신제품\\ 반응이\\ 좋아요\\.\\ 재무에\\ 반영되기\\ 전인\\ 지금이\\ 들어가기\\ 좋은\\ 타이밍이에요\\.", "v"], ["분위기가\\ 올라오는\\ 중이에요\\.\\ 성과급이\\ 오르기\\ 전에\\ 들어가는\\ 사람이\\ 제일\\ 이득이에요\\.", "v"], ["좋은\\ 뉴스가\\ 쌓이는\\ 시기예요\\.\\ 타이밍은\\ 지금이\\ 제일\\ 좋아요\\.", "v"], ["평가한\\ 사람이\\ 적어서\\ 숫자만으론\\ 판단이\\ 불안해요\\.\\ 현직자\\ 한\\ 명만\\ 만나\\ 보셔도\\ 답이\\ 확\\ 나와요\\.", "v"], ["자료가\\ 얇은\\ 회사예요\\.\\ 면접\\ 때\\ 팀원·팀장\\ 분위기를\\ 꼭\\ 직접\\ 보고\\ 판단하세요\\.", "v"], ["평점이\\ 충분히\\ 쌓이지\\ 않았어요\\.\\ 링크드인이나\\ 지인으로\\ 현직자\\ 이야기를\\ 꼭\\ 들어\\ 보세요\\.", "v"], ["스펙이\\ 되는\\ 분이면\\ 모회사·경쟁사를\\ 직접\\ 노리세요\\.\\ 여기는\\ 그\\ 다음\\ 선택지예요\\.", "v"], ["들어간다면\\ 1\\~2년\\ 안에\\ 모회사·경쟁사\\ 경력직으로\\ 넘어가는\\ 징검다리로만\\ 쓰세요\\.", "v"], ["모회사\\ 전환\\ 제도가\\ 실제로\\ 몇\\ 명에게\\ 열렸는지\\ 면접에서\\ 꼭\\ 물어보세요\\.", "v"], ["연봉은\\ .+?\\ 상위\\ .+?%라\\ 돈\\ 걱정은\\ 덜어도\\ 돼요\\.", "+"], ["연봉은\\ .+?\\ 상위\\ .+?%예요\\.\\ 이\\ 부분은\\ 자신\\ 있게\\ 자랑해도\\ 돼요\\ ㅎㅎ", "+"], [".+?\\ 상위\\ .+?%\\ 연봉이에요\\.\\ 처우는\\ 확실히\\ 챙겨\\ 주는\\ 회사예요\\.", "+"], ["5년\\ 평균\\ 영업이익률\\ .+?%,\\ 남는\\ 장사를\\ 꾸준히\\ 하는\\ 회사예요\\.", "+"], ["5년\\ 평균\\ 영업이익률이\\ .+?%예요\\.\\ 돈\\ 버는\\ 구조가\\ 잡혀\\ 있는\\ 회사예요\\.", "+"], ["영업이익률\\ 5년\\ 평균\\ .+?%,\\ 이익\\ 체력이\\ 좋아서\\ 성과급\\ 재원도\\ 넉넉한\\ 편이에요\\.", "+"], ["부채비율\\ .+?%로\\ 재무\\ 체력은\\ 탄탄해요\\.", "+"], ["부채비율\\ .+?%,\\ 회사가\\ 쉽게\\ 흔들릴\\ 걱정은\\ 적어요\\.", "+"], ["부채비율이\\ .+?%라\\ 빚\\ 걱정\\ 없는\\ 회사예요\\.", "+"], ["매출이\\ 제자리라\\ 자리가\\ 안\\ 늘어요\\.\\ 승진은\\ 느릴\\ 각오\\ 하세요\\.", "-"], ["매출이\\ 안\\ 늘어서\\ 위로\\ 올라갈\\ 자리가\\ 빡빡해요\\.", "-"], ["성장이\\ 정체돼\\ 있어요\\.\\ 승진\\ 속도는\\ 기대\\ 접으세요\\.", "-"], ["빚이\\ 많아서\\ 업황\\ 꺾이면\\ 구조조정\\ 리스크가\\ 있어요\\.", "-"], ["부채가\\ 무거워요\\.\\ 경기\\ 나빠지면\\ 제일\\ 먼저\\ 허리띠\\ 졸라맬\\ 회사예요\\.", "-"], ["레버리지가\\ 큰\\ 회사라\\ 업황\\ 따라\\ 분위기가\\ 크게\\ 출렁여요\\.", "-"], ["현직자\\ 워라밸\\ .+?점\\(잡플래닛·블라인드·캐치\\ 종합\\),\\ 야근은\\ 기본값이라고\\ 보세요\\.", "-"], ["워라밸\\ .+?점이에요\\.\\ 저녁\\ 약속은\\ 줄이셔야\\ 해요\\ ㅎㅎ", "-"], ["현직자\\ 워라밸\\ .+?점\\(잡플래닛·블라인드·캐치\\ 종합\\),\\ 칼퇴는\\ 기대\\ 안\\ 하시는\\ 게\\ 정신\\ 건강에\\ 좋아요\\.", "-"], ["연봉은\\ 업계\\ 아래쪽이라\\ 처우\\ 협상에서\\ 최대한\\ 끌어올리고\\ 들어가세요\\.", "-"], ["연봉이\\ 업계\\ 하위권이에요\\.\\ 입사\\ 후엔\\ 안\\ 올라요\\.\\ 지금\\ 협상에서\\ 끝장\\ 보세요\\.", "-"], ["처우는\\ 업계\\ 아래쪽이에요\\.\\ 직전\\ 연봉\\ 대비\\ 최소\\ 인상률은\\ 꼭\\ 지키고\\ 들어가세요\\.", "-"], ["성과급\\ 비중이\\ 큰\\ 회사라\\ 오퍼를\\ 비교할\\ 땐\\ '기본연봉'끼리\\ 비교하세요\\.", "0"], ["성과급이\\ 커서\\ 연봉이\\ 해마다\\ 출렁여요\\.\\ 비교는\\ 꼭\\ 기본연봉으로\\ 하세요\\.", "0"], ["총보상\\ 숫자에\\ 속지\\ 마세요\\.\\ 성과급\\ 비중이\\ 커서\\ 기본연봉부터\\ 따로\\ 보셔야\\ 해요\\.", "0"], ["회사가\\ 산업단지\\ 안에\\ 있어요\\.\\ 통근·편의시설·공기질은\\ 꼭\\ 직접\\ 확인하세요\\.", "0"], ["산업단지\\ 근무예요\\.\\ 출퇴근\\ 동선이랑\\ 주변\\ 환경은\\ 면접\\ 가는\\ 길에\\ 꼭\\ 보세요\\.", "0"], ["근무지가\\ 산업단지예요\\.\\ 통근버스·기숙사\\ 여부까지\\ 꼭\\ 물어보세요\\.", "0"], ["평점·재무\\ 없이\\ 국민연금\\ 자료만으로\\ 낸\\ 판정이에요\\.\\ 평점이\\ 있는\\ 회사로\\ 맞춰\\ 보면\\ 이런\\ 판정이\\ 맞는\\ 비율은\\ .+?%\\ 정도라,\\ 참고로만\\ 보세요\\.", "0"], ["국민연금\\ 숫자만\\ 보고\\ 한\\ 판정이라\\ 확신은\\ 낮아요\\.\\ 평점\\ 있는\\ 회사로\\ 대\\ 보면\\ 이런\\ 신호가\\ 실제로\\ 나쁜\\ 회사였던\\ 건\\ .+?%\\ 정도예요\\.", "0"], ["평점·재무\\ 없이\\ 국민연금\\ 자료만으로\\ 낸\\ 판정이에요\\.\\ 평점이\\ 있는\\ 회사로\\ 맞춰\\ 보면\\ 이런\\ 신호의\\ 회사\\ 중\\ .+?%\\ 정도가\\ 실제로\\ '조건\\ 보고\\ 가세요'\\ 이상이었고,\\ .+?%는\\ 나쁜\\ 판정이\\ 아니었어요\\.", "+"], ["국민연금\\ 숫자만\\ 보고\\ 한\\ 판정이에요\\.\\ 평점\\ 있는\\ 회사로\\ 대\\ 보면\\ 이\\ 신호는\\ .+?%\\ 정도가\\ 실제로\\ 갈\\ 만한\\ 회사였어요\\(나쁜\\ 회사가\\ 아니었던\\ 건\\ .+?%\\)\\.\\ 참고로\\ 보세요\\.", "+"], ["DART에서\\ 읽은\\ 재무\\ 숫자가\\ 이상해서\\ 다시\\ 확인하는\\ 중이에요\\.\\ 확인이\\ 끝날\\ 때까지는\\ 재무를\\ 빼고\\ 보되,\\ 판정은\\ 한\\ 단계만\\ 올려\\ 뒀어요\\.", "0"], ["이\\ 회사는\\ 재무\\ 자료가\\ 잘못\\ 읽힌\\ 것\\ 같아\\ 확인\\ 중이에요\\.\\ 그래서\\ 재무는\\ 빼고\\ 봤고,\\ 확인\\ 전이라\\ 판정은\\ 한\\ 단계만\\ 올렸어요\\.", "0"], ["재무\\ 자료에\\ 이상한\\ 값이\\ 있어\\ 판정에\\ 쓰지\\ 않았어요\\.\\ 확인이\\ 끝나기\\ 전까지는\\ 판정을\\ 한\\ 단계까지만\\ 올려\\ 둘게요\\.", "0"], ["재무\\ 자료가\\ 없고\\ 평점을\\ 남긴\\ 사람도\\ .+?명뿐이라,\\ 판정은\\ '조건\\ 보고\\ 가세요'까지만\\ 드려요\\.\\ 근거가\\ 더\\ 쌓이면\\ 다시\\ 볼게요\\.", "0"], ["재무도\\ 없고\\ 평가자도\\ .+?명이라\\ 확신하기\\ 일러요\\.\\ 그래서\\ 최고\\ '조건\\ 보고\\ 가세요'까지만\\ 줬어요\\.", "0"], ["평가자\\ .+?명,\\ 재무\\ 자료\\ 없음\\.\\ 이\\ 정도\\ 근거로\\ '가세요'라고\\ 하긴\\ 어려워서\\ '조건\\ 보고\\ 가세요'로\\ 묶었어요\\.", "0"], ["빚은\\ 많지만\\ 정부가\\ 뒷받침하는\\ 공공기관이라\\ 안정성은\\ 높게\\ 봤어요\\.\\ 다만\\ 적자가\\ 이어지면\\ 성과급·임금\\ 인상에는\\ 영향이\\ 있을\\ 수\\ 있어요\\.", "0"], ["재무\\ 숫자만\\ 보면\\ 불안하지만,\\ 나라가\\ 뒤에\\ 있는\\ 기관이라\\ 망할\\ 걱정은\\ 안\\ 하셔도\\ 돼요\\.\\ 그래서\\ 안정성은\\ 높게\\ 쳤어요\\.", "0"], ["부채는\\ 큰\\ 편이에요\\.\\ 그래도\\ 국가가\\ 재정으로\\ 받치는\\ 기관이라\\ 안정성은\\ 상으로\\ 봤어요\\.", "0"], ["재무\\ 숫자는\\ 약하지만\\ 지자체가\\ 세운\\ 공기업이라\\ 안정성은\\ 한\\ 단계\\ 올려\\ 봤어요\\.\\ 국가\\ 공기업만큼\\ 든든하진\\ 않아요\\.", "0"], ["빚이\\ 있는\\ 편이지만\\ 지자체가\\ 뒷받침하는\\ 지방공기업이라\\ 안정성은\\ 보통으로\\ 봤어요\\.", "0"], ["매출이\\ 연\\ .+?%씩\\ 늘고\\ 있어요\\.\\ 업력\\ .+?년\\ 된\\ 회사라\\ 스타트업식\\ 급성장과는\\ 결이\\ 달라요\\.\\ 최근\\ 수주가\\ 몰려\\ 바쁘게\\ 돌아가는\\ 시기라\\ 일이\\ 많을\\ 거예요\\.", "0"], ["오래된\\ 회사인데\\ 매출이\\ 연\\ .+?%씩\\ 뛰고\\ 있어요\\.\\ 수주가\\ 몰린\\ 호황기로\\ 보여요\\.\\ 당분간\\ 일이\\ 많고\\ 바쁠\\ 거라는\\ 건\\ 알고\\ 가세요\\.", "0"], ["매출이\\ 연\\ .+?%씩\\ 커지는\\ 중이에요\\.\\ 업력\\ .+?년\\ 회사의\\ 수주\\ 호황이라\\ 조직이\\ 무너질\\ 걱정보다는,\\ 일이\\ 몰려\\ 바쁜\\ 시기라는\\ 점을\\ 보세요\\.", "0"], ["평가한\\ 사람이\\ .+?명뿐이라\\ 평판은\\ .+?%만\\ 반영했어요\\.\\ 평가자가\\ 적을수록\\ 평판\\ 비중을\\ 낮추고,\\ 낮춘\\ 만큼은\\ 보통\\ 수준으로\\ 봐요\\.\\ 현직자\\ 한\\ 명만\\ 만나\\ 보셔도\\ 판단이\\ 확\\ 쉬워져요\\.", "0"], ["평가자가\\ .+?명이라\\ 평점을\\ 다\\ 믿긴\\ 일러요\\.\\ 그래서\\ 평판\\ 비중을\\ .+?%로\\ 낮추고\\ 나머지는\\ 보통으로\\ 쳤어요\\.\\ 현직자\\ 한\\ 명\\ 만나\\ 보는\\ 게\\ 제일\\ 빨라요\\.", "0"], ["평점을\\ 남긴\\ 사람이\\ .+?명뿐이에요\\.\\ 한두\\ 명\\ 기분에\\ 판정이\\ 흔들리지\\ 않게\\ 평판은\\ .+?%만\\ 반영했어요\\.\\ 현직자\\ 얘기를\\ 직접\\ 들어\\ 보세요\\.", "0"], ["평점이\\ 낮아서\\ 무조건\\ 추천은\\ 못\\ 해요\\.\\ 내\\ 스펙·연차·다른\\ 카드랑\\ 비교해서\\ 이\\ 회사가\\ 최선이면\\ 가고,\\ 더\\ 나은\\ 카드\\ 보이면\\ 기다리세요\\.", "-"], ["평점이\\ 낮아요\\.\\ 내\\ 스펙에서\\ 이\\ 회사가\\ 최선인지부터\\ 따지고,\\ 아니면\\ 다음\\ 카드\\ 기다리세요\\.", "-"], ["다니는\\ 사람들\\ 평가가\\ 박해요\\.\\ 지금\\ 연차·스펙에서\\ 더\\ 나은\\ 선택지\\ 있는지\\ 먼저\\ 보세요\\.", "-"], ["AI\\ 영향이\\ 큰\\ 업종이에요\\.\\ .+?\\.\\ 들어간다면\\ AI를\\ 쓰는\\ 쪽\\ 역할을\\ 잡으세요\\.", "-"], ["AI\\ 바람을\\ 정면으로\\ 맞는\\ 업종이에요\\.\\ .+?\\.\\ AI\\ 못\\ 다루면\\ 자리\\ 위험해요\\.", "-"], ["AI로\\ 일하는\\ 방식이\\ 크게\\ 바뀔\\ 업종이에요\\.\\ .+?\\.\\ 대체되는\\ 쪽\\ 말고\\ 활용하는\\ 쪽에\\ 서세요\\.", "-"], ["AI\\ 영향은\\ 중간이에요\\.\\ .+?\\.", "0"], ["AI\\ 영향은\\ 적당히\\ 받는\\ 업종이에요\\.\\ .+?\\.", "0"], ["AI가\\ 일을\\ 일부\\ 바꾸겠지만\\ 통째로\\ 대체하긴\\ 어려운\\ 업종이에요\\.\\ .+?\\.", "0"], ["AI\\ 대체\\ 걱정은\\ 적은\\ 업종이에요\\.\\ .+?\\.", "+"], ["AI가\\ 쉽게\\ 못\\ 들어오는\\ 업종이에요\\.\\ .+?\\.", "+"], ["AI\\ 걱정은\\ 상대적으로\\ 덜어도\\ 되는\\ 업종이에요\\.\\ .+?\\.", "+"], ["현직자\\ 워라밸\\ .+?점\\(잡플래닛·블라인드·캐치\\ 종합\\),\\ 여긴\\ 그냥\\ 시망이에요\\.\\ 엄청\\ 빡셀\\ 테니\\ 워라밸\\ 있던\\ 회사\\ 다니던\\ 분은\\ 포기도\\ 고려하세요\\.", "-"], ["워라밸\\ .+?점이면\\ 저녁은\\ 없다고\\ 보셔야\\ 해요\\.\\ 지금\\ 칼퇴하는\\ 회사\\ 다니시면\\ 진지하게\\ 다시\\ 생각하세요\\.", "-"], ["워라밸\\ .+?점,\\ 갈려\\ 나갈\\ 각오\\ 없으면\\ 못\\ 버팁니다\\.\\ 체력·멘탈\\ 자신\\ 있을\\ 때만\\ 가세요\\.", "-"], ["연봉은\\ 업계\\ 바닥권이에요\\.\\ 이\\ 돈\\ 받고\\ 가는\\ 거면\\ 경력\\ 말고는\\ 남는\\ 게\\ 없어요\\.", "-"], ["업계\\ 하위\\ 10%\\ 연봉이에요\\.\\ 여기\\ 오래\\ 있으면\\ 다음\\ 이직\\ 때\\ 연봉\\ 기준점까지\\ 같이\\ 깎여요\\.", "-"], ["연봉이\\ 많이\\ 짜요\\.\\ 이\\ 회사가\\ 아니면\\ 안\\ 되는\\ 이유가\\ 없다면\\ 패스하세요\\.", "-"], ["평점\\ .+?점,\\ 1점대예요\\.\\ 안에\\ 있는\\ 사람들이\\ 회사를\\ 포기했다는\\ 뜻이에요\\.\\ 정말\\ 다른\\ 카드가\\ 없을\\ 때만\\ 보세요\\.", "-"], ["평점\\ .+?점이면\\ 조직이\\ 망가졌다고\\ 봐야\\ 해요\\.\\ 웬만하면\\ 피하세요\\.", "-"], ["평점\\ .+?점,\\ 이\\ 정도면\\ 리뷰\\ 읽기\\ 전에\\ 결론\\ 나요\\.\\ 비추입니다\\.", "-"], [".+?의\\ .+?\\ 맡는\\ 계열사예요\\.\\ 숫자가\\ 괜찮아\\ 보여도\\ 실제론\\ .+?\\ 정직원과\\ 같은\\ 현장에서\\ 한\\ 단계\\ 아래\\ 대우를\\ 받는\\ '모회사의\\ 그림자'\\ 구조예요\\.", "0"], [".+?\\ 직접\\ 하던\\ .+?\\ 떼어\\ 내\\ 만든\\ 계열사예요\\.\\ 일은\\ .+?\\ 일인데\\ 처우·승진·의사결정은\\ 늘\\ 모회사\\ 다음\\ 순서예요\\.", "0"], ["간판에\\ .+?\\ 붙어\\ 있지만\\ .+?\\ 아니에요\\.\\ .+?\\ 맡는\\ 계열사라\\ 모회사\\ 그림자에서\\ 벗어나기\\ 어려워요\\.", "0"], ["평균\\ 연봉이\\ .+?의\\ .+?%\\ 수준이에요\\(.+?만원\\ vs\\ .+?만원\\)\\.\\ 같은\\ 이름\\ 아래서\\ 이\\ 차이를\\ 매일\\ 보게\\ 돼요\\.", "0"], [".+?\\ 평균\\ .+?만원,\\ 여긴\\ .+?만원\\.\\ 모회사의\\ .+?%예요\\.\\ 이\\ 격차는\\ 입사\\ 후에도\\ 거의\\ 안\\ 좁혀져요\\.", "0"], ["연봉은\\ .+?의\\ .+?%\\(.+?만원\\ vs\\ .+?만원\\)\\.\\ 같은\\ 일을\\ 해도\\ 이\\ 숫자는\\ 계열사\\ 몫이에요\\.", "0"], ["스펙이\\ 좋은\\ 분이면\\ 냉정하게\\ 비추에\\ 가까워요\\.\\ 경력도\\ '.+?'.+?\\ 아니라\\ '.+?\\ 계열사'로\\ 읽혀서\\ 다음\\ 이직\\ 때\\ 몸값이\\ 잘\\ 안\\ 올라가요\\.", "0"], ["고스펙이면\\ 여기서\\ 시간\\ 쓰지\\ 마세요\\.\\ 모회사로\\ 넘어가는\\ 길은\\ 좁고,\\ 이력서엔\\ 계열사\\ 이름만\\ 남아요\\.", "0"], ["취업이\\ 급하거나\\ 이\\ 분야\\ 첫\\ 경력이\\ 필요하면\\ 괜찮지만,\\ 고스펙이면\\ .+?\\ 경쟁사\\ 경력직을\\ 직접\\ 노리는\\ 게\\ 맞아요\\.", "0"], ["이렇게\\ 빨리\\ 크면\\ 새로\\ 들어오는\\ 사람들이\\ 기존\\ 인력보다\\ 레벨이\\ 높은\\ 경우가\\ 많아요\\.\\ '원래\\ 있던\\ 사람\\ vs\\ 새로\\ 온\\ 사람'\\ 갈등이\\ 생기기\\ 쉬우니,\\ 조직문화가\\ 부서지고\\ 있지\\ 않은지\\ 꼭\\ 확인하세요\\.", "-"], ["급하게\\ 클\\ 때는\\ 기존\\ 인력보다\\ 스펙\\ 좋은\\ 사람들이\\ 한꺼번에\\ 들어와요\\.\\ 그\\ 틈에서\\ 조직문화가\\ 금\\ 가는\\ 회사가\\ 많으니,\\ 현직자에게\\ '요즘\\ 분위기'를\\ 꼭\\ 물어보세요\\.", "-"], ["성장\\ 속도가\\ 빠른\\ 회사는\\ 위에\\ 새로\\ 온\\ 고스펙\\ 인력,\\ 아래에\\ 원래\\ 있던\\ 인력이\\ 섞이면서\\ 삐걱대기\\ 쉬워요\\.\\ 숫자보다\\ 조직\\ 분위기를\\ 먼저\\ 확인하세요\\.", "-"], ["다만\\ 업력이\\ .+?년으로\\ 짧아서,\\ 처음부터\\ 스펙\\ 좋은\\ 사람들로\\ 세팅된\\ 회사일\\ 수도\\ 있어요\\.\\ 그런\\ 곳은\\ 기존·신규\\ 인력\\ 갈등은\\ 덜한\\ 편이에요\\.", "-"], ["업력\\ .+?년의\\ 젊은\\ 회사라\\ 처음\\ 멤버부터\\ 스펙이\\ 좋은\\ 경우가\\ 많아요\\.\\ 그럼\\ '기존\\ vs\\ 신규'\\ 갈등은\\ 상대적으로\\ 적어요\\.", "-"], ["그런데\\ 뉴스에\\ 내부\\ 인력\\ 출신·스펙\\ 자랑이\\ 보여요\\.\\ 이런\\ 회사는\\ 서로\\ 눈이\\ 너무\\ 높아서\\ 평가가\\ 박하고\\ 조직문화가\\ 날카로운\\ 경우가\\ 많아요\\.", "-"], ["뉴스에\\ '어디\\ 출신\\ 인재들'\\ 자랑이\\ 나와요\\.\\ 잘난\\ 사람끼리\\ 모인\\ 회사는\\ 눈이\\ 높아서\\ 서로에게\\ 박하고,\\ 조직문화가\\ 피곤할\\ 수\\ 있어요\\.", "-"], ["워라밸\\ 점수가\\ .+?점이에요\\.\\ 칼퇴·휴가\\ 눈치는\\ 덜\\ 보는\\ 곳이라는\\ 평이\\ 많아요\\.", "+"], ["현직자들이\\ 워라밸을\\ .+?점으로\\ 줬어요\\.\\ 저녁\\ 있는\\ 삶을\\ 원하면\\ 점수\\ 하나는\\ 확실히\\ 챙기는\\ 곳이에요\\.", "+"], ["워라밸\\ .+?점,\\ 이\\ 부분은\\ 칭찬해\\ 줄\\ 만해요\\.\\ 일과\\ 삶의\\ 균형은\\ 크게\\ 걱정\\ 안\\ 하셔도\\ 돼요\\.", "+"], ["워라밸\\ 점수가\\ .+?점이에요\\.\\ 야근·주말\\ 업무는\\ 어느\\ 정도\\ 각오하고\\ 가세요\\.", "-"], ["현직자들이\\ 워라밸을\\ .+?점밖에\\ 안\\ 줬어요\\.\\ 퇴근\\ 시간은\\ 기대치를\\ 낮추세요\\.", "-"], ["사내문화\\ 점수가\\ .+?점으로\\ 높아요\\.\\ 사람\\ 때문에\\ 힘든\\ 곳은\\ 아닐\\ 가능성이\\ 커요\\.", "+"], ["사내문화\\ 평이\\ 좋아요\\(.+?점\\)\\.\\ 분위기\\ 좋은\\ 회사라는\\ 말이\\ 많아요\\.", "+"], ["사내문화를\\ 나쁘게\\ 생각하는\\ 사람이\\ 많네요\\(.+?점\\)\\.\\ 팀\\ 분위기는\\ 면접\\ 때\\ 꼭\\ 확인하세요\\.", "-"], ["사내문화\\ 점수가\\ .+?점이에요\\.\\ 꼰대\\ 문화·보고\\ 문화가\\ 있을\\ 수\\ 있으니\\ 현직자\\ 얘기를\\ 들어\\ 보세요\\.", "-"], ["급여·복지\\ 만족도가\\ .+?점이에요\\.\\ 처우에\\ 대한\\ 불만은\\ 적은\\ 편이에요\\.", "+"], ["현직자들이\\ 급여·복지에\\ .+?점을\\ 줬어요\\.\\ 돈과\\ 복지로\\ 서운할\\ 일은\\ 적어요\\.", "+"], ["급여·복지\\ 만족도가\\ .+?점으로\\ 낮아요\\.\\ 연봉\\ 협상\\ 때\\ 최대한\\ 끌어올리고\\ 들어가세요\\.", "-"], ["급여·복지를\\ 아쉬워하는\\ 사람이\\ 많아요\\(.+?점\\)\\.\\ 처우는\\ 입사\\ 전에\\ 끝장\\ 보세요\\.", "-"], ["경영진\\ 평가가\\ .+?점으로\\ 좋아요\\.\\ 위에서\\ 내려오는\\ 방향이\\ 크게\\ 흔들리지\\ 않는\\ 회사예요\\.", "+"], ["경영진\\ 평가가\\ .+?점으로\\ 낮아요\\.\\ 윗선\\ 결정에\\ 휘둘리는\\ 일이\\ 생길\\ 수\\ 있어요\\.", "-"], ["경영진에\\ 대한\\ 불만이\\ 커요\\(.+?점\\)\\.\\ 회사\\ 방향이\\ 자주\\ 바뀌는지\\ 꼭\\ 물어보세요\\.", "-"], ["커리어·승진\\ 점수가\\ .+?점이에요\\.\\ 여기서\\ 쌓는\\ 경력이\\ 다음\\ 이직\\ 때\\ 힘이\\ 된다는\\ 평이\\ 많아요\\.", "+"], ["커리어·승진\\ 점수가\\ .+?점이에요\\.\\ 승진이\\ 막혀\\ 있다는\\ 얘기가\\ 있으니\\ 연차별\\ 직급을\\ 꼭\\ 확인하세요\\.", "-"], ["평균\\ 근속이\\ .+?년이에요\\.\\ 한번\\ 들어가면\\ 오래\\ 다니는\\ 회사예요\\.", "+"], ["직원들이\\ 평균\\ .+?년을\\ 다녀요\\.\\ 쉽게\\ 그만두지\\ 않는\\ 회사라는\\ 뜻이에요\\.", "+"], ["평균\\ 근속이\\ .+?년으로\\ 짧아요\\.\\ 사람이\\ 자주\\ 바뀌는\\ 곳일\\ 수\\ 있어요\\.", "-"], ["1년에\\ 직원의\\ 약\\ .+?%가\\ 나가요\\.\\ 들어가기\\ 전에\\ 왜\\ 나가는지\\ 꼭\\ 알아보세요\\.", "-"], ["연간\\ 퇴사율이\\ 약\\ .+?%예요\\.\\ 이직이\\ 잦은\\ 회사라\\ 인수인계가\\ 부실할\\ 수\\ 있어요\\.", "-"], ["연간\\ 퇴사율이\\ 약\\ .+?%로\\ 낮아요\\.\\ 사람이\\ 잘\\ 안\\ 나가는\\ 회사예요\\.", "+"], ["매출은\\ 5년\\ 동안\\ 연평균\\ .+?%\\ 바뀌었어요\\.", "0"], ["최근\\ 5년\\ 매출\\ 흐름은\\ 연평균\\ .+?%예요\\.", "0"], ["연봉은\\ .+?\\ 상위\\ .+?%\\ 수준이에요\\.", "0"], ["같은\\ 업계에서\\ 연봉\\ 순위는\\ 상위\\ .+?%예요\\.", "0"], [".+?\\ .+?점이에요\\.\\ 좋지도\\ 나쁘지도\\ 않은\\ 평범한\\ 수준이에요\\.", "0"], [".+?\\ 점수는\\ .+?점,\\ 업계\\ 평균\\ 정도예요\\.\\ 팀마다\\ 차이가\\ 클\\ 거예요\\.", "0"], ["평균\\ 연봉은\\ .+?만원이에요\\(.+?\\)\\.", "0"], ["직원\\ 평균\\ 연봉은\\ .+?만원\\ 수준이에요\\(.+?\\)\\.", "0"], ["최근\\ 입사자\\ 평균\\ 연봉은\\ 약\\ .+?만원이에요\\.\\ 협상\\ 기준선으로\\ 쓰세요\\.", "0"], ["새로\\ 들어온\\ 사람들은\\ 평균\\ .+?만원\\ 정도\\ 받았어요\\.\\ 이\\ 숫자를\\ 협상\\ 바닥으로\\ 잡으세요\\.", "0"], ["직원은\\ .+?명\\ 규모예요\\.", "0"], [".+?명이\\ 다니는\\ 회사예요\\.", "0"], ["연봉이\\ .+?\\ 업계\\ 안에선\\ 상위\\ .+?%예요\\.\\ 이\\ 업계에\\ 묶이는\\ 직무라면\\ 최선의\\ 선택이에요\\.\\ 근데\\ 전체\\ 회사로\\ 보면\\ 상위\\ .+?%라,\\ 재무·인사·마케팅·개발처럼\\ 업계를\\ 옮길\\ 수\\ 있는\\ 직무면\\ 좀\\ 아쉬운\\ 연봉이에요\\.", "+"], [".+?\\ 업계에선\\ 상위\\ .+?%로\\ 잘\\ 주는\\ 편인데,\\ 업계\\ 밖까지\\ 놓고\\ 보면\\ 상위\\ .+?%예요\\.\\ 업계\\ 경력이\\ 곧\\ 무기인\\ 직무면\\ 여기가\\ 맞고,\\ 어디서든\\ 통하는\\ 직무면\\ 다른\\ 업계\\ 연봉도\\ 한번\\ 보고\\ 결정하세요\\.", "+"], ["업계\\ 안에서는\\ 상위\\ .+?%,\\ 전체\\ 회사\\ 기준으론\\ 상위\\ .+?%예요\\.\\ 업계를\\ 못\\ 옮기는\\ 직무면\\ 여기가\\ 꼭대기에\\ 가깝고,\\ 옮길\\ 수\\ 있는\\ 직무면\\ 솔직히\\ 돈은\\ 다른\\ 업계가\\ 더\\ 줘요\\.", "+"], ["이\\ 회사\\ 연봉은\\ '.+?\\ 업계\\ 기준'으로만\\ 좋아요\\ \\(업계\\ 상위\\ .+?%\\ ·\\ 전체\\ 상위\\ .+?%\\)\\.\\ 업계\\ 고정\\ 직무면\\ 고민\\ 없이\\ 좋은\\ 조건이고,\\ 범용\\ 직무면\\ 연봉\\ 하나만\\ 보고\\ 오기엔\\ 아쉬워요\\.", "+"], [".+?\\ 업계\\ 안에선\\ 상위\\ .+?%로\\ 위쪽인데,\\ 업계\\ 자체가\\ 연봉이\\ 짠\\ 동네라\\ 전체로는\\ 상위\\ .+?%예요\\.\\ 업계를\\ 옮길\\ 생각이\\ 있는\\ 직무면\\ 이\\ 숫자에\\ 너무\\ 감동하지\\ 마세요\\.", "+"], ["업계\\ 안에선\\ 상위\\ .+?%로\\ 평범해\\ 보이는데,\\ .+?\\ 자체가\\ 연봉이\\ 센\\ 업계라\\ 전체\\ 회사\\ 기준으론\\ 상위\\ .+?%예요\\.\\ 업계\\ 밖에서\\ 보면\\ 꽤\\ 받는\\ 편이에요\\.", "0"], [".+?\\ 업계\\ 안에선\\ 중간쯤\\(상위\\ .+?%\\)이지만\\ 전체\\ 회사로\\ 놓으면\\ 상위\\ .+?%예요\\.\\ 업계\\ 비교만\\ 보고\\ '연봉\\ 별로네'\\ 하고\\ 버리기엔\\ 아까워요\\.", "0"], ["업계\\ 순위\\(상위\\ .+?%\\)만\\ 보면\\ 아쉬운데,\\ 원래\\ 돈\\ 잘\\ 주는\\ 업계라\\ 전체\\ 기준\\ 상위\\ .+?%예요\\.\\ 다른\\ 업계에서\\ 넘어오는\\ 거라면\\ 연봉은\\ 오히려\\ 오르는\\ 쪽이에요\\.", "0"], ["연봉이\\ 업계\\ 안에선\\ 상위\\ .+?%,\\ 전체\\ 회사로는\\ 상위\\ .+?%예요\\.\\ 업계\\ 안\\ 경쟁이\\ 세서\\ 그렇지\\ 절대\\ 금액은\\ 충분히\\ 센\\ 편이에요\\.", "0"], [".+?\\ 인력이\\ .+?%라\\ 회사\\ 평균\\(.+?만\\)이\\ 낮게\\ 잡혀요\\.\\ 본사·사무직만\\ 보면\\ .+?만\\ 원대예요\\.\\ 등급은\\ 둘의\\ 중간값으로\\ 매겼으니,\\ 내가\\ 지원한\\ 자리가\\ 어느\\ 쪽인지부터\\ 확인하세요\\.", "0"], ["평균\\ .+?만은\\ .+?\\ 인력\\ .+?%가\\ 섞인\\ 숫자예요\\.\\ 사무직\\ 기준으론\\ .+?만\\ 원\\ 근처라\\ 등급은\\ 둘의\\ 중간값으로\\ 봤어요\\.\\ 현장\\ 직무로\\ 가는\\ 거면\\ 평균\\ 쪽\\ 숫자를\\ 믿으세요\\.", "0"], ["이\\ 회사\\ 평균\\ 연봉은\\ .+?\\ 인력이\\ 다\\ 깎아\\ 먹은\\ 숫자예요\\(.+?%\\)\\.\\ 본사\\ 직군은\\ .+?만\\ 원대로\\ 보여요\\.\\ 직무가\\ 본사냐\\ 현장이냐에\\ 따라\\ 완전히\\ 다른\\ 회사예요\\.", "0"], ["본사\\ 인력\\ 중에\\ 매장\\ 출신이\\ 꽤\\ 섞여\\ 있어서\\ 평균\\ 연봉이\\ 낮게\\ 잡혔어요\\.\\ 공채로\\ 들어가는\\ 본사\\ 직군\\ 기준이면\\ 업계\\ 상위권이에요\\.\\ 숫자만\\ 보고\\ 겁먹지\\ 마세요\\.", "0"], ["평균이\\ 낮아\\ 보이는\\ 건\\ 매장에서\\ 올라온\\ 본사\\ 인력이\\ 많아서예요\\.\\ 본사\\ 공채\\ 직군\\ 처우는\\ 이\\ 숫자보다\\ 위예요\\.\\ 대신\\ 매장\\ 직무로\\ 가는\\ 거면\\ 얘기가\\ 달라요\\.", "0"], ["국내\\ 사업보고서가\\ 없어서\\ 감사보고서의\\ 주식보상\\(RSU\\)\\ 몫과\\ 연봉\\ 제보를\\ 섞어\\ 잡은\\ 추정치예요\\.\\ RSU는\\ 직군·연차마다\\ 편차가\\ 커요\\.\\ 오퍼\\ 받을\\ 때\\ RSU\\ 금액과\\ 베스팅\\ 일정을\\ 꼭\\ 숫자로\\ 받으세요\\.", "0"], ["쿠팡\\ 연봉은\\ 현금만\\ 보면\\ 안\\ 돼요\\.\\ RSU가\\ 꽤\\ 크게\\ 붙는데,\\ 그\\ 몫을\\ 반쯤\\ 넣어\\ 잡은\\ 숫자예요\\.\\ 오퍼\\ 레터에서\\ RSU\\ 총액·베스팅\\ 일정\\ 확인\\ 필수예요\\.", "0"], ["상담·현장\\ 인력이\\ 대부분이라\\ 평균\\ 연봉이\\ 저연차\\ 값에\\ 가까워요\\.\\ 관리자급\\(과장\\ 이상\\)은\\ 이보다\\ 높지만\\ 그\\ 자리\\ 자체가\\ 많지\\ 않아요\\.\\ 몇\\ 년\\ 안에\\ 관리자로\\ 올라갈\\ 길이\\ 있는지\\ 면접에서\\ 꼭\\ 물어보세요\\.", "0"], ["이\\ 업종은\\ 신입·저연차가\\ 바글바글해서\\ 평균이\\ 낮게\\ 깔려요\\.\\ 과장\\ 이상\\ 가면\\ 확\\ 오르긴\\ 하는데,\\ 위로\\ 가는\\ 문이\\ 좁아요\\.\\ 승진\\ 구조부터\\ 확인하세요\\.", "0"], ["평균\\ 연봉은\\ 상담·현장\\ 직원\\ 위주\\ 숫자예요\\.\\ 관리자\\ 트랙이면\\ 꽤\\ 올라가지만\\ TO가\\ 적어요\\.\\ 들어가서\\ 3년\\ 뒤\\ 내\\ 자리가\\ 어딘지\\ 그려지는지\\ 보세요\\.", "0"], ["학습지\\ 선생님은\\ 대부분\\ 위탁\\ 계약이라\\ 이\\ 연봉에\\ 안\\ 들어가요\\.\\ 여기\\ 숫자는\\ 본사·지점\\ 정직원\\ 기준이에요\\.\\ 선생님\\ 직군으로\\ 가는\\ 거라면\\ 수수료\\ 구조를\\ 따로\\ 꼭\\ 확인하세요\\.", "0"], ["이\\ 연봉은\\ 본사·지점\\ 정직원\\ 숫자예요\\.\\ 교사\\(선생님\\)\\ 직군은\\ 위탁\\ 계약이라\\ 수수료로\\ 벌어요\\.\\ 어느\\ 쪽으로\\ 들어가는지에\\ 따라\\ 완전히\\ 다른\\ 얘기예요\\.", "0"], ["기관\\ 특성\\(비정규직·공무직\\ 위주\\)상\\ 회사\\ 연봉과\\ 비교하기\\ 어려워요\\.\\ 여기\\ 숫자는\\ 계약직·공무직이\\ 섞인\\ 평균이라,\\ 내가\\ 들어갈\\ 자리의\\ 고용\\ 형태와\\ 급여표를\\ 따로\\ 확인하세요\\.", "0"], ["비정규\\ 연구원·공무직이\\ 대부분인\\ 기관이라\\ 일반\\ 회사\\ 연봉과\\ 나란히\\ 놓고\\ 보면\\ 안\\ 돼요\\(기관\\ 특성상\\ 비교\\ 어려움\\)\\.\\ 정규직인지,\\ 몇\\ 년\\ 계약인지부터\\ 확인하세요\\.", "0"], ["평균\\ 근속이\\ .+?년밖에\\ 안\\ 되는\\ 젊은\\ 조직이라\\ 평균\\ 연봉이\\ 낮아\\ 보여요\\.\\ 같은\\ 연차끼리\\ 비교하면\\ 차이가\\ 확\\ 줄어요\\.\\ 숫자보다\\ 내\\ 연차\\ 기준\\ 오퍼를\\ 보세요\\.", "0"], ["사원·대리급이\\ 대부분인\\ 회사라\\ 평균이\\ 낮게\\ 깔려요\\(평균\\ 근속\\ .+?년\\)\\.\\ 경력직이면\\ 평균\\ 말고\\ 직급별\\ 금액을\\ 보세요\\.", "0"], ["직원\\ .+?%가\\ .+?\\ 인력이라\\ 평균\\ 연봉\\(.+?만\\)은\\ 사실상\\ 현장\\ 직원\\ 연봉이에요\\.\\ 본사·관리직은\\ 이보다\\ 높지만\\ 숫자로\\ 딱\\ 잘라\\ 말하긴\\ 어려워서\\ 등급은\\ 한\\ 칸만\\ 올려\\ 잡았어요\\.\\ 지원\\ 직무가\\ 본사인지\\ 현장인지부터\\ 확인하세요\\.", "0"], ["평균\\ .+?만은\\ .+?\\ 인력\\(.+?%\\)\\ 숫자라고\\ 보시면\\ 돼요\\.\\ 본사\\ 직군은\\ 더\\ 받지만\\ 규모가\\ 작아\\ 평균엔\\ 거의\\ 안\\ 보여요\\.\\ 본사\\ 오퍼라면\\ 이\\ 평균에\\ 기죽지\\ 말고\\ 협상하세요\\.", "0"], ["걱정\\ 포인트는\\ 이익이에요\\.\\ 5년\\ 평균\\ 영업이익률이\\ .+?%로\\ 얇아서,\\ 업황이\\ 꺾이면\\ 지금\\ 같은\\ 처우가\\ 흔들릴\\ 수\\ 있어요\\.", "-"], ["남는\\ 게\\ 많은\\ 장사는\\ 아니에요\\(5년\\ 평균\\ 영업이익률\\ .+?%\\)\\.\\ 지금\\ 연봉은\\ 좋지만\\ 성과급은\\ 해마다\\ 출렁일\\ 수\\ 있어요\\.", "-"], ["이익률이\\ .+?%\\ 수준이라\\ 쿠션이\\ 얇아요\\.\\ 불황\\ 한\\ 번\\ 오면\\ 제일\\ 먼저\\ 성과급·채용부터\\ 줄어드는\\ 구조예요\\.", "-"], ["걱정\\ 포인트는\\ 성장이에요\\.\\ 매출이\\ 제자리라\\ 자리가\\ 잘\\ 안\\ 늘고,\\ 회사랑\\ 같이\\ 크는\\ 그림은\\ 기대하기\\ 어려워요\\.", "-"], ["회사가\\ 크지\\ 않는\\ 중이에요\\.\\ 지금\\ 처우는\\ 좋아도\\ 승진\\ 자리는\\ 위에서\\ 안\\ 비면\\ 안\\ 생겨요\\.", "-"], ["성장이\\ 멈춘\\ 회사는\\ 지금은\\ 편해도,\\ 몇\\ 년\\ 뒤\\ 구조조정·사업\\ 재편\\ 얘기가\\ 나오기\\ 쉬워요\\.", "-"], ["최근\\ 실적\\ 기사\\ 흐름이\\ 좋지\\ 않아요\\.\\ 당장\\ 흔들릴\\ 회사는\\ 아니지만,\\ 면접에서\\ 사업\\ 전망은\\ 꼭\\ 물어보세요\\.", "-"], ["요즘\\ 기사\\ 분위기가\\ 썩\\ 밝진\\ 않아요\\.\\ 들어가기\\ 전에\\ 주력\\ 사업이\\ 앞으로\\ 뭘로\\ 먹고살지\\ 한번\\ 확인하세요\\.", "-"], ["뉴스만\\ 보면\\ 실적이\\ 꺾이는\\ 구간이에요\\.\\ 지금\\ 들어가면\\ '좋은\\ 시절\\ 끝물'일\\ 수도\\ 있다는\\ 것만\\ 알고\\ 가세요\\.", "-"], ["지금\\ 받는\\ 돈과\\ 분위기는\\ 누리되,\\ 이\\ 회사\\ 밖에서도\\ 통하는\\ 경력을\\ 꾸준히\\ 쌓아\\ 두세요\\.", "-"], ["들어가서\\ 편하게\\ 안주하지만\\ 마세요\\.\\ 회사가\\ 흔들려도\\ 나는\\ 안\\ 흔들리게\\ 포트폴리오는\\ 계속\\ 챙기세요\\.", "-"], ["정년까지\\ 여기라고\\ 생각하기보단,\\ 좋은\\ 조건에서\\ 몸값\\ 키우는\\ 곳으로\\ 쓰면\\ 딱이에요\\.", "-"], ["미래\\ 걱정은\\ 회사\\ 몫으로\\ 두고,\\ 나는\\ 3년\\ 단위로\\ 시장에서\\ 내\\ 가치를\\ 체크하세요\\.", "-"], ["여긴\\ 지주사예요\\.\\ 지주사\\ 자체\\(별도\\)\\ 매출은\\ .+?뿐이고\\ 그마저\\ 배당·로열티라\\ 회사\\ 체력이\\ 안\\ 보여요\\.\\ 그래서\\ 재무는\\ 자회사까지\\ 합친\\ 연결\\(.+?\\)\\ 기준으로\\ 봤어요\\.", "0"], ["지주사라\\ 별도\\ 재무제표는\\ 배당금\\ 장부에\\ 가까워요\\(매출\\ .+?\\)\\.\\ 그룹\\ 전체\\ 실적이\\ 곧\\ 지주사\\ 실적이라,\\ 성장·수익·안정성은\\ 연결\\ 매출\\ .+?\\ 기준으로\\ 판단했어요\\.", "0"], ["참고로\\ 지주사예요\\.\\ 지주사는\\ 계열사\\ 실적이\\ 좋아야\\ 배당이\\ 들어오고\\ 성과급도\\ 나오는\\ 구조라,\\ 별도\\(매출\\ .+?\\)\\ 말고\\ 연결\\(.+?\\)\\ 숫자로\\ 봤어요\\.", "0"], ["여긴\\ 금융지주예요\\.\\ 성장·수익은\\ 은행·카드\\ 등\\ 자회사까지\\ 합친\\ 연결\\ 기준으로\\ 봤고,\\ 연결\\ 부채엔\\ 고객\\ 예금이\\ 섞여\\ 있어서\\ 안정성만\\ 지주사\\ 자체\\(별도\\)\\ 기준으로\\ 봤어요\\.", "0"], ["장부상\\ 자본이\\ 바닥난\\ 자본잠식\\ 상태예요\\(자본총계\\ \\-.+?\\)\\.\\ 투자금이나\\ 모회사\\ 지원이\\ 끊기면\\ 버티기\\ 어려운\\ 구조라\\ '조건\\ 보고\\ 가세요'까지만\\ 드려요\\.", "v"], ["자본총계가\\ \\-.+?인\\ 자본잠식\\ 회사예요\\.\\ 다음\\ 투자\\ 유치나\\ 모회사\\ 지원\\ 계획이\\ 있는지\\ 면접에서\\ 꼭\\ 물어보세요\\.\\ 그래서\\ '조건\\ 보고\\ 가세요'까지예요\\.", "v"], ["최근\\ .+?년\\ 연속\\ 영업적자예요\\.\\ 평판·연봉이\\ 좋아도\\ 적자가\\ 길어지면\\ 처우부터\\ 흔들려서\\ '조건\\ 보고\\ 가세요'까지만\\ 드려요\\.", "v"], [".+?년째\\ 영업적자가\\ 이어지고\\ 있어요\\.\\ 지금\\ 처우가\\ 언제까지\\ 갈지\\ 장담하기\\ 어려워\\ '조건\\ 보고\\ 가세요'까지예요\\.", "v"], ["최근\\ 영업이익률이\\ .+?%예요\\.\\ 버는\\ 것보다\\ 쓰는\\ 게\\ 훨씬\\ 많은\\ 회사라\\ '조건\\ 보고\\ 가세요'까지만\\ 드려요\\.", "v"], ["작년\\ 영업이익률이\\ .+?%,\\ 적자\\ 폭이\\ 커요\\.\\ 투자금으로\\ 버티는\\ 구간이라\\ '조건\\ 보고\\ 가세요'까지예요\\.", "v"], ["수익성\\ 등급이\\ F예요\\.\\ 돈\\ 버는\\ 구조가\\ 아직\\ 안\\ 잡혀서\\ '조건\\ 보고\\ 가세요'까지만\\ 드려요\\.", "v"], ["이익을\\ 거의\\ 못\\ 내는\\ 회사예요\\(수익성\\ F\\)\\.\\ 평판이\\ 좋아도\\ '조건\\ 보고\\ 가세요'까지예요\\.", "v"], ["현직자들이\\ 매긴\\ 경영진\\ 점수가\\ 아주\\ 높아요\\(.+?\\)\\.\\ 대표이사에\\ 대한\\ 신뢰가\\ 참\\ 좋은\\ 회사예요\\.", "0"], ["경영진\\ 점수가\\ 업계를\\ 통틀어\\ 손꼽히게\\ 높아요\\(.+?\\)\\.\\ 직원들이\\ 대표이사를\\ 믿고\\ 따르는\\ 회사예요\\.", "0"], ["대표이사에\\ 대한\\ 신뢰가\\ 참\\ 좋은\\ 회사예요\\.\\ 경영진\\ 점수가\\ 상위권이에요\\(.+?\\)\\.", "0"], ["현직자들이\\ 매긴\\ 경영진\\ 점수가\\ 아주\\ 높아요\\(.+?\\)\\.\\ 기관장·경영진에\\ 대한\\ 신뢰가\\ 좋은\\ 곳이에요\\.", "0"], ["경영진\\ 점수가\\ 손꼽히게\\ 높아요\\(.+?\\)\\.\\ 직원들이\\ 윗선을\\ 믿고\\ 일하는\\ 곳이에요\\.", "0"], [".+?은\\ 업계\\ 평균\\ 정도예요\\.\\ 좋지도\\ 나쁘지도\\ 않은\\ 평범한\\ 수준이라\\ 팀마다\\ 차이가\\ 클\\ 거예요\\.", "0"], ["현직자\\ 점수로\\ 보면\\ .+?,\\ 딱\\ 중간이에요\\.\\ 결국\\ 어느\\ 팀에\\ 가느냐가\\ 더\\ 중요해요\\.", "0"]];
let ZKRE = null;
function zKind(t, i, len) {
  if (i === 0 || i === len - 1) return "v";
  ZKRE = ZKRE || ZK.map(([s, k]) => [new RegExp("^" + s + "$"), k]);
  for (const [re, k] of ZKRE) if (re.test(t)) return k;
  const tone = meTone(t);   // 표에 없는 말(직접 넣은 문장 등)은 말투로
  return /가세요|잡으세요|놓치지|축하|사인하세요|합류하세요|타이밍|들어가면|들어가서|입사 첫해|누리되/.test(t) ? "v" : tone === "fail" ? "-" : tone === "plus" ? "+" : tone === "cond" ? "-" : "0";
}
function meTail(V, o = {}) {
  // 신입·중고신입: 다니는 회사가 없거나(취준) 직급 협상이 없으니 말을 바꾼다 (2026-10-28 문장 검수)
  if (o.newbie) {
    if (V === "무조건 가세요") return "합격 통보 받으면 망설이지 말고 입사하세요." + (o.working ? " 지금 회사엔 인수인계만 깔끔하게 하고 오세요." : "");
    if (V === "가세요") return "입사 전에 배치 부서와 근무지만 확인하고 가세요.";
    if (V === "중립기어") return o.working ? "결국 지금 회사보다 나아지는 게 분명한지가 답이에요. 분명하면 가고, 아니면 남으세요." : "결국 이 회사에서 3년 뒤 내 모습이 그려지는지가 답이에요. 그려지면 가고, 아니면 다음 카드를 보세요.";
    if (V === "다시 생각해요") return o.working ? "지금 자리에서 버틸 만하다면, 이 카드보다 내 조건에 맞는 곳을 조금 더 기다려 보세요." : "급하지 않다면 이 카드보다 내 조건에 맞는 곳을 조금 더 기다려 보세요.";
  }
  // 11-12 F9: 이미 퇴사한 사람에게 '지금 회사·남으세요·버틸 만하다면' 같은 재직자 말을 하지 않는다
  if (o.left) {
    if (V === "무조건 가세요") return o.offer ? "망설이지 말고 사인하세요." : "오퍼 받으면 망설이지 말고 사인하세요.";
    if (V === "중립기어") return "결국 전 회사에서 제일 싫었던 게 여기서 풀리는지가 답이에요. 풀리면 가고, 아니면 다른 카드를 더 보세요.";
    if (V === "다시 생각해요" && !(o.now && o.pct != null && o.pct < 10 && !o.offer && !o.noPay)) return "공백이 길어지는 게 부담되더라도, 이 카드보다 내 조건에 맞는 곳을 조금 더 찾아보세요.";
  }
  if (V === "무조건 가세요") return (o.offer ? "망설이지 말고 사인하세요." : "오퍼 받으면 망설이지 말고 사인하세요.") + " 지금 회사엔 인수인계만 깔끔하게 하고 오세요.";
  if (V === "가세요") return "가기 전에 입사 직급과 연봉만 확실히 맞추고 가세요.";
  if (V === "조건 보고 가세요") return "위 조건 중 하나라도 안 맞으면 미련 없이 접어도 되는 카드예요.";
  if (V === "중립기어") return "결국 지금 회사에서 제일 싫은 게 여기서 풀리는지가 답이에요. 풀리면 가고, 아니면 남으세요.";
  if (V === "스펙 보고 결정하세요") return "다른 카드와 나란히 놓고 정하세요. 이 카드 하나만 보고 서두를 필요는 없어요.";
  if (o.now && o.pct != null && o.pct < 10 && !o.offer && !o.noPay) return "실제 오퍼를 받으면 '제시 연봉'에 넣어 다시 보세요. 추정치와 실제 오퍼는 꽤 달라요. 다만, 성과급과 현금성 복지까지 넣어 꼼꼼히 살피셔야 해요. " + mePayWarn();   // 6회차 B5
  if (V === "다시 생각해요") return "지금 자리에서 버틸 만하다면, 이 카드보다 내 조건에 맞는 곳을 조금 더 기다려 보세요.";
  return "이 카드는 접고 다른 곳을 보세요.";
}
function meCompose(c, V, why, pay, ctx, facts = [], o = {}) {
  const n = ME_GRADE[V] ?? 3, base = ME_GRADE[c.verdict], all = c.zorro || [];
  const kind = new Map(all.map((t, i) => [t, zKind(t, i, all.length)]));
  const body = all.filter(t => kind.get(t) !== "v");
  const lines = meAdapt(body, ctx);
  const mine = lines.filter(t => !kind.has(t));          // 내 연차·나이에 맞게 바꾼 말
  const pick = k => lines.filter(t => kind.get(t) === k);
  // 말리는 판정에선 '들어가서 ~하세요' 같은 입사 전제 말과 농담(ㅎㅎ)은 빼고, 좋은 점은 첫 문장(사실)만
  const joinTalk = /들어가면|들어가서|입사 첫해|누리되|합류|자리 잡고/;
  const first = t => (t.match(/^.*?(요|다)\.(?=\s|$)/) || [t])[0];
  let plus = pick("+"), minus = pick("-"), fact = pick("0");
  if (n <= 2) { plus = plus.map(first).filter(t => !/ㅎㅎ/.test(t)); fact = fact.filter(t => !joinTalk.test(t)); minus = minus.filter(t => !joinTalk.test(t)); }
  // 내 이유: 판정 방향과 같은 말을 앞에
  const rank = t => { const s = meTone(t); return n <= 2 ? (s === "fail" ? 0 : s === "cond" ? 1 : 2) : n >= 5 ? (s === "plus" ? 0 : s === "" ? 1 : 2) : (s === "cond" ? 0 : 1); };
  const top = o.wlbTop || [];
  const reasons = [...top, ...why.filter(t => !top.includes(t)).map((t, i) => [t, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0])];
  // 6회차 C6: 경력은 첫 줄에 내 연봉을 안 보인다(캡처 공유). A13: 워라밸로 낮췄으면 첫 줄에 그 얘기
  const head = o.newbie ? `지금 ${meWho()} 기준이면,` : "말씀하신 연봉 기준이면,";
  // 11-12 F1: 판단자료 부족 회사는 첫 줄에서 무엇만 보고 한 말인지 밝힌다
  const lackHead = !o.lack ? "" : o.newbie ? `자료가 부족한 회사라 내 스펙·나이와 회사 ${o.fin ? "연봉 수준" : "급"}만 보고 한 말이에요. `
    : o.noPay ? "자료가 부족하고 내 연차에 맞는 연봉 자료도 없는 회사라 회사 급만 보고 한 말이에요. " : `자료가 부족한 회사라 연봉과 회사 ${o.fin ? "수준" : "급"}만 보고 한 말이에요. `;
  // 11-12 F8 보완: 평균만 있는 회사인데 그 평균이 내 연봉보다 크게 낮으면 첫 줄에서 직접 비교를 못 했다고 밝힌다 (자료 부족 회사는 위 문장이 이미 같은 말을 함)
  const avgHead = o.avgLow && !o.lack ? "이 회사는 평균 연봉 자료뿐이라 내 연봉과 직접 비교하지 못했어요. " : "";
  const z = [`${lackHead}${avgHead}${head} ${o.first ? o.first + " " : ""}${ME_FIRST[V]}`, ...reasons, pay];
  let co;
  if (base != null && n <= 2 && base >= 4) co = [`회사 자체는 일반 판정 '${c.verdict}'일 만큼 괜찮은 곳이에요. ${o.newbie ? "판정이 낮은 건 내 나이·스펙·직무로 봤을 때 더 맞는 길이 있어서예요." : "걸리는 건 회사가 아니라 지금 내 조건이에요."}`, ...plus.slice(0, 1), ...minus.slice(0, 2)];
  else if (n <= 2) co = [...minus.slice(0, 3), ...plus.slice(0, 1)];
  else if (base != null && n >= 5 && base <= 2) co = [`회사 자체 판정은 '${c.verdict}'예요. 그래도 내 조건에선 얻는 게 더 커요. 아래 걸리는 점은 알고 가세요.`, ...minus.slice(0, 2), ...plus.slice(0, 2)];
  else if (n >= 5) co = [...plus.slice(0, 3), ...minus.slice(0, 2).map(t => /다만/.test(t) ? t : `다만 ${t}`)];
  else co = [...plus.slice(0, 2), ...minus.slice(0, 2)];
  co = co.map((t, i) => i === 0 && !/^회사 자체/.test(t) ? `회사만 놓고 보면, ${t}` : t);
  z.push(...mine.slice(0, 2), ...co);
  for (const f of [...fact, ...facts]) { if (z.length >= 7) break; if (!z.includes(f)) z.push(f); }
  z.push(meTail(V, o));
  return z.filter((t, i) => t && z.indexOf(t) === i);
}
// 이유별 확인: { text, cap } — cap 이면 판정을 '조건 보고 가세요' 위로 못 올라가게
const ME_GOOD = /^(S|A\+|A)$/, ME_BAD = /^(C|D|F)$/;
// E2: 계약연봉을 넣었으면 원천징수·계약연봉 혼동 경고 대신 비교 기준을 알려 준다
function mePayWarn() {
  return ME?.contract ? `제시 연봉은 내 계약연봉(${won(ME.contract)}만 원)과 비교하고, 성과급·현금성 복지 차이는 따로 따져 보세요.` : "현재 연봉은 원천징수로 생각하고, 제안은 계약연봉으로만 생각하는 우를 범하시면 안 됩니다!";
}
function meReason(c, kase, pct) {
  const r = ME.why, g = k => c.grades?.[k]?.letter || "";
  if (!r) return null;
  const W = ["칼퇴", "보통", "야근 잦음", "매일 야근"], wn = W.indexOf(kase.now.wlb), wt = W.indexOf(kase.target.wlb);
  const how = /추정/.test(kase.target.how || "") ? "추정치로는" : "제시 연봉으로는";
  if (r === "연봉" && kase.target.pay_unknown) return { text: "연봉 때문에 옮기시는데 이 회사는 내 연차에 맞는 연봉 자료가 없어요(전 직원 평균뿐). 제시받은 연봉을 넣어야 이유가 풀리는지 볼 수 있어요.", cap: true };   // 11-12 F8
  // 11-12 F8: 추정치가 5%까지 낮은 건 '비슷'으로 묶는다 (추정치 -1%에 '스펙 보고', 0%에 '조건 보고'로 뛰던 것)
  const nearPay = /추정/.test(kase.target.how || "") && kase.target.salary < kase.now.salary && (kase.now.salary - kase.target.salary) / kase.now.salary * 100 <= FitEngine.FIT.est_same_pct;
  //   이유=연봉이면 0% 이상은 '조건 보고 가세요'까지, 5% 안쪽으로 낮으면 '중립기어'까지, 그보다 낮으면 '스펙 보고'(6회차 D6) → 한 단계씩
  if (r === "연봉" && nearPay) return { text: `연봉 때문에 옮기시는 건데 추정치로는 지금과 비슷하거나 조금 낮아요(${pct}%). 추정치라 이 정도 차이는 실제 오퍼에서 뒤집힐 수 있으니, 연봉 협상 결과를 보고 정하세요. ${mePayWarn()}`, cap: 3 };
  if (r === "워라밸" && kase.target.wlb_unknown) return { text: "워라밸 때문에 옮기시는데 이 회사는 현직자 워라밸 자료가 없어 확인하지 못했어요. 면접에서 야근·퇴근 문화를 꼭 물어보세요." };   // 11-12 F9
  if (r === "연봉") return pct >= 10 ? { text: `연봉이 가장 큰 이유라면 +${pct}%는 이유를 풀어 주는 카드예요.` }
    : pct < 0 ? { text: `연봉 때문에 옮기시는데 ${how} 오히려 ${-pct}% 낮아요. 회사 급이나 다른 조건이 좋아도, 연봉 협상 결과를 보고 갈지 말지 정하세요.`, cap: 2 }   // 6회차 D6
    : { text: `연봉 때문에 옮기시는 건데 ${how} +${pct}%예요. 연봉 이직이 되려면 실제 오퍼에서 지금보다 확실히 오른다면 좋겠습니다. 추정되는 성과급과 현금성 복지까지 넣어서 충분히 올라간다면 가시기 바랍니다. ${mePayWarn()}`, cap: true };   // 6회차 B6
  if (r === "워라밸") return wt > wn ? { text: "", wlb: true }   // 나빠지는 건 워라밸 규칙(FitEngine.wlbAdjust)이 판정·문구를 맡는다
    : wt < wn ? { text: `워라밸이 이유라면 맞는 방향이에요. 현직자 워라밸이 '${kase.target.wlb}' 쪽이에요. ${FitEngine.TB}` }
    : { text: `워라밸은 지금과 비슷한 회사예요(현직자 기준 '${kase.target.wlb}'). 팀마다 다르니 면접에서 꼭 물어보세요.` };
  if (r === "성장·커리어") return meGrowth(c, kase, pct);
  if (r === "회사 안정성") return ME_BAD.test(g("안정성")) ? { text: `안정성 때문에 옮기는 건데 이 회사 안정성은 ${g("안정성")}이에요. 이유와 안 맞는 회사예요.`, cap: true }
    : !g("안정성") ? { text: "안정성이 이유인데 이 회사는 재무 자료가 없어 안정성을 확인 못 했어요. 감사보고서를 꼭 따로 보세요." }
    : { text: `안정성이 이유라면 안정성 ${g("안정성")}로 맞는 방향이에요.` };
  if (r === "직무 바꾸기") return FitEngine.family(kase.now.job) === FitEngine.family(kase.target.job)
    ? { text: "직무를 바꾸고 싶은 건데 '옮긴다면 갈 직무'가 지금과 같아요. 원하는 직무를 적으면 그 기준으로 다시 봐 드려요.", cap: true }
    : { text: `원하던 직무 전환(${kase.now.job} → ${kase.target.job})이에요. 연봉보다 그 직무 경력을 쌓는 게 먼저예요.` };
  if (r === "통근·지역") return meCommute(c, kase, pct);
  if (r === "지금 회사 분위기") return kase.now.rating != null && kase.target.rating != null && kase.target.rating <= kase.now.rating
    ? { text: `분위기 때문에 옮기는 건데 현직자 평점이 지금 회사(${kase.now.rating.toFixed(2)})보다 높지 않아요(${kase.target.rating.toFixed(2)}).`, cap: true }
    : { text: `분위기가 이유라면 평점${kase.target.rating != null ? ` ${kase.target.rating.toFixed(2)}` : ""}만 보지 말고, 들어갈 팀 분위기를 현직자에게 꼭 물어보세요.` };
  return null;
}
// ── 이유 = 성장·커리어 (2026-11-04 사용자: 회사 성장성만 말고 연봉·승진 기회·커리어 향상·커리어 점수를 같이)
// 항목마다 -1~+1 점, 무게를 곱해 평균. 평점 항목은 지금 회사 점수가 있으면 '지금보다 나은지', 없으면 같은 출처 전체 회사 중간값과 비교
// (판정 회사 31,558곳: 잡플래닛 승진 기회 중간 2.5·20~80% 2.0~3.0, 블라인드 커리어 향상 2.8·2.3~3.3, 캐치 커리어 3.8·3.4~4.0, 직급표 부장÷사원 1.46·1.32~1.79)
const ME_CAREER = [["승진 기회", "jobplanet", "승진 기회", 2.5, 0.5, 1], ["커리어 향상", "blind", "커리어 향상", 2.8, 0.5, 0.75], ["커리어 점수", "catch", "커리어", 3.8, 0.3, 0.75]];
function meGrowth(c, kase, pct) {
  const nc = meNow.c, sub = (o, s, k) => o?.rep?.[s]?.subs?.[k], clip = v => Math.max(-1, Math.min(1, v));
  const F = [];   // [이름, 점수, 무게, 근거]
  const g = c.grades?.["성장성"]?.letter;
  if (g) F.push(["회사 성장성", ME_GOOD.test(g) ? 1 : ME_BAD.test(g) ? -1 : 0, 1, `회사 성장성 ${g}`]);
  if (kase.target.salary && pct != null) F.push(["연봉", pct >= 15 ? 1 : pct >= 5 ? 0.5 : pct >= 0 ? 0 : pct >= -5 ? -0.5 : -1, 1, `연봉 ${pct >= 0 ? "+" : ""}${pct}%`]);
  for (const [l, s, k, mid, step, w] of ME_CAREER) {
    const v = sub(c, s, k); if (v == null) continue;
    const m = sub(nc, s, k);
    F.push([l, clip((v - (m ?? mid)) / step), w, `${l} ${v.toFixed(1)}${m != null ? `(지금 ${m.toFixed(1)})` : ""}`]);
  }
  const rk = c.salary?.ranks;
  if (rk?.사원 && rk?.부장) { const sl = rk.부장 / rk.사원; F.push(["승진하면 오르는 연봉", clip((sl - 1.46) / 0.33), 0.5, `부장 연봉이 사원의 ${sl.toFixed(1)}배`]); }
  if (kase.target.lead) F.push(["팀장 자리", 1, 1, "팀장 자리"]);
  if (F.length < 2) return { text: g ? `성장이 이유인데 이 회사는 성장성 ${g} 말고는 승진·커리어 평점 자료가 없어요. 최근 2~3년 승진자·외부 영입 비율과 맡을 일의 범위를 면접에서 꼭 물어보세요.`
    : "성장이 이유인데 이 회사는 성장성·커리어 평점 자료가 없어요. 최근 매출·채용 흐름과 승진 속도를 면접에서 꼭 물어보세요." };
  const W = F.reduce((a, f) => a + f[2], 0), S = F.reduce((a, f) => a + f[1] * f[2], 0) / W;
  const good = F.filter(f => f[1] >= 0.4).map(f => f[3]), bad = F.filter(f => f[1] <= -0.4).map(f => f[3]);
  const P = k => F.find(f => f[0] === k)?.[1];
  const car = F.filter(f => /승진 기회|커리어/.test(f[0])), carS = car.length ? car.reduce((a, f) => a + f[1] * f[2], 0) / car.reduce((a, f) => a + f[2], 0) : null;
  // 엇갈릴 때 한 줄: 회사가 크는 것과 내가 크는 것은 다르다
  const mix = P("회사 성장성") <= -1 && carS >= 0.4 ? "회사 매출은 잘 안 크지만 현직자들은 승진·커리어를 좋게 봐요. 회사보다 내 경력이 크는 자리일 수 있어요."
    : P("회사 성장성") >= 1 && carS != null && carS <= -0.4 ? "회사는 크는데 현직자들은 승진·커리어가 아쉽다고 해요. 늘어난 자리를 외부 영입으로 채우는 건 아닌지 확인하세요."
    : P("연봉") <= -0.5 && carS >= 0.4 ? "연봉은 내려가지만 커리어 쪽 점수는 좋아요. 여기서 2~3년 쌓은 경력으로 다음 이직 때 깎인 연봉을 되찾을 수 있을지 따져 보세요."
    : P("연봉") >= 1 && carS != null && carS <= -0.4 ? "연봉은 크게 오르지만 승진·커리어 점수는 낮아요. 성장보다는 연봉을 보고 가는 이직에 가까워요."
    : "";
  const seen = `본 것: ${F.map(f => f[3]).join(" · ")}.`;
  if (S >= 0.35) return { text: `성장·커리어가 이유라면 맞는 방향이에요. ${good.length ? `${good.slice(0, 3).join(", ")} 쪽이 좋아요.` : ""}${bad.length ? ` 다만 ${bad[0]} 쪽은 아쉬워요.` : ""} ${mix} 맡을 일의 범위가 지금보다 넓은지까지 확인하면 좋아요. ${seen}`.replace(/\s+/g, " ").trim() };
  if (S <= -0.25) return { text: `성장·커리어 때문에 옮기는 건데, 이 회사는 ${bad.slice(0, 3).join(", ") || "성장·커리어 점수"} 쪽이 아쉬워요. ${mix} 승진 속도와 맡을 일의 범위를 확인하고 정하세요. ${seen}`.replace(/\s+/g, " ").trim(), cap: true };
  return { text: `성장·커리어로 보면 반반이에요. ${good.length ? `좋은 점은 ${good.slice(0, 2).join(", ")} 쪽이고, ` : ""}${bad.length ? `아쉬운 점은 ${bad.slice(0, 2).join(", ")} 쪽이에요.` : "눈에 띄게 아쉬운 점은 없어요."} ${mix} 면접에서 최근 승진자 비율과 맡을 일의 범위를 꼭 물어보세요. ${seen}`.replace(/\s+/g, " ").trim() };
}
// ── 이유 = 통근·지역 (2026-11-04): 지금 근무지 → 갈 근무지 방향으로 반응
function meCommute(c, kase, pct) {
  const a = kase.now.place || "", b = kase.target.place || "";
  const sa = meNow.c && !ME.place ? coSido(meNow.c) : "", sb = coSido(c);
  const cap = x => /^(서울|수도권)/.test(x) ? "up" : /현장/.test(x) ? "site" : /공장|산단/.test(x) ? "plant" : /지방/.test(x) ? "local" : "";
  const A = cap(a), B = cap(b);
  const two = (c.salary?.members || 0) >= 1000 && B === "local" ? " 등록 주소는 지방이어도 서울 사무소에서 일하는 회사가 있어요(포스코처럼). 실제 근무지가 다르면 위 '근무지'를 바꿔 주세요." : "";
  if (B === "site") return { text: "통근·지역 때문에 옮기는 건데 이 회사는 지방 현장을 돌아가며 일하는 자리예요. 이유와 반대 방향이에요.", cap: true };
  if (A === "site" || (A === "plant" && B !== "plant")) return { text: `지방 ${A === "site" ? "현장" : "공장"}에서 ${b}${/[권]$/.test(b) ? "으로" : "로"} 오는 이동이라 통근·지역 이유와 맞아요.${two}` };
  if (A !== "up" && B === "up") return { text: `지방에서 수도권으로 올라오는 이동이라 방향은 맞아요. 다만 집을 옮겨야 하면 월세·생활비가 늘어요. ${pct != null && pct < 10 ? `연봉 +${Math.max(pct, 0)}%로는 그 비용을 메우기 어려울 수 있으니` : "늘어난 연봉이 주거비를 넘는지"} 따져 보세요.` };
  if (A === "up" && B !== "up") return { text: `수도권에서 지방(${sb || b})으로 가는 이동이에요. 고향·가족 곁으로 가는 거라면 맞는 방향이에요. 다만 그 지역에 같은 업계 회사가 적으면 다음 이직이 어려우니, 옮길 만한 회사가 몇 곳 있는지 먼저 보세요.${B === "plant" ? " 공장·산단은 시내와 떨어진 곳이 많아 통근 버스·사택이 있는지도 확인하세요." : ""}${two}` };
  if (A === "up" && B === "up") return { text: `지금도 이 회사도 수도권이에요. 통근 시간은 건물 위치에 따라 갈리니 지도로 왕복 시간을 확인하세요. 하루 왕복 30분만 줄어도 1년에 약 120시간이에요.` };
  // 둘 다 지방
  if (sa && sb) return sa === sb ? { text: `같은 지역(${sb}) 안에서 옮기는 거라 통근·지역 이유와 맞을 가능성이 커요. 집에서 실제 거리만 확인하세요.${two}` }
    : { text: `지금 회사는 ${sa}, 이 회사는 ${sb}예요. 지역을 바꾸는 이동이라 이사·통근 비용을 같이 따져 보세요.${two}` };
  return { text: `둘 다 지방 근무예요${sb ? `(이 회사 ${sb})` : ""}. 통근이 이유라면 집에서 실제로 가까워지는지 지도로 확인하세요.${B === "plant" ? " 공장·산단은 통근 버스·사택이 있는지도 보세요." : ""}${two}` };
}
function meStrip(c, my) {
  if (!ME) return `<div class="mecta" id="meSlot"><p><b>내 상황에 맞춰 볼까요?</b> 연차·연봉을 넣으면 위 판정과 한마디가 전부 내 기준으로 바뀌어요.</p><button type="button" data-me-open>내 상황 넣기</button></div>`;
  if (meGeneral) return `<div class="mestrip" id="meSlot"><span>지금은 <b>일반 판정</b>을 보고 있어요.</span><button class="lnk" type="button" data-me-mine>내 상황으로 보기</button></div>`;
  if (meNoJudge(c)) return `<div class="mestrip need" id="meSlot"><span><b>이곳은 내 상황 판정을 내지 않아요.</b> ${ME_NOJUDGE_WHY}</span><span class="lnks"><button class="lnk" type="button" data-me-open>내 상황 고치기</button></span></div>`;
  if (meNew()) {
    const o = meOver[c.name] || {}, sl = c.salary || {}, cs = coSalary(c, 0), nh = sl.newHire || (cs && !cs.avg ? cs.v : null);   // 11-12 F8: 전 직원 평균을 신입 연봉 자리에 쓰지 않는다
    return `<div class="mestrip" id="meSlot"><span class="tag">신입 기준</span><span>지금 <b>${esc(meWho())}</b>${nh ? ` → 신입 추정 연봉 <b>${won(o.salary || nh)}만 원</b>` : ""}</span>
      <label>제시 연봉<input id="meOff" type="number" inputmode="numeric" step="100" value="${o.salary || ""}" placeholder="${nh ? won(nh) : "만 원"}"></label>
      <span class="lnks">${mePickBtn(c)}<button class="lnk" type="button" data-me-open>내 상황 고치기</button><button class="lnk" type="button" data-me-general>일반 판정 보기</button></span></div>`;
  }
  const { c: kase, est, offer: off } = meCase(c), o = meOver[c.name] || {};
  const opt = (list, v) => list.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
  const offer = `<label>제시 연봉<input id="meOff" type="number" inputmode="numeric" step="100" value="${o.salary || ""}" placeholder="${est ? won(est.v) : "만 원"}"></label>`;
  if (!kase.target.salary) return `<div class="mestrip need" id="meSlot"><span>이 회사는 연봉 자료가 없어요. <b>제시받은 연봉</b>을 넣으면 내 기준으로 판정해요.</span>${offer}</div>`;
  const nowInfo = ME.co ? (meNow.c ? `<span class="nowco">지금 회사 <b>${esc(dn(meNow.c.name))}</b> 정보 반영</span>` : `<span class="nowco">'${esc(ME.co)}' 정보를 못 찾아 넣은 내용으로만 판단했어요</span>`) : "";
  return `<div class="mestrip" id="meSlot"><span class="tag">내 상황 기준</span>${nowInfo}
    <span>지금 <b>${esc(meWho())}</b> → ${off ? "제시 연봉" : esc(est.how)} <b>${won(kase.target.salary)}만 원</b> · ${esc(kase.target.size)}${kase.target.rating != null ? " · 평점 " + kase.target.rating.toFixed(2) : ""}</span>
    ${offer}<label>근무지<select id="mePlace">${opt(ME_PLACES, kase.target.place)}</select></label>
    <span class="lnks">${mePickBtn(c)}<button class="lnk" type="button" data-me-open>내 상황 고치기</button><button class="lnk" type="button" data-me-general>일반 판정 보기</button></span></div>`;
}
// ── #4 지금 회사 vs 이 회사 (경력) — 지금 회사 이름을 찾았으면 평점·재무까지, 못 찾았으면 넣은 값만
function meCmp(c, my) {
  if (!my || meNew() || !my.kase) return "";
  const { now, target } = my.kase, nc = meNow.c;
  const W = ["칼퇴", "보통", "야근 잦음", "매일 야근"], LV = ["F", "D", "C", "B", "A", "A+", "S"];
  const lt = (o, k) => { const x = o?.grades?.[k]; return x?.grade == null ? null : ltxt(x); };
  const num = v => v == null ? null : Number(v);
  const rows = [
    ["일반 판정", nc ? nc.verdict : null, c.verdict, (a, b) => (ME_GRADE[b] ?? -1) - (ME_GRADE[a] ?? -1)],
    ["연봉", now.salary && `${won(now.salary)}만 원`, target.salary && `${won(target.salary)}만 원`, () => num(target.salary) - num(now.salary)],
    ["규모", now.size, target.size, () => now.size_unknown || target.size_unknown ? 0 : FitEngine.tierOf(target).n - FitEngine.tierOf(now).n],
    ["현직자 평점", now.rating != null && now.rating.toFixed(2), target.rating != null && target.rating.toFixed(2), () => now.rating == null || target.rating == null ? 0 : target.rating - now.rating],
    ["워라밸", now.wlb, target.wlb, () => W.indexOf(now.wlb) - W.indexOf(target.wlb)],
    ["근무지", now.place, target.place, () => 0],
    ...["안정성", "성장성", "수익성"].map(k => [k, lt(nc, k), lt(c, k), (a, b) => a && b ? LV.indexOf(b) - LV.indexOf(a) : 0]),
  ].filter(r => r[1] || r[2]);
  const td = (v, win) => `<td class="${win ? "win" : ""}">${v ? esc(String(v)) : "—"}</td>`;
  const body = rows.map(([k, a, b, f]) => { const d = a && b ? f(a, b) : 0; return `<tr><th>${k}</th>${td(a, d < 0)}${td(b, d > 0)}</tr>`; }).join("");
  return `<div class="mecmp"><h4>지금 회사 vs 이 회사<small>▲ 더 나은 쪽</small></h4><table><thead><tr><th></th><th>${esc(nc ? dn(nc.name) : "지금 (넣은 값)")}</th><th>${esc(dn(c.name))}</th></tr></thead><tbody>${body}</tbody></table>
    ${nc ? "" : `<p class="note">${ME.co ? `'${esc(ME.co)}'을(를) 못 찾아 넣은 값으로만 비교했어요.` : "내 상황에 지금 회사 이름을 넣으면 평점·재무까지 나란히 비교해요."}</p>`}</div>`;
}
// ── #5 후보 비교: 회사 화면에서 '비교 목록에 담기' → 2곳 이상이면 내 판정 순으로 줄 세운다 (이 기기에만 저장)
const mePicks = () => { try { return JSON.parse(localStorage.getItem("cc-me-picks") || "[]"); } catch (e) { return []; } };
function meSetPicks(a) { try { localStorage.setItem("cc-me-picks", JSON.stringify(a.slice(-5))); } catch (e) {} }
function mePickBtn(c) { const on = mePicks().includes(c.name); return `<button class="lnk" type="button" data-me-pick>${on ? "비교 목록에서 빼기" : (meNew() ? "합격 카드 비교에 담기" : "후보 비교에 담기")}</button>`; }
function meRankSlot(c, my) {
  const p = mePicks();
  if (!my || p.length < 2) return "";
  setTimeout(meRankFill, 0);
  return `<div class="merank" id="meRank"><h4>${meNew() ? "내 합격 카드 비교" : "내 후보 회사 비교"}<small>${p.length}곳 · 내 상황 기준</small></h4><p class="note">계산하는 중…</p></div>`;
}
async function meRankFill() {
  const el = document.getElementById("meRank"); if (!el) return;
  const cur = meCo, rows = [];
  for (const n of mePicks()) {
    const c = n === cur?.name ? cur : await getCo(n).catch(() => null);
    if (!c || c.__err || c.__limit || c.__hidden) continue;
    c.name = n;
    meQuiet = true; let r; try { r = meJudge(c); } finally { meQuiet = false; }
    if (r) rows.push({ n, c, v: r.v, g: ME_GRADE[r.v], sal: r.kase ? r.kase.target.salary : r.est?.v, why: meNew() ? (r.chips || []).filter(x => !/^회사 판정/.test(x)).join(" · ") : r.z[1] || "" });
  }
  meCo = cur;
  if (!document.getElementById("meRank")) return;
  rows.sort((a, b) => b.g - a.g || (b.sal || 0) - (a.sal || 0));
  // 신입: 1·2위 판정이 같으면 엔진의 '두 합격 비교'(회사 급·직무·근무지·연봉 점수)로 한 번 더
  let tie = "";
  if (meNew() && rows.length >= 2 && rows[0].g === rows[1].g) {
    const o = r => ({ size: coSize(r.c), job: ME.job, place: coPlace(r.c), salary: r.sal, industry: engInd(r.c.salary?.group, r.c.salary?.industry, r.n) });
    const j = FitEngine.judge({ type: "C", me: { sex: ME.sex, age: ME.age }, a: o(rows[0]), b: o(rows[1]) });
    if (j.verdict === "뒤 회사") [rows[0], rows[1]] = [rows[1], rows[0]];
    tie = j.verdict === "상황 따라" ? `<p class="note">1·2위는 거의 같아요. ${esc(j.reasons.length > 1 ? j.reasons.at(-1).text : "회사 급·근무지·연봉이 비슷해요. 직무가 더 맞는 쪽, 출퇴근이 편한 쪽으로 정하세요.")}</p>` : `<p class="note">1·2위 판정이 같아 회사 급·직무·근무지·연봉 점수로 한 번 더 나눴어요.</p>`;
  }
  el.innerHTML = `<h4>${meNew() ? "내 합격 카드 비교" : "내 후보 회사 비교"}<small>${rows.length}곳 · 내 상황 기준</small></h4>
    <table><thead><tr><th></th><th>회사</th><th>내 판정</th><th>연봉</th><th>핵심 이유</th></tr></thead><tbody>${rows.map((r, i) =>
      `<tr><td class="no">${i + 1}</td><td><button class="go" type="button" data-me-go="${esc(r.n)}">${esc(r.n)}</button></td><td>${esc(r.v)}</td><td>${r.sal ? won(r.sal) + "만" : "—"}</td><td class="why">${esc(r.why)}</td></tr>`).join("")}</tbody></table>${tie}
    <p class="note">회사 화면의 '비교 목록에서 빼기'로 지울 수 있어요. 최대 5곳.</p>`;
}
// ── #2 이 판정 맞았나요? → /me 에 t:"f" 로 (판정 규칙을 실제 결과로 고치는 데 씀). 고른 값은 이 기기에만 기억
const meFbAll = () => { try { return JSON.parse(localStorage.getItem("cc-fb") || "{}"); } catch (e) { return {}; } };
let meLastV = "";
function meFb(c, my) {
  meLastV = my.v;
  const s = meFbAll()[c.name] || {};
  const b = (g, v, txt) => `<button type="button" class="mfb${s[g] === v ? " on" : ""}" data-fb="${g}" data-fv="${v}">${txt}</button>`;
  return `<div class="mefb" id="meFb"><span>이 판정, 내 생각과 맞나요?</span>${b("fb", "up", "맞아요")}${b("fb", "down", "아니에요")}
    <span class="sep">실제로는?</span>${b("went", "갔어요", "갔어요·갈 거예요")}${b("went", "안 가요", "안 가요")}${b("went", "아직", "아직 몰라요")}
    ${s.fb || s.went ? "<em>고마워요! 판정을 다듬는 데 써요.</em>" : ""}</div>`;
}
// 내 상황이 바뀌면 지금 회사 화면을 통째로 다시 그린다 (회사 자료는 이미 받아 둔 것을 씀)
function meRefresh() {
  meBar();
  const d = document.querySelector(".disc span");
  if (d) d.innerHTML = ME && !meGeneral ? "<b>내 상황 기준 판정이에요.</b> 실제 제시 조건을 넣을수록 정확해져요."
    : "<b>회사에 대한 일반적인 평가예요.</b> 내 상황에 맞춘 판정은 위 <b>내 상황 넣기</b>로 보세요.";
  if (meCo && document.getElementById("meSlot")) { const y = scrollY; render(meCo.name).then(() => scrollTo(0, y)); }
}
// 카드 안 입력 (제시 연봉·근무지)
document.addEventListener("change", e => {
  if (!meCo) return;
  if (e.target.id === "meOff") {
    const v = e.target.value === "" ? undefined : Number(e.target.value);
    // 11-12 F9: 만 원 단위가 아닌 값(원 단위 65000000, 58 등)은 받지 않는다 — 전에는 '+1083233%', '무조건 가세요'가 나왔다
    if (v !== undefined && !mePayOk(v)) { toast(`제시 연봉은 만 원 단위로 넣어 주세요 (예: 6,500만 원이면 6500 · ${won(ME_PAY_MIN)}~${won(ME_PAY_MAX)})`); e.target.value = meOver[meCo.name]?.salary || ""; return; }
    (meOver[meCo.name] ||= {}).salary = v; meRefresh();
  }
  if (e.target.id === "mePlace") { (meOver[meCo.name] ||= {}).place = e.target.value; meRefresh(); }
});
document.addEventListener("click", e => {
  if (e.target.closest("[data-me-open]")) meOpen();
  if (e.target.closest("[data-me-general]")) { meGeneral = true; meRefresh(); }
  if (e.target.closest("[data-me-mine]")) { meGeneral = false; meRefresh(); }
  if (e.target.closest("[data-me-pick]") && meCo) {
    const p = mePicks(), n = meCo.name;
    meSetPicks(p.includes(n) ? p.filter(x => x !== n) : [...p, n]); meRefresh();
  }
  const go = e.target.closest("[data-me-go]");
  if (go) { pick(go.dataset.meGo); scrollTo(0, 0); }
  const fb = e.target.closest("[data-fb]");
  if (fb && meCo) {
    const all = meFbAll(), s = all[meCo.name] = { ...(all[meCo.name] || {}), [fb.dataset.fb]: fb.dataset.fv };
    try { localStorage.setItem("cc-fb", JSON.stringify(all)); } catch (e) {}
    meSend({ t: "f", co: meCo.name, v: meLastV, gen: meCo.verdict, fb: s.fb, went: s.went });
    document.getElementById("meFb").outerHTML = meFb(meCo, { v: meLastV });
  }
});

// ---- 왼쪽 창 ----
const meEl = id => document.getElementById(id);
function meFill(sel, list, v) { sel.innerHTML = list.map(x => `<option>${esc(x)}</option>`).join(""); if (v) sel.value = v; }
// 맨 앞 '모름' = 비워 두기 → 회사 정보로 채움 (사람이 고른 값이 늘 먼저)
const ME_UNK = "모름";
meFill(meEl("me_size"), [ME_UNK, ...ME_SIZES]); meFill(meEl("me_ind"), [ME_UNK, ...ME_INDS.filter(x => x !== "게임" || GAME_CO.size)]);   // '게임'은 게임사 목록을 켰을 때만
meFill(meEl("me_wlb"), [ME_UNK, ...ME_WLB]);   // 2026-10-28: 위 주석 뒤에 붙어 실행이 안 되던 줄 (워라밸 칸이 비어 있었음)
meFill(meEl("me_place"), [ME_UNK, ...ME_PLACES]);
let meLast = null;
function meOpen() {
  meLast = document.activeElement;
  meEl("meForm").querySelectorAll("[data-k]").forEach(el => {
    const v = ME?.[el.dataset.k];
    if (el.type === "checkbox") el.checked = !!v; else if (v != null) el.value = el.dataset.k === "left" ? (v ? "1" : "") : v;
    else if (el.tagName === "SELECT" && el.options[0]?.value === ME_UNK) el.value = ME_UNK;
  });
  meEl("me_gapf").hidden = !meEl("me_left").value;
  meSetKind(ME?.kind || "career"); meGradeShow();
  loadMore?.(); meCoHint();   // 지금 회사 칸: 어느 회사로 알아들었는지 (2026-11-11)
  meEl("meErr").hidden = true;
  meEl("medim").hidden = false;
  requestAnimationFrame(() => { meEl("medim").classList.add("open"); meEl("medrawer").classList.add("open"); });
  meEl("medrawer").setAttribute("aria-hidden", "false");
  setTimeout(() => (ME ? meEl("me_sal") : meEl("me_age")).focus(), 60);
}
function meClose() {
  meEl("medim").classList.remove("open"); meEl("medrawer").classList.remove("open"); meEl("medrawer").setAttribute("aria-hidden", "true");
  setTimeout(() => { meEl("medim").hidden = true; }, 260);
  meLast?.focus?.();
}
meEl("meX").onclick = meClose; meEl("medim").onclick = meClose;
document.addEventListener("keydown", e => { if (e.key === "Escape" && meEl("medrawer").classList.contains("open")) meClose(); });
meEl("me_left").onchange = () => { meEl("me_gapf").hidden = !meEl("me_left").value; };
// 경력 이직 / 신입·중고신입: 고른 쪽 칸만 보이고, 저장도 보이는 칸만 (2026-10-27 사용자)
let meKind = "career";
function meSetKind(k) {
  meKind = k;
  document.querySelectorAll(".mkind button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.kind === k)));
  meEl("meForm").querySelectorAll("[data-kind]:not(button)").forEach(el => { el.hidden = el.dataset.kind !== k; });
  meWorkShow();
}
function meWorkShow() {
  const w = meEl("me_nstat").value !== "재직 중";
  meEl("me_nsalf").hidden = w; document.querySelectorAll("[data-work]").forEach(el => { el.hidden = w; });
}
document.querySelectorAll(".mkind button").forEach(b => b.onclick = () => meSetKind(b.dataset.kind));
meEl("me_nstat").onchange = meWorkShow;
const meVisible = el => !el.closest("[data-kind]:not(button)")?.hidden;
// 숫자 칸은 0 아래로 못 내려가게 (화살표·직접 입력 모두)
meEl("meForm").querySelectorAll('input[type=number]').forEach(el => el.addEventListener("input", () => { if (el.value !== "" && Number(el.value) < 0) el.value = "0"; }));
// 경력 이직에서 총경력 0 → 신입·중고신입으로 바로 넘긴다 (직무는 지원 직무로 옮겨 적음)
meEl("me_years").addEventListener("change", () => {
  if (meKind === "career" && meEl("me_years").value !== "" && Number(meEl("me_years").value) <= 0) {
    if (!meEl("me_njob").value) meEl("me_njob").value = meEl("me_job").value;
    meEl("me_nyears").value = "0";
    meSetKind("new"); meGradeShow();
    toast("경력이 0년이라 신입·중고신입으로 바꿨어요");
  }
});
// 11-12 F11: 신입·중고신입 칸에 경력 4년 넘게 넣으면 경력 이직으로 넘긴다 (경력 8년을 신입 칸에 넣어 '무조건 가세요'가 나오던 것)
meEl("me_nyears").addEventListener("change", () => {
  const y = Number(meEl("me_nyears").value);
  if (meKind === "new" && y > FitEngine.FIT.newbie_years_max) {
    meEl("me_years").value = String(y);
    if (!meEl("me_job").value) meEl("me_job").value = meEl("me_njob").value;
    if (!meEl("me_sal").value && meEl("me_nsal").value) meEl("me_sal").value = meEl("me_nsal").value;
    meEl("me_nyears").value = "";
    meSetKind("career");
    toast(`경력이 ${FitEngine.FIT.newbie_years_max}년을 넘어 '경력 이직'으로 바꿨어요`);
  }
});
// 신입 스펙 등급 S~D: 엔진(FitEngine.spec)이 지원 직무 기준 무게로 계산 (5회차: 학점·직무 자격증·학위 추가)
const meSpec = m => FitEngine.spec(m);
// 받침 따라 조사: meJ("어학", "이", "가") → "어학이"
const meJ = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
function meGradeShow() {
  const m = { job: meEl("me_njob").value.trim() }; document.querySelectorAll("[data-spec]").forEach(el => { m[el.dataset.k] = el.value; });
  const sp = meSpec(m), el = meEl("me_grade");
  el.innerHTML = sp ? `<b>${sp.g}</b>내 스펙 ${sp.word} · ${esc(sp.how)} 봐요${sp.gpaBad ? " · 학점 3.0 이하라 C 아래로" : ""}${sp.miss.length ? ` · 안 고른 ${sp.miss.length}개는 '보통 아래'로 계산` : ""}` : "항목을 고르면 스펙 등급(SS~D)을 보여 드려요. 지원 직무에 따라 크게 보는 항목이 달라져요.";
}
document.querySelectorAll("[data-spec]").forEach(el => el.addEventListener(el.type === "number" ? "input" : "change", meGradeShow));
meEl("me_njob").addEventListener("input", meGradeShow);   // 직무가 바뀌면 문과/이공계 기준도 바뀐다
meEl("meClr").onclick = () => {
  ME = null; try { localStorage.removeItem("cc-me"); } catch (e) {}
  meEl("meForm").reset(); meClose(); meRefresh(); toast("내 상황을 지웠어요");
};
meEl("meSave").onclick = () => {
  const m = { kind: meKind };
  meEl("meForm").querySelectorAll("[data-k]").forEach(el => {
    if (!meVisible(el)) return;
    const k = el.dataset.k;
    if (el.type === "checkbox") m[k] = el.checked;
    else if (el.type === "number") { if (el.value !== "") m[k] = Math.max(0, Number(el.value)); }
    else if (k === "left") m[k] = !!el.value;
    else if (el.value.trim() && el.value !== ME_UNK) m[k] = el.value.trim();
  });
  if (m.kind === "new" && m.nstat !== "재직 중") { delete m.salary; delete m.prevSize; delete m.prevSame; }
  // 11-12 F9·F11: 입력 범위 검사 (연봉은 만 원 단위, 신입 칸 경력은 4년까지)
  const payBad = v => v != null && v !== 0 && !mePayOk(v), payMsg = k => `${k}은 만 원 단위로 넣어 주세요 (예: 5,800만 원이면 5800).`;
  const err = (m.age != null && m.age !== 0 && (m.age < 15 || m.age > 80)) ? "만 나이를 다시 확인해 주세요."
    : m.years > 50 ? "경력 연수를 다시 확인해 주세요."
    : m.kind === "new" ? (!m.age ? "나이를 넣어 주세요." : !m.job ? "지원 직무를 넣어 주세요."
      : m.years > FitEngine.FIT.newbie_years_max ? `경력이 ${FitEngine.FIT.newbie_years_max}년을 넘으면 위에서 '경력 이직'을 골라 주세요. 신입·중고신입은 경력 ${FitEngine.FIT.newbie_years_max}년까지만 봐요.`
      : payBad(m.salary) ? payMsg("지금 연봉") : "")
    : !m.salary ? "지금 연봉을 넣어 주세요." : payBad(m.salary) ? payMsg("연봉") : payBad(m.contract) ? payMsg("계약연봉")
    : m.contract > m.salary ? "계약연봉은 연봉(총액)보다 클 수 없어요. 총액에는 성과급까지 넣어 주세요." : m.years == null ? "총 경력을 넣어 주세요." : !m.job ? "직무를 넣어 주세요." : "";
  if (err) { meEl("meErr").textContent = err; meEl("meErr").hidden = false; return; }
  ME = m; try { localStorage.setItem("cc-me", JSON.stringify(m)); } catch (e) {}
  // 연봉 보태기: 체크한 사람만, 같은 내용은 한 번만 보낸다
  if (m.kind !== "new" && m.salary) {
    const body = { co: m.co || "", size: m.size, industry: m.industry, job: m.job, years: m.years, salary: m.salary };   // 기기 번호는 보내지 않음 (개인정보처리방침 제2조)
    const key = JSON.stringify(body);
    try { if (localStorage.getItem("cc-sal-sent") !== key) { send("/sal", body); localStorage.setItem("cc-sal-sent", key); } } catch (e) {}
  }
  meSend({ t: "p", co: m.kind === "new" ? "" : (m.co || "") });
  meGeneral = false; meClose(); meRefresh();
  toast(meCo ? "내 상황이 입력됐어요 · 판정을 내 기준으로 바꿨어요" : "내 상황이 입력됐어요 · 이제 회사를 검색해 보세요");
  if (!meCo) setTimeout(() => $("#q").focus(), 300);
};
// 검색창 아래: 두 가지 보는 법
// 두 칸은 서로 왔다 갔다 하는 스위치: 내 상황을 넣은 뒤엔 '그냥 궁금하면'을 누르면 일반 판정, '내 상황'을 누르면 다시 내 기준 (2026-10-27)
function meBar() {
  const b = meEl("meOpenBtn"), g = meEl("meGenBtn"); if (!b) return;
  const mine = !!ME && !meGeneral;
  b.classList.toggle("set", !!ME); b.classList.toggle("on", mine); g.classList.toggle("on", !!ME && !mine);
  b.setAttribute("aria-pressed", String(mine)); g.setAttribute("aria-pressed", String(!!ME && !mine));
  g.querySelector("span").textContent = !ME ? "평점·연봉·재무로 본 일반 판정이에요" : mine ? "누르면 일반 판정으로 바꿔요" : "지금 일반 판정을 보고 있어요";
  b.innerHTML = ME
    ? `<small>${mine ? "내 상황 기준으로 보는 중" : "내 상황 입력됨"}</small><b>${esc(meWho())}</b><span>${mine ? "판정·한마디가 내 기준으로 나와요 · 한 번 더 누르면 고치기" : "누르면 다시 내 기준으로 봐요"}</span>`
    : `<small>내 상황에 맞춰 보려면</small><b>내 상황 넣기 →</b><span>연차·연봉을 넣으면 판정을 내 기준으로 바꿔 드려요</span>`;
}
meEl("meOpenBtn").onclick = () => {
  if (ME && meGeneral) { meGeneral = false; meRefresh(); toast("내 상황 기준으로 바꿨어요"); }
  else meOpen();
};
meEl("meGenBtn").onclick = () => {   // 내 상황을 넣었든 안 넣었든 누르면 일반 판정 + 검색창으로
  if (ME && !meGeneral) { meGeneral = true; meRefresh(); toast("일반 판정으로 바꿨어요"); }
  $("#q").focus({ preventScroll: !!meCo });
};
meRefresh();
const first = decodeURIComponent(location.hash.slice(1));
if (first) route(first); else intro();
