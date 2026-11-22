// 인물 도감 기록(v4.27, 작은 파일 · 처음부터 받음). 큰 화면(도감·관계도)은 people_ui.js 를 열 때 받는다.
// 기록: meta.dex = { 인물id: [처음 만난 회차(0=예전 기록), 최고 호감(5 단위), 최고 이야기 단계, 관계 비트] }
// 관계 비트: 1 친한 사이(호감 45+) · 2 연인 · 4 배우자 · 8 비밀 관계 · 16 손님 · 32 제자 · 64 조력자
import { BODY } from "./gen/body.js";
import { ART } from "./gen/art.js";

export const BIT = { friend: 1, lover: 2, spouse: 4, affair: 8, client: 16, mentee: 32, helper: 64 };
export function relBits(x) {
  if (!x) return 0;
  return (x.aff >= 45 ? 1 : 0) | (x.lover ? 2 : 0) | (x.spouse ? 4 : 0) | (x.affair ? 8 : 0) | (x.client ? 16 : 0) | (x.mentee ? 32 : 0) | (x.helper ? 64 : 0);
}
const a5 = (v) => Math.max(0, Math.min(100, Math.floor((+v || 0) / 5) * 5));

// 한 사람 기록 합치기. 바뀌었으면 true
function put(dex, id, run, aff, stage, bits) {
  const o = dex[id];
  if (!o) { dex[id] = [run, a5(aff), stage || 0, bits || 0]; return true; }
  let ch = false;
  if (run && (!o[0] || run < o[0])) { o[0] = run; ch = true; }
  if (a5(aff) > o[1]) { o[1] = a5(aff); ch = true; }
  if ((stage || 0) > o[2]) { o[2] = stage; ch = true; }
  if ((o[3] | bits) !== o[3]) { o[3] |= bits; ch = true; }
  return ch;
}
// 지금 인생의 인연을 도감에 반영(save 때마다 부르지만, 바뀐 게 있을 때만 true → 그때만 저장)
export function dexSync(S, m, CHAR) {
  if (!S || !S.rel) return false;
  const dex = (m.dex = m.dex || {}), run = S.ng?.n || 1;
  let ch = false;
  for (const [id, x] of Object.entries(S.rel)) if (!CHAR || CHAR[id]) ch = put(dex, id, run, x.aff, x.stage, relBits(x)) || ch;
  return ch;
}
// 처음 한 번: 예전 저장 칸들(S 여러 개)과 지난 인생 기록(metAll)으로 채운다
export function dexFill(m, states, CHAR) {
  const dex = (m.dex = m.dex || {});
  for (const id of m.metAll || []) if (!CHAR || CHAR[id]) put(dex, id, 0, 0, 0, 0);
  for (const id of m.pastFriends || []) if (!CHAR || CHAR[id]) put(dex, id, 0, 45, 0, BIT.friend);
  for (const S of states) if (S) dexSync(S, m, CHAR);
  m.dexInit = 1;
}
export function dexCount(m, CHAR) { return Object.keys(m.dex || {}).filter((id) => !CHAR || CHAR[id]).length; }

// ── 묶음: 데이터(c.group 등)를 먼저 보고, 없으면 회사·투잡 판·동네로 자동 분류. 새 묶음 이름이 오면 저절로 칸이 생긴다 ──
export const GROUPS = {
  co: { n: "회사 사람들", s: "회사", c: "#6aa8ff", ic: "🏢" },
  pr: { n: "파티룸 판", s: "파티룸", c: "#ff7eb6", ic: "🎉" },
  cs: { n: "컨설팅 판", s: "컨설팅", c: "#5fe0a0", ic: "📝" },
  insta: { n: "인별 유명인", s: "인별", c: "#b48cff", ic: "📸" },
  town: { n: "동네·취미", s: "동네", c: "#f5c04e", ic: "🏠" },
};
const ALIAS = { 인별: "insta", 인별그램: "insta", insta: "insta", 회사: "co", co: "co", 파티룸: "pr", partyroom: "pr", pr: "pr", 컨설팅: "cs", consult: "cs", cs: "cs", 동네: "town", 취미: "town", town: "town" };
const EXTRA_C = ["#ff9f5a", "#4fd1d9", "#ff6b7f", "#a3e05f", "#e0b35f"];
export function groupOf(c) {
  const g = c?.group || c?.grp || c?.dex;
  if (g) {
    const k = ALIAS[g] || "g_" + g;
    if (!GROUPS[k]) { const i = Object.keys(GROUPS).length % EXTRA_C.length; GROUPS[k] = { n: g, s: g, c: EXTRA_C[i], ic: "✨" }; }
    return k;
  }
  if (c?.co || c?.hire) return "co";
  const b = c?.helper?.board, cb = c?.customer?.board;
  if (b === "partyroom") return "pr";
  if (b === "consult") return "cs";
  if (!b || b === "none" || b === "common") { if (cb === "partyroom" && b !== "common") return "pr"; if (cb === "consult" && b !== "common") return "cs"; }
  return "town";
}

// ── 썸네일 얼굴(작은 그림 img/bs·img/cs 를 CSS 로 잘라 보여 줌, 원본은 받지 않는다) ──
// 반환: style 문자열(background...). 그림이 없으면 null
export function thumbStyle(id, px) {
  const b = BODY[id]?.[0];
  if (b) { const s = px / b[2]; return `background-image:url(img/bs/${id}.webp);background-size:${(720 * s).toFixed(1)}px auto;background-position:${(-b[0] * s).toFixed(1)}px ${(-b[1] * s).toFixed(1)}px`; }
  if (ART.has(id)) return `background-image:url(img/cs/${id}.webp);background-size:300% 200%;background-position:0 0`;
  return null;
}

// ── 시작 화면 카드(앨범·미니게임 옆 세 번째) ──
export function dexCard(m, CHAR, esc) {
  dexCss();
  const dex = m.dex || {}, n = dexCount(m, CHAR), N = Object.keys(CHAR).length;
  const last = Object.keys(dex).filter((id) => CHAR[id]).sort((a, b) => (dex[b][1] - dex[a][1]) || (a < b ? -1 : 1)).slice(0, 3);
  const th = last.length ? last.map((id) => { const st = thumbStyle(id, 34); return `<i style="${st || ""}">${st ? "" : esc((CHAR[id].name || "?")[0])}</i>`; }).join("") : `<i class="e">👥</i>`;
  return `<button data-dex><div class="tjx-dx">${th}</div><b>인물 도감</b><span>${n}/${N}</span></button>`;
}
let cssDone = false;
function dexCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "dexcss";
  s.textContent = `.tjx.n3{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.tjx.n3>button{padding:8px 7px}
.tjx.n3 b{font-size:12.5px;white-space:normal;line-height:1.25;min-height:2.5em;display:flex;align-items:flex-end}
.tjx.n3 .tjx-th,.tjx.n3 .tjx-ic,.tjx.n3 .tjx-dx{height:48px}
.tjx.n3 .tjx-th i:nth-child(n+3){display:none}
.tjx.n3 .tjx-ic{font-size:26px}
.tjx-dx{display:flex;align-items:center;justify-content:center;margin-bottom:3px;border-radius:8px;background:linear-gradient(135deg,#f5c04e2e,#ff7eb633)}
.tjx-dx i{width:34px;height:34px;border-radius:50%;margin-left:-9px;border:2px solid var(--panel2);background:#2a2f4e no-repeat;font-style:normal;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--gold)}
.tjx-dx i:first-child{margin-left:0}
.tjx-dx i.e{border:0;background:none;font-size:26px;width:auto}`;
  document.head.appendChild(s);
}
