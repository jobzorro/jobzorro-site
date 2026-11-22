// 바이브코딩 2탄: 이게 왜 안 돼? (논리 160xH, 캔버스는 기기 해상도: 가게는 실제 배경 그림, 의뢰인은 캐릭터 그림(표정), 폰·벌레·코디·노트북은 벡터. 그림 실패 때만 도트)
// 의뢰인 앱이 오픈 직전인데 버그 신고가 쏟아진다. 위: 의뢰인 폰에서 도트 앱이 돌아가고, 버그 벌레가 기어다니며
// 화면을 깨뜨린다(버튼 삐져나옴·글자 깨짐·사진 뒤집힘·무한 로딩·가격 0원·다크모드 글자 안 보임).
// 벌레(또는 깨진 곳)를 톡 → 코디가 고치는 법 3개 제안 → 맞으면 화면이 쓱 고쳐지고 벌레 찍!, 틀리면 다른 데가 새로 깨진다.
// 오래 두면 벌레가 알을 까서 늘어난다. 마지막: 의뢰인이 앱을 써 보고 "완벽해요!" → 출시 버튼 꾹.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, SCN = 186, BASE_T = 42;
let H = 280;
// 폰(바깥 테두리)과 화면
const PX = 50, PY = 4, PW = 86, PH = 178, SX = PX + 5, SY = PY + 12, SW = 76, SH = 152;
// 앱 화면 칸(화면 기준 x, y, w, h)
const RG = { title: [0, 5, 76, 14], img: [3, 22, 70, 46], price: [3, 71, 70, 17], dark: [3, 91, 70, 24], load: [3, 118, 70, 14], btn: [5, 136, 66, 12] };
const KEYS = ["title", "img", "price", "dark", "load", "btn"];
const BNAME = { title: "글자 깨짐", img: "사진 뒤집힘", price: "가격 0원", dark: "다크모드 글자 안 보임", load: "무한 로딩", btn: "버튼 삐져나옴" };
// 고치는 법: 첫 번째가 정답(화면에서는 섞는다)
const FIX = {
  title: ["한글 인코딩(UTF-8) 맞추기", "글꼴 파일 전부 지우기", "제목을 영어로 바꾸기"],
  img: ["사진 회전 정보 반영하기", "폰을 거꾸로 들라고 안내", "사진 크기 2배로 키우기"],
  price: ["가격 칸에 진짜 값 연결", "0 뒤에 0 더 붙이기", "가격 칸 숨겨 버리기"],
  dark: ["다크모드 글자색 밝게", "배경을 더 어둡게", "글자를 투명하게"],
  load: ["다 불러오면 로딩 끄기", "로딩 아이콘 더 크게", "새로고침 버튼 추가"],
  btn: ["버튼 폭을 화면에 맞추기", "버튼 글자 더 키우기", "화면을 가로로 돌리기"],
};
const THEMES = [
  { id: "bak", ak: "c086", bg: "cafe", who: "빵집 사장님", app: "빵집 주문 앱", obj: "케이크", c: ["#fff6e6", "#b8743e", "#e8a25a", "#5a3a22"], wall: "#f3e2c4", stripe: "#efd9b6", type: "elder", look: { shirt: "#f4f0e8", hat: "#ffffff" }, ctr: ["#c88a52", "#a8683a"], thumbs: ["#c07a3a", "#f7b8cc", "#e0a040", "#fff4e0"] },
  { id: "flo", ak: "c029", bg: "pantry", who: "꽃집 사장님", app: "꽃 예약 앱", obj: "꽃다발", c: ["#fff0f6", "#ff6fa8", "#8fd46a", "#7a2a4a"], wall: "#dff2e6", stripe: "#c8e6d2", type: "plain", look: { shirt: "#5fa86a", style: "long" }, ctr: ["#d8b88a", "#b8946a"], thumbs: ["#ff7eb0", "#ffd23f", "#c77dff", "#ffffff"] },
  { id: "snk", ak: "c095", bg: "pub", who: "분식집 사장님", app: "분식 주문 앱", obj: "떡볶이", c: ["#fff8e0", "#e0382a", "#ffc83a", "#4a1a10"], wall: "#fff1c8", stripe: "#f0dca0", type: "plain", look: { shirt: "#e0382a", hat: "#f4f4f4" }, ctr: ["#dfe3ea", "#b8bec8"], thumbs: ["#e0382a", "#ffc83a", "#c07a3a", "#6a4a2a"] },
];
const REP = (th) => ({ title: "글자가 다 깨져요ㅠㅠ", img: `${th.obj} 사진이 거꾸로예요?!`, price: "가격이 0원이래요!!", dark: "밤에 보면 글씨가 안 보여요", load: "로딩만 계속 돌아요…", btn: "버튼이 밖으로 나갔어요!" });
const OKSAY = ["오, 고쳐졌다!", "역시!", "와 빠르다!", "됐어요 됐어!"];
const WRSAY = ["어? 여기도 깨졌어요!", "아까보다 더 이상해요ㅠ", "또 뭐가 깨졌는데요?!"];

const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join(""); };
const DIG = { 0: ["111", "101", "101", "101", "111"], 4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"], 9: ["111", "101", "111", "001", "111"], 8: ["111", "101", "111", "101", "111"], 2: ["111", "001", "111", "100", "111"] };
const digits = (P, s, x, y, col, k = 1) => { for (const ch of s) { if (ch === ",") { P(x, y + 4 * k, k, 2 * k, col); x += 2 * k; continue; } const m = DIG[ch]; if (m) m.forEach((r, yy) => [...r].forEach((c, xx) => c === "1" && P(x + xx * k, y + yy * k, k, k, col))); x += 4 * k; } return x; };

// 도트 손가락(할 일 안내)
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}

// ── 앱 속 사진(70x46) ──
function picCanvas(th) {
  const c = document.createElement("canvas"); c.width = 70; c.height = 46; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const sky = shade(th.c[0], 0.93);
  P(0, 0, 70, 46, sky); for (let y = 0; y < 46; y += 4) P(0, y, 70, 1, shade(sky, 0.97));
  P(0, 36, 70, 10, shade(th.c[1], 1.25)); P(0, 36, 70, 1, shade(th.c[1], 1.05));
  if (th.id === "bak") {
    P(14, 38, 42, 3, "#ffffff"); P(12, 40, 46, 2, "#d8dce4");
    P(18, 26, 34, 12, "#f7b8cc"); P(18, 26, 34, 2, "#ffd8e6"); P(18, 31, 34, 2, "#ffffff"); P(18, 36, 34, 2, "#c07a3a");
    P(22, 16, 26, 10, "#fff4e0"); P(22, 16, 26, 2, "#ffffff"); P(22, 22, 26, 1, "#f7b8cc");
    for (const x of [24, 31, 38, 44]) { P(x, 13, 3, 3, "#e0303a"); P(x + 1, 12, 1, 1, "#3e9e5a"); }
    P(34, 5, 2, 8, "#7fc8ff"); P(34, 5, 1, 8, "#c8ecff"); P(34, 2, 2, 3, "#ffd23f"); P(34, 1, 1, 1, "#ff8a3a");
  } else if (th.id === "flo") {
    P(28, 30, 14, 14, "#f4e4c8"); P(26, 28, 18, 3, "#e8d0a8"); P(30, 32, 10, 12, "#eedcbc"); P(34, 30, 2, 14, "#d8c09a");
    P(33, 27, 4, 3, "#ff6fa8");
    const fl = [[22, 14, "#ff6fa8"], [32, 8, "#ffd23f"], [42, 13, "#c77dff"], [27, 21, "#ffffff"], [38, 20, "#ff5a5a"], [34, 15, "#ff9ad0"], [18, 22, "#ffd23f"], [47, 22, "#ff6fa8"]];
    for (const [x, y] of fl) P(x + 2, y + 4, 1, 26 - y > 0 ? 28 - y : 2, "#3e8e4a");
    for (const [x, y, col] of fl) { P(x, y + 1, 6, 4, col); P(x + 1, y, 4, 6, col); P(x + 2, y + 2, 2, 2, "#ffe066"); P(x + 1, y + 1, 1, 1, "#ffffff99"); }
  } else {
    P(14, 30, 42, 10, "#2a2a30"); P(12, 28, 46, 3, "#3a3a44"); P(16, 40, 38, 2, "#1a1a20"); P(12, 28, 46, 1, "#5a5a68");
    P(15, 24, 40, 5, "#e0382a"); P(16, 22, 38, 3, "#e8483a");
    for (const [x, y] of [[18, 20], [26, 19], [34, 21], [42, 19], [22, 24], [38, 24], [48, 22]]) { P(x, y, 6, 3, "#fff4e0"); P(x, y, 6, 1, "#ffffff"); P(x, y + 2, 6, 1, "#f0c0a0"); }
    P(30, 18, 5, 3, "#ffd23f"); P(31, 18, 3, 1, "#fff0a0");
    for (let k = 0; k < 3; k++) { P(22 + k * 12, 6 + (k % 2) * 2, 1, 3, "#ffffff99"); P(23 + k * 12, 9 + (k % 2) * 2, 1, 3, "#ffffff99"); }
  }
  return c;
}

// ── 앱 칸 하나 그리기. P: 화면 기준 ──
// k: 칸, br: 깨짐, th: 테마, tm: 시간, pic: 사진 캔버스, g/ox/oy: 사진 뒤집기용
function drawRegion(g, P, k, br, th, tm, pic, ox, oy) {
  const [bg, main, acc, txt] = th.c, [x, y, w, h] = RG[k];
  if (k === "title") {
    P(x, y, w, h, main); P(x, y + h - 1, w, 1, shade(main, 0.8));
    P(3, 8, 8, 8, acc); P(4, 9, 6, 6, "#ffffff"); P(5, 10, 4, 4, main);
    P(66, 9, 7, 1, "#ffffffcc"); P(66, 11, 7, 1, "#ffffffcc"); P(66, 13, 7, 1, "#ffffffcc");
    if (g.__hi) { g.save(); g.textBaseline = "middle"; if (!br) { g.fillStyle = "#fff"; g.font = "900 6.2px sans-serif"; g.fillText(th.app, ox + 14, oy + y + 7.2); } else { const j = Math.floor(tm * 9); g.font = "900 6px sans-serif"; g.fillStyle = j % 3 ? "#ffffff" : "#ffd23f"; g.fillText(["ë¹µì§ ì£¼ë", "ê½ ìì½ ì±", "ë¶ì ì£¼ë¬¸"][j % 3], ox + 14 + (j % 2), oy + y + 7.2 + (j % 3 === 0 ? 0.6 : 0)); } g.restore(); }
    else if (!br) { P(14, 9, 26, 2, "#ffffff"); P(42, 9, 10, 2, "#ffffff"); P(14, 13, 18, 1, "#ffffffaa"); }
    else if (!g.__hi) {
      const j = Math.floor(tm * 9);
      for (let i = 0; i < 8; i++) {
        const bx = 13 + i * 6, by = 8 + ((i + j) % 3 === 0 ? 1 : 0);
        if ((i * 7 + j) % 5 === 0) { P(bx, by, 4, 6, "#ffd23f"); P(bx + 1, by + 1, 2, 1, main); P(bx + 2, by + 2, 1, 1, main); P(bx + 1, by + 4, 1, 1, main); }
        else { P(bx, by, 4, 1, "#ffffff"); P(bx, by + 5, 4, 1, "#ffffff"); P(bx, by, 1, 6, "#ffffff"); P(bx + 3, by, 1, 6, "#ffffff"); if (i % 2) { P(bx + 1, by + 2, 2, 1, "#ffffff88"); } }
      }
      if (j % 4 === 0) P(13 + ((j * 13) % 44), 7, 3, 1, "#5fe0ff");
    }
  } else if (k === "img") {
    P(x - 1, y - 1, w + 2, h + 2, shade(bg, 0.85));
    g.save(); g.imageSmoothingEnabled = true;
    if (!br) g.drawImage(pic, ox + x, oy + y, w, h);
    else { g.translate(ox + x, oy + y + h); g.scale(1, -1); g.drawImage(pic, 0, 0, w, h); }
    g.restore();
    P(x + w - 9, y + 2, 7, 3, "#00000033"); P(x + w - 8, y + 3, 1, 1, "#ffffff"); P(x + w - 6, y + 3, 1, 1, "#ffffffaa"); P(x + w - 4, y + 3, 1, 1, "#ffffffaa");
  } else if (k === "price") {
    P(x, y, w, h, br && Math.floor(tm * 4) % 2 ? "#ffe2e2" : bg);
    P(x + 1, y + 2, 34, 2, txt); P(x + 1, y + 6, 22, 1, shade(txt, 1.8));
    P(x + 1, y + 10, 8, 4, shade(acc, 1.2)); P(x + 2, y + 11, 6, 2, "#ffffff");
    if (g.__hi) { g.save(); g.textAlign = "right"; g.textBaseline = "alphabetic"; if (!br) { g.fillStyle = main; g.font = "900 6.4px sans-serif"; g.fillText("4,500원", ox + x + w - 3, oy + y + 13.6); } else { g.fillStyle = Math.floor(tm * 4) % 2 ? "#e0202a" : "#ff6a6a"; g.font = "900 12px sans-serif"; g.fillText("0원!", ox + x + w - 2, oy + y + 14); } g.restore(); }
    else if (!br) { const ex = digits(P, "4,500", x + 40, y + 8, main, 1); P(ex, y + 9, 1, 4, main); P(ex + 1, y + 11, 2, 1, main); P(ex + 3, y + 9, 1, 4, main); }
    else { const col = Math.floor(tm * 4) % 2 ? "#e0202a" : "#ff6a6a"; digits(P, "0", x + 54, y + 4, col, 2); P(x + 64, y + 4, 2, 6, col); P(x + 64, y + 12, 2, 2, col); }
    P(x, y + h - 1, w, 1, shade(bg, 0.88));
  } else if (k === "dark") {
    const box = br ? "#16161e" : shade(bg, 0.95), line = br ? "#23232c" : shade(txt, 1.25);
    P(x, y, w, h, box); P(x, y, w, 1, br ? "#2a2a36" : shade(bg, 0.88));
    P(x + 3, y + 4, 50, 1, line); P(x + 3, y + 8, 60, 1, line); P(x + 3, y + 12, 44, 1, line); P(x + 3, y + 16, 56, 1, line); P(x + 3, y + 20, 30, 1, line);
    if (br) { P(x + w - 9, y + 3, 5, 5, "#ffd23f"); P(x + w - 7, y + 2, 4, 4, "#16161e"); }
  } else if (k === "load") {
    P(x, y, w, h, bg);
    for (let i = 0; i < 4; i++) {
      const tx = x + 1 + i * 18;
      if (!br) { P(tx, y + 1, 15, 9, shade(th.thumbs[i], 1)); P(tx, y + 1, 15, 1, shade(th.thumbs[i], 1.2)); P(tx + 4, y + 4, 7, 3, shade(th.thumbs[i], 0.8)); P(tx, y + 11, 10, 1, shade(txt, 1.6)); }
      else { const sh = (Math.floor(tm * 6) + i) % 4 === 0; P(tx, y + 1, 15, 9, sh ? "#ececf2" : "#dcdce4"); P(tx, y + 11, 10, 1, "#dcdce4"); }
    }
    if (br) {
      const cx = x + (w >> 1), cy = y + 6, hd = Math.floor(tm * 10) % 8;
      if (g.__hi) { g.save(); g.beginPath(); g.arc(SX + cx + 0.5, SY + cy + 0.5, 6.5, 0, 6.3); g.fillStyle = "#ffffffdd"; g.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = (i - hd + 8) % 8; g.beginPath(); g.arc(SX + cx + 0.5 + Math.cos(a) * 4, SY + cy + 0.5 + Math.sin(a) * 4, d === 0 ? 1.1 : 0.8, 0, 6.3); g.fillStyle = d === 0 ? main : d < 3 ? shade(main, 1.5) : "#c8c8d4"; g.fill(); } g.restore(); }
      else { P(cx - 6, cy - 6, 13, 13, "#ffffffcc");
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = (i - hd + 8) % 8; P(Math.round(cx + Math.cos(a) * 4), Math.round(cy + Math.sin(a) * 4), 1, 1, d === 0 ? main : d < 3 ? shade(main, 1.5) : "#c8c8d4"); } }
    }
  } else if (k === "btn") {
    const bx = br ? x + 34 : x;
    if (g.__hi) { g.save(); g.beginPath(); g.roundRect ? g.roundRect(ox + bx, oy + y, w, h, 4) : g.rect(ox + bx, oy + y, w, h); const q = g.createLinearGradient(0, oy + y, 0, oy + y + h); q.addColorStop(0, shade(acc, 1.15)); q.addColorStop(1, shade(acc, 0.85)); g.fillStyle = q; g.shadowColor = "#0005"; g.shadowBlur = 2 * g.__hi; g.fill(); g.restore(); g.save(); g.fillStyle = "#fff"; g.font = "900 6px sans-serif"; g.textAlign = "center"; g.fillText(th.id === "flo" ? "예약하기" : "주문하기", ox + bx + w / 2, oy + y + 8.4); g.restore(); return; }
    P(bx, y, w, h, acc); P(bx, y, w, 1, shade(acc, 1.2)); P(bx, y + h - 1, w, 1, shade(acc, 0.7));
    P(bx + (w >> 1) - 9, y + 5, 18, 2, "#ffffff");
    if (br) { P(bx + w, y + 2, 2, h - 2, "#00000044"); }
  }
}

// 폰 한 대(바깥 + 앱). st: { br:{k:1}, fix:{k:0~1}, gl:{k:t} }, scale 1 고정
function drawPhone(g, th, st, tm, pic) {
  const A = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(x, y, w, h); };
  // 바깥
  if (g.__hi) {
    g.save(); g.shadowColor = "#000a"; g.shadowBlur = 8 * g.__hi; g.shadowOffsetY = 2 * g.__hi;
    g.beginPath(); g.roundRect ? g.roundRect(PX, PY, PW, PH, 9) : g.rect(PX, PY, PW, PH); const q = g.createLinearGradient(PX, 0, PX + PW, 0); q.addColorStop(0, "#3a3a4c"); q.addColorStop(0.1, "#1e1e28"); q.addColorStop(0.9, "#1a1a24"); q.addColorStop(1, "#34344a"); g.fillStyle = q; g.fill(); g.restore();
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(PX + 0.6, PY + 0.6, PW - 1.2, PH - 1.2, 8.5) : g.rect(PX, PY, PW, PH); g.lineWidth = 0.7; g.strokeStyle = "#5a5a72"; g.stroke();
    g.fillStyle = "#4a4a5a"; g.fillRect(PX + PW, PY + 30, 0.9, 10); g.fillRect(PX - 0.9, PY + 26, 0.9, 6); g.fillRect(PX - 0.9, PY + 36, 0.9, 6);
    g.beginPath(); g.roundRect ? g.roundRect(PX + PW / 2 - 8, PY + 4.6, 16, 3.6, 1.8) : g.rect(PX + PW / 2 - 8, PY + 4.6, 16, 3.6); g.fillStyle = "#0a0a10"; g.fill(); g.beginPath(); g.arc(PX + PW / 2 + 5, PY + 6.4, 0.9, 0, 6.3); g.fillStyle = "#2a3a7a"; g.fill();
    g.beginPath(); g.roundRect ? g.roundRect(PX + PW / 2 - 11, PY + PH - 7, 22, 1.8, 0.9) : g.rect(PX + PW / 2 - 11, PY + PH - 7, 22, 1.8); g.fillStyle = "#5a5a70"; g.fill(); g.restore();
  } else {
  A(PX + 2, PY, PW - 4, PH, "#1e1e28"); A(PX, PY + 2, PW, PH - 4, "#1e1e28"); A(PX + 1, PY + 1, PW - 2, PH - 2, "#1e1e28");
  A(PX + 3, PY + 1, PW - 6, 1, "#3c3c4e"); A(PX + 1, PY + 3, 1, PH - 6, "#34344a");
  A(PX + PW, PY + 30, 1, 10, "#4a4a5a"); A(PX - 1, PY + 26, 1, 6, "#4a4a5a"); A(PX - 1, PY + 36, 1, 6, "#4a4a5a");
  A(PX + (PW >> 1) - 7, PY + 5, 14, 3, "#0c0c12"); A(PX + (PW >> 1) + 4, PY + 6, 1, 1, "#3a4a8a");
  A(PX + (PW >> 1) - 11, PY + PH - 7, 22, 2, "#4a4a5e");
  }
  // 화면
  const P = (x, y, w, h, c) => A(SX + x, SY + y, w, h, c);
  g.save(); g.beginPath(); g.rect(SX, SY, SW, SH); g.clip();
  P(0, 0, SW, SH, th.c[0]);
  P(0, 0, SW, 5, shade(th.c[1], 0.65)); P(2, 1, 8, 2, "#ffffffcc"); P(SW - 9, 1, 6, 3, "#ffffffcc"); P(SW - 3, 2, 1, 1, "#ffffffcc"); P(SW - 15, 2, 3, 2, "#ffffff99");
  P(3, 115, 30, 1, shade(th.c[3], 1.7));
  P(0, SH - 2, SW, 2, shade(th.c[0], 0.9));
  for (const k of KEYS) {
    const br = !!st.br[k], fp = st.fix[k];
    if (fp != null && fp < 1) {
      const [x, y, w, h] = RG[k], cut = Math.round(h * fp);
      g.save(); g.beginPath(); g.rect(SX + x - 1, SY + y + cut, w + 2, h - cut + 1); g.clip(); drawRegion(g, P, k, true, th, tm, pic, SX, SY); g.restore();
      g.save(); g.beginPath(); g.rect(SX + x - 1, SY + y - 1, w + 2, cut + 1); g.clip(); drawRegion(g, P, k, false, th, tm, pic, SX, SY); g.restore();
      P(x - 1, y + cut, w + 2, 1, "#ffffff"); P(x - 1, y + cut + 1, w + 2, 1, "#7c9cff");
    } else if (k !== "btn" || !br) drawRegion(g, P, k, br, th, tm, pic, SX, SY);
    const gt = st.gl[k];
    if (gt > 0) { const [x, y, w, h] = RG[k]; for (let i = 0; i < 6; i++) P(x + rint(w - 8) - 4, y + rint(h), 8 + rint(w * 0.6), 1 + rint(3), pick(["#ff3b6b", "#5fe0ff", "#ffd23f", "#ffffff", "#1a1a24"])); }
  }
  if (st.over) st.over(P);
  g.restore();
  // 삐져나온 버튼은 화면 밖까지 그린다
  if (st.br.btn && !(st.fix.btn != null && st.fix.btn < 1)) drawRegion(g, P, "btn", true, th, tm, pic, SX, SY);
}

// 버그 벌레(9x7). d: 방향 1 오른쪽 / -1 왼쪽, f: 다리 프레임
function drawBug(A, x, y, f, d, col = "#e8487a", flat = 0) {
  x = Math.round(x); y = Math.round(y);
  const Q = (dx, dy, w, h, c) => A(d > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  const dk = shade(col, 0.55);
  if (flat) { Q(-5, 0, 11, 2, dk); Q(-4, -1, 9, 1, col); Q(-6, 1, 2, 1, dk); Q(5, 1, 2, 1, dk); Q(-2, -1, 1, 1, "#ffffff"); return; }
  const l = f % 2;
  for (const lx of [-3, 0, 2]) { Q(lx + (l ? 1 : 0), -4, 1, 1, "#2a1420"); Q(lx + (l ? 0 : 1), 3, 1, 1, "#2a1420"); }
  Q(-4, -3, 7, 6, dk); Q(-5, -2, 9, 4, dk);
  Q(-4, -2, 7, 4, col); Q(-3, -3, 5, 1, col); Q(-3, 2, 5, 1, col);
  Q(-1, -3, 1, 6, dk); Q(-3, -2, 1, 1, "#ffd23f"); Q(1, 1, 1, 1, "#ffd23f"); Q(-3, -3, 2, 1, shade(col, 1.35));
  Q(3, -2, 3, 4, "#2a1420"); Q(4, -1, 1, 1, "#ffffff"); Q(4, 1, 1, 1, "#ffffff");
  Q(5, -4, 1, 2, "#2a1420"); Q(6, -5, 1, 1, "#2a1420"); Q(5, 2, 1, 2, "#2a1420"); Q(6, 4, 1, 1, "#2a1420");
}

// 버그 벌레(벡터). 크기는 도트판과 같은 9x7 안팎
function bugV(g, x, y, f, d, col = "#e8487a", flat = 0) {
  g.save(); g.translate(x + 0.5, y + 0.5); g.scale(d > 0 ? 1 : -1, 1);
  const dk = shade(col, 0.55);
  if (flat) { g.beginPath(); g.ellipse(0, 0.6, 6, 1.6, 0, 0, 6.3); g.fillStyle = dk; g.fill(); g.beginPath(); g.ellipse(-0.5, 0, 4.4, 1.1, 0, 0, 6.3); g.fillStyle = col; g.fill(); g.restore(); return; }
  g.strokeStyle = "#2a1420"; g.lineWidth = 0.6; g.lineCap = "round"; const l = f % 2 ? 0.8 : -0.8;
  g.beginPath(); for (const lx of [-2.6, 0, 2.4]) { g.moveTo(lx, -2); g.lineTo(lx + l, -4.4); g.moveTo(lx, 2); g.lineTo(lx - l, 4.4); } g.stroke();
  g.beginPath(); g.moveTo(4.6, -1.2); g.quadraticCurveTo(6.4, -3.4, 7.4, -4.6); g.moveTo(4.6, 1.2); g.quadraticCurveTo(6.4, 3.4, 7.4, 4.6); g.stroke();
  g.shadowColor = "#0007"; g.shadowBlur = 2 * (g.__hi || 1); g.beginPath(); g.ellipse(-0.6, 0, 4.6, 3.6, 0, 0, 6.3); const q = g.createRadialGradient(-2, -1.6, 0.4, -0.6, 0, 4.8); q.addColorStop(0, shade(col, 1.45)); q.addColorStop(0.6, col); q.addColorStop(1, dk); g.fillStyle = q; g.fill(); g.shadowBlur = 0; g.shadowColor = "transparent";
  g.strokeStyle = dk; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-0.6, -3.5); g.lineTo(-0.6, 3.5); g.stroke();
  g.fillStyle = "#2a1420"; [[-2.6, -1.4, 0.8], [1.4, 1.4, 0.7], [-2.4, 1.8, 0.6], [1.2, -1.8, 0.6]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 6.3); g.fill(); });
  g.beginPath(); g.ellipse(4.2, 0, 2, 2.3, 0, 0, 6.3); g.fillStyle = "#2a1420"; g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(4.8, -0.9, 0.6, 0, 6.3); g.arc(4.8, 0.9, 0.6, 0, 6.3); g.fill();
  g.fillStyle = "#ffffffaa"; g.beginPath(); g.ellipse(-2.4, -2, 1.4, 0.6, -0.4, 0, 6.3); g.fill();
  g.restore();
}
// 코디(노트북 위 빼꼼 로봇, 벡터). cx, cy: 왼쪽 위(14x11 안팎)
function codiV(g, cx, cy, mood, tm) {
  const H = g.__hi || 1;
  g.save();
  g.strokeStyle = "#9aa6d8"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx + 7, cy - 1); g.lineTo(cx + 7, cy - 4); g.stroke();
  g.shadowColor = Math.floor(tm * 3) % 2 ? "#ffd23f" : "#ff7ab0"; g.shadowBlur = 4 * H; g.beginPath(); g.arc(cx + 7, cy - 4.8, 1.4, 0, 6.3); g.fillStyle = g.shadowColor; g.fill(); g.shadowBlur = 0;
  g.beginPath(); g.roundRect ? g.roundRect(cx - 1, cy - 1, 16, 12, 4) : g.rect(cx - 1, cy - 1, 16, 12); g.fillStyle = "#1a1e38"; g.fill();
  g.beginPath(); g.roundRect ? g.roundRect(cx - 0.2, cy - 0.2, 14.4, 10.4, 3.4) : g.rect(cx, cy, 14, 10); const q = g.createLinearGradient(0, cy, 0, cy + 10); q.addColorStop(0, "#b8c8ff"); q.addColorStop(0.3, "#7c9cff"); q.addColorStop(1, "#5a74d8"); g.fillStyle = q; g.fill();
  g.beginPath(); g.roundRect ? g.roundRect(cx + 1.8, cy + 1.8, 10.4, 6.6, 2) : g.rect(cx + 2, cy + 2, 10, 6); g.fillStyle = "#141a36"; g.fill();
  const ec = "#5ff0ff"; g.shadowColor = ec; g.shadowBlur = 3 * H; g.strokeStyle = ec; g.fillStyle = ec; g.lineWidth = 0.8; g.lineCap = "round";
  const eye = (x, y) => { g.beginPath(); g.arc(cx + x, cy + y, 1, 0, 6.3); g.fill(); };
  if (mood === "happy") { g.beginPath(); g.arc(cx + 4.5, cy + 5.6, 1.3, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(cx + 10.8, cy + 5.6); g.arc(cx + 9.5, cy + 5.6, 1.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else if (mood === "sad") { g.beginPath(); g.moveTo(cx + 3.4, cy + 4.4); g.lineTo(cx + 5.8, cy + 5.4); g.moveTo(cx + 10.6, cy + 4.4); g.lineTo(cx + 8.2, cy + 5.4); g.stroke(); }
  else if (mood === "think") { const s = Math.floor(tm * 4) % 2; eye(4.4 + s, 4.4); eye(9.4 + s, 4.4); }
  else if (mood === "work") { const s = Math.floor(tm * 8) % 3 * 0.6; eye(4 + s, 5); eye(8.6 + s, 5); }
  else if (Math.floor(tm * 1.3) % 5 === 0) { g.beginPath(); g.moveTo(cx + 3.8, cy + 5); g.lineTo(cx + 5.6, cy + 5); g.moveTo(cx + 8.6, cy + 5); g.lineTo(cx + 10.4, cy + 5); g.stroke(); }
  else { eye(4.8, 5); eye(9.2, 5); }
  g.restore();
}
// 앱 속 상품 사진(벡터, 고해상도). 케이크·꽃다발·떡볶이
function picHi(th, KS) {
  const c = document.createElement("canvas"); c.width = Math.round(70 * KS); c.height = Math.round(46 * KS); const g = c.getContext("2d"); g.scale(KS, KS);
  const L = (y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  g.fillStyle = L(0, 46, shade(th.c[0], 1.02), shade(th.c[0], 0.88)); g.fillRect(0, 0, 70, 46);
  const q0 = g.createRadialGradient(35, 18, 2, 35, 22, 40); q0.addColorStop(0, "#ffffff99"); q0.addColorStop(1, "#ffffff00"); g.fillStyle = q0; g.fillRect(0, 0, 70, 46);
  g.fillStyle = L(34, 46, shade(th.c[1], 1.3), shade(th.c[1], 0.95)); g.fillRect(0, 35, 70, 11);
  const el = (x, y, rx, ry, c) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.3); g.fillStyle = c; g.fill(); };
  g.shadowColor = "#0005"; g.shadowBlur = 3 * KS; g.shadowOffsetY = 1 * KS;
  if (th.id === "bak") {
    el(35, 40, 24, 3.4, "#ffffff"); g.shadowColor = "transparent";
    g.beginPath(); g.roundRect ? g.roundRect(17, 25, 36, 14, 2) : g.rect(17, 25, 36, 14); g.fillStyle = L(25, 39, "#ffd8e6", "#f7a8c4"); g.fill();
    g.fillStyle = "#ffffff"; g.fillRect(17, 30.5, 36, 1.6); g.fillStyle = "#c07a3a"; g.fillRect(17, 36.4, 36, 2.6);
    g.beginPath(); g.roundRect ? g.roundRect(22, 15, 26, 11, 2) : g.rect(22, 15, 26, 11); g.fillStyle = L(15, 26, "#ffffff", "#ffeedd"); g.fill();
    g.fillStyle = "#f7b8cc"; g.beginPath(); for (let k = 0; k <= 13; k++) g.lineTo(22 + k * 2, 16 + (k % 2 ? 2.4 : 0.6)); g.lineTo(48, 15); g.lineTo(22, 15); g.fill();
    for (const x of [25.5, 31.5, 38.5, 44.5]) { el(x, 13.6, 1.8, 1.7, "#e0303a"); el(x - 0.5, 13, 0.5, 0.4, "#ffffffaa"); g.fillStyle = "#3e9e5a"; g.fillRect(x - 0.2, 11, 0.6, 1.2); }
    g.fillStyle = "#7fc8ff"; g.fillRect(34.4, 5, 1.4, 8); g.shadowColor = "#ffb347"; g.shadowBlur = 4 * KS; el(35.1, 3.6, 1, 1.8, "#ffd23f"); g.shadowBlur = 0;
  } else if (th.id === "flo") {
    g.shadowColor = "transparent";
    g.beginPath(); g.moveTo(26, 30); g.lineTo(44, 30); g.lineTo(38, 45); g.lineTo(32, 45); g.closePath(); g.fillStyle = L(30, 45, "#f8ecd6", "#d8c09a"); g.fill();
    g.strokeStyle = "#3e8e4a"; g.lineWidth = 0.8; g.beginPath(); for (const [x, y] of [[22, 14], [32, 8], [42, 13], [27, 21], [38, 20], [34, 15], [18, 22], [47, 22]]) { g.moveTo(x + 3, y + 4); g.lineTo(35, 33); } g.stroke();
    for (const [x, y, c] of [[22, 14, "#ff6fa8"], [32, 8, "#ffd23f"], [42, 13, "#c77dff"], [27, 21, "#ffffff"], [38, 20, "#ff5a5a"], [34, 15, "#ff9ad0"], [18, 22, "#ffd23f"], [47, 22, "#ff6fa8"]]) {
      for (let k = 0; k < 5; k++) { const a = k * 1.2566; el(x + 3 + Math.cos(a) * 2, y + 3 + Math.sin(a) * 2, 1.8, 1.8, c); }
      el(x + 3, y + 3, 1.3, 1.3, "#ffe066"); el(x + 2.4, y + 2.2, 0.6, 0.5, "#ffffffaa");
    }
    g.beginPath(); g.moveTo(31, 33); g.quadraticCurveTo(35, 36, 39, 33); g.quadraticCurveTo(37, 38, 35, 36); g.fillStyle = "#ff6fa8"; g.fill();
  } else {
    el(35, 37, 24, 5, "#2a2a30"); g.shadowColor = "transparent"; el(35, 35.6, 23, 4.2, "#3a3a44");
    el(35, 33.4, 20, 7.4, "#c8281a"); el(35, 32.6, 18, 6, "#e0382a");
    for (const [x, y, r] of [[24, 31, -0.3], [30, 29, 0.2], [37, 31, -0.1], [44, 30, 0.4], [28, 34, 0.1], [40, 34, -0.3], [47, 33, 0.2], [33, 35, 0.3]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.roundRect ? g.roundRect(-3.2, -1.3, 6.4, 2.6, 1.3) : g.rect(-3.2, -1.3, 6.4, 2.6); g.fillStyle = "#fff4e0"; g.fill(); g.fillStyle = "#ffffff"; g.fillRect(-2.4, -1, 4, 0.6); g.restore(); }
    el(34, 28.4, 3, 1.8, "#ffd23f"); el(33.4, 28, 1.2, 0.6, "#fff6c0");
    g.strokeStyle = "#ffffff88"; g.lineWidth = 0.6; g.beginPath(); for (let k = 0; k < 3; k++) { const x = 24 + k * 11; g.moveTo(x, 22); g.bezierCurveTo(x + 2, 18, x - 2, 15, x + 1, 11); } g.stroke();
  }
  return c;
}
function stepPics() {
  const U = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
  const bug = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-3-2l-1-3M0-2v-3M3-2l1-3M-3 2l-1 3M0 2v3M3 2l1 3" stroke="#2a1420" stroke-width=".9" stroke-linecap="round"/><ellipse cx="-.6" cy="0" rx="4.8" ry="3.8" fill="#e8487a"/><path d="M-.6-3.6v7.2" stroke="#8a2050" stroke-width=".6"/><circle cx="-2.6" cy="-1.4" r=".8" fill="#2a1420"/><circle cx="1.4" cy="1.4" r=".7" fill="#2a1420"/><ellipse cx="4.2" cy="0" rx="2" ry="2.3" fill="#2a1420"/><circle cx="4.8" cy="-.9" r=".6" fill="#fff"/><circle cx="4.8" cy=".9" r=".6" fill="#fff"/></g>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const phone = `<rect x="14" y="3" width="40" height="62" rx="7" fill="#1e1e28" stroke="#5a5a72"/><rect x="17.5" y="9" width="33" height="52" rx="2.5" fill="#fff6e6"/><rect x="17.5" y="9" width="33" height="8" fill="#b8743e"/>`;
  const a = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#2a2440"/>${phone}<rect x="20" y="21" width="27" height="14" rx="2" fill="#f7b8cc"/><text x="46" y="50" font-size="11" font-weight="900" fill="#e0202a" text-anchor="end" font-family="sans-serif">0원!</text>${bug(27, 44, 1.6)}<path d="M18 38l-3-2M18 44h-4M38 38l3-2" stroke="#ffd23f" stroke-width="1.6" stroke-linecap="round"/>${hand(44, 40)}</svg>`);
  const b = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#1a1e38"/><rect x="5" y="18" width="20" height="15" rx="4.6" fill="#7c9cff" stroke="#1a1e38"/><rect x="8" y="21" width="14" height="9" rx="2.4" fill="#141a36"/><circle cx="12" cy="25.5" r="1.4" fill="#5ff0ff"/><circle cx="18" cy="25.5" r="1.4" fill="#5ff0ff"/><path d="M15 18v-4" stroke="#9aa6d8" stroke-width="1.2"/><circle cx="15" cy="13" r="2" fill="#ffd23f"/><rect x="4" y="36" width="22" height="16" rx="2" fill="#3a3e52"/><rect x="6" y="38" width="18" height="12" rx="1" fill="#0e1220"/><path d="M8 41h9M10 44h11M8 47h6" stroke="#5fe0a0" stroke-width="1.2"/>
    <rect x="30" y="8" width="44" height="14" rx="5" fill="#262c4e"/><rect x="30" y="27" width="44" height="14" rx="5" fill="#3fd08a"/><rect x="30" y="46" width="44" height="14" rx="5" fill="#262c4e"/><path d="M35 15h26M35 34h26M35 53h26" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/><path d="M63 34l3 3 6-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const c = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#2a2440"/>${phone}<rect x="20" y="21" width="27" height="14" rx="2" fill="#f7b8cc"/><circle cx="34" cy="45" r="9" fill="#3fd08a"/><path d="M29.6 45l3 3 6-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#ffd23f"><circle cx="8" cy="12" r="2"/><circle cx="66" cy="10" r="2.4"/></g><g fill="#7c9cff"><circle cx="68" cy="40" r="2"/><circle cx="7" cy="50" r="1.6"/></g><g fill="#ff7eb0"><circle cx="62" cy="58" r="2"/><circle cx="10" cy="30" r="1.4"/></g></svg>`);
  return [[`<img src="${a}" alt="">`, "벌레를 톡!"], [`<img src="${b}" alt="">`, "맞는 수정 고르기"], [`<img src="${c}" alt="">`, "다 잡으면 출시"]];
}

// 코디(노트북 위 빼꼼 로봇) 머리. cx, cy: 왼쪽 위
function drawCodi(A, cx, cy, mood, tm) {
  A(cx + 6, cy - 4, 1, 3, "#9aa6d8"); A(cx + 5, cy - 6, 3, 2, Math.floor(tm * 3) % 2 ? "#ffd23f" : "#ff7ab0");
  A(cx, cy - 1, 14, 12, "#1a1e38"); A(cx - 1, cy, 16, 10, "#1a1e38");
  A(cx + 1, cy, 12, 10, "#7c9cff"); A(cx, cy + 1, 14, 8, "#7c9cff"); A(cx + 1, cy, 12, 1, "#b8c8ff"); A(cx, cy + 8, 14, 1, "#5a74d8");
  A(cx + 2, cy + 2, 10, 6, "#141a36");
  const ec = "#5ff0ff";
  if (mood === "happy") [[3, 5], [4, 4], [5, 5], [8, 5], [9, 4], [10, 5]].forEach(([x, y]) => A(cx + x, cy + y, 1, 1, ec));
  else if (mood === "sad") { A(cx + 3, cy + 5, 3, 1, ec); A(cx + 8, cy + 5, 3, 1, ec); A(cx + 3, cy + 4, 1, 1, ec); A(cx + 10, cy + 4, 1, 1, ec); }
  else if (mood === "think") { const s = Math.floor(tm * 4) % 2; A(cx + 3 + s, cy + 3, 2, 2, ec); A(cx + 8 + s, cy + 3, 2, 2, ec); }
  else if (mood === "work") { const s = Math.floor(tm * 8) % 3; A(cx + 3 + s, cy + 4, 2, 2, ec); A(cx + 7 + s, cy + 4, 2, 2, ec); }
  else if (Math.floor(tm * 1.3) % 5 === 0) { A(cx + 4, cy + 5, 2, 1, ec); A(cx + 8, cy + 5, 2, 1, ec); }
  else { A(cx + 4, cy + 4, 2, 2, ec); A(cx + 8, cy + 4, 2, 2, ec); }
}

function cliSpec(th) { const s = uSpec(th.type); Object.assign(s, th.look || {}); s.pack = null; s.hood = null; s.kid = false; s.shirt2 = shade(s.shirt); return s; }

// 가게 벽(뒤) + 계산대(앞)
function shopBg(th) {
  const c = document.createElement("canvas"); c.width = W; c.height = SCN; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P(0, 0, W, SCN, th.wall);
  if (th.id === "bak") for (let x = 0; x < W; x += 6) P(x, 0, 2, SCN, th.stripe);
  else if (th.id === "flo") { for (let y = 4; y < SCN; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) P(x, y, 1, 1, th.stripe); }
  else { for (let y = 0; y < SCN; y += 6) P(0, y, W, 1, th.stripe); for (let x = 0; x < W; x += 6) P(x, 0, 1, SCN, th.stripe); }
  // 밤 창문(왼쪽 위)
  P(4, 8, 40, 30, "#3a3048"); P(5, 9, 38, 28, "#1c2040"); P(24, 9, 1, 28, "#3a3048"); P(5, 22, 38, 1, "#3a3048");
  for (let k = 0; k < 9; k++) P(6 + ((k * 13) % 36), 10 + ((k * 7) % 11), 1, 1, k % 3 ? "#ffffff88" : "#ffffff");
  P(34, 12, 4, 4, "#ffe9a8"); P(36, 12, 2, 2, "#1c2040");
  for (let x = 6; x < 43; x += 5) { const bh = 3 + ((x * 7) % 9); P(x, 37 - bh, 4, bh, "#2a2f58"); if (x % 2) P(x + 1, 37 - bh + 2, 1, 1, "#ffd27a"); }
  P(3, 38, 42, 2, "#8a6a4a"); P(3, 38, 42, 1, "#a8886a");
  // 벽 시계 23시 오른쪽 위
  P(140, 10, 14, 14, "#2a2a36"); P(141, 11, 12, 12, "#fffdf6"); P(147, 13, 1, 5, "#2a2a36"); P(144, 17, 3, 1, "#2a2a36"); P(147, 17, 1, 1, "#e0382a");
  // 오른쪽 선반
  P(138, 60, 22, 2, "#8a5a32"); P(138, 62, 22, 1, "#5a3a22"); P(138, 96, 22, 2, "#8a5a32"); P(138, 98, 22, 1, "#5a3a22");
  for (let k = 0; k < 3; k++) { const col = th.thumbs[k]; P(140 + k * 7, 53, 5, 7, col); P(140 + k * 7, 53, 5, 1, shade(col, 1.2)); P(140 + k * 7 + 1, 89, 4, 7, th.thumbs[(k + 1) % 4]); }
  return c;
}
function shopFront(th) {
  const c = document.createElement("canvas"); c.width = W; c.height = SCN; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const [top, face] = th.ctr;
  P(0, 166, 52, 3, top); P(0, 166, 52, 1, shade(top, 1.15)); P(0, 169, 52, SCN - 169, face); P(0, 169, 52, 1, shade(face, 0.7));
  for (let x = 0; x < 52; x += 12) P(x, 170, 1, SCN - 170, shade(face, 0.85));
  P(136, 166, 24, 3, top); P(136, 166, 24, 1, shade(top, 1.15)); P(136, 169, 24, SCN - 169, face);
  return c;
}

export const GAME = {
  key: "vibe2", base: "vibe", jc: "#7c9cff", n: "이게 왜 안 돼?", desc: "오픈 직전 앱에 버그 신고가 쏟아져요. 벌레를 잡고 코디에게 맞는 수정을 시켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 의뢰인 폰 화면에 <b>버그 벌레</b>가 기어다니며 앱을 깨뜨려요.",
    "<b>벌레</b>(또는 깨진 곳)를 <b>톡!</b> 하면 코디가 고치는 법 3개를 알려 줘요. 화면을 보고 <b>맞는 방법</b>을 골라요.",
    "<b>틀리면 다른 데가 새로 깨지고</b>, 오래 두면 벌레가 <b>알</b>을 까서 늘어나요. 다 잡으면 <b>출시!</b>",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "벌레를 톡!"], ["", "맞는 수정 고르기"], ["", "다 잡으면 출시"]]; } },
  css: `
.mg-v2st{background:#0d1020!important;display:flex;align-items:center;justify-content:center}
.mg-vibe2 .mg-steps img{width:76px;height:65px;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-vibe2 .v2-w{position:relative;flex:0 0 auto}
.mg-vibe2 .v2-w>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.mg-vibe2 .v2-bub{position:absolute;z-index:4;background:#fffdf6;color:#2a2018;border-radius:11px;padding:4px 8px 5px;font-size:11.5px;line-height:1.3;font-weight:800;box-shadow:0 3px 0 #0006;word-break:keep-all;pointer-events:none;transform-origin:30% 100%;opacity:0;transform:scale(.6);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.mg-vibe2 .v2-bub.on{opacity:1;transform:scale(1)}
.mg-vibe2 .v2-bub::after{content:"";position:absolute;left:22px;bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fffdf6}
.mg-vibe2 .v2-bub em{display:block;font-style:normal;font-size:11px;font-weight:900;color:#7c9cff}
.mg-vibe2 .v2-bub.no{background:#fff0ee;color:#b0302a}.mg-vibe2 .v2-bub.no::after{border-top-color:#fff0ee}
.mg-vibe2 .v2-bub.ok{background:#eafff2;color:#1f7a4a}.mg-vibe2 .v2-bub.ok::after{border-top-color:#eafff2}
.mg-vibe2 .v2-bub.big{font-size:15px;padding:6px 11px}
.mg-vibe2 .v2-pan{position:absolute;z-index:3;border-radius:10px;background:#11152a;border:2px solid #3c4680;padding:5px 6px;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;transition:border-color .15s,opacity .3s}
.mg-vibe2 .v2-pan.hot{border-color:#ffd23f;background:#161b36}
.mg-vibe2 .v2-pan.off{opacity:0;pointer-events:none}
.mg-vibe2 .v2-ph{color:#c8d0f0;font-size:11.5px;line-height:1.35;font-weight:700;word-break:keep-all}
.mg-vibe2 .v2-ph em{font-style:normal;display:inline-block;background:#7c9cff;color:#fff;font-size:11px;font-weight:900;padding:0 6px;border-radius:5px;margin-right:4px}
.mg-vibe2 .v2-ph em.bug{background:#e8487a}
.mg-vibe2 .v2-ph b{color:#ffd23f}
.mg-vibe2 .v2-cnt{margin-top:auto;display:flex;flex-wrap:wrap;gap:3px}
.mg-vibe2 .v2-cnt i{font-style:normal;font-size:11px;font-weight:800;color:#ff9ab8;background:#3a1a2c;border:1px solid #6a2a48;border-radius:6px;padding:1px 5px;white-space:nowrap}
.mg-vibe2 .v2-cnt i.ok{color:#8ff0b8;background:#143a28;border-color:#2a6a48}
.mg-vibe2 .v2-op{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:3px 8px!important;border-radius:9px!important;background:#262c4e!important;border:1px solid #3c4680!important;box-shadow:0 2px 0 #0008!important;color:#eef0ff!important;font-size:12.5px!important;font-weight:800!important;text-align:left;line-height:1.15;letter-spacing:-.3px;word-break:keep-all;animation:v2deal .3s cubic-bezier(.3,1.5,.5,1) backwards}
.mg-vibe2 .v2-op span{flex:0 0 auto;width:17px;height:17px;border-radius:5px;background:#7c9cff;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
.mg-vibe2 .v2-op:active{transform:translateY(2px)}
.mg-vibe2 .v2-op.ok{background:#1d5a3c!important;border-color:#3fd08a!important;box-shadow:0 0 0 1px #3fd08a,0 2px 0 #0008!important}
.mg-vibe2 .v2-op.bad{background:#4a1e2a!important;border-color:#ff5a5a!important;animation:v2shk .4s}
@keyframes v2deal{0%{transform:translateX(30px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
@keyframes v2shk{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.mg-vibe2 .v2-go{position:absolute;z-index:25;width:0;height:0;display:none;pointer-events:none}
.mg-vibe2 .v2-go.on{display:block}
.mg-vibe2 .v2-go i{position:absolute;width:39px;height:39px;left:-14px;top:-37px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009);animation:v2tap .7s infinite}
.mg-vibe2 .v2-go.up i{top:2px;animation:v2tapu .7s infinite}
.mg-vibe2 .v2-go span{position:absolute;left:0;bottom:44px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-vibe2 .v2-go.up span{bottom:auto;top:46px}
.mg-vibe2 .v2-go span:empty{display:none}
.mg-vibe2 .v2-go span b{color:#d8402a}
@keyframes v2tap{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v2tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
.mg-vibe2 .v2-tut{position:absolute;left:6px;right:6px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-vibe2 .v2-tut.off{opacity:0;visibility:hidden}
.mg-vibe2 .v2-tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:7px 12px 6px;box-shadow:0 4px 0 #0006,0 0 0 2px #7c9cff;max-width:300px;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-vibe2 .v2-tut.pop .v2-tc{animation:v2pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-vibe2 .v2-tc em{font-style:normal;display:inline-block;background:#5a74e0;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-vibe2 .v2-tc p{margin:0}.mg-vibe2 .v2-tc b{color:#2f55c8}.mg-vibe2 .v2-tc b.rd{color:#c0392b}
.mg-vibe2 .v2-tb{margin-top:4px;display:flex;justify-content:center}
.mg-vibe2 .v2-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-vibe2 .v2-go2{background:linear-gradient(#8aa8ff,#5a74e0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #2a3a90!important;animation:v2pulse .5s infinite alternate}
@keyframes v2pulse{to{transform:scale(1.07);box-shadow:0 3px 0 #2a3a90,0 0 12px #8aa8ff}}
@keyframes v2pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-vibe2 .v2-lb{position:absolute;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:14px;background:linear-gradient(#ff8a7a,#e0382a);color:#fff;font-weight:900;font-size:19px;letter-spacing:1px;box-shadow:0 6px 0 #8a1a10,0 0 0 3px #fff3;opacity:0;transform:scale(.4);transition:opacity .25s,transform .35s cubic-bezier(.3,1.7,.5,1);pointer-events:none}
.mg-vibe2 .v2-lb small{font-size:11px;font-weight:700;letter-spacing:0;opacity:.9}
.mg-vibe2 .v2-lb.on{opacity:1;transform:scale(1)}
.mg-vibe2 .v2-lb.on.press{transform:translateY(5px);box-shadow:0 1px 0 #8a1a10,0 0 22px #ffd23f}
.mg-vibe2 .v2-ban{position:absolute;z-index:7;left:0;right:0;text-align:center;pointer-events:none;opacity:0;transform:scale(2.2);transition:opacity .2s,transform .45s cubic-bezier(.3,1.6,.5,1)}
.mg-vibe2 .v2-ban b{display:inline-block;background:#ffd23f;color:#2a1a10;font-size:22px;font-weight:900;padding:4px 16px;border-radius:10px;box-shadow:0 4px 0 #a07a10,0 0 18px #ffd23f99;transform:rotate(-4deg)}
.mg-vibe2 .v2-ban.meh b{background:#c8c8d4;box-shadow:0 4px 0 #6a6a78}
.mg-vibe2 .v2-ban.on{opacity:1;transform:scale(1)}
.mg-vibe2 .v2-me{position:absolute;z-index:5;right:0;bottom:0;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transform:translateY(20px);transition:opacity .5s,transform .5s;pointer-events:none;filter:drop-shadow(0 0 6px #7c9cff55)}
.mg-vibe2 .v2-me.on{opacity:1;transform:none}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "vibe2", "이게 왜 안 돼?", "mg-v2st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="v2-w"><canvas></canvas>
    <div class="v2-bub"><em></em><p></p></div>
    <div class="v2-pan"><div class="v2-ph"></div><div class="v2-ops" style="display:flex;flex-direction:column;gap:4px"></div><div class="v2-cnt"></div></div>
    <div class="v2-lb"><span>출시하기</span><small>앱 오픈</small></div><div class="v2-ban"><b>출시 완료!</b></div><div class="v2-me"></div>
    <div class="v2-go"><span></span><i></i></div>
    <div class="v2-tut off"><div class="v2-tc"><em>리허설</em><p></p><div class="v2-tb"></div></div></div></div>`);
  const $ = (s) => F.stage.querySelector(s);
  const wrap = $(".v2-w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d");
  const bub = $(".v2-bub"), bubWho = bub.querySelector("em"), bubP = bub.querySelector("p");
  const pan = $(".v2-pan"), panH = $(".v2-ph"), panO = $(".v2-ops"), panC = $(".v2-cnt");
  const lbEl = $(".v2-lb"), banEl = $(".v2-ban"), meEl = $(".v2-me");
  const goEl = $(".v2-go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i");
  const tutEl = $(".v2-tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".v2-tb");
  let K = 2, KS = 2;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const px = (v) => Math.round(v * K) + "px";
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 268);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 268, 300);
    KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.__hi = KS; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
    Object.assign(pan.style, { left: px(46), top: px(SCN + 3), width: px(112), height: px(H - SCN - 6) });
    Object.assign(tutEl.style, { top: px(4) });
    Object.assign(lbEl.style, { left: px(46), top: px(SCN + 16), width: px(56), height: px(Math.min(44, H - SCN - 30)) });
    Object.assign(banEl.style, { left: px(PX), right: "auto", width: px(PW), top: px(92) });
    const hh = Math.round((H - SCN) * K + 10), ww = Math.round(hh * 240 / 312);
    Object.assign(meEl.style, { width: ww + "px", height: hh + "px" });
  };
  fit();
  g.imageSmoothingEnabled = false;
  const th = pick(THEMES), RP = REP(th);
  const BG = shopBg(th), FR = shopFront(th);
  let PIC = picCanvas(th);
  try { PIC = picHi(th, Math.max(2, KS)); } catch (e) {}
  // 그림: 가게 배경·의뢰인
  const ld = (src) => { const q = { ok: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.src = src; return q; };
  const BGI = ld("img/bg/" + th.bg + ".webp"), CLI = ld("img/body/" + th.ak + ".webp");
  let BGH = null;
  const buildBgH = () => {
    const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(SCN * KS); const q = c.getContext("2d"); q.scale(KS, KS);
    const im = BGI.im, iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(W / iw, SCN / ih), sw = W / sc, sh = SCN / sc;
    q.filter = "blur(0.6px)"; q.drawImage(im, (iw - sw) / 2, (ih - sh) * 0.4, sw, sh, 0, 0, W, SCN); q.filter = "none";
    q.fillStyle = "rgba(14,12,32,.38)"; q.fillRect(0, 0, W, SCN);
    const v = q.createRadialGradient(W * 0.6, SCN * 0.45, 20, W * 0.6, SCN * 0.5, W * 0.9); v.addColorStop(0, "#00000000"); v.addColorStop(1, "#0a0818aa"); q.fillStyle = v; q.fillRect(0, 0, W, SCN);
    return c;
  };
  const cliP = { spec: cliSpec(th), cache: {} };
  // 책상 띠
  const DESK = document.createElement("canvas"); DESK.width = W; DESK.height = 120;
  {
    const d = DESK.getContext("2d"), P = (x, y, w, h, c) => { d.fillStyle = c; d.fillRect(x, y, w, h); };
    for (let y = 0; y < 120; y++) P(0, y, W, 1, y < 2 ? "#3a3048" : `rgb(${Math.max(14, 38 - (y >> 2))},${Math.max(12, 30 - (y >> 2))},${Math.max(22, 44 - (y >> 2))})`);
    for (let x = 0; x < W; x += 23) P(x, 2, 1, 118, "#2a2234");
    P(0, 0, W, 1, "#5a4a68");
    P(1, 38, 41, 4, "#b8bccc"); P(1, 38, 41, 1, "#e0e4ee"); P(1, 41, 41, 1, "#7a7e8e"); P(17, 39, 9, 1, "#9a9eae");
    // 커피 컵
    P(10, 52, 9, 10, "#f4f4f4"); P(10, 52, 9, 1, "#ffffff"); P(11, 53, 7, 2, "#6a4428"); P(19, 55, 2, 4, "#f4f4f4");
  }
  const P = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x, y, w, h); };
  const FDN = fingerURL(true), FUP = fingerURL(false);

  // ── 상태 ──
  let tut = 0, over = false, last = 0, el = 0, phase = "idle", phT = 0, tm0 = null, endT = -1, finished = false;
  let bugs = [], caught = null, opts3 = [], lastAct = 0, codiMood = "idle", codiT = 0, combo = 0;
  let spawned = 0, fixed = 0, picks = 0, rightPicks = 0, eggs = 0, sideFx = 0, sched = [], order = [], cleared = false, firstHintT = 0;
  const fixP = {}, glT = {}, splats = [], sparks = [], codeLines = [];
  let cliMode = "idle", cliT = 0, bubT = 0;
  const T = BASE_T * ez;
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };
  const elXY = (e2, dy = 0) => { const r = e2.getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + dy]; };
  const brk = () => { const o = {}; for (const b of bugs) o[b.k] = 1; return o; };
  const healthy = () => { const b = brk(); return KEYS.filter((k) => !b[k] && !(fixP[k] != null && fixP[k] < 1)); };
  const rcen = (k) => { const [x, y, w, h] = RG[k]; return [SX + x + w / 2, SY + y + h / 2]; };
  const updSc = () => (F.sc.textContent = tut >= 0 ? "리허설" : `버그 ${bugs.length}`);

  // ── 소리 ──
  const S = {
    report: () => { tone(1320, 0.07, "sine", 0.08); tone(990, 0.12, "sine", 0.08, 0, 0.09); },
    grab: () => { tone(300, 0.05, "square", 0.07, 300); SFX.tick(); },
    squash: () => { noise(0.07, 700, 0.18, 0, 2); tone(220, 0.12, "square", 0.07, -150); },
    fix: () => { SFX.sweep(); tone(660, 0.25, "triangle", 0.06, 660); },
    glitch: () => { noise(0.25, 900, 0.14, 0, 3); tone(90, 0.25, "sawtooth", 0.07, 60); },
    egg: () => { tone(400, 0.05, "sine", 0.1, 300); tone(900, 0.06, "sine", 0.08, 0, 0.06); },
    key: () => tone(1700 + rnd() * 600, 0.018, "square", 0.025),
    yay: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "triangle", 0.1, 0, i * 0.07)),
    hmm: () => { tone(300, 0.14, "triangle", 0.08, -40); tone(260, 0.2, "triangle", 0.08, -50, 0.16); },
  };

  // ── 의뢰인 말풍선 ──
  const say = (html, cls = "", dur = 1.8) => {
    bubWho.textContent = th.who; bubP.innerHTML = html; bub.className = "v2-bub " + cls; void bub.offsetWidth; bub.classList.add("on"); bubT = dur;
    const big = cls.includes("big");
    Object.assign(bub.style, { left: px(2), top: px(big ? 70 : 76), width: big ? "auto" : px(56), maxWidth: px(big ? 100 : 56) });
  };

  // ── 버그 ──
  const addBug = (k, from) => {
    if (bugs.some((b) => b.k === k)) return null;
    const [cx, cy] = rcen(k), [fx, fy] = from || [cx + rnd() * 20 - 10, cy];
    const b = { k, x: fx, y: fy, tx: cx, ty: cy, d: 1, age: 0, eggAt: (8.5 + rnd() * 2.5) * ez, egg: 0, born: el, id: Math.random() };
    bugs.push(b); glT[k] = 0.45; delete fixP[k];
    if (tut < 0) spawned++;
    updSc(); renderPan();
    return b;
  };
  const nextTarget = (b) => {
    const [x, y, w, h] = RG[b.k];
    if (rnd() < 0.72) { b.tx = SX + x + 4 + rnd() * Math.max(2, w - 8); b.ty = SY + y + 2 + rnd() * Math.max(2, h - 4); }
    else { b.tx = SX + 6 + rnd() * (SW - 12); b.ty = SY + 8 + rnd() * (SH - 16); }
  };
  const spawnReport = () => {
    const free = healthy(); if (!free.length) return false;
    let k = order.find((x) => free.includes(x)); if (k) order.splice(order.indexOf(k), 1); else k = pick(free);
    const [cx] = rcen(k);
    addBug(k, [rnd() < 0.5 ? SX + 2 : SX + SW - 2, SY + RG[k][1] + 4]);
    S.report(); S.glitch(); vib(12);
    say(RP[k], "no"); cliMode = "sad"; cliT = 0;
    F.float(stageXY(cx, SY + RG[k][1]), "버그 신고!", "bad");
    return true;
  };

  // ── 잡기 → 제안 → 고르기 ──
  const catchBug = (b) => {
    if (over || !b) return;
    caught = b; lastAct = el; S.grab(); vib(8); codiMood = "think"; codiT = 0;
    const list = FIX[b.k].map((t, i) => ({ t, ok: i === 0 }));
    opts3 = tut >= 0 ? shuffle([list[0], list[1]]) : shuffle(list);
    F.burst(stageXY(b.x, b.y), "#ffd23f", 6);
    renderPan(true);
    if (tut === 1) tutNext(2);
  };
  const choose = (i) => {
    if (over || !caught) return;
    const o = opts3[i]; if (!o) return;
    const btn = panO.children[i];
    const b = caught, k = b.k;
    lastAct = el;
    if (tut < 0) { picks++; if (o.ok) rightPicks++; }
    if (o.ok) {
      if (btn) btn.classList.add("ok");
      bugs = bugs.filter((x) => x !== b); caught = null; fixP[k] = 0; fixed += tut < 0 ? 1 : 0; combo++;
      splats.push({ x: b.x, y: b.y, d: b.d, t: 0.9 });
      S.squash(); setTimeout(() => S.fix(), 60); SFX.ding(Math.min(combo, 8)); vib(18);
      F.hit(stageXY(b.x, b.y), 1, "#7c9cff");
      if (combo >= 2) F.float(stageXY(rcen(k)[0], rcen(k)[1] - 6), `콤보 x${combo}`, "good");
      for (let n = 0; n < 10; n++) sparks.push({ x: b.x, y: b.y, vx: rnd() * 60 - 30, vy: -30 - rnd() * 40, t: 0.7, c: pick(["#ffd23f", "#7c9cff", "#ffffff", "#5fe0a0"]) });
      codiMood = "happy"; codiT = 0;
      if (tut < 0 && rnd() < 0.55) { say(pick(OKSAY), "ok", 1.1); cliMode = "happy"; cliT = 0; }
      if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 900);
      setTimeout(() => renderPan(), 380);
    } else {
      if (btn) btn.classList.add("bad");
      combo = 0; S.glitch(); SFX.fail(); vib([30, 40, 30]);
      if (tut >= 0) { F.msg("틀리면 다른 데가 깨져요! 다시 골라요"); return; }
      // 사이드 이펙트: 다른 칸이 새로 깨진다. 벌레는 도망
      caught = null; b.age += 2; sideFx++;
      const free = healthy();
      codiMood = "sad"; codiT = 0;
      if (free.length) {
        const nk = pick(free), nb = addBug(nk, [b.x, b.y]);
        const [cx, cy] = rcen(nk); F.float(stageXY(cx, cy), "사이드 이펙트!", "bad"); F.miss(stageXY(cx, cy));
        if (nb) nb.d = cx > b.x ? 1 : -1;
      } else { F.miss(stageXY(b.x, b.y)); }
      say(pick(WRSAY), "no", 1.3); cliMode = "sad"; cliT = 0;
      setTimeout(() => renderPan(), 420);
    }
  };
  const renderPan = (fresh) => {
    if (over) return;
    pan.classList.toggle("hot", !!caught);
    if (caught) {
      panH.innerHTML = `<em class="bug">버그</em><b>${BNAME[caught.k]}</b><br>코디: 이렇게 고쳐 볼까요?`;
      if (fresh || !panO.children.length) panO.innerHTML = opts3.map((o, i) => `<button class="v2-op" data-i="${i}" style="animation-delay:${i * 0.05}s"><span>${i + 1}</span>${o.t}</button>`).join("");
      panC.innerHTML = "";
    } else {
      panO.innerHTML = "";
      panH.innerHTML = bugs.length ? `<em>코디</em><b>벌레</b>나 깨진 곳을 <b>톡!</b><br>고치는 법을 골라 드릴게요` : `<em>코디</em>${tut < 0 && !sched.length ? "버그 다 잡았어요! 출시 준비 완료" : "지금은 조용해요… 신고가 또 올 거예요"}`;
      panC.innerHTML = bugs.map((b) => `<i>${BNAME[b.k]}</i>`).join("") + (tut < 0 && fixed ? `<i class="ok">잡음 ${fixed}</i>` : "");
    }
  };
  panO.addEventListener("pointerdown", (e) => { const b = e.target.closest(".v2-op"); if (!b || b.classList.contains("ok") || b.classList.contains("bad")) return; e.preventDefault(); choose(+b.dataset.i); });

  // 캔버스 톡: 가까운 벌레 → 깨진 칸
  const hitAt = (lx, ly) => {
    let best = null, bd = 15;
    for (const b of bugs) { const d = Math.hypot(b.x - lx, b.y - ly); if (d < bd) { bd = d; best = b; } }
    if (best) return best;
    for (const b of bugs) { const [x, y, w, h] = RG[b.k]; const bx = b.k === "btn" ? x : x; if (lx >= SX + bx - 2 && lx <= SX + bx + w + (b.k === "btn" ? 36 : 2) && ly >= SY + y - 2 && ly <= SY + y + h + 2) return b; }
    return null;
  };
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (over || tut === 3) return;
    const r = cv.getBoundingClientRect(), lx = ((e.clientX - r.left) / r.width) * W, ly = ((e.clientY - r.top) / r.height) * H;
    const b = hitAt(lx, ly);
    if (b) { if (b !== caught) catchBug(b); }
    else if (lx > PX && lx < PX + PW && ly > PY && ly < PY + PH) { SFX.tok(); if (bugs.length) F.msg("벌레를 톡!"); }
  });

  // ── 할 일 손가락 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "v2-go"; return; }
    const up = o.y < 60;
    goI.style.backgroundImage = `url(${up ? FUP : FDN})`;
    goEl.style.left = o.x + "px"; goEl.style.top = o.y + "px"; goT.innerHTML = o.t || "";
    const ww = W * K; goT.style.transform = o.x < 60 ? "translateX(-22%)" : o.x > ww - 60 ? "translateX(-80%)" : "";
    goEl.className = "v2-go on" + (up ? " up" : "");
  };
  const atBug = (b, t) => ({ x: b.x * K, y: (b.y - 3) * K, t });
  const atOpt = (t) => { const i = opts3.findIndex((o) => o.ok), btn = panO.children[i]; if (!btn) return null; const [x, y] = elXY(btn, 24); return { x: x + 34, y, t }; };
  const taskNow = () => {
    if (tut >= 0 || over) return null;
    const idle = el - lastAct;
    if (caught) return null;
    if (!bugs.length) return null;
    const oldest = bugs.reduce((a, b) => (a.born <= b.born ? a : b));
    if (el < 3.5 && fixed === 0) return atBug(oldest, "벌레 <b>톡!</b>");
    if (idle > 3.5) return atBug(oldest, oldest.egg > 0 ? "알 까기 직전! <b>톡!</b>" : "벌레 <b>톡!</b>");
    return null;
  };

  // ── 리허설 ──
  const SKIP = `<button class="v2-skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) { tutEl.style.top = px(4); tutP.innerHTML = `의뢰인 앱에 <b class="rd">버그 벌레</b>가 나타났어요!<br>가격이 0원이 됐네요. <b>벌레를 톡!</b>`; tutB.innerHTML = SKIP; }
    else if (n === 2) { tutEl.style.top = px(4); tutP.innerHTML = `코디가 고치는 법을 알려 줘요.<br>화면을 보고 <b>맞는 방법</b>을 톡!`; tutB.innerHTML = SKIP; }
    else if (n === 3) {
      tutEl.style.top = px(36); caught = null; renderPan();
      tutP.innerHTML = `좋아요! 이제 <b>오픈 전날 밤</b>, 신고가 쏟아져요.<br><b class="rd">틀린 방법</b>을 고르면 <b class="rd">다른 데가 새로 깨지고</b>,<br>오래 두면 벌레가 <b class="rd">알</b>을 까서 늘어나요.<br>다 잡으면 <b>출시!</b>`;
      tutB.innerHTML = `<button class="v2-go2" data-go>버그 잡으러!</button>`;
    }
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    bugs = []; caught = null; combo = 0; for (const k of KEYS) { delete fixP[k]; glT[k] = 0; }
    spawned = 0; fixed = 0; picks = 0; rightPicks = 0; eggs = 0; sideFx = 0;
    order = shuffle(KEYS.slice());
    sched = [0.2, 0.9, 4.5, 8.5, 12.5, 16.5, 20.5, 24.5, 28.5];
    el = 0; lastAct = 0; tm0 = timer(T, F.bar, () => endGame(true));
    renderPan(); updSc(); SFX.go();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 그리기 ──
  const drawClient = (tm) => {
    let o, y = 112;
    if (cliMode === "happy") { o = { v: "f", arm: Math.floor(cliT * 4) % 2 ? "up" : undefined }; y -= Math.abs(Math.sin(cliT * 9)) * 3 | 0; }
    else if (cliMode === "sad") o = { v: "f", look: Math.floor(cliT * 5) % 2 ? -1 : 1 };
    else if (cliMode === "meh") o = { v: "f", look: -1 };
    else if (cliMode === "use") o = { v: "f", arm: "up" };
    else o = { v: "f", f: Math.floor(tm * 1.6) % 2 ? 1 : 0, look: 1 };
    // 캐릭터 그림(표정): 신남=웃음, 틀림=화남·슬픔, 써 보는 중=무표정, 버그 많으면 깜짝
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    const ex = cliMode === "happy" ? (Math.floor(cliT * 3) % 2 ? "smile" : "blush") : cliMode === "sad" ? (Math.floor(cliT * 3) % 2 ? "angry" : "sad") : cliMode === "meh" ? "sad" : cliMode === "use" ? "neutral" : bugs.length >= 3 ? "surprised" : bugs.length ? "sad" : "smile";
    if (CLI.ok) {
      const e = EXI[ex], hh = 82, ww = hh * 240 / 312, by = cliMode === "happy" ? -Math.abs(Math.sin(cliT * 9)) * 3 : 0;
      g.save(); g.imageSmoothingEnabled = true; g.shadowColor = "#0009"; g.shadowBlur = 6 * KS; g.drawImage(CLI.im, (e % 3) * 240, e >= 3 ? 540 : 0, 240, 312, 24 - ww / 2, 166 - hh * 0.8 + by, ww, hh); g.restore();
    } else { const s = uSprite(cliP, `${o.v}${o.f || 0}${o.arm || ""}${o.look || 0}`, o, false); g.drawImage(s, 6, y, 32, 62); }
    if (CLI.ok) y = 166 - 82 * 0.8 - 6;
    if (cliMode === "sad" || cliMode === "meh") { g.save(); g.fillStyle = "#7fc8ff"; g.beginPath(); g.moveTo(40, y + 8); g.quadraticCurveTo(42.6, y + 12.6, 40, y + 13.4); g.quadraticCurveTo(37.4, y + 12.6, 40, y + 8); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(39.4, y + 11.6, 0.5, 0, 6.3); g.fill(); g.restore(); }
    if (cliMode === "happy") for (let k = 0; k < 3; k++) { const a = cliT * 3 + k * 2.1, hx = 22 + Math.cos(a) * 20, hy = y + 10 + Math.sin(a) * 5; g.save(); g.translate(hx, hy); g.fillStyle = "#ff7eb0"; g.beginPath(); g.moveTo(0, 1.6); g.bezierCurveTo(-3, -0.6, -1.4, -2.8, 0, -1); g.bezierCurveTo(1.4, -2.8, 3, -0.6, 0, 1.6); g.fill(); g.restore(); }
  };
  const drawLaptop = (tm) => {
    const oy = SCN;
    g.save(); g.shadowColor = "#0008"; g.shadowBlur = 4 * KS; g.beginPath(); g.roundRect ? g.roundRect(2.6, oy + 9.6, 38, 29, 2.4) : g.rect(3, oy + 10, 37, 28); g.fillStyle = "#3a3e52"; g.fill(); g.restore();
    g.beginPath(); g.roundRect ? g.roundRect(4, oy + 11, 35, 26, 1.2) : g.rect(4, oy + 11, 35, 26); g.fillStyle = "#0e1220"; g.fill();
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(0.6, oy + 37.6, 42, 4.2, [0, 0, 2.4, 2.4]) : g.rect(1, oy + 38, 41, 4); g.fillStyle = g.createLinearGradient(0, oy + 38, 0, oy + 42); g.fillStyle = (() => { const q = g.createLinearGradient(0, oy + 38, 0, oy + 42); q.addColorStop(0, "#e0e4ee"); q.addColorStop(1, "#7a7e8e"); return q; })(); g.fill(); g.fillStyle = "#9a9eae"; g.fillRect(17, oy + 38.6, 9, 0.8); g.restore();
    // 커피
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(10, oy + 52, 9, 10, [0, 0, 2.4, 2.4]) : g.rect(10, oy + 52, 9, 10); g.fillStyle = "#f4f4f4"; g.fill(); g.beginPath(); g.ellipse(14.5, oy + 52.6, 4.2, 1.2, 0, 0, 6.3); g.fillStyle = "#6a4428"; g.fill(); g.strokeStyle = "#f4f4f4"; g.lineWidth = 1.2; g.beginPath(); g.arc(19.4, oy + 56.6, 2, -1.3, 1.3); g.stroke();
    g.strokeStyle = "#ffffff55"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(13, oy + 50); g.bezierCurveTo(14.4, oy + 47, 12, oy + 46, 13.6, oy + 43); g.stroke(); g.restore();
    const work = codiMood === "happy" && codiT < 0.6 || codiMood === "think";
    if (work) { const n = Math.min(codeLines.length, 8); for (let i = 0; i < n; i++) { const l = codeLines[(Math.floor(tm * 12) + i) % codeLines.length]; P(6 + l.ind, oy + 13 + i * 3, Math.min(l.len, 30 - l.ind), 1, l.c); } }
    else { [[0, 10, "#7c9cff"], [2, 16, "#5a6290"], [2, 12, "#5a6290"], [0, 6, "#7c9cff"]].forEach(([ind, len, c], i) => P(6 + ind, oy + 13 + i * 3, len, 1, c)); if (Math.floor(tm * 2) % 2) P(6, oy + 25, 2, 1, "#ffffff"); }
    if (bugs.length && tut < 0) { const a = Math.floor(tm * 3) % 2; P(30, oy + 13, 7, 5, a ? "#e8487a" : "#9a2050"); P(33, oy + 14, 1, 2, "#ffffff"); P(33, oy + 17, 1, 1, "#ffffff"); }
    const cy = oy - 2 + (codiMood === "happy" ? -Math.abs(Math.sin(tm * 10)) * 2 | 0 : codiMood === "think" ? (Math.floor(tm * 4) % 2) : 0);
    codiV(g, 15, cy, codiMood, tm);
    g.save(); g.fillStyle = "#7c9cff"; [14, 27].forEach((x) => { g.beginPath(); g.roundRect ? g.roundRect(x, oy + 8.6, 3, 2.4, 1) : g.rect(x, oy + 9, 3, 2); g.fill(); }); g.restore();
    if (codiMood === "think" && Math.floor(tm * 2) % 2) { g.save(); g.fillStyle = "#fff"; [[33, oy - 7, 1.1], [37.4, oy - 9.6, 1.6], [43, oy - 13.4, 2.4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }); g.restore(); }
  };
  const render = (tm) => {
    g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (!BGH && BGI.ok) BGH = buildBgH();
    if (BGH) { g.imageSmoothingEnabled = true; g.drawImage(BGH, 0, 0, W, SCN); g.imageSmoothingEnabled = false; } else g.drawImage(BG, 0, 0);
    drawClient(tm);
    if (BGH) {
      // 계산대(벡터)
      const [top, face] = th.ctr;
      const cnt = (x, w) => { g.save(); g.shadowColor = "#0008"; g.shadowBlur = 3 * KS; g.beginPath(); g.roundRect ? g.roundRect(x, 165.4, w, 3.6, 1.2) : g.rect(x, 165.4, w, 3.6); const q = g.createLinearGradient(0, 165, 0, 169); q.addColorStop(0, shade(top, 1.25)); q.addColorStop(1, top); g.fillStyle = q; g.fill(); g.restore(); const q2 = g.createLinearGradient(0, 169, 0, SCN); q2.addColorStop(0, shade(face, 0.8)); q2.addColorStop(1, shade(face, 0.6)); g.fillStyle = q2; g.fillRect(x, 169, w, SCN - 169); g.fillStyle = shade(face, 0.55); for (let k = x + 12; k < x + w; k += 12) g.fillRect(k, 170, 0.5, SCN - 170); };
      cnt(0, 52); cnt(136, 24);
    } else g.drawImage(FR, 0, 0);
    // 폰
    const st = { br: brk(), fix: fixP, gl: glT, over: null };
    if (endT >= 0 && endT > 1.1) {
      st.over = (Q) => {
        if (cleared || !bugs.length) {
          const a = clamp((endT - 1.1) / 0.25, 0, 1), cw = Math.round(56 * a), ch = Math.round(34 * a);
          if (cw > 4) { Q(38 - (cw >> 1), 60 - (ch >> 1), cw, ch, "#ffffff"); Q(38 - (cw >> 1), 60 - (ch >> 1), cw, 2, "#3fd08a"); }
          if (a >= 1) { Q(30, 50, 16, 14, "#3fd08a"); [[33, 57], [34, 58], [35, 59], [36, 60], [37, 59], [38, 58], [39, 57], [40, 56], [41, 55], [42, 54]].forEach(([x, y]) => { Q(x, y, 1, 2, "#ffffff"); }); Q(24, 68, 28, 2, "#5a5a68"); Q(28, 72, 20, 1, "#9a9aa8"); }
        } else {
          for (let i = 0; i < 8; i++) Q(rint(SW), rint(SH), 10 + rint(30), 1 + rint(3), pick(["#ff3b6b", "#5fe0ff", "#ffd23f", "#1a1a24"]));
        }
      };
    }
    drawPhone(g, th, st, tm, PIC);
    // 잡힌 칸 표시(노란 점선)
    if (caught) {
      const [x, y, w, h] = RG[caught.k], bw = w + 4 + (caught.k === "btn" ? 34 : 0);
      g.save(); g.setLineDash([2, 2]); g.lineDashOffset = -tm * 20; g.strokeStyle = "#ffd23f"; g.lineWidth = 1; g.shadowColor = "#ffd23f"; g.shadowBlur = 3 * KS; g.beginPath(); g.roundRect ? g.roundRect(SX + x - 2, SY + y - 2, bw, h + 4, 2) : g.rect(SX + x - 2, SY + y - 2, bw, h + 4); g.stroke(); g.restore();
    }
    if (false) {
      const [x, y, w, h] = RG[caught.k], bx = SX + x - 2, by = SY + y - 2, bw = w + 4 + (caught.k === "btn" ? 34 : 0), bh = h + 4, o = Math.floor(tm * 10) % 4;
      for (let i = 0; i < bw; i++) if ((i + o) % 4 < 2) { P(bx + i, by, 1, 1, "#ffd23f"); P(bx + bw - 1 - i, by + bh - 1, 1, 1, "#ffd23f"); }
      for (let i = 0; i < bh; i++) if ((i + o) % 4 < 2) { P(bx + bw - 1, by + i, 1, 1, "#ffd23f"); P(bx, by + bh - 1 - i, 1, 1, "#ffd23f"); }
    }
    // 벌레·찍힌 자국
    for (const s of splats) { if (s.t > 0.35 || Math.floor(s.t * 20) % 2) bugV(g, s.x, s.y, 0, s.d, "#e8487a", 1); }
    for (const b of bugs) {
      const f = b === caught ? Math.floor(tm * 16) % 2 : Math.floor(tm * 10 + b.id * 7) % 2;
      const col = b.egg > 0 && Math.floor(tm * 12) % 2 ? "#ffffff" : "#e8487a";
      const jx = b === caught ? (Math.floor(tm * 20) % 2 ? 1 : -1) : 0;
      bugV(g, b.x + jx, b.y, f, b.d, col);
      if (b === caught) { const r = 7.5 + (Math.floor(tm * 6) % 2); g.save(); g.strokeStyle = "#ffd23f"; g.lineWidth = 1; g.lineCap = "round"; g.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(b.x + sx * r, b.y + sy * (r - 3)); g.lineTo(b.x + sx * r, b.y + sy * r); g.lineTo(b.x + sx * (r - 3), b.y + sy * r); } g.stroke(); g.restore(); }
      if (b.egg > 0) { g.save(); g.beginPath(); g.ellipse(b.x - b.d * 6, b.y + 2, 2.2, 2.8, 0, 0, 6.3); g.fillStyle = "#fff4d0"; g.shadowColor = "#0006"; g.shadowBlur = 2 * KS; g.fill(); g.restore(); }
    }
    { const q = g.createLinearGradient(0, SCN, 0, H); q.addColorStop(0, "#3a3048"); q.addColorStop(0.03, "#2a2234"); q.addColorStop(1, "#0e0c16"); g.fillStyle = q; g.fillRect(0, SCN, W, H - SCN); g.fillStyle = "#5a4a68"; g.fillRect(0, SCN, W, 0.8); g.fillStyle = "#ffffff06"; for (let x = 0; x < W; x += 23) g.fillRect(x, SCN + 2, 0.6, H - SCN); }
    drawLaptop(tm);
    for (const s of sparks) { g.fillStyle = s.c; g.beginPath(); g.arc(s.x + 1, s.y + 1, 1.1, 0, 6.3); g.fill(); }
  };

  // ── 끝: 의뢰인이 써 보고 → 출시 버튼 ──
  const endGame = (timeUp) => {
    if (over) return; over = true; guide(null);
    if (tm0) tm0.stop();
    cleared = !bugs.length && !sched.length;
    caught = null; pan.classList.add("off"); tutEl.classList.add("off");
    if (timeUp) F.msg(cleared ? "마감!" : "마감! 시간이 다 됐어요");
    else F.msg("버그 전부 잡았다!");
    endT = 0; cliMode = "use"; cliT = 0; codiMood = "idle";
    // 내 캐릭터 그림(표정 시트 3x2)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    const i = cleared ? 1 : 2; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`;
    const im = new Image(); im.onload = () => { meEl.style.backgroundImage = `url("${im.src}")`; meEl.dataset.ok = "1"; }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp";
  };
  const endStep = (dt) => {
    const t0 = endT; endT += dt; const at = (t) => t0 < t && endT >= t;
    const happy = cleared || !bugs.length;
    if (at(0.45)) { const [x, y] = rcen("btn"); guide({ x: x * K, y: (y - 2) * K, t: "" }); F.msg(`${th.who}이 써 보는 중…`); }
    if (at(1.1)) { tone(880, 0.05, "square", 0.07); vib(8); if (happy) SFX.ding(3); else S.glitch(); }
    if (at(1.5)) guide(null);
    if (at(1.8)) { if (happy) { say("완벽해요!", "ok big", 9); cliMode = "happy"; cliT = 0; S.yay(); } else { say("음… 일단 열긴 할게요", "no big", 9); cliMode = "meh"; cliT = 0; S.hmm(); } }
    if (at(2.5)) { lbEl.classList.add("on"); SFX.pop(); }
    if (at(2.8)) { const [x, y] = elXY(lbEl, 18); guide({ x, y, t: "" }); }
    if (at(3.25)) {
      guide(null); lbEl.classList.add("press"); SFX.stamp(); vib(30);
      banEl.classList.toggle("meh", !happy); banEl.querySelector("b").textContent = happy ? "출시 완료!" : "일단 출시…";
      banEl.classList.add("on"); if (meEl.dataset.ok) meEl.classList.add("on");
      codiMood = happy ? "happy" : "sad";
      if (happy) { setTimeout(() => SFX.end(), 200); for (let n = 0; n < 40; n++) sparks.push({ x: 93 + rnd() * 20 - 10, y: 60 + rnd() * 20, vx: rnd() * 140 - 70, vy: -60 - rnd() * 80, t: 1.6, c: pick(["#ffd23f", "#7c9cff", "#ff7eb0", "#5fe0a0", "#ffffff"]) }); F.burst(stageXY(93, 70), "#ffd23f", 14); }
    }
    if (at(4.7) && !finished) {
      finished = true;
      const fixRate = spawned ? fixed / spawned : 0, acc = picks ? rightPicks / picks : 0;
      const speed = cleared && tm0 ? clamp(tm0.left() / (T * 0.4), 0, 1) : 0;
      // 찍기(마구 고르기)는 손해: 정확도가 모든 항목에 곱해진다
      const score = clamp(0.4 * fixRate * acc + 0.35 * acc * Math.min(1, fixed / 4) + (cleared ? 0.25 * acc * (0.5 + 0.5 * speed) : 0), 0, 1);
      const line = cleared ? `버그 <b>${fixed}마리</b> 전부 잡고 출시 성공!` : `버그 ${fixed}/${spawned}마리 잡음 · <b>${bugs.length}마리</b> 남은 채 출시`;
      finish(score, line, "", [["버그 잡기", fixRate], ["맞는 수정", acc], ["출시 속도", speed]]);
    }
  };

  // ── 반복 ──
  for (let k = 0; k < 14; k++) codeLines.push({ ind: [0, 2, 4, 2, 4, 6][rint(6)], len: 4 + rint(18), c: pick(["#7c9cff", "#5fe0a0", "#ffd166", "#ff7ab0", "#c8d0f0", "#c8d0f0"]) });
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    if (!over) {
      el += dt; phT += dt;
      if (tut === 0 && phase === "idle") {
        phase = "play";
        if (opts.retry) startGame();
        else { const b = addBug("price", [SX + SW - 4, SY + 80]); b.slow = 1; tutNext(1); say(RP.price, "no", 2.6); cliMode = "sad"; S.report(); }
      }
      // 신고 일정
      if (tut < 0) {
        if (sched.length && !bugs.length && sched[0] - el > 1.0) sched[0] = el + 0.6;
        while (sched.length && el >= sched[0]) { sched.shift(); spawnReport(); }
        if (!sched.length && !bugs.length && !Object.values(fixP).some((v) => v < 1)) { endGame(false); }
      }
      // 벌레 움직임·알
      for (const b of bugs.slice()) {
        if (b === caught) continue;
        const sp = (b.slow ? 7 : 14 + Math.min(10, el * 0.25)) / ez;
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (d < 1.5) nextTarget(b); else { b.x += (dx / d) * sp * dt; b.y += (dy / d) * sp * dt; if (Math.abs(dx) > 0.5) b.d = dx > 0 ? 1 : -1; }
        if (tut < 0) {
          b.age += dt;
          if (b.egg > 0) {
            b.egg -= dt;
            if (b.egg <= 0) {
              b.egg = 0; b.age = 0; b.eggAt = (8 + rnd() * 3) * ez;
              const free = healthy();
              if (free.length) { const nk = pick(free); const nb = addBug(nk, [b.x - b.d * 6, b.y + 2]); eggs++; S.egg(); S.glitch(); const [cx, cy] = rcen(nk); F.float(stageXY(cx, cy), "알에서 버그가!", "bad"); if (nb) say(RP[nk], "no"); cliMode = "sad"; cliT = 0; }
            }
          } else if (b.age >= b.eggAt) { b.egg = 1.1; S.egg(); }
        }
      }
      // 손가락
      if (tut === 1) { const b = bugs[0]; guide(b && !caught ? atBug(b, "벌레 <b>톡!</b>") : null); }
      else if (tut === 2) guide(caught ? atOpt("") : null);
      else if (tut === 3) guide(null);
      else guide(taskNow());
    } else if (endT >= 0) endStep(dt);
    // 공통 애니
    for (const k of KEYS) { if (fixP[k] != null) { fixP[k] += dt / 0.45; if (fixP[k] >= 1) delete fixP[k]; } if (glT[k] > 0) glT[k] -= dt; }
    for (let i = splats.length - 1; i >= 0; i--) { splats[i].t -= dt; if (splats[i].t <= 0) splats.splice(i, 1); }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 110 * dt; if (s.t <= 0) sparks.splice(i, 1); }
    cliT += dt; codiT += dt;
    if (!over && (cliMode === "happy" || cliMode === "sad") && cliT > 1.4) cliMode = "idle";
    if (!over && (codiMood === "happy" || codiMood === "sad") && codiT > 1.1) codiMood = caught ? "think" : "idle";
    if (bubT > 0) { bubT -= dt; if (bubT <= 0) bub.classList.remove("on"); }
    if (!over) updSc();
    render(tm);
    requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.vibe2 = {
    st: () => ({ tut, bugs: bugs.map((b) => b.k), caught: caught && caught.k, spawned, fixed, picks, rightPicks, eggs, sideFx, sched: sched.length, el: +el.toFixed(1), over, endT: +endT.toFixed(2), cleared }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1 && bugs[0]) catchBug(bugs[0]);
      else if (tut === 2 && caught) choose(opts3.findIndex((o) => o.ok));
      else if (tut === 3) startGame();
    },
    auto: () => {
      if (over || tut >= 0) return;
      if (caught) return choose(opts3.findIndex((o) => o.ok));
      if (bugs.length) catchBug(bugs[0]);
    },
    bad: () => {
      if (over || tut >= 0) return;
      if (caught) return choose(rint(opts3.length));
      if (bugs.length && rnd() < 0.5) catchBug(pick(bugs));
    },
  };
  renderPan(); updSc(); render(0); requestAnimationFrame(loop);
}
