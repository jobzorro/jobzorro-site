// 미니게임 3탄(cs3) "공고 중매술": 퇴근 후 컨설턴트가 되어 멘티에게 맞는 채용공고를 골라 준다.
// 위: 멘티 프로필 카드(고정, 멘티 얼굴은 캐릭터 그림·표정). 가운데: 공고 카드가 한 장씩 날아온다. 아래: 밤 책상(실제 방 그림 + 내 캐릭터 그림 + 벡터 책상·노트북·멘티 폰). 그림 실패 때만 도트.
// 오른쪽으로 밀면 지원(→ 멘티 폰), 왼쪽은 패스(→ 휴지통), 위로는 찜(→ 찜 폴더). 마감 임박 공고는 도화선이 탄다.
// 맞게 지원하면 멘티 폰에 '서류 합격' 알림, 엉뚱하게 지원하면 '탈락 메일'. 대기업은 비슷한 직무도 지원하면 보너스(회사가 직무보다 중요).
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uOutline } from "../mg.js";

const LW = 112; // 논리 폭(정수배로 키움)
// 멘티 프로필: 전공, 경력(년), 희망 직무, 비슷한 직무, 지역, 강점
const MENTEES = [
  { maj: "경영학", c: 0, job: "재무", rel: ["회계", "경영기획"], loc: "서울·경기", str: ["회계 자격", "엑셀", "영어"] },
  { maj: "중어중문", c: 0, job: "구매", rel: ["SCM", "영업관리"], loc: "서울·경기", str: ["중국어", "협상", "엑셀"] },
  { maj: "심리학", c: 3, job: "인사", rel: ["교육", "조직문화"], loc: "서울·경기", str: ["채용 운영", "노무 기초", "소통"] },
  { maj: "통계학", c: 0, job: "마케팅", rel: ["MD", "CRM"], loc: "서울·경기", str: ["데이터 분석", "SQL", "SNS"] },
  { maj: "경제학", c: 5, job: "경영기획", rel: ["재무", "전략"], loc: "서울·경기", str: ["사업계획", "PPT", "재무 모델링"] },
  { maj: "무역학", c: 2, job: "영업", rel: ["영업관리", "해외영업"], loc: "서울·경기", str: ["영어", "운전", "거래처 관리"] },
];
const OTHER_JOBS = ["생산관리", "품질", "연구개발", "디자인", "개발", "물류 현장", "보험 설계", "간호", "인사", "재무", "구매", "마케팅", "영업", "경영기획"];
const COMP = {
  big: { n: "대기업", col: "#2f5bd3", names: ["반도체 대기업", "유통 대기업", "자동차 대기업", "식품 대기업", "통신 대기업", "화학 대기업", "건설 대기업"] },
  mid: { n: "중견", col: "#2f8a64", names: ["캐피탈사", "자동차부품 중견", "식품 중견기업", "물류 중견기업", "화장품 중견기업", "제약 중견기업"] },
  start: { n: "스타트업", col: "#e0672f", names: ["핀테크 스타트업", "에듀테크 스타트업", "커머스 스타트업", "AI 스타트업"] },
  fgn: { n: "외국계", col: "#7a4fc0", names: ["외국계 소비재", "외국계 제약", "외국계 IT", "외국계 화학"] },
};
const LOC_OK = ["서울 강남", "서울 여의도", "서울 을지로", "경기 판교", "경기 수원", "서울 성수"];
const LOC_BAD = ["부산 공장", "제주", "울산", "전남 여수", "경북 구미"];
// 함정 문구 [카드에 쓰는 말, 컨설턴트 한마디]
const TRAPS = [["#열정페이 환영", "열정페이? 패스!"], ["#수습 6개월 후 정규직 검토", "수습 뒤 검토? 패스!"], ["#가족 같은 회사 #주말 행사 필참", "가족 같은? 패스!"], ["#포괄임금 #야근 수당 없음", "야근 공짜? 패스!"], ["#입사 전 유료 교육 필수", "돈 내고 입사? 패스!"], ["#신입인데 경력 3년 같은 분", "그게 신입이야? 패스!"]];
const NEUTRAL = ["#직무 자격증 우대", "#주 2회 재택", "#교육비 지원", "#인턴 경험 우대", "#자율 출퇴근", "#사내 이동 제도"];
// 공고 종류 주머니(고르게 섞임): 정답 R 지원 / L 패스 / U 찜
const BAG = ["good", "good", "good", "good", "big", "big", "badJob", "badJob", "badCar", "badCar", "trap", "trap", "badLoc", "pre", "pre", "preBad"];
const ANS = { good: "R", big: "R", badJob: "L", badCar: "L", trap: "L", badLoc: "L", pre: "U", preBad: "L" };
const SAY_OK = ["이건 붙어요!", "딱 맞네요!", "지원 고고!"];
const SAY_NO = ["안 맞아요, 패스", "잘 걸렀어요", "이건 아니죠"];

// ── 도트 그리기 도구(함수 안에서만 mg.js 도구를 쓴다) ──
function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }, g);
  if (ol) uOutline(c); return c;
}
const shade = (col, f = 0.75) => { const n = parseInt(col.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join(""); };
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
// 회사 종류 아이콘(벡터 32x32)
function compSVG(t) {
  const W8 = (x, y, c) => `<rect x="${x}" y="${y}" width="2.2" height="2.2" rx=".5" fill="${c}"/>`;
  let b = "";
  if (t === "big") { b = `<defs><linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="#6a90f0"/><stop offset="1" stop-color="#2f4fb0"/></linearGradient></defs><path d="M16 1v3" stroke="#c9d6ff" stroke-width="1.2"/><circle cx="16" cy="1.4" r="1" fill="#ff5a5a"/><rect x="9" y="4" width="14" height="27" rx="1.2" fill="url(#a)"/><rect x="2" y="15" width="7" height="16" rx="1" fill="#3a55a0"/><rect x="23" y="11" width="7" height="20" rx="1" fill="#3a55a0"/>`; for (let y = 7; y < 28; y += 4) for (let x = 11; x < 21; x += 4) b += W8(x, y, (x + y) % 3 ? "#cfe0ff" : "#ffe68a"); b += `<rect x="12" y="6.2" width="8" height="1.4" fill="#f5c04e"/>${W8(4, 18, "#bcd4ff")}${W8(4, 23, "#ffe68a")}${W8(25.5, 14, "#ffe68a")}${W8(25.5, 20, "#bcd4ff")}`; }
  else if (t === "mid") { b = `<rect x="3" y="4" width="26" height="4" rx="1" fill="#6a5a4a"/><rect x="2" y="8" width="28" height="23" rx="1.4" fill="#9a8a78"/><rect x="2" y="8" width="28" height="2" fill="#c8b8a0"/>`; for (let y = 12; y < 26; y += 5) for (let x = 5; x < 28; x += 6) b += `<rect x="${x}" y="${y}" width="3.6" height="3" rx=".6" fill="${(x + y) % 2 ? "#ffe68a" : "#cfe4ff"}"/>`; b += `<rect x="12.5" y="25" width="7" height="6" rx="1" fill="#4a3a2a"/><rect x="13.5" y="25" width="5" height="1.4" fill="#2f8a64"/>`; }
  else if (t === "start") { b = `<rect x="2" y="14" width="19" height="17" rx="1.4" fill="#f2e4cc"/><path d="M0 14l11.5-6L23 14z" fill="#d8684a"/><rect x="5" y="18" width="6" height="6" rx="1" fill="#7fd1ff"/><rect x="13.5" y="20" width="5" height="11" rx="1" fill="#6a4a30"/><g transform="rotate(20 26 12)"><path d="M26 1c3 3 3.4 9 2.4 15h-4.8C22.6 10 23 4 26 1z" fill="#f4f4f4" stroke="#c8c8d4" stroke-width=".6"/><circle cx="26" cy="8" r="1.6" fill="#5fa8e8"/><path d="M23.6 13l-2.4 4 2.6-.6M28.4 13l2.4 4-2.6-.6" fill="#ff5a5a"/><path d="M24.4 16.4q1.6 5 3.2 0" fill="#ffb03b"/></g>`; }
  else { b = `<defs><radialGradient id="a" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#8fd8ff"/><stop offset="1" stop-color="#2f80c0"/></radialGradient></defs><rect x="6" y="13" width="20" height="18" rx="1.4" fill="#7a6aa8"/>`; for (let y = 16; y < 29; y += 4) for (let x = 9; x < 24; x += 4) b += W8(x, y, "#e0d8ff"); b += `<circle cx="16" cy="8" r="7" fill="url(#a)"/><path d="M11 6c2-1 3 1 5 0s2 2 4 1M10.6 10c2 .4 3-1 5 0s3 1 4.6 0" stroke="#5fd08a" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="8" rx="7" ry="2.6" fill="none" stroke="#ffffff66" stroke-width=".6"/>`; }
  return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${b}</svg>`);
}
function mailSVG(ok) {
  const b = ok ? "#5fe0a0" : "#c3c7d6", d = ok ? "#2f9a6a" : "#7a8096";
  return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 16"><rect x=".6" y=".6" width="18.8" height="14.8" rx="2" fill="${b}" stroke="${d}" stroke-width=".9"/><path d="M1.2 1.6L10 8.6l8.8-7" fill="none" stroke="${d}" stroke-width="1.2" stroke-linejoin="round"/>${ok ? `<circle cx="15.6" cy="11.6" r="3.4" fill="#fff"/><path d="M13.9 11.6l1.2 1.2 2.2-2.4" stroke="#2f9a6a" stroke-width="1.1" fill="none" stroke-linecap="round"/>` : ""}</svg>`);
}
function stepPics() {
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const card = (x, y, r, col, body) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-16" y="-21" width="32" height="42" rx="4" fill="#fffdf7" stroke="#0b0d18" stroke-width="1"/><path d="M-16-17a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v5h-32z" fill="${col}"/><rect x="-12" y="-19" width="6" height="6" rx="1.4" fill="#ffffff88"/><rect x="-4" y="-17.6" width="14" height="2" rx="1" fill="#fff"/><rect x="-12" y="-7" width="18" height="4" rx="1" fill="#16182a"/><rect x="-12" y="0" width="22" height="1.6" rx=".8" fill="#8a90ad"/><rect x="-12" y="4" width="18" height="1.6" rx=".8" fill="#8a90ad"/>${body}</g>`;
  const bg = (c1, c2) => `<defs><radialGradient id="b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><rect width="80" height="68" rx="11" fill="url(#b)"/>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg("#2a3a7a", "#121530")}${card(30, 34, -4, "#2f5bd3", `<rect x="-12" y="9" width="24" height="7" rx="2" fill="#e8f8ef"/><path d="M-6 12.6l2.4 2.4 5-5" stroke="#22a86a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)}<path d="M52 34h18m-6-6 6 6-6 6" stroke="#5fe0a0" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg("#5a2a3a", "#121530")}${card(48, 34, 5, "#e0672f", `<rect x="-13" y="9" width="26" height="7" rx="2" fill="#ffd6dc"/><rect x="-11" y="11.4" width="17" height="1.6" fill="#e0313f"/><path d="M-9-10l18 18M9-10L-9 8" stroke="#e0313f" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`)}<path d="M26 34H8m6-6-6 6 6 6" stroke="#ff8a96" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  let rows = ""; for (let k = 0; k < 4; k++) { const y = 12 + k * 11, ok = k < 3; rows += `<rect x="25" y="${y}" width="30" height="9" rx="2.4" fill="${ok ? "#fff" : "#c9ccd8"}"/><rect x="27" y="${y + 1.8}" width="6.4" height="5.4" rx="1.2" fill="${ok ? "#5fe0a0" : "#8a90ad"}"/><rect x="35" y="${y + 2}" width="16" height="1.8" rx=".9" fill="#16301f"/><rect x="35" y="${y + 5}" width="11" height="1.4" rx=".7" fill="#8a90ad"/>`; }
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg("#1f6a4a", "#121530")}<rect x="21" y="4" width="38" height="60" rx="6" fill="#16182a" stroke="#4a4f6a"/><rect x="23.5" y="9" width="33" height="51" rx="2" fill="#2a3060"/>${rows}<g fill="#ffd166"><path d="M9 14l1.2 3 3 1.2-3 1.2L9 22.4l-1.2-3-3-1.2 3-1.2z"/><path d="M69 40l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></g><circle cx="10" cy="48" r="2" fill="#ff8a96"/><circle cx="70" cy="18" r="2" fill="#5fe0a0"/></svg>`);
  return [[`<img src="${a}" alt="">`, "맞으면 → 지원"], [`<img src="${b}" alt="">`, "수상하면 ← 패스"], [`<img src="${c}" alt="">`, "서류 합격 우르르"]];
}
// 회사 종류 아이콘 16x16(도트, 예비)
function compIcon(t) {
  return mkC(16, 16, (P) => {
    if (t === "big") { // 유리 고층 빌딩
      P(4, 1, 8, 15, "#4a6fd0"); P(4, 1, 8, 1, "#8fb0ff"); P(7, 0, 2, 1, "#c9d6ff"); P(8, -1, 1, 1, "#ff5a5a");
      for (let y = 3; y < 15; y += 2) for (let x = 5; x < 11; x += 2) P(x, y, 1, 1, (x + y) % 3 ? "#bcd4ff" : "#ffe68a");
      P(1, 8, 3, 8, "#3a55a0"); P(12, 6, 3, 10, "#3a55a0"); P(2, 10, 1, 1, "#bcd4ff"); P(13, 8, 1, 1, "#ffe68a"); P(13, 11, 1, 1, "#bcd4ff");
      P(6, 4, 4, 1, "#f5c04e");
    } else if (t === "mid") { // 넓은 6층 건물
      P(1, 4, 14, 12, "#8a7a6a"); P(1, 4, 14, 1, "#b8a890"); P(2, 2, 12, 2, "#6a5a4a");
      for (let y = 6; y < 14; y += 3) for (let x = 3; x < 14; x += 3) P(x, y, 2, 2, (x + y) % 2 ? "#ffe68a" : "#cfe4ff");
      P(6, 13, 4, 3, "#4a3a2a"); P(7, 13, 2, 1, "#2f8a64");
    } else if (t === "start") { // 작은 사무실 + 로켓
      P(1, 7, 10, 9, "#e8d8c0"); P(0, 5, 12, 2, "#c0503a"); P(1, 4, 10, 1, "#d8684a"); P(3, 9, 3, 3, "#7fd1ff"); P(7, 10, 3, 6, "#6a4a30");
      P(12, 1, 3, 9, "#f4f4f4"); P(13, 0, 1, 1, "#ff5a5a"); P(12, 4, 3, 1, "#ff5a5a"); P(11, 8, 1, 2, "#ff5a5a"); P(15, 8, 1, 2, "#ff5a5a"); P(13, 10, 1, 2, "#ffb03b"); P(13, 12, 1, 1, "#ffe066");
    } else { // 외국계: 지구본 달린 빌딩
      P(3, 6, 10, 10, "#7a6aa8"); P(3, 6, 10, 1, "#a898d0"); for (let y = 8; y < 15; y += 2) for (let x = 4; x < 12; x += 2) P(x, y, 1, 1, "#e0d8ff");
      P(5, 0, 6, 6, "#3fa0d8"); P(6, -1, 4, 8, "#3fa0d8"); P(4, 1, 8, 4, "#3fa0d8"); P(6, 1, 2, 2, "#5fd08a"); P(9, 3, 2, 2, "#5fd08a"); P(5, 3, 1, 1, "#5fd08a"); P(7, 0, 1, 1, "#bfe8ff");
    }
  });
}
// 도트 손가락(끝이 위). down=true 면 아래를 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL() {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, y, 1, 1); }));
  return c.toDataURL();
}
// 편지 아이콘(합격 초록 / 탈락 회색) 10x8
function mailIcon(ok) {
  return mkC(10, 8, (P) => { const b = ok ? "#5fe0a0" : "#b8bccb", d = ok ? "#2f9a6a" : "#7a8096"; P(0, 0, 10, 8, b); P(0, 0, 1, 1, d); P(1, 1, 1, 1, d); P(2, 2, 1, 1, d); P(3, 3, 1, 1, d); P(4, 4, 2, 1, d); P(6, 3, 1, 1, d); P(7, 2, 1, 1, d); P(8, 1, 1, 1, d); P(9, 0, 1, 1, d); if (ok) P(7, 5, 2, 2, "#ffd166"); });
}
// 멘티(도트) 24x40. pose: stand / hold(폰 보기) / jump(만세) / sad
function menteeSpec() {
  const top = pick(["#e07a8a", "#5b8fd8", "#f0b44a", "#6ab08a", "#9a7ad0", "#e8e8ee"]);
  return { skin: pick(["#f5d0b0", "#ecc09c", "#d9a47c"]), hair: pick(["#2a2018", "#3b2a1e", "#5a3b22", "#1b1b22", "#7a4a2a"]), style: pick(["long", "short", "bob"]), top, top2: shade(top, 0.78), pants: pick(["#2f3d5c", "#3a3a42", "#5a6a8a", "#7a6a5a"]), shoe: pick(["#f4f4f4", "#2a2a30", "#c94f4f"]), glasses: rnd() < 0.3 };
}
function paintMentee(P, s, pose) {
  const sk = s.skin, hc = s.hair, jump = pose === "jump", sad = pose === "sad", hold = pose === "hold";
  const hy = sad ? 3 : 2, lg = s.style === "long", sideH = lg ? 13 : s.style === "bob" ? 6 : 3;
  if (lg) P(6, hy + 3, 12, 12, hc); // 긴 머리 뒤쪽
  // 다리·신발
  if (jump) { P(7, 27, 3, 8, s.pants); P(14, 27, 3, 8, s.pants); P(6, 35, 4, 2, s.shoe); P(14, 35, 4, 2, s.shoe); }
  else { P(8, 26, 3, 10, s.pants); P(13, 26, 3, 10, s.pants); P(11, 26, 2, 3, shade(s.pants, 0.8)); P(7, 36, 4, 2, s.shoe); P(13, 36, 4, 2, s.shoe); }
  // 몸
  P(6, 14, 12, 13, s.top); P(6, 25, 12, 2, s.top2); P(10, 14, 4, 2, shade(s.top, 1.15)); P(11, 14, 2, 1, sk);
  // 팔
  if (jump) { P(3, 4, 3, 11, s.top2); P(18, 4, 3, 11, s.top2); P(3, 2, 3, 2, sk); P(18, 2, 3, 2, sk); P(19, -1, 3, 4, "#22222e"); P(20, 0, 1, 2, "#8fffc0"); }
  else if (hold) { P(4, 15, 2, 6, s.top2); P(5, 20, 4, 2, s.top2); P(18, 15, 2, 6, s.top2); P(15, 20, 4, 2, s.top2); P(9, 16, 6, 8, "#22222e"); P(10, 17, 4, 6, "#8fd8ff"); P(10, 17, 4, 1, "#cfefff"); P(8, 20, 2, 2, sk); P(14, 20, 2, 2, sk); }
  else if (sad) { P(5, 15, 2, 10, s.top2); P(17, 15, 2, 10, s.top2); P(6, 25, 2, 2, sk); P(16, 25, 2, 2, sk); }
  else { P(4, 15, 2, 10, s.top2); P(18, 15, 2, 10, s.top2); P(4, 25, 2, 2, sk); P(18, 25, 2, 2, sk); }
  // 목·얼굴
  P(10, 12, 4, 2, sk);
  P(7, hy + 1, 10, 9, sk); P(6, hy + 4, 1, 3, sk); P(17, hy + 4, 1, 3, sk);
  // 머리카락
  P(6, hy - 1, 12, 3, hc); P(7, hy - 2, 10, 1, hc); P(6, hy + 2, 2, sideH, hc); P(16, hy + 2, 2, sideH, hc); P(8, hy + 2, 4, 1, hc); P(13, hy + 2, 2, 1, hc); P(9, hy - 1, 3, 1, shade(hc, 1.4));
  // 눈·입
  const ey = hy + 5;
  if (jump) { for (const ex of [9, 14]) { P(ex - 1, ey + 1, 1, 1, "#222"); P(ex, ey, 1, 1, "#222"); P(ex + 1, ey + 1, 1, 1, "#222"); } P(11, hy + 7, 2, 2, "#a8323a"); P(11, hy + 8, 2, 1, "#ff8a96"); }
  else if (sad) { P(8, ey + 1, 2, 1, "#222"); P(14, ey + 1, 2, 1, "#222"); P(11, hy + 8, 2, 1, shade(sk, 0.6)); P(16, ey + 2, 1, 2, "#8fd8ff"); }
  else { P(9, ey, 1, 2, "#222"); P(14, ey, 1, 2, "#222"); P(11, hy + 8, 2, 1, shade(sk, 0.65)); }
  P(8, hy + 7, 1, 1, "#ff9aa8"); P(15, hy + 7, 1, 1, "#ff9aa8");
  if (s.glasses) { P(8, ey, 3, 1, "#333"); P(13, ey, 3, 1, "#333"); P(11, ey, 2, 1, "#333"); }
}
function menteeSprite(s, pose) { return mkC(24, 40, (P) => paintMentee(P, s, pose)); }

// 공고 하나 만들기
function mkCard(M, kind, urgOK) {
  const ans = ANS[kind];
  let typ = pick(["big", "mid", "mid", "start", "fgn"]);
  if (kind === "big") typ = "big";
  if (kind === "good" && typ === "big" && rnd() < 0.5) typ = "mid";
  if (kind === "trap" || kind === "badLoc") typ = pick(["mid", "start", "start", "fgn"]);
  if (kind === "pre" || kind === "preBad") typ = pick(["big", "big", "mid"]);
  const c0 = M.c;
  const fitReq = () => c0 === 0 ? pick(["신입", "경력 무관", "신입·인턴 우대"]) : c0 <= 2 ? pick(["신입·중고신입", "경력 무관", "경력 1년 이상"]) : pick([`경력 ${Math.max(1, c0 - 2)}년 이상`, "경력 무관", `경력 ${c0 - 1}~${c0 + 4}년`]);
  const badReq = () => c0 <= 2 ? pick([`경력 ${4 + rint(3)}년 이상`, "경력 5~10년", "팀장급 10년 이상"]) : pick(["신입 공채(경력 제외)", `경력 ${c0 + 4}년 이상`, "팀장급 12년 이상"]);
  const others = OTHER_JOBS.filter((j) => j !== M.job && !M.rel.includes(j));
  let job = M.job, req = fitReq(), loc = pick(LOC_OK), tag = pick(NEUTRAL), trapSay = "", why = "멘티와 딱 맞는 공고";
  if (rnd() < 0.3) tag = `#${pick(M.str)} 우대`;
  if (kind === "big") { job = pick(M.rel); why = "대기업은 비슷한 직무도 일단 지원!"; }
  if (kind === "badJob") { job = pick(others); why = `희망 직무(${M.job})와 달라요`; }
  if (kind === "badCar") { req = badReq(); why = `경력 조건이 안 맞아요(${req})`; }
  if (kind === "badLoc") { loc = pick(LOC_BAD); why = `근무지가 너무 멀어요(${loc})`; }
  if (kind === "trap") { const t = pick(TRAPS); tag = t[0]; trapSay = t[1]; why = `수상한 문구: ${t[0].replace(/#/g, " ").trim()}`; }
  if (kind === "pre") why = "오픈 예정 공고는 찜!";
  if (kind === "preBad") { if (rnd() < 0.5) { job = pick(others); why = "오픈 예정이지만 직무가 달라요"; } else { req = badReq(); why = "오픈 예정이지만 경력이 안 맞아요"; } }
  const pre = kind === "pre" || kind === "preBad";
  const urg = !pre && urgOK && rnd() < 0.3;
  const dd = pre ? "" : urg ? pick(["D-1", "D-DAY"]) : "D-" + (3 + rint(18));
  return { kind, ans, typ, comp: pick(COMP[typ].names), job, req, loc, tag, trapSay, why, pre, urg, dd, strHit: M.str.some((s) => tag.includes(s)) };
}

const CSS = `
.mg-cs3 .mg-steps img{width:76px;height:65px;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-cs3 .mg-stage{background:#121530}
.mg-cs3 .cs3w{position:absolute;inset:0;overflow:hidden;touch-action:none}
.mg-cs3 .cs3w canvas{position:absolute;top:0;pointer-events:none}
.mg-cs3 .cs3me{position:absolute;z-index:1;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s;transform-origin:50% 100%;pointer-events:none;filter:drop-shadow(0 0 6px #ffd9a055)}
.mg-cs3 .cs3me.on{opacity:1}
.mg-cs3 .cs3fr{z-index:2}
.mg-cs3 .cs3pf{position:absolute;left:8px;right:8px;top:6px;z-index:4;display:flex;gap:8px;align-items:center;background:#fbf7ee;color:#22252f;border-radius:10px;padding:6px 8px;box-shadow:0 0 0 2px #0b0d18,0 4px 0 2px #0b0d18aa}
.mg-cs3 .cs3pf::before{content:"";position:absolute;left:50%;top:-5px;width:34px;height:9px;margin-left:-17px;background:#9aa4b8;border-radius:3px;box-shadow:0 0 0 2px #0b0d18}
.mg-cs3 .cs3pf canvas{position:static;flex:0 0 auto;border-radius:6px;box-shadow:0 0 0 2px #0b0d18;background:#cfe4ff}
.mg-cs3 .cs3pf .in{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.mg-cs3 .cs3pf .t1{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:#5a6078;white-space:nowrap}
.mg-cs3 .cs3pf .t1 em{font-style:normal;background:#ff6b6b;color:#fff;border-radius:4px;padding:0 5px;font-size:11px}
.mg-cs3 .cs3pf .t1 i{font-style:normal;margin-left:auto;background:#1f2a50;color:#ffd166;border-radius:4px;padding:0 5px;font-size:11px}
.mg-cs3 .cs3pf .t2{display:flex;align-items:baseline;gap:5px;white-space:nowrap}
.mg-cs3 .cs3pf .t2 small{font-size:11px;color:#6a7088;font-weight:700}
.mg-cs3 .cs3pf .t2 b{font-size:17px;font-weight:900;color:#c0392b;letter-spacing:-.5px}
.mg-cs3 .cs3pf .t2 span{font-size:11px;color:#3a4060;font-weight:800;overflow:hidden;text-overflow:ellipsis}
.mg-cs3 .cs3pf .t3{display:flex;flex-wrap:wrap;gap:3px;align-items:center;font-size:11px;font-weight:800;color:#3a4060}
.mg-cs3 .cs3pf .t3 span{background:#e3ecff;color:#2a4aa0;border-radius:4px;padding:0 5px}
.mg-cs3 .cs3pf .t3 b{background:#22252f;color:#fff;border-radius:4px;padding:0 5px;font-weight:800}
.mg-cs3 .cs3pf.flash{animation:cs3pfl .5s}
@keyframes cs3pfl{40%{box-shadow:0 0 0 2px #0b0d18,0 0 0 6px #ffd166}}
.mg-cs3 .cs3lb{position:absolute;z-index:3;font-size:11px;font-weight:900;color:#c9cde6;text-align:center;line-height:1.25;pointer-events:none;opacity:.75;transition:opacity .2s,color .2s,transform .2s}
.mg-cs3 .cs3lb b{display:block;font-size:17px}
.mg-cs3 .cs3lb.l b{color:#ff8a96}.mg-cs3 .cs3lb.r b{color:#5fe0a0}.mg-cs3 .cs3lb.u b{color:#ffd166;display:inline;font-size:14px}
.mg-cs3 .cs3lb.hot{opacity:1;transform:scale(1.18);color:#fff}
.mg-cs3 .cs3lb.pulse{animation:cs3lbp .8s ease-in-out infinite;opacity:1}
@keyframes cs3lbp{50%{transform:scale(1.15)}}
.mg-cs3 .cs3gh{position:absolute;z-index:3;border-radius:12px;background:#e9e3d4;box-shadow:0 0 0 2px #0b0d18;pointer-events:none}
.mg-cs3 .cs3cd{position:absolute;z-index:5;border-radius:12px;background:#fffdf7;color:#22252f;box-shadow:0 0 0 2px #0b0d18,0 6px 0 2px #0b0d1888;overflow:hidden;display:flex;flex-direction:column;touch-action:none;cursor:grab;will-change:transform}
.mg-cs3 .cs3cd .hd{display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--hc);color:#fff}
.mg-cs3 .cs3cd .hd img{width:36px;height:36px;flex:0 0 auto;background:#ffffff2a;border-radius:6px}
.mg-cs3 .cs3cd .hd span{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}
.mg-cs3 .cs3cd .hd b{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-cs3 .cs3cd .hd small{font-size:11px;font-weight:800;opacity:.85}
.mg-cs3 .cs3cd .dd{font-style:normal;font-size:12px;font-weight:900;background:#fff;color:#3a4060;border-radius:6px;padding:2px 6px;flex:0 0 auto;box-shadow:0 2px 0 #0003}
.mg-cs3 .cs3cd.urg .dd{background:#ff3b4e;color:#fff;animation:cs3dd .5s steps(2) infinite}
@keyframes cs3dd{50%{background:#ffd166;color:#7a1020}}
.mg-cs3 .cs3cd .jb{padding:6px 10px 2px;display:flex;align-items:baseline;gap:6px}
.mg-cs3 .cs3cd .jb small{font-size:11px;color:#7a8098;font-weight:800}
.mg-cs3 .cs3cd .jb b{font-size:23px;font-weight:900;letter-spacing:-.8px;color:#16182a}
.mg-cs3 .cs3cd .rw{display:flex;flex-direction:column;gap:3px;padding:3px 10px}
.mg-cs3 .cs3cd .rw span{font-size:13px;font-weight:800;color:#2a2e44;display:flex;gap:6px;align-items:center}
.mg-cs3 .cs3cd .rw i{font-style:normal;font-size:11px;font-weight:800;color:#fff;background:#8a90ad;border-radius:4px;padding:0 5px;min-width:36px;text-align:center}
.mg-cs3 .cs3cd .tg{margin:auto 8px 8px;padding:5px 7px;background:#f1ece0;border-radius:6px;font-size:12px;font-weight:800;color:#4a4a5a;line-height:1.3}
.mg-cs3 .cs3cd .tg.tr{background:#ffd6dc;color:#b0202f;box-shadow:0 0 0 2px #ff5a6a}
.mg-cs3 .cs3cd .tg.tt{background:#fff1b8;box-shadow:0 0 0 2px #f5c04e}
.mg-cs3 .cs3cd .fz{position:absolute;left:0;right:0;bottom:0;height:5px;background:#0b0d1822}
.mg-cs3 .cs3cd .fz i{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,#ff3b4e,#ffb03b);transform-origin:left}
.mg-cs3 .cs3cd .fz em{position:absolute;top:-4px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:radial-gradient(#fff 0 2px,#ffd166 3px,#ff5a3a 5px,transparent 6px);animation:cs3sp .12s steps(2) infinite}
@keyframes cs3sp{50%{transform:scale(1.4) rotate(45deg)}}
.mg-cs3 .cs3cd .rb{position:absolute;right:-30px;top:52px;transform:rotate(35deg);background:#2f7ad8;color:#fff;font-size:11px;font-weight:900;padding:2px 30px;box-shadow:0 2px 0 #0004;white-space:nowrap}
.mg-cs3 .cs3cd .st{position:absolute;z-index:3;font-size:30px;font-weight:900;border:4px solid currentColor;border-radius:8px;padding:0 8px;opacity:0;pointer-events:none;background:#fffdf7cc}
.mg-cs3 .cs3cd .st.r{left:12px;top:56px;color:#22a86a;transform:rotate(-16deg)}
.mg-cs3 .cs3cd .st.l{right:12px;top:56px;color:#e0313f;transform:rotate(16deg)}
.mg-cs3 .cs3cd .st.u{left:50%;bottom:46px;color:#d89a10;transform:translateX(-50%) rotate(-4deg)}
.mg-cs3 .cs3cd .st.x{left:50%;top:50%;color:#6a7088;transform:translate(-50%,-50%) rotate(-12deg);opacity:1;animation:cs3stx .3s cubic-bezier(.3,1.6,.5,1)}
@keyframes cs3stx{from{transform:translate(-50%,-50%) scale(2.4) rotate(-30deg);opacity:0}}
.mg-cs3 .cs3cd.urg{box-shadow:0 0 0 2px #0b0d18,0 0 0 5px #ff3b4e88,0 6px 0 2px #0b0d1888}
.mg-cs3 .cs3cd.drag{cursor:grabbing}
.mg-cs3 .cs3fd{position:absolute;z-index:3;font-size:11px;font-weight:900;color:#ffd166;text-align:center;pointer-events:none;line-height:1.1}
.mg-cs3 .cs3fd b{display:inline-block;min-width:16px;background:#ffd166;color:#2a1a00;border-radius:8px;padding:0 4px;font-size:11px}
.mg-cs3 .cs3bd{position:absolute;z-index:3;min-width:18px;height:18px;border-radius:9px;background:#22c070;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 0 0 2px #0b0d18;pointer-events:none;transition:transform .15s}
.mg-cs3 .cs3bd.pop{transform:scale(1.5)}
.mg-cs3 .cs3nt{position:absolute;right:6px;z-index:6;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:4px;pointer-events:none}
.mg-cs3 .cs3nt div{display:flex;align-items:center;gap:5px;background:#fff;color:#16301f;font-size:11px;font-weight:900;padding:4px 8px;border-radius:9px;box-shadow:0 0 0 2px #0b0d18,0 3px 0 2px #0b0d1888;white-space:nowrap;animation:cs3nt 1.9s ease-out forwards}
.mg-cs3 .cs3nt div img{width:20px;height:16px}
.mg-cs3 .cs3nt div.no{background:#e4e6ee;color:#4a4f66}
@keyframes cs3nt{0%{transform:translateY(14px) scale(.6);opacity:0}12%{transform:none;opacity:1}80%{opacity:1}100%{transform:translateY(-16px);opacity:0}}
.mg-cs3 .cs3say{position:absolute;z-index:7;transform:translate(-20%,-100%);background:#fff;color:#16182a;font-weight:900;font-size:12.5px;padding:4px 9px;border-radius:10px;white-space:nowrap;box-shadow:0 0 0 2px #0b0d18,0 3px 0 2px #0b0d1888;pointer-events:none;opacity:0}
.mg-cs3 .cs3say::after{content:"";position:absolute;left:18px;top:100%;border:5px solid transparent;border-top:6px solid #fff;filter:drop-shadow(0 2px 0 #0b0d18)}
.mg-cs3 .cs3say.on{animation:cs3say 1.5s ease-out forwards}
.mg-cs3 .cs3say.bad{background:#ffe0e4;color:#b0202f}.mg-cs3 .cs3say.bad::after{border-top-color:#ffe0e4}
.mg-cs3 .cs3say.stay{animation:cs3sayin .35s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes cs3say{0%{opacity:0;transform:translate(-20%,-80%) scale(.4)}12%{opacity:1;transform:translate(-20%,-100%)}85%{opacity:1}100%{opacity:0}}
@keyframes cs3sayin{from{opacity:0;transform:translate(-20%,-80%) scale(.4)}to{opacity:1;transform:translate(-20%,-100%)}}
.mg-cs3 .cs3go{position:absolute;z-index:9;width:0;height:0;pointer-events:none;display:none}
.mg-cs3 .cs3go.on{display:block}
.mg-cs3 .cs3go i{position:absolute;left:-13px;top:0;width:39px;height:39px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-cs3 .cs3go span{position:absolute;left:0;top:46px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:900;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-cs3 .cs3go span b{color:#d8402a}
.mg-cs3 .cs3go.r i{animation:cs3fr 1.1s ease-in-out infinite}
.mg-cs3 .cs3go.l i{animation:cs3fl 1.1s ease-in-out infinite}
.mg-cs3 .cs3go.u i{animation:cs3fu 1.1s ease-in-out infinite}
.mg-cs3 .cs3go.t i{animation:cs3ft .7s infinite}
@keyframes cs3fr{0%{transform:translateX(-30px);opacity:0}15%{opacity:1}70%{transform:translateX(50px);opacity:1}100%{transform:translateX(60px);opacity:0}}
@keyframes cs3fl{0%{transform:translateX(30px);opacity:0}15%{opacity:1}70%{transform:translateX(-50px);opacity:1}100%{transform:translateX(-60px);opacity:0}}
@keyframes cs3fu{0%{transform:translateY(30px);opacity:0}15%{opacity:1}70%{transform:translateY(-45px);opacity:1}100%{transform:translateY(-55px);opacity:0}}
@keyframes cs3ft{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
.mg-cs3 .cs3tut{position:absolute;left:8px;right:6px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-cs3 .cs3tut.off{opacity:0;visibility:hidden}
.mg-cs3 .cs3tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #ff6b6b;max-width:300px;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-cs3 .cs3tut.pop .cs3tc{animation:cs3pop .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes cs3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-cs3 .cs3tc em{font-style:normal;display:inline-block;background:#ff6b6b;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-cs3 .cs3tc p{margin:0}.mg-cs3 .cs3tc b{color:#1f6a4a}.mg-cs3 .cs3tc b.rd{color:#c0392b}.mg-cs3 .cs3tc b.yl{color:#b07a00}.mg-cs3 .cs3tc b.bl{color:#1f6aa8}
.mg-cs3 .cs3tb{margin-top:5px;display:flex;justify-content:center}
.mg-cs3 .cs3skip{background:none!important;border:0!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-cs3 .cs3go2{background:linear-gradient(#ff7a7a,#d84a4a)!important;color:#fff!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a2a2a!important;animation:cs3pulse .5s infinite alternate}
@keyframes cs3pulse{to{transform:scale(1.06)}}
.mg-cs3 .cs3end{position:absolute;inset:0;z-index:8;opacity:0;transition:opacity .4s;pointer-events:none}
.mg-cs3 .cs3end.on{opacity:1}
.mg-cs3 .cs3big{position:absolute;left:50%;top:6px;width:206px;margin-left:-103px;z-index:2;background:#16182a;border-radius:22px;padding:10px 8px 12px;box-shadow:0 0 0 3px #0b0d18,inset 0 0 0 2px #3a3f5a,0 8px 0 2px #0008;transform:translateY(-120%);transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
.mg-cs3 .cs3end.on .cs3big{transform:none}
.mg-cs3 .cs3big.buzz{animation:cs3buzz .18s}
@keyframes cs3buzz{25%{transform:translateX(-3px) rotate(-1deg)}75%{transform:translateX(3px) rotate(1deg)}}
.mg-cs3 .cs3big .tm{text-align:center;color:#fff;font-size:22px;font-weight:900;letter-spacing:1px;line-height:1}
.mg-cs3 .cs3big .dt{text-align:center;color:#9ea3c0;font-size:11px;font-weight:700;margin:2px 0 6px}
.mg-cs3 .cs3big .ls{display:flex;flex-direction:column;gap:4px;min-height:40px}
.mg-cs3 .cs3big .ls div{display:flex;align-items:center;gap:6px;background:#ffffffee;color:#16301f;border-radius:9px;padding:3px 7px;font-size:11px;white-space:nowrap;overflow:hidden;font-weight:900;line-height:1.2;animation:cs3drop .35s cubic-bezier(.3,1.5,.5,1)}
.mg-cs3 .cs3big .ls div img{width:20px;height:16px;flex:0 0 auto}
.mg-cs3 .cs3big .ls div span{min-width:0;overflow:hidden;text-overflow:ellipsis}.mg-cs3 .cs3big .ls div small{display:block;font-size:11px;color:#4a6a5a;font-weight:700}
.mg-cs3 .cs3big .ls div.no{background:#c9ccd8;color:#3a3f55}
.mg-cs3 .cs3big .ls div.more{justify-content:center;background:#5fe0a0;color:#0b2a1a}
.mg-cs3 .cs3big .ls p{margin:8px 0;text-align:center;color:#9ea3c0;font-size:12px;font-weight:700}
@keyframes cs3drop{from{transform:translateY(-18px) scale(.7);opacity:0}}
.mg-cs3 .cs3msay{position:absolute;z-index:3;transform:translate(-50%,-100%);background:#ffd166;color:#2a1a00;font-weight:900;font-size:14px;padding:5px 11px;border-radius:10px;white-space:nowrap;box-shadow:0 0 0 2px #0b0d18,0 3px 0 2px #0006;animation:cs3sayin2 .4s cubic-bezier(.3,1.6,.5,1) both}
.mg-cs3 .cs3msay.sad{background:#e8eaf3;color:#3a3f5a}
@keyframes cs3sayin2{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
@media (max-height:680px){.mg-cs3 .cs3cd .jb b{font-size:20px}.mg-cs3 .cs3cd .rw span{font-size:12px}}
`;

export const GAME = {
  key: "cs3", base: "cs", n: "공고 중매술", desc: "멘티에게 맞는 공고만 쏙쏙, 서류 합격 알림을 쌓아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 위에 <b>멘티 프로필</b>(희망 직무·경력·지역)이 있고, 채용공고가 한 장씩 날아와요.",
    "맞는 공고는 <b>오른쪽으로 밀어 지원!</b> 직무·경력·근무지가 안 맞거나 <b>수상한 문구</b>(열정페이 같은)가 있으면 <b>왼쪽으로 패스</b>. <b>오픈 예정</b> 공고는 <b>위로 밀어 찜</b>.",
    "<b>대기업</b>은 비슷한 직무여도 지원하면 보너스(회사가 직무보다 중요!). <b>D-1·D-DAY</b> 공고는 불타기 전에 빨리. 많이, 정확하게 지원할수록 멘티 폰에 <b>서류 합격</b>이 쌓여요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "맞으면 → 지원"], ["", "수상하면 ← 패스"], ["", "서류 합격 우르르"]]; } },
  css: CSS,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const T = Math.round(30 * ez), TARGET = 6;
  const F = frame(host, "cs3", "공고 중매술", "", "", `<button class="mg-btn" data-d="L">← 패스</button><button class="mg-btn" data-d="U">↑ 찜</button><button class="mg-btn gold" data-d="R">지원 →</button>`);
  const M = { ...pick(MENTEES) };
  const season = pick([["상반기 공채 시즌", "3/2"], ["하반기 공채 시즌", "9/1"], ["상반기 공채 시즌", "3/16"], ["하반기 공채 시즌", "9/8"]]);
  const cTxt = M.c === 0 ? "신입" : M.c <= 2 ? `중고신입(${M.c}년)` : `경력 ${M.c}년 차`;
  F.stage.insertAdjacentHTML("beforeend", `<div class="cs3w"><canvas class="cs3bg"></canvas><div class="cs3me"></div><canvas class="cs3fr"></canvas>
    <div class="cs3pf"><canvas class="pt" width="26" height="24"></canvas><div class="in">
      <div class="t1"><em>내 멘티</em><span>${M.maj} · ${cTxt}</span><i>${season[0]}</i></div>
      <div class="t2"><small>희망 직무</small><b>${M.job}</b><span>비슷한 직무 ${M.rel.join("·")}</span></div>
      <div class="t3"><b>${M.loc}</b>${M.str.map((s) => `<span>${s}</span>`).join("")}</div></div></div>
    <div class="cs3lb l"><b>←</b>패스</div><div class="cs3lb r"><b>→</b>지원</div><div class="cs3lb u"><b>↑</b> 찜</div>
    <div class="cs3gh g2"></div><div class="cs3gh g1"></div>
    <div class="cs3fd">찜 <b>0</b></div><div class="cs3bd">0</div><div class="cs3nt"></div><div class="cs3say"></div>
    <div class="cs3go"><i></i><span></span></div>
    <div class="cs3end"><canvas class="cs3ec"></canvas><div class="cs3big"><div class="tm"></div><div class="dt">멘티의 폰 · 알림</div><div class="ls"></div></div></div>
    <div class="cs3tut off"><div class="cs3tc"><em>리허설</em><p></p><div class="cs3tb"></div></div></div></div>`);
  const $ = (s) => F.stage.querySelector(s);
  const wrap = $(".cs3w"), bgC = $(".cs3bg"), frC = $(".cs3fr"), meEl = $(".cs3me"), pf = $(".cs3pf"), pt = $(".cs3pf .pt");
  const lbL = $(".cs3lb.l"), lbR = $(".cs3lb.r"), lbU = $(".cs3lb.u"), gh1 = $(".cs3gh.g1"), gh2 = $(".cs3gh.g2");
  const fdEl = $(".cs3fd"), fdN = fdEl.querySelector("b"), bdEl = $(".cs3bd"), ntEl = $(".cs3nt"), sayEl = $(".cs3say");
  const goEl = $(".cs3go"), goI = goEl.querySelector("i"), goT = goEl.querySelector("span");
  const endEl = $(".cs3end"), ecC = $(".cs3ec"), bigEl = $(".cs3big"), bigLs = bigEl.querySelector(".ls");
  const tutEl = $(".cs3tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".cs3tb");
  goI.style.backgroundImage = `url(${fingerURL()})`;

  // ── 크기: 무대 폭을 112칸으로 나눈 정수배 ──
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  let KS = 3;
  let K = 3, H = 170, DT = 154, sw = 336, sh = 510, cardBox = { x: 61, y: 124, w: 214, h: 196 }, meBox = { x: 0, y: 0, w: 100, h: 130 }, FY = 40;
  const fit = () => {
    sw = F.stage.clientWidth || 336; sh = F.stage.clientHeight || 510;
    const r = sw / LW; K = r >= 2 ? Math.floor(r) : Math.max(1, r);
    H = Math.max(140, Math.floor(sh / K)); DT = H - 16;
    const ox = Math.round((sw - LW * K) / 2);
    KS = K * DPR; for (const c of [bgC, frC, ecC]) { const cw = Math.round(LW * KS), chh = Math.round(H * KS); if (c.width !== cw) c.width = cw; if (c.height !== chh) c.height = chh; c.style.width = LW * K + "px"; c.style.height = H * K + "px"; c.style.left = ox + "px"; }
    const pfB = 6 + pf.offsetHeight;
    // 컨설턴트(내 캐릭터): 책상 뒤 왼쪽
    const mw = clamp(Math.round(sw * 0.3), 88, 112), mh = Math.round(mw * 312 / 240);
    meBox = { x: ox + 2, y: DT * K - Math.round(mh * 0.8), w: mw, h: mh };
    Object.assign(meEl.style, { left: meBox.x + "px", top: meBox.y + "px", width: mw + "px", height: mh + "px" });
    // 공고 카드 자리
    const cw = Math.min(214, sw - 120), top = pfB + 22, ch = clamp(meBox.y - 8 - top, 160, 200);
    cardBox = { x: Math.round((sw - cw) / 2), y: top, w: cw, h: ch };
    gh1.style.cssText = `left:${cardBox.x + 5}px;top:${cardBox.y + 6}px;width:${cw - 10}px;height:${ch}px;transform:rotate(2deg)`;
    gh2.style.cssText = `left:${cardBox.x + 10}px;top:${cardBox.y + 11}px;width:${cw - 20}px;height:${ch}px;transform:rotate(-2.5deg);opacity:.7`;
    const midY = cardBox.y + ch / 2 - 18, sideW = cardBox.x - 6;
    lbL.style.cssText = `left:3px;top:${midY}px;width:${sideW}px`; lbR.style.cssText = `right:3px;top:${midY}px;width:${sideW}px`;
    lbU.style.cssText = `left:0;right:0;top:${pfB + 3}px`;
    // 찜 폴더(오른쪽 위), 멘티 폰(책상 오른쪽)
    FY = Math.round((pfB + 10) / K);
    fdEl.style.cssText = `left:${ox + 95 * K - 12}px;top:${(FY + 13) * K}px;width:${17 * K + 24}px`;
    bdEl.style.left = ox + 92 * K + "px"; bdEl.style.top = (DT - 31) * K + "px";
    ntEl.style.bottom = (H - DT + 34) * K + "px";
    sayEl.style.left = meBox.x + meBox.w * 0.42 + "px"; sayEl.style.top = meBox.y + 6 + "px";
    const mEl = F.stage.querySelector(".mg-msg"); if (mEl) mEl.style.top = cardBox.y + cardBox.h + 8 + "px";
    if (cur && cur.el && !cur.out) placeCard(cur.el);
  };
  const placeCard = (el) => Object.assign(el.style, { left: cardBox.x + "px", top: cardBox.y + "px", width: cardBox.w + "px", height: cardBox.h + "px" });

  // 멘티 도트(프로필 사진·마지막 장면)
  const ms = menteeSpec();
  const MS = { stand: menteeSprite(ms, "stand"), hold: menteeSprite(ms, "hold"), jump: menteeSprite(ms, "jump"), sad: menteeSprite(ms, "sad") };
  { const g = pt.getContext("2d"); g.fillStyle = "#cfe4ff"; g.fillRect(0, 0, 26, 24); g.fillStyle = "#b8d4f4"; for (let y = 0; y < 24; y += 4) g.fillRect(0, y, 26, 1); g.drawImage(MS.stand, 1, 3); pt.style.width = 26 * 3 + "px"; pt.style.height = 24 * 3 + "px"; }
  // 멘티 캐릭터 그림: 프로필 얼굴 표정(합격 알림=웃음, 탈락=시무룩), 마지막 장면 몸
  const AVK = typeof opts.avatar === "string" ? opts.avatar : "";
  const MPOOL = ["c002", "c009", "c010", "c021", "c022", "c024", "c028", "c030", "c034", "c039", "c047", "c050", "c051", "c052", "c053", "c054", "c055", "c057", "c063", "c074", "c079", "c083", "c084", "pF2", "pF3", "pF5", "pM1", "pM3", "pM5", "pM8"].filter((k) => k !== AVK);
  const MK = pick(MPOOL), MART = { ok: false, im: new Image() };
  const MEXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  let mEx = "neutral", mExT = 0;
  const drawPt = () => {
    if (!MART.ok) return;
    const S = Math.round(72 * DPR); if (pt.width !== S) { pt.width = S; pt.height = S; pt.style.width = "72px"; pt.style.height = "72px"; }
    const g = pt.getContext("2d"), e = MEXI[mEx] || 0;
    const bgG = g.createLinearGradient(0, 0, 0, S); bgG.addColorStop(0, "#dbeaff"); bgG.addColorStop(1, "#a8c8f0"); g.fillStyle = bgG; g.fillRect(0, 0, S, S);
    g.imageSmoothingEnabled = true; g.drawImage(MART.im, (e % 3) * 240 + 36, (e >= 3 ? 540 : 0) + 4, 168, 168, 0, 0, S, S);
  };
  const mFace = (ex, dur = 0) => { mEx = ex; mExT = dur; drawPt(); };
  MART.im.onload = () => { MART.ok = true; drawPt(); };
  MART.im.src = "img/body/" + MK + ".webp";
  // 밤 방 배경 그림
  const ROOM = { ok: false, im: new Image() }, ROOM2 = { ok: false, im: new Image() };
  ROOM.im.onload = () => { ROOM.ok = true; if (wrap.isConnected) drawBg(); }; ROOM.im.src = "img/bg/online.webp";
  ROOM2.im.onload = () => (ROOM2.ok = true); ROOM2.im.src = "img/bg/home.webp";
  const ICON = {}; for (const t in COMP) { try { ICON[t] = compSVG(t); } catch (e) { ICON[t] = compIcon(t).toDataURL(); } }
  const MAIL_OK = mailSVG(true), MAIL_NO = mailSVG(false);

  // 내 캐릭터 그림(컨설턴트): 몸 그림 시트 3x2 = 표정 6개. 못 불러오면 그림 없이 진행
  const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
  { const im = new Image(); im.onload = () => { meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
  const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  let face = "", faceT = 0, faceBack = "neutral";
  const setFace = (ex, dur = 0) => { if (ex !== face) { face = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; } faceT = dur; };
  setFace("neutral");
  let sayT = 0;
  const say = (t, bad = false, stay = false) => { sayEl.textContent = t; sayEl.className = "cs3say"; void sayEl.offsetWidth; sayEl.className = "cs3say " + (stay ? "stay" : "on") + (bad ? " bad" : ""); clearTimeout(sayT); };

  // ── 배경(밤 방, 한 번만) ──
  const drawBg = () => {
    const g = bgC.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    g.setTransform(KS, 0, 0, KS, 0, 0);
    if (ROOM.ok) {
      const im = ROOM.im, iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(LW / iw, H / ih), sw2 = LW / sc, sh2 = H / sc;
      g.imageSmoothingEnabled = true; g.drawImage(im, (iw - sw2) * 0.42, (ih - sh2) * 0.5, sw2, sh2, 0, 0, LW, H);
      g.fillStyle = "rgba(14,16,44,.32)"; g.fillRect(0, 0, LW, H);
      const v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, "#121530dd"); v.addColorStop(0.35, "#12153044"); v.addColorStop(1, "#12153000"); g.fillStyle = v; g.fillRect(0, 0, LW, H);
      const rg = g.createRadialGradient(106, DT - 4, 2, 100, DT - 4, 50); rg.addColorStop(0, "rgba(255,214,140,.42)"); rg.addColorStop(1, "rgba(255,214,140,0)"); g.fillStyle = rg; g.fillRect(30, DT - 64, LW - 30, 64);
      return;
    }
    for (let y = 0; y < H; y++) { const t = y / H; P(0, y, LW, 1, `rgb(${Math.round(26 + t * 18)},${Math.round(30 + t * 14)},${Math.round(58 + t * 22)})`); }
    for (let x = 4; x < LW; x += 10) for (let y = 2; y < DT; y += 6) P(x + ((y / 6) % 2 ? 5 : 0), y, 1, 1, "#ffffff10");
    // 창문(왼쪽): 밤 도시
    const wy = FY + 4, wh = 34;
    P(1, wy, 20, wh, "#4a4f6a"); P(2, wy + 1, 18, wh - 2, "#0d1430");
    for (let k = 0; k < 9; k++) P(2 + rint(18), wy + 1 + rint(14), 1, 1, "#e9eeff");
    P(14, wy + 3, 3, 3, "#fff3c0"); P(14, wy + 3, 1, 1, "#0d1430");
    const bl = [[2, 20, 4], [6, 14, 3], [9, 22, 4], [13, 17, 3], [16, 24, 4]];
    for (const [x, hgt, w] of bl) { P(x, wy + wh - 1 - hgt + 8, w, hgt - 8, "#1e2648"); for (let yy = wy + wh - hgt + 9; yy < wy + wh - 2; yy += 2) for (let xx = x; xx < x + w - 1; xx += 2) if (rnd() < 0.45) P(xx, yy, 1, 1, rnd() < 0.7 ? "#ffd166" : "#8fd8ff"); }
    P(11, wy + 1, 1, wh - 2, "#4a4f6a"); P(2, wy + 15, 18, 1, "#4a4f6a"); P(0, wy + wh, 22, 2, "#6a6f8a");
    // 코르크판 + 달력(오른쪽)
    const cy = DT - 60;
    P(92, cy, 19, 22, "#8a5e36"); // 코르크판 P(93, cy + 1, 17, 20, "#c8935a"); for (let k = 0; k < 14; k++) P(93 + rint(17), cy + 1 + rint(20), 1, 1, "#b07a44");
    P(94, cy + 3, 8, 9, "#fffdf7"); P(94, cy + 3, 8, 2, "#e0313f"); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) P(95 + q * 2, cy + 6 + r * 2, 1, 1, "#8a90ad"); P(98, cy + 7, 3, 3, "#e0313f"); P(99, cy + 8, 1, 1, "#fffdf7");
    P(103, cy + 4, 6, 6, "#ffe066"); P(104, cy + 6, 4, 1, "#b09030"); P(104, cy + 8, 3, 1, "#b09030"); P(106, cy + 3, 1, 1, "#e0313f");
    P(97, cy + 13, 6, 6, "#ff9ab0"); P(98, cy + 15, 4, 1, "#a04060"); P(105, cy + 12, 5, 7, "#9fe0ff"); P(106, cy + 14, 3, 1, "#3a6a8a");
    // 책장(왼쪽 아래, 컨설턴트 뒤)
    P(0, DT - 34, 30, 34, "#4a3426"); P(1, DT - 33, 28, 32, "#2e2018");
    for (const sy of [DT - 18, DT - 2]) { P(0, sy, 30, 2, "#5a4030"); let x = 2; while (x < 27) { const w = 2 + rint(2), hh = 9 + rint(5); P(x, sy - hh, w, hh, pick(["#c94f4f", "#3a6ea5", "#e0a030", "#5fa060", "#8a5fc0", "#d8d0c0"])); P(x, sy - hh + 2, w, 1, "#ffffff44"); x += w + (rnd() < 0.2 ? 2 : 0); } }
    // 스탠드 불빛
    const rg = g.createRadialGradient(106, DT - 4, 2, 100, DT - 4, 46); rg.addColorStop(0, "rgba(255,214,140,.38)"); rg.addColorStop(1, "rgba(255,214,140,0)"); g.fillStyle = rg; g.fillRect(40, DT - 60, LW - 40, 60);
  };
  // ── 앞 층(책상·노트북·폰·휴지통·찜 폴더). 매 프레임 ──
  let phoneFx = 0, phoneCol = "#5fe0a0", binN = 0, fdPop = 0, steamT = 0;
  const drawFr = (t) => {
    const g = frC.getContext("2d");
    g.setTransform(KS, 0, 0, KS, 0, 0); g.clearRect(0, 0, LW, H); g.imageSmoothingEnabled = true;
    const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
    const lgr = (x0, y0, x1, y1, cs) => { const q = g.createLinearGradient(x0, y0, x1, y1); cs.forEach((c, i) => q.addColorStop(i / (cs.length - 1), c)); return q; };
    const sh = (b, c = "#0009") => { g.shadowColor = c; g.shadowBlur = b * KS; }, nos = () => { g.shadowColor = "transparent"; g.shadowBlur = 0; };
    // 찜 폴더
    { const y = FY - (fdPop > 0 ? Math.sin(fdPop * 9) * 2 : 0);
      g.save(); sh(2.5); rr(95, y, 7.4, 3.4, 1.2); g.fillStyle = "#d8a030"; g.fill(); rr(94.4, y + 2, 16.8, 10.6, 1.8); g.fillStyle = lgr(0, y + 2, 0, y + 12.6, ["#ffe08a", "#f5c04e", "#d0962a"]); g.fill(); nos();
      g.fillStyle = "#fff6c8"; g.font = "900 6px sans-serif"; g.textAlign = "center"; g.fillText("★", 102.8, y + 10.2); g.restore(); }
    // 책상
    g.fillStyle = lgr(0, DT - 2, 0, DT + 1.4, ["#ecc690", "#c79a62", "#a87a46"]); g.fillRect(0, DT - 2, LW, 3.4);
    g.fillStyle = lgr(0, DT + 1, 0, H, ["#8a5e36", "#6a4426"]); g.fillRect(0, DT + 1.4, LW, H - DT);
    g.fillStyle = "#5a3a20"; for (const x of [37, 75]) g.fillRect(x, DT + 1.4, 0.6, H - DT);
    for (const x of [18, 56, 93]) { rr(x - 3.4, DT + 6.6, 6.8, 1.6, 0.8); g.fillStyle = "#c79a62"; g.fill(); }
    // 휴지통(구겨진 공고가 쌓인다)
    g.save(); sh(2); g.beginPath(); g.moveTo(34.6, DT - 11.6); g.lineTo(44.4, DT - 11.6); g.lineTo(43.4, DT - 1.6); g.lineTo(35.6, DT - 1.6); g.closePath(); g.fillStyle = lgr(34, 0, 45, 0, ["#8a90ad", "#6a7088", "#4a4f66"]); g.fill(); nos();
    g.strokeStyle = "#3a3f55"; g.lineWidth = 0.4; g.beginPath(); for (let x = 37; x < 43; x += 1.8) { g.moveTo(x, DT - 9.6); g.lineTo(x - 0.1, DT - 3); } g.stroke();
    rr(34, DT - 12.6, 11, 1.8, 0.9); g.fillStyle = "#a8aec6"; g.fill();
    for (let k = 0; k < Math.min(5, binN); k++) { const bx = 36.4 + ((k * 3) % 7), by = DT - 13.4 - Math.floor(k / 3) * 2; g.beginPath(); g.arc(bx, by, 1.7, 0, 6.3); g.fillStyle = "#f4f1e8"; g.fill(); g.strokeStyle = "#c8c0b0"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(bx - 1, by - 0.4); g.lineTo(bx + 0.6, by + 0.6); g.stroke(); }
    g.restore();
    // 노트북(뒷면) + 화면 빛
    g.save(); g.fillStyle = "rgba(160,210,255,.16)"; g.beginPath(); g.ellipse(63, DT - 26, 22, 5, 0, 0, 6.3); g.fill();
    sh(3); rr(48, DT - 24, 30, 22, 2); g.fillStyle = lgr(48, DT - 24, 78, DT, ["#d4d8e6", "#9aa0b4", "#7a8096"]); g.fill(); nos();
    g.shadowColor = "#ffb347"; g.shadowBlur = 4 * KS; g.beginPath(); g.arc(63, DT - 13, 3, 0, 6.3); g.fillStyle = "#ffd166"; g.fill(); nos(); g.beginPath(); g.arc(63, DT - 13, 1.6, 0, 6.3); g.fillStyle = "#ff8a5a"; g.fill();
    rr(45.6, DT - 3.4, 34.8, 2.2, 1.1); g.fillStyle = lgr(0, DT - 3.4, 0, DT - 1.2, ["#a8aec6", "#5a6078"]); g.fill(); g.restore();
    // 머그컵 + 김
    g.save(); sh(1.5); rr(100, DT - 8.4, 6.4, 7.4, [0.6, 0.6, 1.8, 1.8]); g.fillStyle = lgr(100, 0, 106.4, 0, ["#ffffff", "#e4e0d6"]); g.fill(); nos();
    g.beginPath(); g.ellipse(103.2, DT - 8.2, 3, 0.8, 0, 0, 6.3); g.fillStyle = "#6a3a1a"; g.fill(); g.strokeStyle = "#ece8de"; g.lineWidth = 1; g.beginPath(); g.arc(106.8, DT - 5, 1.6, -1.4, 1.4); g.stroke();
    g.fillStyle = "#ff6b6b"; g.font = "900 3.4px sans-serif"; g.textAlign = "center"; g.fillText("♥", 103.2, DT - 3);
    if (!RM()) { g.strokeStyle = "rgba(240,240,250,.5)"; g.lineWidth = 0.5; for (let i = 0; i < 2; i++) { const ph = (t * 0.6 + i * 0.5) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(102 + i * 2, DT - 9.6 - ph * 4); g.bezierCurveTo(103.6 + i * 2, DT - 12 - ph * 6, 100.6 + i * 2, DT - 13 - ph * 6, 102.4 + i * 2, DT - 16 - ph * 6); g.stroke(); } g.globalAlpha = 1; }
    g.restore();
    // 멘티 폰(거치대): 합격이면 초록, 탈락이면 회색으로 번쩍
    const shk = phoneFx > 0.25 ? (Math.floor(t * 40) % 2 ? 0.8 : -0.8) : 0, X = 83;
    g.save(); rr(X + 1, DT - 3, 10, 2, 1); g.fillStyle = "#3a3f55"; g.fill(); g.fillRect(X + 5, DT - 6, 2, 3);
    sh(3); rr(X + shk, DT - 30, 12, 24, 2.4); g.fillStyle = "#0b0d18"; g.fill(); nos();
    rr(X + 1 + shk, DT - 28.8, 10, 21.6, 1.4); g.fillStyle = phoneFx > 0 ? lgr(0, DT - 29, 0, DT - 7, [phoneCol, shade(phoneCol, 0.7)]) : lgr(0, DT - 29, 0, DT - 7, ["#2a3a70", "#141c40"]); g.fill();
    if (phoneFx > 0) { rr(X + 2 + shk, DT - 26, 8, 3.4, 1); g.fillStyle = "#ffffff"; g.fill(); g.beginPath(); g.arc(X + 3.6 + shk, DT - 24.3, 0.9, 0, 6.3); g.fillStyle = phoneCol; g.fill(); rr(X + 2 + shk, DT - 21.4, 8, 3, 1); g.fillStyle = "#ffffffaa"; g.fill(); }
    else { g.fillStyle = "#3a4a80"; rr(X + 2.4, DT - 26, 7, 1.6, 0.8); g.fill(); rr(X + 2.4, DT - 22.4, 5, 1.6, 0.8); g.fill(); rr(X + 4, DT - 11.6, 4, 0.9, 0.45); g.fill(); }
    if (phoneFx > 0.2 && !RM()) { g.strokeStyle = "#ffd166"; g.lineWidth = 0.7; g.lineCap = "round"; g.beginPath(); g.moveTo(X - 1.6, DT - 24); g.lineTo(X - 3, DT - 26); g.moveTo(X + 13.6, DT - 22); g.lineTo(X + 15, DT - 24); g.moveTo(X - 2, DT - 18); g.lineTo(X - 3.8, DT - 18); g.stroke(); }
    g.restore();
    // 스탠드(맨 오른쪽)
    g.save(); rr(107.4, DT - 3.2, 5, 2.2, 1); g.fillStyle = "#2a2e3a"; g.fill(); g.strokeStyle = "#4a4f66"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(110, DT - 3); g.lineTo(110.4, DT - 26); g.stroke();
    g.shadowColor = "#ffd166"; g.shadowBlur = 8 * KS; g.beginPath(); g.moveTo(106, DT - 26); g.lineTo(112.4, DT - 26); g.lineTo(111.4, DT - 30.4); g.lineTo(107, DT - 30.4); g.closePath(); g.fillStyle = "#ffd166"; g.fill(); nos();
    g.fillStyle = "#fff6d0"; g.fillRect(106.6, DT - 26.2, 5.4, 0.8); g.restore();
  };
  // ── 상태 ──
  let tut = 0, tutT = 0, over = false, ended = false, raf = 0, last = 0, el = 0, t0 = 0, tm = null;
  let cur = null, bag = [], idleT = 0, firstHint = 0, urgSaid = false, dealing = false;
  const st = { n: 0, ok: 0, pass: 0, rej: 0, bonus: 0, urgN: 0, urgOk: 0, saves: 0, combo: 0 };
  const results = []; // 마지막 장면 알림: { ok, comp }
  const upd = () => { F.sc.textContent = `합격 ${st.pass} · 탈락 ${st.rej}`; bdEl.textContent = st.pass; fdN.textContent = st.saves; };
  const nextKind = () => { if (!bag.length) bag = shuffle(BAG.slice()); return bag.pop(); };

  // 공고 카드 만들기·들이기
  const cardHTML = (c) => `<div class="hd" style="--hc:${COMP[c.typ].col}"><img src="${ICON[c.typ]}" alt=""><span><b>${c.comp}</b><small>${COMP[c.typ].n}</small></span>${c.pre ? "" : `<em class="dd">${c.dd}</em>`}</div>
    <div class="jb"><small>모집 직무</small><b>${c.job}</b></div>
    <div class="rw"><span><i>경력</i>${c.req}</span><span><i>근무지</i>${c.loc}</span></div>
    <div class="tg">${c.tag}</div>${c.urg ? `<div class="fz"><i></i><em></em></div>` : ""}${c.pre ? `<div class="rb">${season[1]} 접수 시작</div>` : ""}
    <div class="st r">지원!</div><div class="st l">패스</div><div class="st u">찜</div>`;
  const deal = (c) => {
    const e = document.createElement("div"); e.className = "cs3cd" + (c.urg ? " urg" : "") + (c.pre ? " pre" : ""); e.innerHTML = cardHTML(c);
    c.el = e; c.out = false; c.ready = false; c.fuse = c.dd === "D-DAY" ? 3.4 * ez : 4.4 * ez; c.fuse0 = c.fuse; c.dx = 0; c.dy = 0;
    placeCard(e); wrap.appendChild(e); cur = c; bindDrag(c);
    noise(0.12, 3200, 0.06); tone(700, 0.05, "triangle", 0.05, 300);
    if (e.animate && !RM()) e.animate([{ transform: "translate(170px,-90px) rotate(18deg)", opacity: 0 }, { transform: "translate(-6px,4px) rotate(-2deg)", opacity: 1, offset: 0.8 }, { transform: "none" }], { duration: 300, easing: "ease-out" });
    setTimeout(() => (c.ready = true), RM() ? 0 : 290);
    if (c.urg && tut < 0) { st.urgN++; setFace("surprised", 0.9); tone(1046, 0.07, "square", 0.07); tone(1046, 0.07, "square", 0.07, 0, 0.12); if (!urgSaid) { urgSaid = true; say("마감 임박! 빨리!", true); } }
    idleT = 0;
  };
  const dealNext = () => { if (over) return; dealing = false; deal(mkCard(M, nextKind(), el > 1.5)); };

  // 끌기: 오른쪽 지원 / 왼쪽 패스 / 위 찜
  const stampShow = (c) => {
    const e = c.el, r = clamp(c.dx / 80, 0, 1), l = clamp(-c.dx / 80, 0, 1), u = Math.abs(c.dx) < -c.dy ? clamp(-c.dy / 80, 0, 1) : 0;
    e.querySelector(".st.r").style.opacity = u ? 0 : r; e.querySelector(".st.l").style.opacity = u ? 0 : l; e.querySelector(".st.u").style.opacity = u;
    lbR.classList.toggle("hot", !u && r > 0.6); lbL.classList.toggle("hot", !u && l > 0.6); lbU.classList.toggle("hot", u > 0.6);
  };
  const bindDrag = (c) => {
    const e = c.el; let sx = 0, sy = 0, on = false, vx = 0, vy = 0, lt = 0, lx = 0, ly = 0;
    e.addEventListener("pointerdown", (ev) => {
      if (over || c.out || !c.ready || tutBlock()) return; ev.preventDefault(); on = true; sx = ev.clientX; sy = ev.clientY; lx = sx; ly = sy; lt = performance.now(); vx = vy = 0;
      try { e.setPointerCapture(ev.pointerId); } catch (er) {} e.classList.add("drag"); SFX.tok();
    });
    e.addEventListener("pointermove", (ev) => {
      if (!on || c.out) return; c.dx = ev.clientX - sx; c.dy = ev.clientY - sy;
      const now = performance.now(), dtm = Math.max(1, now - lt); vx = (ev.clientX - lx) / dtm; vy = (ev.clientY - ly) / dtm; lx = ev.clientX; ly = ev.clientY; lt = now;
      e.style.transform = `translate(${c.dx}px,${Math.min(c.dy, 40)}px) rotate(${c.dx * 0.07}deg)`; stampShow(c); idleT = 0;
    });
    const up = () => {
      if (!on) return; on = false; e.classList.remove("drag"); if (c.out) return;
      const fx = c.dx + vx * 120, fy = c.dy + vy * 120;
      let d = null;
      if (-fy > 70 && -fy > Math.abs(fx)) d = "U"; else if (fx > 70) d = "R"; else if (fx < -70) d = "L";
      if (d) decide(d); else springBack(c);
    };
    e.addEventListener("pointerup", up); e.addEventListener("pointercancel", up);
  };
  const springBack = (c) => {
    c.dx = 0; c.dy = 0; stampShow(c); const e = c.el;
    if (e.animate) e.animate([{ transform: e.style.transform || "none" }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.3,1.6,.5,1)" });
    e.style.transform = "";
  };
  // 카드가 폰·휴지통·폴더로 날아간다
  const flyOut = (c, d, then) => {
    const e = c.el; c.out = true; const W2 = cardBox.w / 2, H2 = cardBox.h / 2, cx = cardBox.x + W2, cy = cardBox.y + H2;
    const ox = Math.round((sw - LW * K) / 2);
    const tgt = d === "R" ? [ox + 89 * K, (DT - 18) * K] : d === "L" ? [ox + 39 * K, (DT - 10) * K] : d === "U" ? [ox + 102 * K, (FY + 6) * K] : [cx, cy + 260];
    const s = d === "X" ? 0.9 : 0.12, rot = d === "R" ? 28 : d === "L" ? -40 : d === "U" ? 10 : 8;
    const from = e.style.transform || "none";
    e.querySelectorAll(".st").forEach((x) => (x.style.opacity = 0)); if (d !== "X") { const sx = e.querySelector(".st." + (d === "R" ? "r" : d === "L" ? "l" : "u")); if (sx) sx.style.opacity = 1; }
    lbL.classList.remove("hot"); lbR.classList.remove("hot"); lbU.classList.remove("hot");
    let done = false; const fin = () => { if (done) return; done = true; e.remove(); then && then(); };
    if (e.animate && !RM()) {
      const a = e.animate([{ transform: from }, { transform: `translate(${(tgt[0] - cx) * 0.25 + c.dx * 0.4}px,${(tgt[1] - cy) * 0.1 - 20}px) rotate(${rot * 0.4}deg) scale(.9)`, offset: 0.35 }, { transform: `translate(${tgt[0] - cx}px,${tgt[1] - cy}px) rotate(${rot}deg) scale(${s})`, opacity: d === "X" ? 0 : 0.9 }], { duration: d === "X" ? 520 : 420, easing: "ease-in", fill: "forwards" });
      a.onfinish = fin; setTimeout(fin, (d === "X" ? 520 : 420) + 60);
    } else setTimeout(fin, 60);
  };
  const notif = (ok, comp) => {
    if (!host.isConnected) return;
    const n = document.createElement("div"); if (!ok) n.className = "no";
    n.innerHTML = `<img src="${ok ? MAIL_OK : MAIL_NO}" alt="">${ok ? `서류 합격! <span style="color:#2a8a5a">${comp}</span>` : `탈락 메일 · ${comp}`}`;
    ntEl.appendChild(n); setTimeout(() => n.remove(), 1950); while (ntEl.children.length > 3) ntEl.firstChild.remove();
    phoneFx = 0.9; phoneCol = ok ? "#5fe0a0" : "#9aa0b4"; mFace(ok ? "smile" : "sad", 1.3);
    if (ok) { tone(1318, 0.08, "triangle", 0.11); tone(1760, 0.14, "triangle", 0.1, 0, 0.08); noise(0.14, 160, 0.1, 0.02, 3); vib([15, 30, 15]); bdEl.classList.add("pop"); setTimeout(() => bdEl.classList.remove("pop"), 160); }
    else { tone(330, 0.16, "triangle", 0.09, -60); tone(247, 0.22, "triangle", 0.08, -40, 0.14); noise(0.1, 160, 0.08, 0, 3); }
    upd();
  };
  const stagePt = () => [cardBox.x + cardBox.w / 2, cardBox.y + cardBox.h * 0.35];

  // 결정
  const decide = (d) => {
    const c = cur; if (!c || c.out || !c.ready || over) return;
    if (tut === 0 || tut === 9) return;
    if (tut > 0) return tutDecide(c, d);
    const right = d === c.ans, P = stagePt();
    st.n++; idleT = 0;
    if (c.urg && right) st.urgOk++;
    if (right) { st.ok++; st.combo++; } else st.combo = 0;
    flyOut(c, d, null);
    if (d === "R") {
      SFX.snap(); SFX.stamp();
      if (right) {
        F.hit(P, 1, "#5fe0a0"); setFace("smile", 1);
        const big = c.typ === "big";
        if (big) { st.bonus++; F.float([P[0], P[1] + 30], "좋은 회사 일단 붙기 +보너스", ""); say("회사가 먼저예요!"); }
        else if (c.strHit) { F.float([P[0], P[1] + 30], "강점 딱!"); say(pick(SAY_OK)); }
        else say(pick(SAY_OK));
        st.pass++; results.push({ ok: true, comp: c.comp, job: c.job });
        setTimeout(() => notif(true, c.comp), 700 + rnd() * 500);
      } else if (c.ans === "U") {
        F.miss(P); setFace("sad", 1); F.msg("아직 접수 전이에요. 위로 밀어 찜!"); say("아직 오픈 전…", true);
      } else {
        F.miss(P); setFace("sad", 1.1); F.msg(c.why); say(pick(["이건 탈락각…", "앗, 아까워…"]), true);
        st.rej++; results.push({ ok: false, comp: c.comp });
        setTimeout(() => notif(false, c.comp), 700 + rnd() * 500);
      }
    } else if (d === "L") {
      noise(0.18, 2600, 0.12, 0, 0.8); SFX.scratch(0.18); tone(140, 0.1, "sine", 0.15, -40, 0.25); binN++;
      if (right) {
        F.hit(P, 1, "#ff8a96");
        if (c.kind === "trap") { const tg = c.el.querySelector(".tg"); tg.classList.add("tr"); setFace("angry", 0.9); say(c.trapSay); F.msg(c.why); }
        else { setFace("smile", 0.7); say(pick(SAY_NO)); F.msg(c.why); }
      } else { F.miss(P); setFace("sad", 1); say("아까운 공고였는데…", true); F.msg(c.ans === "U" ? "오픈 예정 공고였어요. 찜해 둘걸!" : "멘티와 맞는 공고였어요!"); }
    } else {
      SFX.pop(); tone(880, 0.06, "triangle", 0.08, 0, 0.06); fdPop = 0.5;
      if (right) { st.saves++; F.hit(P, 1, "#ffd166"); setFace("smile", 0.8); say("오픈하면 바로!"); }
      else { F.miss(P); setFace("sad", 1); say("찜할 공고가 아닌데…", true); F.msg(c.ans === "R" ? (c.urg ? "찜하는 사이 마감돼요! 지원했어야 해요" : "지금 지원할 수 있는 공고였어요") : c.why); }
    }
    if (st.combo === 3 || st.combo === 6) { pf.classList.remove("flash"); void pf.offsetWidth; pf.classList.add("flash"); }
    upd(); dealing = true; setTimeout(dealNext, 160);
  };
  // 마감: 도화선이 다 타면 카드가 회색 도장과 함께 떨어진다
  const expire = (c) => {
    if (c.out) return; c.out = true; const e = c.el, P = stagePt();
    e.insertAdjacentHTML("beforeend", `<div class="st x">마감</div>`); noise(0.25, 500, 0.15); tone(200, 0.25, "sawtooth", 0.08, -80);
    if (c.ans === "R") { st.n++; st.combo = 0; F.miss(P); setFace("sad", 1); say("마감 놓쳤어요…", true); F.msg("맞는 공고였는데 마감됐어요!"); }
    else { st.urgOk++; F.msg("마감됐어요. 어차피 안 맞는 공고!"); }
    upd(); dealing = true; setTimeout(() => { flyOut(c, "X", null); setTimeout(dealNext, 200); }, 380);
  };

  // ── 손가락 안내 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? o.d + o.t : ""; if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "cs3go"; return; }
    goEl.style.left = cardBox.x + cardBox.w / 2 + "px"; goEl.style.top = cardBox.y + cardBox.h * (o.d === "U" ? 0.45 : o.d === "T" ? 0.72 : 0.3) + "px";
    goT.innerHTML = o.t; goEl.className = "cs3go on " + o.d.toLowerCase();
  };

  // ── 리허설: 지원(→) → 패스(←) → 찜(↑) → 안내 ──
  const SKIP = `<button class="cs3skip" data-skip>건너뛰기</button>`;
  const TUT = [null,
    { kind: "good", d: "R", top: true, t: () => `위 <b>멘티 프로필</b>과 공고를 비교해요.<br>희망 직무 <b>${M.job}</b>, 경력도 맞으면<br><b>오른쪽으로 밀어 지원!</b>`, f: "오른쪽으로 <b>쓱!</b>" },
    { kind: "trap", d: "L", t: () => `직무가 맞아도 <b class="rd">수상한 문구</b>가 있으면<br><b class="rd">왼쪽으로 밀어 패스!</b><br>직무·경력·근무지가 안 맞아도 패스예요.`, f: "왼쪽으로 <b>쓱!</b>" },
    { kind: "pre", d: "U", t: () => `<b class="bl">접수 시작 전</b>(오픈 예정) 공고는<br>아직 못 내요. <b class="yl">위로 밀어 찜!</b>`, f: "위로 <b>쓱!</b>" },
  ];
  const tutBlock = () => tut === 4;
  const placeTut = (mid) => { if (mid) Object.assign(tutEl.style, { top: cardBox.y + 16 + "px", left: "8px" }); else Object.assign(tutEl.style, { top: cardBox.y + cardBox.h + 6 + "px", left: Math.round(meBox.x + meBox.w * 0.62) + "px" }); };
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n >= 1 && n <= 3) {
      const s = TUT[n], c = mkCard(M, s.kind, false);
      if (n === 1) { c.typ = "mid"; c.comp = pick(COMP.mid.names); c.tag = pick(NEUTRAL); c.strHit = false; }
      if (n === 2) { c.req = c.req; }
      tutP.innerHTML = s.t(); tutB.innerHTML = SKIP; placeTut(false); deal(c);
      if (n === 2) setTimeout(() => { const tg = c.el && c.el.querySelector(".tg"); if (tg) tg.classList.add("tt"); }, 300);
    } else if (n === 4) {
      guide(null); placeTut(true);
      tutP.innerHTML = `좋아요! 하나 더.<br><b>대기업</b>은 <b>비슷한 직무</b>(${M.rel.join("·")})여도 지원하면 <b>보너스</b>!<br><b class="rd">D-1·D-DAY</b> 공고는 도화선이 타기 전에 빨리.<br>많이, 정확하게! 자소서는 <b>양치기</b>예요.`;
      tutB.innerHTML = `<button class="cs3go2" data-go>시작!</button>`;
    }
  };
  const tutDecide = (c, d) => {
    const s = TUT[tut];
    if (d !== s.d) { springBack(c); SFX.tok(); F.msg(s.d === "R" ? "멘티와 딱 맞는 공고예요. 오른쪽으로!" : s.d === "L" ? "수상한 문구가 있어요. 왼쪽으로!" : "오픈 예정 공고예요. 위로!"); return; }
    flyOut(c, d, null); cur = null;
    if (d === "R") { SFX.snap(); F.hit(stagePt(), 1, "#5fe0a0"); setFace("smile", 1); say("이건 붙어요!"); setTimeout(() => notif(true, c.comp), 600); }
    else if (d === "L") { noise(0.18, 2600, 0.12); SFX.scratch(0.18); binN++; c.el.querySelector(".tg").classList.add("tr"); F.hit(stagePt(), 1, "#ff8a96"); setFace("angry", 0.9); say(c.trapSay); }
    else { SFX.pop(); fdPop = 0.5; F.hit(stagePt(), 1, "#ffd166"); setFace("smile", 0.8); say("오픈하면 바로!"); }
    guide(null); const n = tut + 1; tut = 9; // 넘어가는 동안 입력 막기
    setTimeout(() => { if (!over) tutNext(n); }, d === "R" ? 1500 : 900);
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    if (cur && cur.el) cur.el.remove(); cur = null;
    Object.assign(st, { n: 0, ok: 0, pass: 0, rej: 0, bonus: 0, urgN: 0, urgOk: 0, saves: 0, combo: 0 }); results.length = 0; binN = 0; bag = [];
    ntEl.innerHTML = ""; upd(); setFace("neutral");
    SFX.go(); t0 = 0; el = 0; firstHint = 3.5;
    tm = timer(T, F.bar, end);
    dealNext();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
  F.foot.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { if (tutBlock()) return; decide(b.dataset.d); }));

  // ── 마지막 장면: 멘티 폰에 '서류 합격' 우르르 ──
  const end = () => {
    if (over) return; over = true; ended = true; guide(null); sayEl.className = "cs3say";
    if (cur && cur.el && !cur.out) flyOut(cur, "X", null);
    F.foot.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const passes = results.filter((r) => r.ok), rejs = results.filter((r) => !r.ok);
    const now = new Date(), hh = 21 + rint(2), mm = rint(60);
    bigEl.querySelector(".tm").textContent = `${hh}:${String(mm).padStart(2, "0")}`; void now;
    setTimeout(() => { endEl.classList.add("on"); SFX.whoosh(); }, 350);
    meEl.style.zIndex = 9; sayEl.style.zIndex = 10;
    let pose = "hold", jumpT = 0; const conf = [];
    const g = ecC.getContext("2d");
    const drawEnd = (t) => {
      const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      g.setTransform(KS, 0, 0, KS, 0, 0);
      if (ROOM2.ok && MART.ok) {
        const im = ROOM2.im, iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(LW / iw, H / ih), sw2 = LW / sc, sh2 = H / sc;
        g.imageSmoothingEnabled = true; g.drawImage(im, (iw - sw2) * 0.3, (ih - sh2) * 0.5, sw2, sh2, 0, 0, LW, H);
        g.fillStyle = "rgba(40,24,60,.35)"; g.fillRect(0, 0, LW, H);
        for (let x = 4; x < LW; x += 8) { const y = 4 + Math.sin(x * 0.2) * 2, on = (Math.floor(t * 3) + x) % 3 === 0, c = ["#ff8a96", "#ffd166", "#5fe0a0", "#8fd8ff"][(x / 8 | 0) % 4]; g.shadowColor = c; g.shadowBlur = (on ? 6 : 3) * KS; g.beginPath(); g.arc(x, y + 2, 1.2, 0, 6.3); g.fillStyle = on ? "#fff6d0" : c; g.fill(); }
        g.shadowBlur = 0; g.shadowColor = "transparent"; g.strokeStyle = "#3a2a4a"; g.lineWidth = 0.4; g.beginPath(); for (let x = 0; x <= LW; x += 2) g.lineTo(x, 4 + Math.sin(x * 0.2) * 2 + 0.6); g.stroke();
        // 멘티: 폰 보다가(무표정) → 합격이면 만세(웃음), 없으면 시무룩
        const e = pose === "jump" ? (Math.floor(jumpT * 3) % 2 ? 1 : 4) : pose === "sad" ? 2 : 0, hh = 104, ww = hh * 240 / 312, cx = 62;
        let jy = pose === "jump" ? Math.abs(Math.sin(jumpT * 6)) * 6 : 0;
        const top = H - hh + 8 - jy;
        g.save(); g.shadowColor = "#000a"; g.shadowBlur = 8 * KS; g.drawImage(MART.im, (e % 3) * 240, e >= 3 ? 540 : 0, 240, 312, cx - ww / 2, top, ww, hh); g.restore();
        const fd = g.createLinearGradient(0, H - 26, 0, H); fd.addColorStop(0, "rgba(40,24,40,0)"); fd.addColorStop(1, "rgba(40,24,40,.9)"); g.fillStyle = fd; g.fillRect(0, H - 26, LW, 26);
        if (pose === "hold") { g.save(); g.translate(cx + 2, top + hh * 0.62); g.rotate(-0.15); g.beginPath(); g.roundRect ? g.roundRect(-5, -8, 10, 16, 1.8) : g.rect(-5, -8, 10, 16); g.fillStyle = "#16182a"; g.fill(); g.beginPath(); g.roundRect ? g.roundRect(-4, -6.6, 8, 13, 1) : g.rect(-4, -6.6, 8, 13); g.fillStyle = "#8fd8ff"; g.fill(); g.restore(); }
        for (const p of conf) { p.vy += 0.04; p.x += p.vx; p.y += p.vy; g.save(); g.translate(p.x, p.y); g.rotate(p.y * 0.3); g.fillStyle = p.c; g.fillRect(-p.s * 0.6, -p.s * 0.35, p.s * 1.2, p.s * 0.7); g.restore(); }
        for (let i = conf.length - 1; i >= 0; i--) if (conf[i].y > H) conf.splice(i, 1);
        return;
      }
      for (let y = 0; y < H; y++) { const k = y / H; P(0, y, LW, 1, `rgb(${Math.round(52 + k * 30)},${Math.round(40 + k * 22)},${Math.round(78 + k * 14)})`); }
      // 꼬마전구 줄
      for (let x = 2; x < LW; x += 7) { const y = 3 + Math.round(Math.sin(x * 0.2) * 2); P(x, y, 1, 1, "#3a2a4a"); P(x, y + 1, 2, 2, ["#ff8a96", "#ffd166", "#5fe0a0", "#8fd8ff"][(x / 7 | 0) % 4]); if ((Math.floor(t * 3) + x) % 3 === 0) P(x, y + 1, 2, 2, "#fff6d0"); }
      // 바닥·침대
      P(0, H - 26, LW, 26, "#6a4a3a"); for (let x = 0; x < LW; x += 12) P(x, H - 26, 1, 26, "#5a3c2e"); P(0, H - 26, LW, 1, "#8a6a52");
      P(76, H - 40, 36, 16, "#e8e0f4"); P(76, H - 40, 36, 3, "#c8b8e0"); P(78, H - 46, 12, 6, "#fff"); P(76, H - 24, 36, 4, "#8a6a8a");
      // 멘티
      const spr = MS[pose], sc = 2, x = 40, by = H - 6 - 42 * sc;
      let jy = 0; if (pose === "jump") jy = Math.round(Math.abs(Math.sin(jumpT * 6)) * 6);
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 8, H - 8, 36 - Math.round(jy / 2), 3);
      g.imageSmoothingEnabled = false; g.drawImage(spr, x, by - jy, 26 * sc, 42 * sc);
      for (const p of conf) { p.vy += 0.04; p.x += p.vx; p.y += p.vy; P(Math.round(p.x), Math.round(p.y), p.s, p.s, p.c); }
      for (let i = conf.length - 1; i >= 0; i--) if (conf[i].y > H) conf.splice(i, 1);
    };
    let eraf = 0, el0 = performance.now();
    const eloop = (now2) => { if (!ecC.isConnected) return; const t = (now2 - el0) / 1000; if (pose === "jump") jumpT += 1 / 60; drawEnd(t); eraf = requestAnimationFrame(eloop); };
    eraf = requestAnimationFrame(eloop);
    // 알림이 하나씩 떨어진다
    const list = results.slice(-3), show = list, more = results.length - show.length;
    let i = 0;
    const t1 = 900, gap = RM() ? 120 : 300;
    const step = () => {
      if (!host.isConnected) return;
      if (i < show.length) {
        const r = show[i], d = document.createElement("div"); if (!r.ok) d.className = "no";
        d.innerHTML = `<img src="${r.ok ? MAIL_OK : MAIL_NO}" alt=""><span>${r.ok ? "서류 합격!" : "지원 결과 안내"} · ${r.comp}<small>${r.ok ? `${r.job} · 면접 일정 확인` : "아쉽지만 이번에는…"}</small></span>`;
        bigLs.appendChild(d); bigEl.classList.remove("buzz"); void bigEl.offsetWidth; bigEl.classList.add("buzz");
        if (r.ok) { const k = Math.pow(1.07, i); tone(1046 * k, 0.07, "triangle", 0.11); tone(1568 * k, 0.12, "triangle", 0.09, 0, 0.06); vib(14); } else tone(300, 0.15, "triangle", 0.08, -50);
        i++; setTimeout(step, gap); return;
      }
      if (more > 0) { const d = document.createElement("div"); d.className = "more"; d.textContent = `알림 ${more}개 더 · 합격 ${passes.length} 탈락 ${rejs.length}`; if (rejs.length > passes.length) d.style.background = "#c9ccd8"; bigLs.appendChild(d); }
      if (!show.length) bigLs.innerHTML = `<p>새 알림이 없어요</p>`;
      const ms2 = document.createElement("div"); ms2.className = "cs3msay" + (passes.length ? "" : " sad");
      ms2.style.left = Math.round((sw - LW * K) / 2) + 66 * K + "px"; ms2.style.top = (H - 6 - 84 - 2) * K + "px"; ms2.style.zIndex = 3;
      const ok = passes.length >= 3 && rejs.length * 2 <= passes.length, meh = rejs.length > passes.length;
      if (passes.length) {
        pose = "jump"; ms2.textContent = passes.length >= 5 ? `서류 합격 ${passes.length}개?!` : `서류 합격 ${passes.length}개!`;
        for (let k = 0; k < (RM() ? 15 : 70); k++) conf.push({ x: 50 + (rnd() - 0.5) * 30, y: H - 90, vx: (rnd() - 0.5) * 1.8, vy: -1.4 - rnd() * 1.6, s: rnd() < 0.3 ? 2 : 1, c: pick(["#ff5a6a", "#ffd166", "#5fe0a0", "#6aa8ff", "#c77dff", "#ffffff"]) });
        [523, 659, 784, 1046, 1318].forEach((f, k) => tone(f, 0.12, "triangle", 0.12, 0, k * 0.08)); vib([20, 40, 20]);
        if (ok) { setFace("blush"); say("양치기 성공!", false, true); } else if (meh) { setFace("sad"); say("탈락 메일이 더 많아요…", true, true); } else { setFace("smile"); say("좋아요, 더 정확하게!", false, true); }
      } else { pose = "sad"; ms2.textContent = "알림이 안 와요…"; tone(330, 0.2, "triangle", 0.1, -80); tone(247, 0.3, "triangle", 0.1, -60, 0.2); setFace("sad"); say("다음 시즌엔 꼭!", true, true); }
      endEl.appendChild(ms2);
      setTimeout(() => {
        cancelAnimationFrame(eraf);
        const acc = st.n ? st.ok / st.n : 0, vol = clamp((st.pass - 1.5 * st.rej) / TARGET, 0, 1), urg = st.urgN ? st.urgOk / st.urgN : (st.n ? 1 : 0);
        const score = st.n ? clamp(0.55 * acc * acc + 0.35 * vol + 0.1 * urg * acc + Math.min(0.06, st.bonus * 0.02) * acc, 0, 1) : 0;
        finish(score, `서류 합격 <b>${st.pass}곳</b> · 탈락 ${st.rej}곳 · 판단 ${st.ok}/${st.n}`, "", [["판단 정확도", acc], ["서류 합격 수", clamp(st.pass / TARGET, 0, 1)], ["마감 임박", urg], ["좋은 회사", clamp(st.bonus / 2, 0, 1)]]);
      }, passes.length ? 2300 : 1900);
    };
    setTimeout(step, t1);
  };

  // ── 반복 ──
  const loop = (now) => {
    if (!wrap.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    if (faceT > 0) { faceT -= dt; if (faceT <= 0) setFace(faceBack); }
    if (mExT > 0) { mExT -= dt; if (mExT <= 0) mFace(cur && cur.urg ? "surprised" : "neutral"); }
    phoneFx = Math.max(0, phoneFx - dt); fdPop = Math.max(0, fdPop - dt);
    if (tut >= 0 && tut !== 9) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); }
      else if (tut >= 1 && tut <= 3 && cur && cur.ready && !cur.out) guide({ d: TUT[tut].d, t: TUT[tut].f });
    } else if (tut === -1 && !ended) {
      if (!t0) t0 = now; el = (now - t0) / 1000;
      const c = cur;
      if (c && c.urg && !c.out && c.ready) {
        c.fuse -= dt; const fz = c.el.querySelector(".fz i"), sp = c.el.querySelector(".fz em"), p = clamp(c.fuse / c.fuse0, 0, 1);
        if (fz) { fz.style.transform = `scaleX(${p})`; sp.style.left = p * 100 + "%"; }
        if (Math.floor(c.fuse * 8) !== Math.floor((c.fuse + dt) * 8)) noise(0.02, 4000, 0.03, 0, 2);
        if (c.fuse <= 0) expire(c);
      }
      idleT += dt; if (firstHint > 0) firstHint -= dt;
      // 처음 몇 초: 세 방향 이름표가 깜빡 / 그 뒤엔 꼭 필요할 때만 손가락
      const hintLb = firstHint > 0 || idleT > 4;
      lbL.classList.toggle("pulse", hintLb); lbR.classList.toggle("pulse", hintLb); lbU.classList.toggle("pulse", hintLb);
      if (c && c.urg && !c.out && c.fuse / c.fuse0 < 0.6) guide({ d: "T", t: "마감 임박! <b>빨리 결정</b>" });
      else if (idleT > 4 && c && !c.out) guide({ d: "T", t: "카드를 <b>밀어서</b> 결정!" });
      else guide(null);
    } else { lbL.classList.remove("pulse"); lbR.classList.remove("pulse"); lbU.classList.remove("pulse"); }
    drawFr(t);
    raf = requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.cs3 = {
    st: () => ({ ...st, tut, el, cur: cur && { kind: cur.kind, ans: cur.ans, urg: cur.urg, ready: cur.ready, out: cur.out }, ended }),
    tut: () => (tut === 9 ? 9 : tut), start: startGame,
    tutDo: () => { if (tut >= 1 && tut <= 3 && cur && cur.ready && !cur.out) decide(TUT[tut].d); else if (tut === 4) startGame(); },
    auto: () => { if (tut === -1 && cur && cur.ready && !cur.out) decide(cur.ans); },
    swipe: (d) => decide(d),
  };
  const onR = () => { if (!wrap.isConnected) removeEventListener("resize", onR); else { fit(); drawBg(); drawFr(performance.now() / 1000); } }; addEventListener("resize", onR);
  fit(); drawBg(); upd(); drawFr(0);
  raf = requestAnimationFrame(loop);
  void TARGET;
}
