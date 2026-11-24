// 미니게임 고르기(11-24): 플레이어가 그 투잡에서 고른 것(포지션·컨셉·길·설비)에 맞는 게임이 뜨게 한다.
// 전에는 투잡마다 1탄 → 2탄 → 3탄을 판 수로만 번갈아 냈다(면접 코칭을 골라도 첫 게임이 자소서 첨삭).
// 이 파일은 상태(s)를 읽기만 하고 난수를 쓰지 않는다. 같은 상태면 늘 같은 게임이 나온다.
//   mgPool(s, job, keys, arg)   → 지금 나올 수 있는 게임 목록(나오는 순서대로). keys = 그 투잡에 있는 게임 전부
//   mgChoose(s, job, keys, plays, arg) → 다음에 나올 게임 하나: 목록에서 이번 인생에 가장 덜 한 것(s.mgC), 같으면 앞의 것
//   mgCtx(s, job, arg)          → 게임 안 내용을 내 선택에 맞추는 값(예: 웹소설 장르). 게임은 opts.ctx 로 받는다
import { AB_REGIONS, CONCEPTS, NICHES } from "./engine/defs.js";

// 판이 바뀐 뒤 갈아탄 길(a·b). 안 갈아탔으면 null
// (wave.js pathNow 와 같은 규칙. 컨설팅은 '면접 코칭 전문' = b 만 본다)
const pathOf = (s, job) => { const x = s?.wv?.[job]; if (!x) return null; if (job === "cs") return x.path === "b" ? "b" : null; return x.mode === "shift" ? x.path || "a" : null; };

// ───────── 취업컨설팅 ─────────
// 포지션(NICHES)마다 맡는 일이 다르다: 서류(신입 자소서·공기업) / 면접(면접 코칭) / 경력 이직.
// 종합(cs3 공고 중매술)과 '내가 안 고른 쪽' 게임은 컨설팅을 다 하게 됐을 때만 섞인다.
export const CS_MG = {
  side: { newgrad: "doc", public: "doc", interview: "itv", career: "car" },
  games: { doc: ["cs"], itv: ["cs4", "cs5", "cs2"], car: ["cs6"] },
  all: ["cs3"], // 종합
  allLv: 4, // Lv4 「1:1 종합 컨설턴트」부터는 포지션을 안 늘렸어도 다 한다고 본다
};
// 지금 하는 쪽들(첫 포지션이 맨 앞)과 '컨설팅을 다 한다'는 판정
export function csSides(s) {
  const cs = s?.cs || {}, ns = (cs.niches && cs.niches.length ? cs.niches : [cs.niche]).filter(Boolean);
  let sides = [...new Set([cs.niche, ...ns].map((k) => CS_MG.side[k]).filter(Boolean))];
  if (!sides.length) sides = ["doc"];
  if (pathOf(s, "cs") === "b") sides = ["itv", ...sides.filter((x) => x !== "itv")]; // 판 변화에서 '면접 코칭 전문'을 고름
  const all = (sides.includes("doc") && sides.includes("itv")) || (cs.lv || 1) >= CS_MG.allLv;
  return { sides, all };
}
function csPool(s) {
  const { sides, all } = csSides(s), out = [];
  for (const k of sides) out.push(...CS_MG.games[k]);
  if (all) { out.push(...CS_MG.all); for (const k of ["doc", "itv"]) out.push(...CS_MG.games[k]); } // 경력 이직 게임은 그 포지션을 열었을 때만
  return [...new Set(out)];
}

// ───────── 다른 투잡: 게임마다 '맞음 1 · 보통 0 · 안 맞음 −1' ─────────
// 안 맞는 게임은 빼고, 맞는 게임을 앞에 둔다. 전부 안 맞으면(뺄 수 없으면) 원래 순서 그대로.
const FIT = {
  // 인별: 1탄은 여행지 장관 촬영, 2탄은 라이브 방송, 3탄은 숏폼 편집
  // (얼굴 비공개 컨셉인데 2·3탄에 내 얼굴이 나오는 것은 게임을 고쳐야 해서 여기서는 못 고친다. 빼면 게임이 하나만 남는다)
  insta(s) {
    const cc = s?.ins?.cc; if (!cc) return {};
    return {
      insta: cc.topic === "travel" ? 1 : cc.topic === "daily" ? 0 : -1,
      insta2: pathOf(s, "insta") === "a" ? 1 : 0, // 길 A = 라이브·공동구매
      insta3: cc.fmt === "reels" || cc.fmt === "vlog" ? 1 : 0,
    };
  },
  // 무인카페: 1탄은 밤에 CCTV 로 지켜보는 게임. CCTV 를 단 24시간 매장이 있어야 맞다
  ucafe(s) {
    const st = s?.uc?.stores || []; if (!st.length) return {};
    return { ucafe: st.some((x) => x.cctv && x.night !== false) ? 1 : -1 };
  },
  // 바이브코딩: 3탄은 '떡상한 내 앱'. 내 앱이 있어야 맞다
  vibe(s, arg) {
    const app = s?.vibe?.app;
    return { vibe3: !app ? -1 : arg === "app" ? 1 : 0 };
  },
  // 치킨: 2탄은 배달 라이더. 길 A(홀·포장 중심)면 안 맞고 길 B(배달 전문)면 딱 맞다
  chicken(s) {
    const p = pathOf(s, "chicken");
    return { chicken2: p === "a" ? -1 : p === "b" ? 1 : 0 };
  },
  // 에어씨앤씨: 1·3탄은 외국인 손님 게임. 외국인이 적은 지역(부산·제주·경주)은 2탄(방 점검)을 먼저
  airbnb(s, arg) {
    const us = s?.ab?.units || []; if (!us.length) return {};
    const pickU = us.filter((u) => u.id === arg), list = pickU.length ? pickU : us;
    const f = list.reduce((a, u) => a + (AB_REGIONS[u.rk]?.foreign ?? 0.5), 0) / list.length, many = f >= 0.5 || pathOf(s, "airbnb") === "b"; // 길 B = 외국인 장기 손님 전문
    return many ? { airbnb: 1, airbnb3: 1 } : { airbnb2: 1 };
  },
  // 파티룸: 3탄은 밤 파티 소음. 조용한 컨셉(스터디·강의·교육장)과 키즈에는 안 맞는다
  pr(s, arg) {
    const rs = (s?.pr?.rooms || []).filter((x) => x.status === "open"); if (!rs.length) return {};
    const rm = rs.find((x) => x.id === arg) || rs[0], c = CONCEPTS[rm.concept]; if (!c) return {};
    const quiet = c.noisy <= 0.15 || rm.concept === "kids";
    return quiet ? { pr3: -1, pr2: 1 } : {};
  },
  // 타로: 2탄은 카페 상담실. 상담실을 구했으면 먼저
  tarot(s) { return s?.tarot?.room && s.tarot.room !== "none" ? { tarot2: 1 } : {}; },
};

export function mgPool(s, job, keys, arg) {
  keys = (keys || []).slice();
  if (!s || !keys.length) return keys;
  try {
    if (job === "cs") { const p = csPool(s).filter((k) => keys.includes(k)); return p.length ? p : keys; }
    const f = FIT[job] ? FIT[job](s, arg) || {} : {};
    const ok = keys.filter((k) => (f[k] || 0) >= 0);
    if (!ok.length) return keys;
    return ok.map((k, i) => [k, i]).sort((a, b) => (f[b[0]] || 0) - (f[a[0]] || 0) || a[1] - b[1]).map((x) => x[0]);
  } catch (e) { return keys; }
}
export function mgChoose(s, job, keys, plays = 0, arg) {
  const pool = mgPool(s, job, keys, arg);
  if (!pool.length) return undefined;
  if (!s) return pool[plays % pool.length];
  const c = s.mgC || {};
  let best = pool[0];
  for (const k of pool) if ((c[k] || 0) < (c[best] || 0)) best = k;
  return best;
}

// 미니게임 시간 여유·건너뛰기 결과에 쓰는 능력치. 컨설팅은 첫 포지션의 능력치(자소서·공기업 글쓰기 / 면접 말빨 / 경력 이직 커리어)
export function mgSkillStat(s, job, stat) {
  try { if (job === "cs") return NICHES[s?.cs?.niche]?.stat || stat; } catch (e) {}
  return stat;
}

// 게임 안 내용 맞추기
const WN_GENRE = { hyun: "reg", rofan: "rof", murim: "mur" }; // 웹소설 엔진 장르 → 1탄(마감) 안 장르. 판타지는 게임에 없다
export function mgCtx(s, job) {
  try {
    if (job === "webnovel") { const g = WN_GENRE[s?.webnovel?.work?.g]; return g ? { genre: g } : {}; }
    if (job === "cs") { const { sides, all } = csSides(s); return { side: sides[0], all }; }
  } catch (e) {}
  return {};
}
