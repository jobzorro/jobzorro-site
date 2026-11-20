// After 6PM 투잡 미니게임 5개 (v4.15)
// mgRun(job, host, { skill }) → Promise<{ score: 0~1, grade, line }>
// 한 판 20~40초, 한 손 터치. 실력(skill 0~200)은 시간 여유·속도에만 반영하고 점수는 손 실력으로 낸다.

export const MG = {
  pr: { n: "퇴실 청소", desc: "다음 손님 오기 전에 파티룸을 되살려요", how: ["시작하면 <b>체크인 때 사진</b>이 3초 보여요. 소파·스피커·조명 같은 가구·기기 자리를 기억해요.", "손님이 놀고 가서 엉뚱한 곳에 간 가구·기기를 <b>끌어서</b> 원래 자리에 놓아요. 가까우면 딱 붙어요.", "컵·피자 상자·캔 같은 쓰레기는 톡톡 치우고, 반짝이는 <b>분실물</b>(지갑·휴대폰·열쇠 등)은 아래 <b>분실물</b> 버튼으로 바꾼 뒤 눌러 모아요. 버리면 감점.", "기억이 안 나면 <b>사진</b> 버튼을 누르고 있는 동안 체크인 때 자리가 잔상으로 겹쳐 보여요(3번)."] },
  cs: { n: "빨간펜", desc: "자소서에서 고칠 문장을 찾아요", how: ["자소서 한 항목이 나와요. <b>고쳐야 할 문장</b>을 찾아 톡.", "고칠 문장: 결론 없는 서두, AI 티 나는 상투어, 숫자 없는 막연한 성과, 다른 이야기로 새는 문장.", "멀쩡한 문장을 누르면 감점이에요."] },
  airbnb: { n: "외국어 답장", desc: "외국인 손님 메시지에 바로 답해요", how: ["손님 메시지 5개가 차례로 와요.", "맞는 답장 3개 중 하나를 골라요. 작은 글씨가 한국어 뜻인데, 외국어 실력이 낮으면 ***로 가려져요.", "빨리 맞힐수록 별점이 올라요."] },
  ucafe: { n: "CCTV 먹튀 잡기", desc: "밤 무인카페 CCTV, 수상한 손님을 잡아요", how: ["손님은 <b>문 → 키오스크(카드 결제) → 커피 머신 → 문</b>으로 다녀요. 앉았다 가는 손님도 있어요.", "수상한 손님을 나가기 전에 톡! <b>키오스크를 건너뛰고</b> 커피만 들고 두리번거리다 빨리 나가는 손님, 진열대에서 <b>컵을 잔뜩</b> 쌓아 가는 손님, <b>의자를 넘어뜨리는</b> 10대 무리.", "정상 손님을 누르면 단골이 화나서 감점. 처음엔 한산하다가 점점 붐벼요."] },
  insta: { n: "사진 한 장", desc: "여행 중 갑자기 나타난 장관을 찍어 떡상해요", how: ["여행지에서 '뭘 올리지…' 하는 순간, 갑자기 <b>고래·토네이도·유성·번개·오로라·불꽃</b> 중 하나가 나타나요.", "처음엔 화면 밖에 있어요. <b>화면을 끌어</b> 카메라를 돌려 가운데 초점 틀(초록)에 담아요.", "오른쪽 <b>분위기</b> 막대가 꼭대기에 닿을 때 셔터! 구도와 타이밍으로 좋아요가 정해져요."] },
};

const CSS = `.mg-langnote{font-size:11.5px;color:#ffe9c4;background:#0007;border-radius:8px;padding:4px 8px;margin-bottom:6px}
.mg{--mgb:var(--panel,#171a2e);--mgb2:var(--panel2,#20243d);--mgl:var(--line,#2f3456);--mgf:var(--fg,#f2f1fb);--mgm:var(--muted,#9ea3c0);--mgg:var(--gold,#f5c04e);--mgr:var(--red,#ff6b7f);--mggr:var(--green,#5fe0a0);
  display:flex;flex-direction:column;gap:8px;color:var(--mgf);height:var(--mgh,min(600px,calc(100vh - 120px)));height:var(--mgh,min(600px,calc(100dvh - 120px)));min-height:330px;user-select:none;-webkit-user-select:none}
.mg *{box-sizing:border-box}
.mg button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;touch-action:manipulation}
.mg-head{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.mg-head b{font-size:16px;white-space:nowrap}
.mg-bar{flex:1;height:8px;border-radius:99px;background:var(--mgb2);overflow:hidden}
.mg-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--mgr),var(--mgg) 35%,var(--mggr));transform-origin:left;transition:transform .1s linear}
.mg-sc{font-size:13px;color:var(--mgg);font-weight:700;white-space:nowrap;min-width:52px;text-align:right}
.mg-stage{position:relative;flex:1 1 auto;min-height:0;border-radius:14px;overflow:hidden;background:var(--mgb2) center/cover no-repeat;border:1px solid var(--mgl)}
.mg-foot{flex:0 0 auto;display:flex;gap:8px}
.mg-btn{flex:1;padding:12px 10px;border-radius:12px;background:var(--mgb2)!important;border:1px solid var(--mgl)!important;font-weight:700;font-size:15px}
.mg-foot .mg-btn.mg-re{flex-direction:column!important;gap:1px;line-height:1.2;font-weight:900;border-color:var(--mgg)!important;color:var(--mgg)!important}.mg-btn.mg-re small{display:block;font-size:10.5px;font-weight:600;opacity:.8;color:#fff}
.mg-btn.gold{background:var(--mgg)!important;color:#2a1a00!important;border-color:var(--mgg)!important}
.mg-btn.on{outline:2px solid var(--mgg);outline-offset:-2px}
.mg-msg{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:9;background:#000b;color:#fff;font-size:12.5px;padding:5px 12px;border-radius:99px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s}
.mg-msg.on{opacity:1}
.mg-intro,.mg-res{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px}
.mg-intro h3,.mg-res h3{margin:0;font-size:20px}
.mg-intro .mg-d{color:var(--mgm);font-size:13px}
.mg-intro ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.55}
.mg-intro .mg-ease{font-size:12px;color:var(--mgm);background:var(--mgb2);border-radius:10px;padding:6px 10px}
.mg-res{align-items:stretch;text-align:center}
.mg-res .mg-gr{font-size:34px;font-weight:900;color:var(--mgg);margin-top:6px}
.mg-res .mg-gr.ng{color:var(--mgm)}
.mg-res .mg-ln{font-size:14px}
.mg-res .mg-x{text-align:left;font-size:13px;display:flex;flex-direction:column;gap:6px}
.mg-res .mg-x div{background:var(--mgb2);border-radius:10px;padding:8px 10px}
.mg-res .mg-x s{color:var(--mgr)}.mg-res .mg-x em{font-style:normal;color:var(--mggr)}
.mg-res .mg-x small{color:var(--mgm);display:block}
.mg-pop{animation:mgpop .25s ease-out forwards}
@keyframes mgpop{to{transform:scale(1.6);opacity:0}}
.mg-shake{animation:mgshake .3s}
@keyframes mgshake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
/* 빨간펜 */
.mg-paper{position:absolute;inset:0;overflow:auto;background:#fbf7ee;color:#2a2620;padding:14px 14px 18px;font-size:14.5px;line-height:1.75}
.mg-paper .mg-ttl{font-weight:900;font-size:15px;border-bottom:2px solid #2a262033;padding-bottom:6px;margin-bottom:8px}
.mg-sen{display:inline;padding:1px 2px;border-radius:4px;cursor:pointer;background:none;text-align:left;color:#2a2620!important;font-size:inherit;line-height:inherit}
.mg-sen.hit{color:#c62828!important;text-decoration:line-through;text-decoration-color:#e53935;text-decoration-thickness:2px;background:#ffcdd255}
.mg-sen.miss{background:#90a4ae44}
.mg-sen.show{background:#ffe08299}
/* 숙소 답장 */
.mg-chat{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding:12px;background:linear-gradient(180deg,#0e1020aa,#0e1020ee)}
.mg-bub{align-self:flex-start;max-width:86%;background:#fff;color:#1d1d1f;border-radius:16px 16px 16px 4px;padding:10px 12px;font-size:15px}
.mg-bub small{display:block;color:#666;font-size:12px;margin-top:2px}
.mg-bub .mg-fl{font-size:12px;color:#888;margin-bottom:2px}
.mg-ans{display:flex;flex-direction:column;gap:7px}
.mg-ans button{text-align:left;background:#2f6fde!important;color:#fff!important;border-radius:14px 14px 4px 14px;padding:9px 12px;align-self:flex-end;max-width:92%;font-size:14px}
.mg-ans button small{display:block;opacity:.8;font-size:11.5px}
.mg-ans button.ok{background:var(--mggr)!important;color:#0b2a1a!important}.mg-ans button.ng{background:var(--mgr)!important}
.mg-stars{font-size:13px;color:var(--mgg);text-align:center}
/* 무인카페 */
.mg-cafe{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;padding:12px;background:linear-gradient(180deg,#0e1020cc,#0e1020f2)}
.mg-sym{background:#111;border:1px solid #333;border-radius:10px;padding:8px 10px;font-family:ui-monospace,monospace;font-size:13px;color:#7CFC9A}
.mg-man{background:#fffbe6;color:#3a3000;border-radius:10px;padding:8px 10px;font-size:14px;line-height:1.7}
.mg-man.hide{visibility:hidden}
.mg-seq{display:flex;gap:6px;flex-wrap:wrap;min-height:30px}
.mg-seq span{background:var(--mggr);color:#0b2a1a;border-radius:8px;padding:3px 8px;font-size:13px;font-weight:700}
.mg-parts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:auto}
.mg-parts button{background:var(--mgb2)!important;border:1px solid var(--mgl)!important;border-radius:12px;padding:6px 4px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:2px}
.mg-parts button i{font-style:normal;font-size:22px}
.mg-parts button.done{opacity:.35}
/* 인별 사진 */
.mg-cam .mg-frame{position:absolute;left:50%;top:50%;width:34%;aspect-ratio:1;transform:translate(-50%,-50%);border:2px solid #fffc;border-radius:10px;box-shadow:0 0 0 999px #0006;z-index:2;pointer-events:none}
.mg-cam .mg-frame::before,.mg-cam .mg-frame::after{content:"";position:absolute;background:#fff8}
.mg-cam .mg-frame::before{left:50%;top:-8px;bottom:-8px;width:1px}.mg-cam .mg-frame::after{top:50%;left:-8px;right:-8px;height:1px}
.mg-subj{position:absolute;z-index:1;font-size:54px;line-height:1;transform:translate(-50%,-50%);will-change:left,top}
.mg-flash{position:absolute;inset:0;background:#fff;z-index:5;opacity:0;pointer-events:none}
.mg-flash.on{animation:mgflash .35s}
@keyframes mgflash{0%{opacity:.9}100%{opacity:0}}
.mg-shots{display:flex;gap:6px;justify-content:center}
.mg-shots span{width:46px;height:46px;border-radius:8px;background:var(--mgb2);border:1px solid var(--mgl);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--mgm)}
.mg-shots span b{color:var(--mgg)}
.mg-shut{flex:0 0 auto;width:68px;height:68px;border-radius:50%;background:#fff!important;border:5px solid #ffffff66!important;margin:0 auto;box-shadow:0 0 0 3px #0004}
.mg-shut:active{transform:scale(.92)}
@media (max-height:680px){.mg-parts button i{font-size:18px}.mg-cafe{gap:7px;padding:9px}.mg-paper{font-size:13.5px;line-height:1.65}.mg-intro ol{font-size:13px}.mg-subj{font-size:44px}.mg-shut{width:58px;height:58px}}
`;
function inject() {
  if (typeof document === "undefined" || document.getElementById("mgcss")) return;
  const s = document.createElement("style"); s.id = "mgcss"; s.textContent = CSS + CSS2 + IN_CSS + MG2.map((g) => g.css || "").join("\n"); document.head.appendChild(s);
}
const CSS2 = `
/* 빨간펜: 펜이 직접 줄을 긋는다 */
.mg-sen.hit{text-decoration:none!important;color:#8e2b2b!important;background:#ffcdd233!important}
.mg-strk{position:absolute;pointer-events:none;overflow:visible;z-index:3}
.mg-strk path{fill:none;stroke:#d32f2f;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:.92}
.mg-pen{position:absolute;left:0;top:0;z-index:4;font-size:24px;line-height:1;pointer-events:none;filter:drop-shadow(1px 3px 2px #0006)}
.mg-xx{position:absolute;z-index:4;color:#d32f2f;font-weight:900;font-size:24px;line-height:1;transform:translate(-50%,-50%) scale(0);animation:mgxx .3s forwards;pointer-events:none}
@keyframes mgxx{to{transform:translate(-50%,-50%) scale(1) rotate(-8deg)}}
/* 퇴실 청소 도트 */
.mg-prst{background:#0d0818!important;display:flex;align-items:center;justify-content:center}
.mg-prw{position:relative;flex:0 0 auto}
.mg-prw canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:grab}
.mg-prpola{position:absolute;left:50%;top:48%;width:80%;z-index:5;background:#fbfaf5;padding:6px 6px 0;border-radius:3px;box-shadow:0 12px 28px #000c;transform:translate(-50%,-50%) rotate(-3deg);animation:mgprin .5s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
.mg-prpola img{display:block;width:100%;aspect-ratio:160/200;image-rendering:pixelated;background:#3a2552}
.mg-prpola b{display:block;color:#3a3340;font-size:12.5px;text-align:center;padding:6px 0 8px;font-weight:800;white-space:nowrap}
.mg-prpola b i{font-style:normal;color:#c2416b;font-size:15px;margin-left:2px}
@keyframes mgprin{from{transform:translate(-50%,-140%) rotate(8deg);opacity:0}}
.mg-prpola.away{transition:transform .45s ease-in,opacity .45s;transform:translate(60%,-160%) rotate(24deg) scale(.5);opacity:0}
.mg-prcap{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:5;background:#fff;color:#333;font-size:12px;font-weight:800;padding:4px 10px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px #0008;display:none;pointer-events:none}
.mg-prcap.on{display:block}
.mg-pr .mg-foot .mg-btn{font-size:13.5px;padding:7px 4px;display:flex;align-items:center;justify-content:center;gap:4px}
.mg-pr .mg-foot .mg-btn img{width:24px;height:auto;image-rendering:pixelated;flex:0 0 auto}
.mg-pr .mg-foot .mg-btn span{color:var(--mgg)}
.mg-pr .mg-foot .mg-btn:disabled{opacity:.4}
/* 무인카페 CCTV */
.mg-cctv{filter:saturate(.4) brightness(.8) contrast(1.1)}
.mg-cctv::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,#3cff8a26,#001a0ad0 88%);z-index:1;pointer-events:none}
.mg-scan{position:absolute;inset:0;z-index:20;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,#0000003a 2px 3px);animation:mgscan 5s linear infinite}
@keyframes mgscan{to{background-position:0 60px}}
.mg-rec{position:absolute;left:10px;top:8px;z-index:21;color:#ff4d4d;font:700 12px ui-monospace,monospace;animation:mgblink 1s steps(2) infinite}
@keyframes mgblink{50%{opacity:0}}
.mg-clock{position:absolute;right:10px;top:8px;z-index:21;color:#b8ffcf;font:12px ui-monospace,monospace;text-shadow:0 0 4px #3f8}
.mg-cctv .mg-msg{z-index:22}
.mg-prop{position:absolute;z-index:2;transform:translate(-50%,-50%);font-size:30px;text-align:center;line-height:1;pointer-events:none}
.mg-prop small{display:block;font-size:10px;color:#b8ffcf;margin-top:3px;font-family:ui-monospace,monospace;white-space:nowrap}
.mg-prop.chair.fall{animation:mgfall .4s forwards}
@keyframes mgfall{to{transform:translate(-50%,-50%) rotate(90deg)}}
.mg-cu{position:absolute;transform:translate(-50%,-80%);font-size:30px;line-height:1;padding:6px;touch-action:none;cursor:pointer;border:2px solid transparent;border-radius:12px;user-select:none}
.mg-cu.sm{font-size:24px}
.mg-cu i{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);font-style:normal;font-size:13px;white-space:nowrap;text-shadow:0 1px 2px #000}
.mg-cu.caught{border-color:#ff3b3b;background:#ff3b3b33;box-shadow:0 0 12px #f33}
.mg-cu.caught i{color:#ff6b6b;font-weight:900;font-size:14px}
/* 인별: 찰칵·폴라로이드·하트 */
.mg-flash.soft.on{animation:mgflash2 .3s}
@keyframes mgflash2{0%{opacity:.35}100%{opacity:0}}
.mg-click{position:absolute;left:50%;top:20%;z-index:7;transform:translate(-50%,-50%) scale(.6);font-weight:900;font-size:30px;color:#fff;text-shadow:0 2px 10px #000a;opacity:0;pointer-events:none}
.mg-click.on{animation:mgclick .7s ease-out}
@keyframes mgclick{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-75%) scale(1)}}
.mg-pola{position:absolute;left:50%;top:52%;z-index:6;width:min(56%,210px);background:#fff;padding:8px 8px 6px;border-radius:4px;box-shadow:0 10px 24px #000a;transform:translate(-50%,-50%) rotate(var(--r));animation:mgdrop .45s cubic-bezier(.3,1.4,.5,1)}
@keyframes mgdrop{from{transform:translate(-50%,-150%) rotate(0deg);opacity:.2}}
.mg-pola.away{transition:transform .4s ease-in,opacity .4s;transform:translate(-50%,120%) rotate(var(--r)) scale(.4);opacity:0}
.mg-pimg{position:relative;aspect-ratio:1;background-size:300%;overflow:hidden;background-color:#ccc}
.mg-pimg span{position:absolute;transform:translate(-50%,-50%);font-size:56px;line-height:1}
.mg-pola.blur .mg-pimg{filter:blur(3px) brightness(.9)}
.mg-pcap{color:#333;font-weight:900;text-align:center;font-size:16px;margin-top:4px}
.mg-plike{color:#e0245e;font-weight:900;text-align:center;font-size:15px}
.mg-plike.pang{animation:mgpang .35s}
@keyframes mgpang{50%{transform:scale(1.35)}}
.mg-heart{position:absolute;bottom:32%;z-index:7;font-style:normal;font-size:20px;pointer-events:none;opacity:0;animation:mgheart 1.2s ease-out forwards}
@keyframes mgheart{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2)}}
/* CCTV 도트 */
.mg-cctv2{background:#06100a!important;display:flex;align-items:center;justify-content:center}
.mg-cvw{position:relative;flex:0 0 auto}
.mg-cvw canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:crosshair}
.mg-cvw .mg-rec{left:6px;top:5px}.mg-cvw .mg-clock{right:6px;top:5px;font-size:11px}
.mg-bubs{position:absolute;inset:0;pointer-events:none;z-index:23}
.mg-bub2{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#111;font-weight:900;font-size:12px;padding:3px 8px;border-radius:8px;white-space:nowrap;animation:mgbub 1.3s ease-out forwards;box-shadow:0 2px 0 #0006}
.mg-bub2.red{background:#ff3b3b;color:#fff}.mg-bub2.miss{background:#222;color:#ffb0b0}.mg-bub2.angry{background:#ffe0e0;color:#c00}
@keyframes mgbub{0%{opacity:0;transform:translate(-50%,-80%) scale(.6)}15%{opacity:1;transform:translate(-50%,-100%) scale(1.12)}25%{transform:translate(-50%,-100%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-130%)}}
/* ── 공통 손맛 ── */
.mg-snd{font-size:15px!important;padding:2px 4px!important;line-height:1;flex:0 0 auto}
.mg-bar.warn i{background:#ff4d5e!important;animation:mgwarn .5s steps(2) infinite}
@keyframes mgwarn{50%{opacity:.35}}
.mg-fxl{position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden}
.mg-pt{position:absolute;width:6px;height:6px;border-radius:2px;transform:translate(-50%,-50%);animation:mgpt .6s ease-out forwards}
@keyframes mgpt{to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}
.mg-fl2{position:absolute;transform:translate(-50%,-50%);font-weight:900;font-size:19px;color:#ffe066;text-shadow:0 2px 0 #000a,0 0 6px #000;animation:mgfl .9s ease-out forwards;white-space:nowrap}
.mg-fl2.bad{color:#ff5a6a}
@keyframes mgfl{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}20%{opacity:1;transform:translate(-50%,-60%) scale(1.2)}100%{opacity:0;transform:translate(-50%,-190%) scale(1)}}
.mg-combo{position:absolute;right:10px;bottom:10px;z-index:31;font-weight:900;font-size:21px;color:#ffd166;text-shadow:0 2px 0 #000a,0 0 8px #000;opacity:0;pointer-events:none;font-style:italic}
.mg-combo.on{animation:mgcombo 1s ease-out forwards}
@keyframes mgcombo{0%{opacity:0;transform:scale(.5)}20%{opacity:1;transform:scale(1.35) rotate(-6deg)}40%{transform:scale(1) rotate(-6deg)}80%{opacity:1}100%{opacity:0;transform:rotate(-6deg)}}
.mg-redf{position:absolute;inset:0;z-index:29;pointer-events:none;box-shadow:inset 0 0 0 4px #ff3b4f,inset 0 0 50px #ff3b4f99;opacity:0}
.mg-redf.on{animation:mgred .38s ease-out}
@keyframes mgred{0%{opacity:1}100%{opacity:0}}
/* 카운트다운 */
.mg-cd{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.mg-cd small{color:var(--mgm);font-size:15px;font-weight:700}
.mg-cd b{font-size:104px;font-weight:900;color:var(--mgg);text-shadow:0 6px 0 #0006;line-height:1}
.mg-cd b.go{font-size:64px;color:var(--jc,var(--mgg))}
.mg-cd b.on{animation:mgcd .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes mgcd{0%{transform:scale(2.6);opacity:0}60%{transform:scale(.9);opacity:1}100%{transform:scale(1)}}
/* 방법 화면 */
.mg-logo{display:flex;align-items:center;gap:8px}
.mg-logo b{font-size:30px;font-weight:900;letter-spacing:-1px;background:linear-gradient(180deg,#fff 30%,var(--jc,#f5c04e));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #0009)}
.mg-logo small{font-size:11px;border:1px solid var(--jc,#f5c04e);color:var(--jc,#f5c04e);border-radius:99px;padding:1px 8px;font-weight:700}
.mg-logo .mg-snd,.mg-rhead .mg-snd{margin-left:auto;font-size:18px!important}
.mg-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.mg-steps div{background:var(--mgb2);border:1px solid var(--mgl);border-top:3px solid var(--jc,#f5c04e);border-radius:12px;padding:10px 4px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:12px;color:var(--mgf)}
.mg-steps div i{font-style:normal;font-size:28px;line-height:1;animation:mgbob 1.6s ease-in-out infinite;display:flex;align-items:flex-end;justify-content:center;min-height:30px}
.mg-steps div:nth-child(2) i{animation-delay:.2s}.mg-steps div:nth-child(3) i{animation-delay:.4s}
.mg-steps img{width:32px;height:62px;image-rendering:pixelated}
@keyframes mgbob{50%{transform:translateY(-4px)}}
/* 결과 */
.mg-rhead{display:flex;align-items:center;gap:8px;justify-content:center}
.mg-stampw{position:relative;display:flex;justify-content:center;padding:4px 0}
.mg-stamp{width:116px;height:116px;border-radius:50%;border:6px double currentColor;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:900;color:#ff5a6a;transform:rotate(-12deg);animation:mgstamp .45s cubic-bezier(.3,1.6,.5,1) .25s both;background:#ffffff08}
.mg-stamp.g0{color:var(--mgg);box-shadow:0 0 26px #f5c04e77;text-shadow:0 0 10px #f5c04e99;background:radial-gradient(circle,#f5c04e22,transparent 70%)}
.mg-stamp.g1{color:#5fe0a0}.mg-stamp.g2{color:#6aa8ff}.mg-stamp.g3{color:#9ea3c0}
@keyframes mgstamp{0%{transform:scale(3) rotate(-30deg);opacity:0}70%{transform:scale(.92) rotate(-12deg);opacity:1}100%{transform:scale(1) rotate(-12deg)}}
.mg-spk{position:absolute;font-style:normal;font-size:16px;opacity:0;animation:mgspk 1.4s ease-in-out infinite;pointer-events:none}
@keyframes mgspk{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1.15)}}
.mg-rev{font-size:15px;font-weight:700}
.mg-big b{font-size:34px;font-weight:900;color:var(--mgg)}.mg-big span{color:var(--mgm);margin-left:4px}
.mg-parts2{display:flex;flex-direction:column;gap:6px;text-align:left;font-size:12.5px}
.mg-parts2 div{display:grid;grid-template-columns:76px 1fr 30px;align-items:center;gap:8px}
.mg-parts2 i{height:8px;border-radius:99px;background:var(--mgb2);overflow:hidden}
.mg-parts2 em{display:block;height:100%;width:var(--w);background:linear-gradient(90deg,var(--mggr),var(--mgg));border-radius:99px;animation:mgbar .9s ease-out .5s both}
@keyframes mgbar{from{width:0}}
.mg-parts2 b{text-align:right;color:var(--mgf)}
/* 빨간펜 종이 */
.mg-paper{background:repeating-linear-gradient(180deg,transparent 0 24px,#9fb4d433 24px 25px),radial-gradient(circle at 20% 10%,#fffdf6,#f6efe0 70%,#ece0c6)!important;box-shadow:inset 0 0 34px #b8a07a44;padding-left:30px!important}
.mg-paper::before{content:"";position:absolute;left:22px;top:0;bottom:0;width:1px;background:#e8a0a088}
.mg-goodstamp{position:absolute;right:16px;bottom:16px;z-index:6;width:96px;height:96px;border-radius:50%;border:4px solid #d32f2f;color:#d32f2f;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900;font-size:17px;line-height:1.15;transform:rotate(-14deg);background:#fff6;box-shadow:inset 0 0 0 3px #fff6,inset 0 0 0 5px #d32f2f;animation:mgstamp .4s cubic-bezier(.3,1.6,.5,1) both;pointer-events:none}
/* 외국어 답장 */
.mg-bub.typing{display:flex;gap:5px;padding:13px 15px;width:max-content}
.mg-bub.typing i{width:7px;height:7px;border-radius:50%;background:#999;animation:mgdot 1s infinite}
.mg-bub.typing i:nth-child(2){animation-delay:.15s}.mg-bub.typing i:nth-child(3){animation-delay:.3s}
@keyframes mgdot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
.mg-bub.in{animation:mgin .3s ease-out}
@keyframes mgin{from{transform:translateY(12px) scale(.9);opacity:0}}
.mg-ans button.send{animation:mgsend .45s ease-in forwards}
@keyframes mgsend{35%{transform:translateX(-8px)}100%{transform:translate(50px,-70px) scale(.5);opacity:0}}
.mg-stars span{display:inline-block}
.mg-stars span.new{animation:mgstar .45s cubic-bezier(.3,1.8,.5,1) both}
@keyframes mgstar{from{transform:scale(0) rotate(-120deg);opacity:0}}
/* 사진 초점 */
.mg-cam .mg-frame{transition:border-color .08s,box-shadow .08s}
.mg-cam .mg-frame.focus{border-color:#4cff7a;box-shadow:0 0 0 999px #0006,0 0 16px #4cff7a}
@media (prefers-reduced-motion:reduce){.mg-shake{animation:none!important}.mg-redf.on{animation-duration:.05s}.mg-flash.on{animation:none!important}.mg-stamp,.mg-cd b.on,.mg-combo.on,.mg-goodstamp{animation-duration:.01s!important}.mg-steps div i,.mg-spk{animation:none}.mg-bar.warn i{animation:none}}
`;
const rnd = Math.random;
const rint = (n) => Math.floor(rnd() * n);
const pick = (a) => a[rint(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const gradeOf = (s) => (s >= 0.85 ? "대성공" : s >= 0.6 ? "성공" : s >= 0.35 ? "보통" : "아쉬움");
// 실력이 높을수록 시간 여유가 커진다(최대 1.5배)
const easeOf = (skill) => 1 + clamp(+skill || 0, 0, 200) / 200 * 0.5;

// ───────── 공통: 소리·진동·손맛 ─────────
// 효과음은 파일 없이 WebAudio로 합성. [시작]을 누를 때 오디오를 켠다. 소리 끄기는 기기에 기억(실패해도 그냥 켜짐).
import { gIN2, IN_CSS } from "./mg_in.js";
import { GAME as G_pr2 } from "./mg2/pr2.js";
import { GAME as G_cs2 } from "./mg2/cs2.js";
import { GAME as G_airbnb2 } from "./mg2/airbnb2.js";
import { GAME as G_ucafe2 } from "./mg2/ucafe2.js";
import { GAME as G_insta2 } from "./mg2/insta2.js";
// 미니게임 2탄: 투잡마다 두 번째 게임. MG·GAMES 에 key 로 붙고, base 는 원래 투잡
const MG2 = [G_pr2, G_cs2, G_airbnb2, G_ucafe2, G_insta2].filter(Boolean);
const SND_KEY = "a6_mg_sound";
let SND_ON = true; try { SND_ON = localStorage.getItem(SND_KEY) !== "0"; } catch (e) {}
let ACX = null;
function audioInit() { try { ACX = ACX || new (window.AudioContext || window.webkitAudioContext)(); if (ACX.state === "suspended") ACX.resume(); } catch (e) {} }
function tone(freq, dur = 0.08, type = "square", vol = 0.12, slide = 0, at = 0) {
  if (!SND_ON || !ACX) return;
  try { const t = ACX.currentTime + at, o = ACX.createOscillator(), g = ACX.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(ACX.destination); o.start(t); o.stop(t + dur + 0.02); } catch (e) {}
}
function noise(dur = 0.08, freq = 2000, vol = 0.15, at = 0, q = 1) {
  if (!SND_ON || !ACX) return;
  try { const t = ACX.currentTime + at, n = Math.max(1, Math.floor(ACX.sampleRate * dur)), b = ACX.createBuffer(1, n, ACX.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ACX.createBufferSource(), f = ACX.createBiquadFilter(), g = ACX.createGain(); s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; s.connect(f).connect(g).connect(ACX.destination); s.start(t); } catch (e) {}
}
const SFX = {
  tok: () => tone(880, 0.05, "square", 0.07),
  ding: (n = 0) => { const k = Math.pow(1.06, Math.min(n, 12)); tone(988 * k, 0.09, "triangle", 0.14); tone(1318 * k, 0.12, "triangle", 0.1, 0, 0.06); },
  fail: () => tone(170, 0.22, "sawtooth", 0.11, -70),
  tick: () => tone(1500, 0.025, "square", 0.05),
  count: () => tone(660, 0.12, "square", 0.1),
  go: () => { tone(880, 0.1, "square", 0.1); tone(1320, 0.18, "square", 0.1, 0, 0.08); },
  end: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, "triangle", 0.12, 0, i * 0.09)),
  stamp: () => { tone(95, 0.2, "sine", 0.35, -45); noise(0.08, 420, 0.25); },
  scratch: (dur = 0.3) => { const n = Math.max(2, Math.round(dur / 0.07)); for (let k = 0; k < n; k++) noise(0.05, 3000 + Math.random() * 2200, 0.07, k * 0.07, 2); },
  whoosh: () => noise(0.24, 1300, 0.13, 0, 0.7),
  sweep: () => noise(0.15, 2600, 0.09, 0, 0.8),
  snap: () => { tone(520, 0.05, "square", 0.08); tone(1040, 0.09, "triangle", 0.1, 0, 0.04); },
  pop: () => tone(620, 0.06, "sine", 0.12, 520),
};
const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const sndBtn = () => `<button class="mg-snd" data-mg-snd aria-label="소리 켜기·끄기">${SND_ON ? "🔊" : "🔇"}</button>`;
function bindSnd(root) {
  root.querySelectorAll("[data-mg-snd]").forEach((b) => b.onclick = (e) => {
    e.stopPropagation(); SND_ON = !SND_ON; try { localStorage.setItem(SND_KEY, SND_ON ? "1" : "0"); } catch (er) {}
    root.querySelectorAll("[data-mg-snd]").forEach((x) => (x.textContent = SND_ON ? "🔊" : "🔇")); if (SND_ON) { audioInit(); SFX.tok(); }
  });
}
// 공통 틀: 머리(제목·시간 막대·점수·소리) + 무대(+효과 층) + 바닥
function frame(host, job, title, stageCls = "", stageBg = "", foot = "") {
  host.innerHTML = `<div class="mg mg-${job}"><div class="mg-head"><b>${title}</b><div class="mg-bar"><i></i></div><span class="mg-sc"></span>${sndBtn()}</div>
    <div class="mg-stage ${stageCls}" ${stageBg ? `style="background-image:url(${stageBg})"` : ""}><div class="mg-msg"></div><div class="mg-fxl"></div><div class="mg-combo"></div><div class="mg-redf"></div></div>${foot ? `<div class="mg-foot">${foot}</div>` : ""}</div>`;
  const root = host.firstElementChild, stage = root.querySelector(".mg-stage"), bar = root.querySelector(".mg-bar i"), sc = root.querySelector(".mg-sc"), msgEl = root.querySelector(".mg-msg");
  const fxl = root.querySelector(".mg-fxl"), comboEl = root.querySelector(".mg-combo"), redf = root.querySelector(".mg-redf");
  bindSnd(root);
  let mt = 0, combo = 0;
  const msg = (t) => { msgEl.textContent = t; msgEl.classList.add("on"); clearTimeout(mt); mt = setTimeout(() => msgEl.classList.remove("on"), 1100); };
  // p: 요소 또는 무대 기준 [x, y] 픽셀
  const at = (p) => { if (Array.isArray(p)) return p; const r = p.getBoundingClientRect(), s = stage.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };
  const burst = (p, color = "#ffd166", n = 10) => {
    const [x, y] = at(p); if (RM()) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) { const e = document.createElement("i"); e.className = "mg-pt"; e.style.left = x + "px"; e.style.top = y + "px"; const a = rnd() * 6.283, d = 16 + rnd() * 30; e.style.setProperty("--dx", Math.cos(a) * d + "px"); e.style.setProperty("--dy", Math.sin(a) * d + "px"); e.style.background = color; fxl.appendChild(e); setTimeout(() => e.remove(), 650); }
  };
  const float = (p, t, cls = "") => { const [x, y] = at(p); const e = document.createElement("b"); e.className = "mg-fl2 " + cls; e.textContent = t; e.style.left = x + "px"; e.style.top = y - 8 + "px"; fxl.appendChild(e); setTimeout(() => e.remove(), 950); };
  // 맞힘: 파티클 + "+N" + 콤보(소리가 점점 높아짐) + 짧은 진동
  const hit = (p, n = 1, color) => {
    combo++; burst(p, color); float(p, "+" + n); SFX.ding(combo - 1); vib(12);
    if (combo >= 2) { comboEl.textContent = `콤보 x${combo}`; comboEl.classList.remove("on"); void comboEl.offsetWidth; comboEl.classList.add("on"); }
  };
  // 틀림: 흔들림 + 빨간 번쩍 + 낮은 소리 + 진동, 콤보 끊김
  const miss = (p) => {
    combo = 0; comboEl.classList.remove("on"); SFX.fail(); vib([30, 40, 30]);
    if (p) float(p, "✕", "bad");
    if (!RM()) { stage.classList.remove("mg-shake"); void stage.offsetWidth; stage.classList.add("mg-shake"); setTimeout(() => stage.classList.remove("mg-shake"), 320); }
    redf.classList.remove("on"); void redf.offsetWidth; redf.classList.add("on");
  };
  return { root, stage, bar, sc, msg, foot: root.querySelector(".mg-foot"), hit, miss, burst, float };
}
// 시간: 초 단위. onEnd 는 한 번만. 15초 넘는 판은 남은 10초부터 막대가 빨갛게 깜빡이고 째깍.
function timer(sec, bar, onEnd) {
  const t0 = performance.now(); let raf = 0, dead = false, lastS = -1;
  const box = bar && bar.parentElement; if (box) box.classList.remove("warn");
  const loop = () => {
    if (dead) return; const left = sec - (performance.now() - t0) / 1000;
    if (bar) { bar.style.transform = `scaleX(${clamp(left / sec, 0, 1)})`; if (sec >= 15 && left <= 10 && left > 0) { box.classList.add("warn"); const s = Math.ceil(left); if (s !== lastS) { lastS = s; SFX.tick(); } } }
    if (left <= 0) { dead = true; if (box) box.classList.remove("warn"); onEnd(); return; } raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { left: () => Math.max(0, sec - (performance.now() - t0) / 1000), stop: () => { dead = true; cancelAnimationFrame(raf); if (box) box.classList.remove("warn"); } };
}
// 3·2·1·시작!
function countdown(host, job, title, then) {
  host.innerHTML = `<div class="mg mg-${job}" style="--jc:${JC[job]}"><div class="mg-cd"><small>${title}</small><b></b></div></div>`;
  const b = host.querySelector(".mg-cd b"), seq = ["3", "2", "1", "시작!"]; let i = 0;
  const nx = () => { if (!b.isConnected) return; if (i >= seq.length) return then(); b.textContent = seq[i]; b.classList.toggle("go", i === 3); b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); if (i === 3) SFX.go(); else SFX.count(); i++; setTimeout(nx, i === 4 ? 480 : 640); };
  nx();
}
const JC = { pr: "#c77dff", cs: "#ff6b6b", airbnb: "#4fc3f7", ucafe: "#7CFC9A", insta: "#ff8fc8" };
// 방법 화면의 작은 그림 설명 3칸
function introSteps(job) {
  { const g2 = MG2.find((g) => g.key === job); if (g2) { try { return g2.steps ? g2.steps() : []; } catch (e) { return []; } } }
  if (job === "ucafe") {
    try {
      const im = (t, o) => uSprite({ spec: uSpec(t), cache: {} }, "i", o, false).toDataURL();
      return [[`<img src="${im("worker", { v: "b", arm: "up" })}" alt="">`, "결제하면 정상"], [`<img src="${im("student", { v: "s", f: 1, carry: 2 })}" alt="">`, "컵 탑은 도둑"], [`<img src="${im("plain", { v: "f", look: 1, carry: 1 })}" alt="">`, "두리번은 먹튀"]];
    } catch (e) { return [["🖥️", "결제"], ["☕", "커피"], ["🚪", "나감"]]; }
  }
  if (job === "pr") { try { return prSteps(); } catch (e) { return [["", "사진 기억"], ["", "끌어서 제자리"], ["", "톡톡 청소"]]; } }
  return { cs: [["📄", "자소서 읽기"], ["🖊️", "고칠 문장 톡"], ["💮", "참 잘했어요"]], airbnb: [["💬", "손님 메시지"], ["👆", "맞는 답장"], ["⭐", "빠를수록 별"]], insta: [["✈️", "여행 중"], ["🌪️", "어어?!"], ["📸", "결정적 순간"]] }[job];
}
const REVIEW = { 대성공: ["손이 기억하는 프로의 솜씨!", "이 정도면 사장님 소리 들어요", "완벽 그 자체예요"], 성공: ["꽤 잘했어요. 손님도 만족!", "안정적인 운영이에요", "한 끗만 더 가면 대성공!"], 보통: ["무난했어요. 다음엔 더 잘할 수 있어요", "평범한 하루였어요"], 아쉬움: ["오늘은 운이 없었어요", "연습하면 금방 늘어요", "내일은 다를 거예요"] };

// "한 번 더?" 문지기. 지금은 무료로 바로 통과. 나중에 광고 보기·유료 아이템으로 바꿀 때
// setRetryGate(async ({ job, score, grade }) => { …광고 보고 오면 true… }) 한 줄이면 된다(false 면 그대로 결과 화면).
let retryGate = async () => true;
export function setRetryGate(fn) { retryGate = typeof fn === "function" ? fn : async () => true; }
export function mgRun(job, host, opts = {}) {
  inject(); mg2Init();
  const def = MG[job];
  if (!def || !GAMES[job]) return Promise.resolve({ score: 0.5, grade: "보통", line: "미니게임이 없어 보통 결과로 했어요" });
  const ez = easeOf(opts.skill);
  return new Promise((resolve) => {
    // 망친 판(보통·아쉬움)은 한 번 더 할 수 있다. 두 판 중 더 잘한 판으로 친다
    let tries = 0, prev = null;
    const play = (o) => GAMES[job](host, ez, finish, opts.skill || 0, o);
    // parts: [[항목 이름, 0~1], …] 항목별 막대
    const finish = (score, line, extra = "", parts = null) => {
      score = clamp(Math.round(score * 100) / 100, 0, 1);
      const grade = gradeOf(score), gi = ["대성공", "성공", "보통", "아쉬움"].indexOf(grade);
      tries++;
      const canRe = tries === 1 && gi >= 2, keepPrev = prev && prev.score > score;
      if (prev) extra = (keepPrev ? `앞 판이 더 잘해서 <b>앞 판 ${Math.round(prev.score * 100)}점</b>으로 쳐요` : prev.score === score ? `두 판 점수가 같아요` : `이번 판이 더 잘했어요! <b>이번 점수</b>로 쳐요`) + (extra ? "<br>" + extra : "");
      SFX.end();
      host.innerHTML = `<div class="mg mg-${job}" style="--jc:${JC[job]}"><div class="mg-res"><div class="mg-rhead"><h3>${def.n} 끝</h3>${sndBtn()}</div>
        <div class="mg-stampw"><div class="mg-stamp g${gi}">${grade}</div></div>
        <div class="mg-rev">${pick(REVIEW[grade])}</div><div class="mg-ln">${line}</div>
        <div class="mg-big"><b data-cnt>0</b><span>/ 100</span></div>
        ${parts ? `<div class="mg-parts2">${parts.map(([n, v]) => { const p = Math.round(clamp(+v || 0, 0, 1) * 100); return `<div><span>${n}</span><i><em style="--w:${p}%"></em></i><b>${p}</b></div>`; }).join("")}</div>` : ""}
        ${extra ? `<div class="mg-x">${extra}</div>` : ""}</div><div class="mg-foot">${canRe ? `<button class="mg-btn mg-re" data-mg-re>한 번 더?<small>더 잘한 판으로 쳐요</small></button>` : ""}<button class="mg-btn gold" data-mg-ok>확인</button></div></div>`;
      bindSnd(host);
      setTimeout(() => { SFX.stamp(); vib(25); }, 380);
      if (gi === 0) { const w = host.querySelector(".mg-stampw"); for (let k = 0; k < 7; k++) { const s = document.createElement("i"); s.className = "mg-spk"; s.textContent = "✨"; s.style.left = 50 + (rnd() - 0.5) * 70 + "%"; s.style.top = rnd() * 90 + "%"; s.style.animationDelay = 0.5 + rnd() * 0.9 + "s"; w.appendChild(s); } }
      const cnt = host.querySelector("[data-cnt]"), t1 = performance.now(), tgt = Math.round(score * 100);
      const up = () => { const p = Math.min(1, (performance.now() - t1 - 450) / 800); if (p > 0) cnt.textContent = Math.round(tgt * (1 - Math.pow(1 - p, 3))); if (p < 1 && cnt.isConnected) requestAnimationFrame(up); };
      requestAnimationFrame(up);
      host.querySelector("[data-mg-ok]").onclick = () => resolve(keepPrev ? prev : { score, grade, line: line.replace(/<[^>]+>/g, "") });
      const re = host.querySelector("[data-mg-re]");
      if (re) re.onclick = async () => { if (re.disabled) return; re.disabled = true; let ok = false; try { ok = await retryGate({ job, score, grade }); } catch (e) {} if (!ok || !host.contains(re)) { re.disabled = false; return; } prev = { score, grade, line: line.replace(/<[^>]+>/g, "") }; audioInit(); countdown(host, job, def.n + " · 한 번 더", () => play({ ...opts, retry: true })); };
    };
    const steps = introSteps(job) || [];
    host.innerHTML = `<div class="mg mg-${job}" style="--jc:${JC[job]}"><div class="mg-intro"><div class="mg-logo"><b>${def.n}</b><small>미니게임</small>${sndBtn()}</div><div class="mg-d">${def.desc}</div>
      <div class="mg-steps">${steps.map(([ic, t]) => `<div><i>${ic}</i>${t}</div>`).join("")}</div>
      <ol>${def.how.map((h) => `<li>${h}</li>`).join("")}</ol>${ez > 1.05 ? `<div class="mg-ease">능력치 덕분에 시간 여유 +${Math.round((ez - 1) * 100)}%</div>` : ""}</div><div class="mg-foot"><button class="mg-btn gold" data-mg-start>시작</button></div></div>`;
    bindSnd(host);
    host.querySelector("[data-mg-start]").onclick = () => { audioInit(); countdown(host, job, def.n, () => play(opts)); };
  });
}

// ───────── 1. 파티룸 퇴실 청소 (도트 캔버스) ─────────
// 160x200 논리 픽셀을 정수배로 키워 그린다. 체크인 사진(폴라로이드) 3초 → 손님이 놀고 간 방.
// 가구·기기는 끌어서 제자리에(가까우면 딱 붙음), 쓰레기는 톡톡, 분실물은 분실물 모드로 모은다.
const PW = 160, PH = 200, P_FLOOR = 62;
const PR_BULB = ["#ff5f7a", "#ffd166", "#5fe0a0", "#5fb8ff", "#c77dff"];
// 받침 글자 따라 조사(을/를, 은/는)
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
// 도트 한 장: 둘레 1픽셀 자리를 두고 그린 뒤 어두운 테두리(uOutline)
function prMk(w, h, fn, outline = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (outline) uOutline(c); return c;
}
// 같은 모양을 한 색으로 덮은 사본(체크인 사진 잔상·딱 붙을 때 번쩍)
function prTint(c, col, a) { const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height); return o; }
// 가구·기기: 이름, 크기, 원래 자리(밑변 가운데), 깊이 보정, 벽에 거는 것, 그림
const PR_FURN = [
  { id: "screen", n: "스크린", w: 42, h: 28, home: [112, 42], zb: -100, wall: 1, d: (P) => { P(0, 0, 42, 3, "#3a3a46"); P(0, 0, 42, 1, "#5a5a68"); P(2, 3, 38, 21, "#eeeef6"); P(2, 3, 38, 1, "#c8c8da"); P(38, 3, 2, 21, "#d6d6e6"); P(1, 24, 40, 2, "#3a3a46"); P(20, 26, 2, 2, "#9a9aa8"); } },
  { id: "frame", n: "액자", w: 16, h: 13, home: [54, 46], zb: -100, wall: 1, d: (P) => { P(0, 0, 16, 13, "#d4a84a"); P(1, 1, 14, 11, "#9a6e2a"); P(2, 2, 12, 9, "#8fd0f4"); P(2, 7, 12, 4, "#4a9a5a"); P(5, 5, 4, 2, "#4a9a5a"); P(6, 4, 2, 1, "#5aae6a"); P(10, 3, 2, 2, "#ffd166"); P(0, 0, 16, 1, "#f0cc70"); } },
  { id: "console", n: "게임기", w: 16, h: 9, home: [112, 53], zb: 0, d: (P) => { P(0, 1, 16, 7, "#ececf2"); P(1, 0, 14, 1, "#ffffff"); P(0, 7, 16, 1, "#a8a8b8"); P(15, 1, 1, 6, "#c8c8d4"); P(2, 3, 8, 1, "#3a3a46"); P(12, 3, 1, 1, "#33ccff"); P(12, 5, 1, 1, "#ff5566"); P(1, 8, 2, 1, "#555"); P(13, 8, 2, 1, "#555"); } },
  { id: "speaker", n: "스피커", w: 12, h: 24, home: [146, 84], zb: 0, d: (P) => { P(0, 0, 12, 22, "#2a2a33"); P(0, 0, 12, 1, "#4a4a58"); P(11, 1, 1, 21, "#1c1c24"); P(4, 3, 4, 4, "#5a5a6e"); P(5, 4, 2, 2, "#15151c"); P(3, 10, 6, 8, "#5a5a6e"); P(2, 11, 8, 6, "#5a5a6e"); P(3, 11, 6, 6, "#1c1c24"); P(4, 12, 4, 4, "#2c2c38"); P(5, 13, 2, 2, "#7a7a90"); P(9, 1, 1, 1, "#44ff88"); P(1, 22, 2, 2, "#111"); P(9, 22, 2, 2, "#111"); } },
  { id: "mic", n: "노래방 마이크", w: 9, h: 26, home: [131, 102], zb: 0, d: (P) => { P(3, 0, 3, 1, "#9a9aa8"); P(2, 1, 5, 3, "#c4c4d0"); P(3, 1, 1, 1, "#ffffff"); P(2, 2, 5, 1, "#8a8a98"); P(3, 4, 3, 4, "#e0447a"); P(3, 4, 1, 4, "#ff7aa8"); P(3, 8, 3, 1, "#555"); P(4, 9, 1, 14, "#9a9aa8"); P(1, 23, 7, 1, "#555"); P(0, 24, 9, 2, "#333"); } },
  { id: "lamp", n: "스탠드 조명", w: 12, h: 32, home: [13, 94], zb: 0, d: (P) => { for (let r = 0; r < 9; r++) { const a = Math.floor(r / 3); P(3 - a, r, 6 + 2 * a, 1, r === 0 ? "#fff4d0" : "#f7d77a"); P(8 + a, r, 1, 1, "#d9a840"); } P(1, 9, 10, 1, "#d9a840"); P(5, 10, 2, 20, "#c9a050"); P(5, 10, 1, 20, "#e8c878"); P(3, 29, 6, 1, "#4a4a56"); P(2, 30, 8, 2, "#3a3a44"); } },
  { id: "sofa", n: "소파", w: 38, h: 20, home: [46, 110], zb: 0, d: (P) => { P(3, 0, 32, 10, "#c2416b"); P(4, 0, 30, 1, "#e0628a"); P(13, 1, 1, 8, "#8e2a4e"); P(24, 1, 1, 8, "#8e2a4e"); P(0, 5, 5, 11, "#c2416b"); P(0, 5, 5, 1, "#e0628a"); P(4, 6, 1, 10, "#8e2a4e"); P(33, 5, 5, 11, "#c2416b"); P(33, 5, 5, 1, "#e0628a"); P(33, 6, 1, 10, "#8e2a4e"); P(5, 10, 28, 5, "#d65580"); P(5, 10, 28, 1, "#e8789c"); P(18, 10, 1, 5, "#8e2a4e"); P(1, 15, 36, 3, "#8e2a4e"); P(1, 15, 36, 1, "#a8345c"); P(3, 18, 2, 2, "#3a2418"); P(33, 18, 2, 2, "#3a2418"); P(7, 4, 7, 6, "#f2c14e"); P(7, 4, 7, 1, "#ffe08a"); P(13, 5, 1, 5, "#c99a2a"); P(25, 5, 6, 5, "#5bc0d8"); P(25, 5, 6, 1, "#9ae0f0"); } },
  { id: "table", n: "탁자", w: 28, h: 12, home: [68, 142], zb: 0, d: (P) => { P(0, 0, 28, 6, "#b07a4a"); P(1, 1, 26, 1, "#c99060"); P(5, 3, 9, 1, "#a06c3e"); P(17, 4, 7, 1, "#a06c3e"); P(0, 6, 28, 2, "#7a4e2a"); P(2, 8, 2, 4, "#5a3820"); P(24, 8, 2, 4, "#5a3820"); P(4, 10, 20, 1, "#5a3820"); } },
  { id: "projector", n: "빔프로젝터", w: 14, h: 9, home: [68, 136], zb: 8, d: (P) => { P(0, 1, 14, 7, "#e8e8ee"); P(1, 0, 12, 1, "#ffffff"); P(0, 7, 14, 1, "#b8b8c4"); P(9, 2, 4, 4, "#2a2a36"); P(10, 3, 2, 2, "#6ad0ff"); P(2, 3, 1, 3, "#b8b8c4"); P(4, 3, 1, 3, "#b8b8c4"); P(6, 3, 1, 3, "#b8b8c4"); P(2, 1, 1, 1, "#44ff66"); P(1, 8, 2, 1, "#333"); P(11, 8, 2, 1, "#333"); } },
  { id: "chair", n: "의자", w: 12, h: 20, home: [110, 150], zb: 0, d: (P) => { P(1, 0, 10, 8, "#3fb0c9"); P(1, 0, 10, 1, "#7fd8ea"); P(2, 2, 8, 1, "#2f8ea6"); P(2, 5, 8, 1, "#2f8ea6"); P(0, 8, 12, 3, "#2f8ea6"); P(0, 8, 12, 1, "#5cc6dc"); P(1, 11, 1, 9, "#555"); P(10, 11, 1, 9, "#555"); P(3, 11, 1, 8, "#3a3a3a"); P(8, 11, 1, 8, "#3a3a3a"); } },
  { id: "guitar", n: "기타", w: 10, h: 26, home: [150, 142], zb: 0, d: (P) => { P(3, 0, 4, 3, "#3a2418"); P(2, 1, 1, 1, "#dddddd"); P(7, 1, 1, 1, "#dddddd"); P(4, 3, 2, 10, "#6b4226"); P(4, 5, 2, 1, "#c9a050"); P(4, 8, 2, 1, "#c9a050"); P(5, 3, 1, 10, "#a07850"); P(2, 12, 6, 5, "#e07a2a"); P(1, 16, 8, 9, "#e07a2a"); P(2, 25, 6, 1, "#c8661e"); P(1, 16, 1, 8, "#f0a050"); P(8, 13, 1, 11, "#b85a1a"); P(4, 17, 2, 2, "#2a1a10"); P(3, 21, 4, 1, "#3a2418"); } },
  { id: "plant", n: "화분", w: 14, h: 20, home: [148, 194], zb: 0, d: (P) => { P(4, 0, 4, 7, "#4fbe6a"); P(5, 1, 1, 4, "#8fe09a"); P(0, 4, 6, 5, "#3e9e5a"); P(1, 5, 2, 1, "#6fd07e"); P(8, 2, 6, 6, "#3e9e5a"); P(10, 3, 2, 1, "#6fd07e"); P(3, 8, 8, 4, "#2f7a3e"); P(6, 9, 1, 3, "#2a6a34"); P(2, 12, 10, 2, "#d8784a"); P(3, 14, 8, 6, "#c0603a"); P(9, 14, 2, 6, "#9a4a2a"); P(3, 14, 1, 6, "#d8784a"); } },
];
// 쓰레기·분실물: [폭, 높이, 그림, 테두리 없음]
const PR_TRASH = {
  cup: [6, 7, (P) => { P(0, 0, 6, 1, "#f4f4f4"); P(0, 1, 6, 3, "#d8383a"); P(1, 4, 4, 3, "#d8383a"); P(1, 1, 1, 4, "#f07070"); P(4, 2, 1, 4, "#a82428"); }],
  pizza: [11, 6, (P) => { P(0, 1, 11, 4, "#d9b27a"); P(0, 1, 11, 1, "#ecd09a"); P(0, 5, 11, 1, "#a8824a"); P(5, 0, 5, 3, "#f2c14e"); P(5, 0, 5, 1, "#e8a040"); P(6, 1, 1, 1, "#cc3333"); P(8, 2, 1, 1, "#cc3333"); }],
  can: [7, 4, (P) => { P(0, 0, 7, 4, "#3a8fd0"); P(0, 0, 1, 4, "#c8c8d0"); P(6, 0, 1, 4, "#c8c8d0"); P(1, 1, 5, 1, "#7fc8f0"); P(2, 2, 3, 1, "#e8e8f0"); }],
  balloon: [6, 10, (P) => { P(1, 0, 4, 1, "#ff6fa8"); P(0, 1, 6, 4, "#ff6fa8"); P(1, 5, 4, 1, "#ff6fa8"); P(1, 1, 1, 2, "#ffc0dc"); P(4, 3, 1, 2, "#d84a88"); P(2, 6, 2, 1, "#d84a88"); P(3, 7, 1, 3, "#e8e8f0"); }],
  chips: [7, 8, (P) => { P(0, 0, 7, 1, "#d0d0d8"); P(0, 1, 7, 6, "#f2a62a"); P(0, 7, 7, 1, "#d0d0d8"); P(2, 3, 3, 2, "#d8383a"); P(1, 2, 1, 4, "#ffd27a"); P(5, 1, 1, 6, "#c8801a"); }],
  napkin: [6, 5, (P) => { P(1, 0, 4, 1, "#ffffff"); P(0, 1, 6, 3, "#ececf2"); P(1, 4, 4, 1, "#d4d4dc"); P(2, 2, 1, 1, "#c4c4cc"); P(4, 1, 1, 1, "#c4c4cc"); }],
  bottle: [10, 4, (P) => { P(0, 0, 7, 4, "#2f7a40"); P(0, 0, 7, 1, "#5ab06a"); P(7, 1, 3, 2, "#2f7a40"); P(2, 1, 3, 3, "#f2e8c0"); P(9, 1, 1, 2, "#c9a050"); }],
  confetti: [9, 4, (P) => { [[0, 2], [2, 0], [3, 3], [5, 1], [6, 3], [8, 0], [1, 1], [7, 2], [4, 0], [8, 3]].forEach(([x, y], i) => P(x, y, 1, 1, PR_BULB[i % 5])); }, true],
  cake: [8, 5, (P) => { P(0, 3, 8, 2, "#f4f4f8"); P(0, 4, 8, 1, "#c8c8d4"); P(2, 0, 4, 3, "#f7b8cc"); P(2, 0, 4, 1, "#ffffff"); P(3, 0, 1, 1, "#e0303a"); P(5, 1, 1, 2, "#e898b0"); }],
  takeout: [7, 8, (P) => { P(4, 0, 1, 3, "#c9a050"); P(5, 0, 1, 2, "#c9a050"); P(0, 2, 7, 1, "#e4e4ea"); P(1, 3, 5, 5, "#f4f4f8"); P(5, 3, 1, 5, "#d4d4dc"); P(3, 5, 1, 1, "#d8383a"); }],
  hat: [6, 8, (P) => { P(2, 0, 2, 1, "#ffd166"); P(2, 1, 2, 2, "#5fb8ff"); P(1, 3, 4, 2, "#c77dff"); P(1, 5, 4, 1, "#5fb8ff"); P(0, 6, 6, 2, "#c77dff"); P(0, 7, 6, 1, "#9a5ad0"); }],
  wallet: [8, 6, (P) => { P(0, 0, 8, 6, "#7a4a2a"); P(0, 0, 8, 2, "#94603a"); P(1, 0, 6, 1, "#aa7448"); P(6, 2, 1, 1, "#e0c060"); P(0, 5, 8, 1, "#5a3420"); }],
  phone: [5, 8, (P) => { P(0, 0, 5, 8, "#22222c"); P(1, 1, 3, 5, "#3a7fe0"); P(1, 1, 1, 2, "#9cd0ff"); P(2, 7, 1, 1, "#666"); }],
  keys: [8, 6, (P) => { P(0, 0, 3, 1, "#c8c8d0"); P(0, 1, 1, 2, "#c8c8d0"); P(2, 1, 1, 2, "#c8c8d0"); P(0, 3, 3, 1, "#c8c8d0"); P(3, 2, 5, 1, "#e0c060"); P(5, 3, 1, 1, "#e0c060"); P(7, 3, 1, 1, "#e0c060"); P(0, 4, 2, 2, "#ff7ab0"); }],
  shades: [9, 4, (P) => { P(0, 0, 9, 1, "#2a2a30"); P(0, 1, 4, 3, "#2a2a30"); P(5, 1, 4, 3, "#2a2a30"); P(1, 1, 1, 1, "#8a8ab0"); P(6, 1, 1, 1, "#8a8ab0"); }],
  ring: [5, 5, (P) => { P(2, 0, 1, 1, "#9ce8ff"); P(1, 1, 3, 1, "#ffd166"); P(0, 2, 1, 2, "#ffd166"); P(4, 2, 1, 2, "#ffd166"); P(1, 4, 3, 1, "#e0a830"); }],
  buds: [6, 5, (P) => { P(1, 0, 4, 1, "#f4f4f8"); P(0, 1, 6, 3, "#f4f4f8"); P(1, 4, 4, 1, "#d4d4dc"); P(0, 2, 6, 1, "#c4c4cc"); P(3, 3, 1, 1, "#4fe07a"); }],
};
const PR_TR = ["cup", "pizza", "can", "balloon", "chips", "napkin", "bottle", "confetti", "cake", "takeout", "hat", "cup", "can"];
const PR_LOST = [["wallet", "지갑"], ["phone", "휴대폰"], ["keys", "열쇠"], ["shades", "선글라스"], ["ring", "반지"], ["buds", "이어폰"]];
// 네온 하트(11x9)
const PR_HEART = ["..XX...XX..", ".X..X.X..X.", "X....X....X", "X.........X", ".X.......X.", "..X.....X..", "...X...X...", "....X.X....", ".....X....."];
function prBg() {
  const c = document.createElement("canvas"); c.width = PW; c.height = PH; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 벽: 짙은 보라, 세로 줄무늬, 작은 점
  P(0, 0, PW, P_FLOOR, "#3a2552");
  for (let x = 0; x < PW; x += 8) P(x, 6, 3, 40, "#41295c");
  for (let y = 10; y < 44; y += 8) for (let x = ((y / 8) % 2) * 4 + 2; x < PW; x += 8) P(x, y, 1, 1, "#5a3c7a");
  P(0, 0, PW, 4, "#1c1228");
  // 아래 벽판
  P(0, 46, PW, 16, "#2d1c42"); P(0, 46, PW, 2, "#5a3c7a");
  for (let x = 4; x < PW; x += 20) { P(x, 50, 16, 9, "#33204a"); P(x, 50, 16, 1, "#26183a"); }
  P(0, 60, PW, 2, "#1a1026");
  // 마루
  P(0, P_FLOOR, PW, PH - P_FLOOR, "#8a5a3c");
  for (let r = 0, y = P_FLOOR; y < PH; y += 7, r++) {
    P(0, y, PW, 1, "#6e4630");
    for (let x = (r * 11) % 24; x < PW; x += 24) P(x, y + 1, 1, 6, "#74492f");
    for (let x = (r * 17) % 13; x < PW; x += 13) P(x + 3, y + 3, 4, 1, (x + r) % 2 ? "#9a6a48" : "#7e5236");
  }
  const gr = g.createLinearGradient(0, P_FLOOR, 0, P_FLOOR + 40); gr.addColorStop(0, "rgba(20,8,30,.45)"); gr.addColorStop(1, "rgba(20,8,30,0)"); g.fillStyle = gr; g.fillRect(0, P_FLOOR, PW, 40);
  // 러그
  P(32, 118, 74, 52, "#24506a"); P(34, 120, 70, 48, "#c94f6a"); P(36, 122, 66, 44, "#2f6f8f");
  for (let k = 0; k < 3; k++) { const cx = 52 + k * 17, cy = 144; for (let d = 0; d < 7; d++) { P(cx - d, cy - 6 + d, 1, 1, "#f2c14e"); P(cx + d, cy - 6 + d, 1, 1, "#f2c14e"); P(cx - d, cy + 6 - d, 1, 1, "#f2c14e"); P(cx + d, cy + 6 - d, 1, 1, "#f2c14e"); } P(cx, cy, 1, 1, "#ff8ac8"); }
  for (let y = 120; y < 168; y += 2) { P(30, y, 2, 1, "#e8dcc0"); P(106, y, 2, 1, "#e8dcc0"); }
  // 창문: 밤 도시
  P(1, 6, 40, 1, "#c9a050");
  P(6, 8, 30, 38, "#cbb8e6"); P(8, 10, 26, 34, "#141a3a"); P(8, 27, 26, 17, "#1d2752");
  P(26, 13, 4, 4, "#f4f0c8"); P(28, 13, 2, 2, "#141a3a"); P(12, 13, 1, 1, "#ffffff"); P(17, 17, 1, 1, "#cfd8ff"); P(31, 21, 1, 1, "#cfd8ff");
  P(8, 32, 6, 12, "#0b0e20"); P(14, 27, 6, 17, "#0e1228"); P(21, 34, 6, 10, "#0b0e20"); P(27, 29, 7, 15, "#0e1228");
  P(20, 10, 2, 34, "#cbb8e6"); P(8, 26, 26, 1, "#cbb8e6");
  P(3, 7, 4, 39, "#8a3a6a"); P(4, 7, 1, 39, "#a84a80"); P(35, 7, 4, 39, "#8a3a6a"); P(37, 7, 1, 39, "#a84a80");
  P(4, 46, 34, 2, "#e0d0f4"); P(4, 48, 34, 1, "#8a7aa8");
  // 줄전구 전선
  for (let x = 42; x < PW; x++) P(x, 5 + Math.round(3 * Math.sin(((x - 42) / 118) * Math.PI)), 1, 1, "#140c20");
  // TV 장(고정)
  P(92, 52, 40, 2, "#6a4430"); P(92, 54, 40, 14, "#4a2e1e"); P(93, 55, 1, 12, "#5a3826"); P(112, 55, 1, 12, "#3a2216"); P(109, 60, 1, 2, "#c9a050"); P(115, 60, 1, 2, "#c9a050"); P(94, 68, 2, 2, "#2a1a10"); P(128, 68, 2, 2, "#2a1a10");
  // 스크린 걸이·액자 못·콘센트
  P(92, 13, 2, 2, "#777"); P(130, 13, 2, 2, "#777"); P(53, 32, 2, 1, "#aaa"); P(140, 52, 4, 5, "#d8d0e0"); P(141, 54, 1, 1, "#555"); P(142, 54, 1, 1, "#555");
  return c;
}
let PR_S = null;
function prSprites() {
  if (PR_S) return PR_S;
  const S = { f: {}, gh: {}, wh: {}, t: {}, ic: {} };
  for (const d of PR_FURN) { const c = prMk(d.w, d.h, d.d); S.f[d.id] = c; S.gh[d.id] = prTint(c, "#bfe9ff", 0.55); S.wh[d.id] = prTint(c, "#ffffff", 1); }
  for (const [k, [w, h, fn, nol]] of Object.entries(PR_TRASH)) S.t[k] = prMk(w, h, fn, !nol);
  S.broom = prMk(10, 12, (P) => { [8, 8, 7, 7, 6, 5, 5].forEach((x, i) => P(x, i, 1, 1, "#8a5a2b")); P(3, 7, 4, 1, "#cc3333"); P(1, 8, 7, 4, "#e8c060"); P(1, 8, 7, 1, "#f8e090"); P(2, 9, 1, 3, "#c9a040"); P(4, 9, 1, 3, "#c9a040"); P(6, 9, 1, 3, "#c9a040"); });
  S.box = prMk(12, 10, (P) => { P(0, 2, 12, 8, "#c99a5a"); P(0, 2, 12, 1, "#e0b878"); P(0, 0, 5, 2, "#d8a868"); P(7, 0, 5, 2, "#d8a868"); P(5, 2, 2, 8, "#e8d8a8"); P(0, 9, 12, 1, "#9a7040"); });
  S.cam = prMk(12, 9, (P) => { P(3, 0, 5, 2, "#3a3a46"); P(0, 2, 12, 7, "#3a3a46"); P(0, 2, 12, 1, "#5a5a68"); P(4, 3, 4, 4, "#15151c"); P(5, 4, 2, 2, "#6ad0ff"); P(9, 3, 2, 1, "#ffffff"); });
  S.ic = { broom: S.broom.toDataURL(), box: S.box.toDataURL(), cam: S.cam.toDataURL() };
  S.bg = prBg();
  S.heart = []; PR_HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "X") S.heart.push([47 + x, 11 + y]); }));
  S.winL = [[10, 35], [12, 38], [16, 30], [17, 34], [16, 38], [23, 37], [25, 40], [29, 32], [31, 35], [29, 38], [32, 41], [10, 41]].map(([x, y], i) => [x, y, i * 1.9]);
  S.bulbs = []; for (let x = 46; x < PW; x += 8) S.bulbs.push([x, 6 + Math.round(3 * Math.sin(((x - 42) / 118) * Math.PI))]);
  return (PR_S = S);
}
// 방법 화면 그림 3칸
function prSteps() {
  const S = prSprites();
  const mk = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return `<img src="${c.toDataURL()}" alt="" style="width:${w * 2}px;height:${h * 2}px">`; };
  const a = mk(30, 32, (g, P) => { P(0, 0, 30, 32, "#12121a"); P(1, 1, 28, 30, "#fbfaf5"); P(3, 3, 24, 20, "#3a2552"); P(3, 15, 24, 8, "#8a5a3c"); P(3, 19, 24, 1, "#6e4630"); PR_HEART.forEach((row, y) => { if (y % 2) return; [...row].forEach((ch, x) => { if (ch === "X" && x % 2 === 0) P(5 + x / 2, 5 + y / 2, 1, 1, "#ff8ac8"); }); }); g.drawImage(S.f.console, 9, 7); P(9, 26, 12, 1, "#bbbbbb"); });
  const b = mk(36, 28, (g, P) => { g.drawImage(S.f.speaker, 0, 2); g.globalAlpha = 0.75; g.drawImage(S.gh.speaker, 22, 2); g.globalAlpha = 1; P(15, 13, 6, 1, "#ffffff"); P(19, 11, 1, 5, "#ffffff"); P(20, 12, 1, 3, "#ffffff"); P(18, 12, 1, 3, "#ffffff"); });
  const c = mk(30, 16, (g, P) => { g.drawImage(S.t.cup, 0, 7); g.drawImage(S.t.chips, 7, 6); g.drawImage(S.broom, 17, 2); P(5, 4, 1, 1, "#e8dcc8"); P(14, 3, 1, 1, "#e8dcc8"); P(3, 2, 1, 1, "#cbbfa8"); });
  return [[a, "사진 기억"], [b, "끌어서 제자리"], [c, "톡톡 청소"]];
}
function gPR(host, ez, finish) {
  const T = 30 * ez, PEEK = 3, SNAP = 16;
  const S = prSprites();
  const F = frame(host, "pr", "퇴실 청소", "mg-prst", "", `<button class="mg-btn on" data-mode="clean"><img src="${S.ic.broom}" alt="">치우기</button><button class="mg-btn" data-mode="keep"><img src="${S.ic.box}" alt="">분실물</button><button class="mg-btn" data-photo><img src="${S.ic.cam}" alt="">사진 <span>3</span></button>`);
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-prw"><canvas width="${PW}" height="${PH}"></canvas><div class="mg-prpola"><img alt="체크인 때 방 사진"><b>체크인 때 사진 · 자리를 기억해요 <i>${PEEK}</i></b></div><div class="mg-prcap">체크인 때 사진</div></div>`);
  const wrap = F.stage.querySelector(".mg-prw"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), pola = wrap.querySelector(".mg-prpola"), cap = wrap.querySelector(".mg-prcap");
  g.imageSmoothingEnabled = false;
  // 정수배 확대
  const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight; if (!sw || !sh) return; const r = Math.min(sw / PW, sh / PH), K = r >= 2 ? Math.floor(r) : Math.max(1, r); wrap.style.width = PW * K + "px"; wrap.style.height = PH * K + "px"; };
  fit(); requestAnimationFrame(fit);
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const rect = (x, y, w, h) => [x - w / 2, y - h, x + w / 2, y];
  const ov = (a, b, m = 2) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;
  let mode = "clean", cleared = 0, total = 0, saved = 0, tossed = 0, nLost = 0, over = false, spawned = false, photos = 3, tm = null, started = false;
  let tt = 0, peek = true, shine = -1, drag = null, showing = false, done = false, raf = 0, lastFix = 0;
  // 가구: 몇 개가 엉뚱한 곳으로
  const items = PR_FURN.map((d) => ({ ...d, x: d.home[0], y: d.home[1], disp: false, ok: false, to: null, mv: null, wob: -9, flash: -9, drop: -9 }));
  const byId = (id) => items.find((f) => f.id === id);
  const disp = shuffle(items).slice(0, 4 + rint(3)); disp.forEach((f) => (f.disp = true));
  const occ = [[92, 52, 132, 70], ...items.filter((f) => !f.disp && !f.wall).map((f) => rect(f.x, f.y, f.w, f.h))];
  for (const f of disp) {
    const y0 = Math.max(80, P_FLOOR + f.h + 6);
    for (let k = 0; k < 160 && !f.to; k++) {
      const x = f.w / 2 + 3 + rnd() * (PW - f.w - 6), y = y0 + rnd() * (196 - y0), r = rect(x, y, f.w, f.h);
      if (Math.hypot(x - f.home[0], y - f.home[1]) < 38) continue;
      if (k < 130 && occ.some((o) => ov(o, r))) continue;
      f.to = [Math.round(x), Math.round(y)]; occ.push(r);
    }
    if (!f.to) { f.to = [Math.round(clamp(PW - f.home[0], f.w / 2 + 2, PW - f.w / 2 - 2)), 190]; occ.push(rect(f.to[0], f.to[1], f.w, f.h)); }
  }
  // 쓰레기·분실물
  const tr = [];
  const addT = (kind, lost, near) => {
    const s = PR_S.t[kind], w = s.width - 2, h = s.height - 2, sofa = byId("sofa");
    let x = 80, y = 180;
    for (let k = 0; k < 90; k++) {
      let sur = false;
      if (near) { x = near[0] + (rnd() - 0.5) * 34; y = near[1] + 3 + rnd() * 10; }
      else if (!sofa.disp && rnd() < 0.18) { x = 31 + rnd() * 30; y = 103; sur = true; }
      else { x = 6 + rnd() * 148; y = 72 + rnd() * 124; }
      x = clamp(x, w / 2 + 2, PW - w / 2 - 2); y = clamp(y, h + 66, 197);
      const r = rect(x, y, w, h);
      if (k < 70 && (!tr.every((t) => t.gone || Math.hypot(t.x - x, (t.y - y) * 1.2) > 11) || (!sur && !near && occ.some((o) => ov(o, r, 1))))) continue;
      break;
    }
    if (lost) nLost++; else total++;
    const t = { kind, s, w, h, x: Math.round(x), y: Math.round(y), lost: lost || null, gone: false, save: false, die: -9, app: started ? tt : 1e9, wob: -9, ph: rnd() * 1.4 };
    tr.push(t); return t;
  };
  const n0 = 8 + rint(4); for (let i = 0; i < n0; i++) addT(pick(PR_TR));
  const nl = rnd() < 0.8 ? 1 + rint(2) : 0; shuffle(PR_LOST).slice(0, nl).forEach(([k, nm]) => addT(k, nm));
  const total0 = disp.length + tr.length;
  const left = () => tr.filter((t) => !t.gone).length;
  // 효과: 먼지, 반짝 별, 빗자루
  const pts = [], fxs = [], brooms = [];
  const dust = (x, y, n, w = 6) => { for (let i = 0; i < n; i++) { const l = 0.45 + rnd() * 0.4; pts.push({ x: x + (rnd() - 0.5) * w, y: y - rnd() * 3, vx: (rnd() - 0.5) * 26, vy: -6 - rnd() * 16, l, m: l, c: pick(["#e8dcc8", "#cbbfa8", "#a89a86", "#f4ecdc"]), s: rnd() < 0.3 ? 2 : 1 }); } };
  const stars = (x, y, n, sp = 12) => { for (let i = 0; i < n; i++) fxs.push({ x: x + (rnd() - 0.5) * sp * 2, y: y + (rnd() - 0.5) * sp, t0: tt + rnd() * 0.15, l: 0.45 + rnd() * 0.3 }); };
  const star = (x, y, p) => { const k = Math.max(1, Math.round((p < 0.5 ? p : 1 - p) * 6)); x = Math.round(x); y = Math.round(y); g.globalAlpha = 1 - p * 0.4; P(x - k, y, 2 * k + 1, 1, "#fff3a0"); P(x, y - k, 1, 2 * k + 1, "#fff3a0"); if (k > 1) P(x - 1, y - 1, 3, 3, "#fffbe0"); P(x, y, 1, 1, "#ffffff"); g.globalAlpha = 1; };
  // 좌표
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * PW, ((e.clientY - r.top) / r.height) * PH]; };
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / PW) * r.width, r.top - s.top + (y / PH) * r.height]; };
  const home0 = (f) => !f.mv && Math.abs(f.x - f.home[0]) < 0.5 && Math.abs(f.y - f.home[1]) < 0.5;
  const depth = (f) => (drag && drag.f === f ? 1e4 : f.y + (home0(f) ? f.zb : 0));
  const upd = () => {
    const placed = disp.filter((f) => f.ok).length;
    F.sc.textContent = `가구 ${placed}/${disp.length} · 청소 ${cleared}/${total}`;
    if (started && !over && !left() && placed >= disp.length) end();
  };
  // 다 치웠는데 분실물만 남으면 알려 준다
  const hintT = setInterval(() => { if (over || !cv.isConnected) return clearInterval(hintT); if (started && cleared >= total && left() && disp.every((f) => f.ok)) F.msg("반짝이는 건 분실물! 분실물로 바꿔 모아요"); }, 1600);
  // 톡: 쓰레기·분실물
  const tapT = (t) => {
    const sp = stageXY(t.x, t.y - t.h / 2);
    if (t.lost) {
      if (mode === "keep") { saved++; t.save = true; F.msg(`${t.lost} 보관함에 담았어요`); F.hit(sp, 2, "#7fd1ff"); stars(t.x, t.y - t.h / 2, 4, 6); }
      else { tossed++; F.msg(`앗, 손님 ${jo(t.lost, "을", "를")} 버렸어요! 감점`); F.miss(sp); dust(t.x, t.y, 6, t.w); }
    } else {
      if (mode === "keep") { F.msg("그건 쓰레기예요. 치우기로 바꿔요"); SFX.tok(); t.wob = tt; return; }
      cleared++; brooms.push({ x: t.x, y: t.y, t0: tt }); dust(t.x, t.y, 10, t.w); SFX.sweep(); F.hit(sp, 1, "#e8d5b0");
    }
    t.gone = true; t.die = tt; upd();
  };
  // 누르기: 쓰레기 먼저, 아니면 엉뚱한 곳의 가구를 집는다
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); if (!started || over || drag) return;
    const [lx, ly] = toL(e);
    let best = null, bd = 1e9;
    for (const t of tr) { if (t.gone || tt < t.app) continue; const dx = Math.abs(lx - t.x), dy = Math.abs(ly - (t.y - t.h / 2)); if (dx <= t.w / 2 + 5 && dy <= t.h / 2 + 5) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = t; } } }
    const hits = items.filter((f) => lx >= f.x - f.w / 2 - 4 && lx <= f.x + f.w / 2 + 4 && ly >= f.y - f.h - 4 && ly <= f.y + 4).sort((a, b) => depth(b) - depth(a));
    const mov = hits.find((f) => f.disp && !f.ok && !f.mv);
    if (best && (bd <= 5 || !mov)) return tapT(best);
    if (mov) { drag = { f: mov, ox: mov.x - lx, oy: mov.y - ly, id: e.pointerId, t0: tt }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} SFX.tok(); vib(8); return; }
    const fx = hits[0];
    if (fx) { fx.wob = tt; SFX.tok(); if (performance.now() - lastFix > 1500) { lastFix = performance.now(); F.msg(fx.ok ? `${jo(fx.n, "은", "는")} 이미 제자리예요` : `${jo(fx.n, "은", "는")} 원래 그 자리예요`); } }
  });
  cv.addEventListener("pointermove", (e) => { if (!drag || e.pointerId !== drag.id) return; const [lx, ly] = toL(e), f = drag.f; f.x = clamp(lx + drag.ox, f.w / 2 + 1, PW - f.w / 2 - 1); f.y = clamp(ly + drag.oy, f.h + 2, PH - 1); });
  // 놓기: 가까우면 딱 붙고, 아니면 통 떨어진다
  const drop = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return; const f = drag.f; drag = null;
    if (over) return;
    if (Math.hypot(f.x - f.home[0], f.y - f.home[1]) < SNAP) {
      f.ok = true; f.mv = { fx: f.x, fy: f.y, tx: f.home[0], ty: f.home[1], t0: tt, dur: 0.12, arc: 0 }; f.flash = tt + 0.12;
      stars(f.home[0], f.home[1] - f.h / 2, 6, Math.max(8, f.w / 2)); dust(f.home[0], f.home[1], 6, f.w);
      F.msg(`${f.n} 제자리!`); F.hit(stageXY(f.home[0], f.home[1] - f.h / 2), 3, "#ffd166"); SFX.snap();
    } else { f.x = Math.round(f.x); f.y = Math.round(f.y); f.drop = tt; dust(f.x, f.y, 5, f.w); tone(150, 0.08, "sine", 0.16, -40); }
    upd();
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((k) => cv.addEventListener(k, drop));
  F.foot.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; F.foot.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b)); SFX.tok(); }));
  // 사진: 누르고 있는 동안 체크인 때 모습이 겹쳐 보임(최대 1.5초), 3번까지
  const pb = F.foot.querySelector("[data-photo]"); let pt = 0;
  const hidePhoto = () => { if (!showing) return; showing = false; clearTimeout(pt); cap.classList.remove("on"); };
  pb.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!started || over || showing) return; if (photos <= 0) { F.msg("사진은 다 봤어요"); return; } photos--; pb.querySelector("span").textContent = photos; if (!photos) pb.disabled = true; showing = true; cap.classList.add("on"); noise(0.05, 3200, 0.1); tone(1400, 0.04, "square", 0.05, 0, 0.05); pt = setTimeout(hidePhoto, 1500); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((k) => pb.addEventListener(k, () => setTimeout(hidePhoto, 250)));
  // 그리기
  const drawSpr = (c, x, y, a = 1, sc = 1) => {
    g.globalAlpha = a;
    if (sc === 1) g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height + 1));
    else { const w = Math.max(1, Math.round(c.width * sc)), h = Math.max(1, Math.round(c.height * sc)); g.drawImage(c, Math.round(x - w / 2), Math.round(y - h + 1), w, h); }
    g.globalAlpha = 1;
  };
  const drawF = (f, clean) => {
    let x = clean ? f.home[0] : f.x, y = clean ? f.home[1] : f.y, lift = 0;
    if (!clean) {
      if (drag && drag.f === f) lift = Math.min(1, (tt - drag.t0) / 0.08) * 5;
      else if (tt - f.drop < 0.3) { const p = (tt - f.drop) / 0.3; lift = p < 0.5 ? 5 * (1 - p / 0.5) : 2 * Math.sin(((p - 0.5) / 0.5) * Math.PI); }
      if (tt - f.wob < 0.3) x += Math.round(Math.sin((tt - f.wob) * 40) * 1.5);
    }
    const onWall = f.wall && Math.abs(x - f.home[0]) < 1 && Math.abs(y - f.home[1]) < 1;
    if (!onWall) { const sw = Math.max(4, f.w - 2 - Math.round(lift)); g.fillStyle = lift > 0.5 ? "rgba(8,2,18,.45)" : "rgba(8,2,18,.3)"; g.fillRect(Math.round(x - sw / 2), Math.round(y) - 1, sw, 2); }
    drawSpr(S.f[f.id], x, y - Math.round(lift));
    if (!clean && tt >= f.flash && tt - f.flash < 0.45) drawSpr(S.wh[f.id], x, y, 1 - (tt - f.flash) / 0.45);
  };
  const drawT = (t) => {
    if (tt < t.app) return;
    let sc = 1, a = 1, x = t.x, y = t.y;
    const pa = tt - t.app; if (pa < 0.25) { const p = pa / 0.25; sc = p < 0.6 ? (p / 0.6) * 1.3 : 1.3 - ((p - 0.6) / 0.4) * 0.3; }
    if (t.gone) { const p = (tt - t.die) / (t.save ? 0.5 : 0.25); if (p >= 1) return; if (t.save) { y -= p * 14; a = 1 - p; } else sc = 1 - p; }
    if (tt - t.wob < 0.3) x += Math.round(Math.sin((tt - t.wob) * 40) * 1.5);
    if (!t.gone) { g.fillStyle = "rgba(8,2,18,.25)"; g.fillRect(Math.round(x - t.w / 2), Math.round(y) - 1, t.w, 1); }
    drawSpr(t.s, x, y, a, sc);
    // 분실물은 가끔 반짝
    if (t.lost && !t.gone && sc === 1) { const ph = (tt * 0.8 + t.ph) % 1.4; if (ph < 0.3) { const k = ph < 0.1 || ph > 0.2 ? 1 : 2, sx = Math.round(x + t.w / 2), sy = Math.round(y - t.h); P(sx - k, sy, 2 * k + 1, 1, "#fff8c0"); P(sx, sy - k, 1, 2 * k + 1, "#fff8c0"); P(sx, sy, 1, 1, "#ffffff"); } }
  };
  const render = (clean) => {
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.drawImage(S.bg, 0, 0);
    // 창밖 불빛, 천장 네온 띠, 네온 하트, 줄전구, 미러볼
    for (const [x, y, ph] of S.winL) if (clean || Math.sin(tt * 1.7 + ph) > -0.5) P(x, y, 1, 1, "#ffd56a");
    const hue = Math.round(clean ? 300 : tt * 50) % 360; P(0, 4, PW, 1, `hsl(${hue},95%,72%)`); g.fillStyle = `hsla(${hue},95%,60%,.22)`; g.fillRect(0, 5, PW, 3);
    const hOn = clean || !(Math.sin(tt * 7.3) > 0.9 && Math.sin(tt * 2.3) > 0);
    if (hOn) { g.fillStyle = "rgba(255,80,170,.22)"; for (const [x, y] of S.heart) g.fillRect(x - 1, y - 1, 3, 3); }
    g.fillStyle = hOn ? "#ff8ac8" : "#6a2a50"; for (const [x, y] of S.heart) g.fillRect(x, y, 1, 1);
    S.bulbs.forEach(([x, y], i) => { const c = PR_BULB[i % 5], lit = clean || (Math.floor(tt * 2.5) + i) % 3 !== 0; if (lit) { g.fillStyle = c + "40"; g.fillRect(x - 1, y - 1, 4, 4); } P(x, y, 2, 2, lit ? c : shade(c, 0.4)); });
    P(78, 0, 1, 11, "#4a4a58");
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { if ((i - 3) ** 2 + (j - 3) ** 2 > 10) continue; P(75 + i, 11 + j, 1, 1, (i + j + Math.floor(tt * 8)) % 4 === 0 ? "#ffffff" : (i * 3 + j) % 2 ? "#9a9ab4" : "#d4d4e4"); }
    // 가구(깊이순) → 쓰레기 → 들고 있는 가구
    const list = items.filter((f) => clean || !(drag && drag.f === f)).sort((a, b) => (clean ? a.home[1] + a.zb - b.home[1] - b.zb : depth(a) - depth(b)));
    for (const f of list) drawF(f, clean);
    if (!clean) {
      for (const t of tr) drawT(t);
      if (drag) {
        const f = drag.f;
        // 원래 자리 가까이 오면 그 자리가 깜빡(딱 붙을 자리)
        if (Math.hypot(f.x - f.home[0], f.y - f.home[1]) < SNAP && Math.floor(tt * 8) % 2) drawSpr(S.gh[f.id], f.home[0], f.home[1], 0.6);
        drawF(f, false);
      }
    }
    // 빛: 스크린 영상, 조명, 미러볼 점
    const at = (f) => clean || home0(f);
    const scr = byId("screen"), pj = byId("projector"), lamp = byId("lamp"), spk = byId("speaker");
    if (at(scr) && at(pj)) {
      const sx = scr.home[0] - 19, sy = scr.home[1] - 25, sw = 38, sh = 21;
      P(sx, sy, sw, sh, "#24307a"); P(sx, sy, sw, 6, "#3a3f9a");
      for (let i = 0; i < 5; i++) P(sx + 5 + i * 7, sy + 8 - Math.round(Math.abs(Math.sin(tt * 4 + i)) * 4), 3, 3, PR_BULB[i]);
      P(sx + 5, sy + 15, 28, 1, "#ffffff"); P(sx + 5, sy + 15, Math.floor((tt * 7) % 29), 1, "#ff6fa8"); P(sx + 9, sy + 18, 20, 1, "#c8c8e8");
      g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,250,220,.07)";
      g.beginPath(); g.moveTo(pj.home[0] + 4, pj.home[1] - 6); g.lineTo(sx, sy + sh); g.lineTo(sx + sw, sy + sh); g.closePath(); g.fill();
      g.globalCompositeOperation = "source-over";
    }
    g.globalCompositeOperation = "lighter";
    { const lx = clean ? lamp.home[0] : lamp.x, ly = (clean ? lamp.home[1] : lamp.y) - lamp.h + 10, rg = g.createRadialGradient(lx, ly, 2, lx, ly, 32); rg.addColorStop(0, "rgba(255,210,130,.32)"); rg.addColorStop(1, "rgba(255,210,130,0)"); g.fillStyle = rg; g.fillRect(lx - 32, ly - 32, 64, 64); }
    for (let k = 0; k < 12; k++) { const a = tt * 0.5 + k * 0.523, rr = 30 + (k % 4) * 24, x = 78 + Math.cos(a) * rr * 1.1, y = 100 + Math.sin(a) * rr * 0.75; if (x < 0 || x > PW - 2 || y < 8 || y > PH - 2) continue; g.fillStyle = PR_BULB[k % 5] + "70"; g.fillRect(Math.round(x), Math.round(y), 2, 2); }
    g.globalCompositeOperation = "source-over";
    if (clean) return;
    // 스피커가 제자리면 음표
    if (at(spk)) for (let k = 0; k < 2; k++) { const ph = (tt * 0.7 + k * 0.5) % 1, x = Math.round(spk.x - 3 + k * 6 + Math.sin(ph * 6)), y = Math.round(spk.y - spk.h - 4 - ph * 12); g.globalAlpha = 1 - ph; P(x, y + 3, 2, 2, "#ffd166"); P(x + 1, y, 1, 3, "#ffd166"); P(x + 2, y, 1, 1, "#ffd166"); g.globalAlpha = 1; }
    // 어질러진 만큼 방이 어둡다
    const rem = disp.filter((f) => !f.ok).length + left(), dark = peek ? 0 : 0.3 * clamp(rem / total0, 0, 1);
    if (dark > 0.01) { g.fillStyle = `rgba(12,6,30,${dark})`; g.fillRect(0, 0, PW, PH); }
    // 사진 겹쳐 보기: 원래 자리 잔상 + 사진 테두리
    if (showing) {
      g.fillStyle = "rgba(255,244,220,.1)"; g.fillRect(0, 0, PW, PH);
      for (const f of disp) if (!f.ok) drawSpr(S.gh[f.id], f.home[0], f.home[1], 0.75);
      g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(0, 0, PW, 3); g.fillRect(0, PH - 3, PW, 3); g.fillRect(0, 0, 3, PH); g.fillRect(PW - 3, 0, 3, PH);
    }
    // 효과
    for (const q of pts) { g.globalAlpha = clamp(q.l / q.m, 0, 1); P(Math.round(q.x), Math.round(q.y), q.s, q.s, q.c); }
    g.globalAlpha = 1;
    for (const b of brooms) { const p = (tt - b.t0) / 0.32; if (p >= 0 && p <= 1) drawSpr(S.broom, b.x - 9 + p * 18, b.y + 1 - Math.round(Math.sin(p * Math.PI) * 2), 1 - p * p); }
    for (const s of fxs) { const p = (tt - s.t0) / s.l; if (p >= 0 && p <= 1) star(s.x, s.y, p); }
    // 다 치우면 빛줄기가 쓱
    if (shine >= 0) { const p = (tt - shine) / 1.0, x0 = -80 + p * 320; g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,255,235,.3)"; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 26, 0); g.lineTo(x0 - 54, PH); g.lineTo(x0 - 80, PH); g.closePath(); g.fill(); g.globalCompositeOperation = "source-over"; }
    if (peek) { g.fillStyle = "rgba(8,4,20,.62)"; g.fillRect(0, 0, PW, PH); }
  };
  const t0 = performance.now();
  const loop = (now) => {
    if (done || !cv.isConnected) { clearInterval(hintT); return; }
    const nt = (now - t0) / 1000, dt = clamp(nt - tt, 0, 0.05); tt = nt;
    for (const f of items) if (f.mv) { const m = f.mv, p = (tt - m.t0) / m.dur; if (p >= 1) { f.x = m.tx; f.y = m.ty; f.mv = null; } else if (p > 0) { const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; f.x = m.fx + (m.tx - m.fx) * e; f.y = m.fy + (m.ty - m.fy) * e - m.arc * Math.sin(p * Math.PI); } }
    for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; q.l -= dt; if (q.l <= 0) { pts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy += 12 * dt; }
    for (let i = fxs.length - 1; i >= 0; i--) if (tt - fxs[i].t0 > fxs[i].l) fxs.splice(i, 1);
    for (let i = brooms.length - 1; i >= 0; i--) if (tt - brooms[i].t0 > 0.4) brooms.splice(i, 1);
    // 절반쯤 지나면 소파 밑에서 쓰레기가 더
    if (started && !over && !spawned && tm && tm.left() < T * 0.55) { spawned = true; const so = byId("sofa"), k = 1 + rint(2); for (let i = 0; i < k; i++) { const t = addT(pick(PR_TR), null, [so.x, so.y]); dust(t.x, t.y, 6, 8); } F.msg("소파 밑에서 쓰레기가 더 나왔어요"); SFX.pop(); upd(); }
    if (shine >= 0 && rnd() < 0.6) stars(8 + rnd() * (PW - 16), 20 + rnd() * 170, 1, 0);
    render(false);
    raf = requestAnimationFrame(loop);
  };
  const end = () => {
    if (over) return; over = true; tm?.stop(); clearInterval(hintT); drag = null; hidePhoto();
    const tl = tm ? tm.left() : 0;
    const acc = disp.reduce((a, f) => a + (f.ok ? 1 : 0.5 * clamp(1 - Math.hypot(f.x - f.home[0], f.y - f.home[1]) / (PW * 0.5), 0, 1)), 0) / disp.length;
    const placed = disp.filter((f) => f.ok).length, all = cleared >= total && placed >= disp.length;
    const s = acc * 0.45 + (cleared / total) * 0.3 + (all ? 0.15 * Math.min(1, tl / (T * 0.4)) : 0) + (nl ? (saved / nl) * 0.1 : 0.1) - tossed * 0.12;
    const fin = () => { done = true; cancelAnimationFrame(raf); finish(s, `제자리 ${placed}/${disp.length} · 쓰레기 ${cleared}/${total}${nl ? ` · 분실물 ${saved}/${nl} 보관` : ""}${tossed ? ` · 분실물 ${tossed}개 버림` : ""}${all ? ` · ${Math.round(tl)}초 남김` : ""}`, "", [["제자리", acc], ["쓰레기", cleared / total], ["분실물", nl ? saved / nl : 1], ["남은 시간", all ? Math.min(1, tl / (T * 0.4)) : 0]]); };
    // 다 치우면 방이 반짝
    if (all) { shine = tt; F.msg("방이 반짝반짝!"); stars(PW / 2, PH / 2, 14, 70); for (let k = 0; k < 4; k++) setTimeout(() => F.burst([F.stage.clientWidth * (0.15 + rnd() * 0.7), F.stage.clientHeight * (0.15 + rnd() * 0.7)], "#fff7c2", 10), k * 150); setTimeout(fin, 1200); } else fin();
  };
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.pr = { items, disp, tr, cv, photo: () => showing };
  // 시작: 체크인 때 사진(폴라로이드) 3초 → 손님이 놀고 간 방
  render(true); try { pola.querySelector("img").src = cv.toDataURL(); } catch (e) {}
  let cd = PEEK; const cdEl = pola.querySelector("i");
  const ci = setInterval(() => { cd--; if (cd > 0) { cdEl.textContent = cd; SFX.tick(); } }, 1000);
  F.bar.style.transform = "scaleX(1)"; upd();
  raf = requestAnimationFrame(loop);
  setTimeout(() => {
    clearInterval(ci); if (!cv.isConnected) return;
    peek = false; pola.classList.add("away"); setTimeout(() => pola.remove(), 500); SFX.whoosh();
    disp.forEach((f, i) => (f.mv = { fx: f.home[0], fy: f.home[1], tx: f.to[0], ty: f.to[1], t0: tt + 0.15 + i * 0.07, dur: 0.5, arc: 14 }));
    tr.forEach((t, i) => (t.app = tt + 0.3 + i * 0.035));
    setTimeout(() => { if (!cv.isConnected || over) return; started = true; F.msg("손님이 놀고 간 방이에요. 시작!"); tm = timer(T, F.bar, end); upd(); }, 750);
  }, PEEK * 1000);
}

// ───────── 2. 컨설팅 빨간펜 ─────────
// 이야기 묶음: 소제목 + 좋은 문장(순서대로) + 이 이야기 전용 나쁜 문장(숫자 없음 n / 다른 이야기 o)
const CS_SETS = [
  { ttl: "[주문 동선을 바꿔 대기 시간 40% 단축]", good: ["카페 아르바이트 6개월 차, 점심마다 대기 줄이 매장 밖까지 이어졌습니다.", "주문부터 픽업까지 동선을 그려 보니 계산대와 픽업대가 붙어 있어 손님이 엉키고 있었습니다.", "점장님께 픽업대를 출입구 반대편으로 옮기자고 제안해 바로 바꿨습니다.", "그 결과 점심 평균 대기 시간이 10분에서 6분으로 줄었고, 점심 매출은 한 달 만에 12% 늘었습니다.", "작은 동선 하나가 숫자를 바꾼다는 것을 배웠고, 영업관리 직무에서도 현장의 병목부터 찾겠습니다."],
    bad: [["n", "덕분에 매장 분위기가 많이 좋아졌고 손님들의 만족도도 크게 높아졌습니다.", "그 결과 점심 재방문 손님이 한 달 새 15% 늘었습니다."], ["o", "참고로 저는 커피를 좋아해 바리스타 자격증도 준비하고 있습니다.", "(이 항목과 다른 이야기라 빼고, 자격증은 다른 항목에서 씁니다)"]] },
  { ttl: "[재고 실사 방식을 바꿔 오차 0건]", good: ["물류 인턴으로 일하던 3개월 동안 월말 재고 실사에서 매번 20건 넘는 오차가 났습니다.", "원인을 보니 입고 기록이 종이와 엑셀로 나뉘어 하루씩 늦게 반영되고 있었습니다.", "입고 즉시 바코드로 찍어 공유 시트에 바로 쌓이게 바꿨습니다.", "다음 두 번의 실사에서 오차는 0건이었고, 실사 시간도 6시간에서 2시간으로 줄었습니다.", "구매 직무에서도 숫자가 맞지 않는 곳의 흐름부터 보겠습니다."],
    bad: [["n", "이 일로 업무 효율이 상당히 개선되었다는 평가를 받았습니다.", "실사 시간이 6시간에서 2시간으로 줄어 팀장님께 우수 인턴 추천을 받았습니다."], ["o", "인턴 기간에는 회식 자리에서 분위기를 띄우는 역할도 맡았습니다.", "(재고 이야기와 섞이면 초점이 흐려져서 뺍니다)"]] },
  { ttl: "[회비 장부를 공개해 납부율 95%]", good: ["동아리 총무를 맡았을 때 회비 납부율은 60%에 머물러 있었습니다.", "안 내는 이유를 물어보니 돈이 어디에 쓰이는지 모르겠다는 답이 가장 많았습니다.", "매달 지출 내역을 영수증 사진과 함께 단톡방에 공개했습니다.", "한 학기 만에 납부율이 95%가 됐고, 남은 회비로 MT 비용의 30%를 지원했습니다.", "재무 직무에서도 숫자를 투명하게 보여 주는 것부터 신뢰를 쌓겠습니다."],
    bad: [["n", "그 뒤로 회원들의 참여가 눈에 띄게 늘었습니다.", "그 뒤로 정기 모임 참석 인원이 평균 12명에서 20명이 됐습니다."], ["o", "동아리 활동을 하며 좋은 친구들도 많이 사귀었습니다.", "(성과 항목에서는 빼고, 인성·관계 항목에서 씁니다)"]] },
  { ttl: "[카드뉴스 A/B 시험으로 조회수 3배]", good: ["학회 홍보팀에서 행사 카드뉴스 조회수가 평균 300회에 그쳤습니다.", "같은 내용을 제목만 바꿔 두 가지로 올려 반응을 비교해 봤습니다.", "질문형 제목이 설명형보다 클릭이 2배 많다는 것을 확인하고 이후 모두 질문형으로 바꿨습니다.", "다음 행사 카드뉴스는 조회수 900회를 넘겼고, 참가 신청도 40명에서 75명으로 늘었습니다.", "마케팅 직무에서도 감보다 시험 결과로 결정하겠습니다."],
    bad: [["n", "이 경험으로 홍보 효과가 크게 높아졌습니다.", "이 경험으로 참가 신청이 40명에서 75명으로 늘었습니다."], ["o", "학회에서는 발표 대회에 나가 장려상을 받기도 했습니다.", "(카드뉴스 이야기와 다른 성과라 따로 씁니다)"]] },
  { ttl: "[불만 문의를 유형별로 나눠 재문의 절반]", good: ["콘텐츠 회사 고객센터 아르바이트에서 하루 80건의 문의를 받았습니다.", "같은 고객이 두세 번 다시 묻는 경우가 많아, 한 달 치 문의를 유형별로 나눠 봤습니다.", "환불 절차 문의가 35%로 가장 많았고, 안내 문구가 너무 길어 이해가 어렵다는 것을 알았습니다.", "안내 문구를 세 줄로 줄이고 그림을 붙이자 재문의가 한 달 만에 절반으로 줄었습니다.", "인사 직무에서도 반복되는 질문 뒤에 숨은 원인을 찾겠습니다."],
    bad: [["n", "고객 만족도가 많이 올라 회사에 좋은 영향을 주었습니다.", "재문의가 하루 24건에서 12건으로 줄어 상담 시간이 하루 2시간 줄었습니다."], ["o", "힘든 고객도 있었지만 늘 웃으며 응대했습니다.", "(태도 이야기는 이 항목의 성과와 따로 씁니다)"]] },
  { ttl: "[견적 비교표로 구매 단가 18% 절감]", good: ["학생회 행사 물품을 맡았을 때 업체 한 곳에서만 사 오던 관행이 있었습니다.", "같은 물품을 다섯 곳에 견적을 받아 단가·배송비·반품 조건을 표로 비교했습니다.", "가장 싼 곳이 아니라 반품 조건이 좋은 곳을 골라 묶음 할인을 협상했습니다.", "전년보다 물품 단가를 18% 줄였고, 아낀 예산으로 행사 경품을 두 배로 늘렸습니다.", "구매 직무에서도 조건까지 함께 비교해 총비용을 줄이겠습니다."],
    bad: [["n", "비용을 많이 아껴 학생회에 큰 도움이 됐습니다.", "물품 단가를 18%, 금액으로 120만 원 줄였습니다."], ["o", "학생회에서 회의록 정리도 도맡아 했습니다.", "(구매 이야기와 다른 업무라 뺍니다)"]] },
];
// 어느 이야기에나 끼어드는 나쁜 문장: 서두(두괄식 아님 h) / AI 티 상투어(a)
const CS_HEAD = [
  ["저는 어릴 때부터 사람을 좋아하고 무엇이든 열심히 하는 아이였습니다.", "첫 문장에 결론을 둡니다: 소제목 내용(무엇을 해서 어떤 숫자를 냈는지)을 한 문장으로."],
  ["대학 생활 동안 저는 많은 것을 느끼고 배울 수 있었습니다.", "막연한 서두 대신 '○○을 바꿔 △△를 ◇% 줄였습니다'로 시작합니다."],
  ["누구나 한 번쯤은 어려운 상황을 겪게 됩니다.", "일반론으로 시작하지 말고 내 사건으로 바로 들어갑니다."],
  ["제 인생의 좌우명은 '포기하지 말자'입니다.", "좌우명은 빼고, 결과를 먼저 말합니다."],
  ["이번 경험을 말씀드리기 전에 제 성격을 먼저 소개하겠습니다.", "인사팀은 첫 줄만 읽고 넘깁니다. 결론을 첫 줄에."],
  ["세상은 빠르게 변하고 있고, 기업도 끊임없이 혁신해야 합니다.", "거대 담론 대신 내 이야기의 결론으로 시작합니다."],
];
const CS_AI = [
  ["다양한 경험을 통해 저는 한층 더 성장할 수 있었습니다.", "'다양한 경험'은 아무 말도 안 한 것과 같아요. 무엇을 배웠는지 하나만 씁니다."],
  ["이러한 경험을 바탕으로 귀사의 발전에 기여하고 싶습니다.", "'기여하고 싶습니다'는 AI 티가 나요. 입사 후 할 일을 구체적으로: '첫해에 ○○ 업무에서 △△를 하겠습니다.'"],
  ["이를 통해 소통의 중요성을 깊이 깨달을 수 있었습니다.", "'깊이 깨달았다'는 상투어예요. 깨달은 걸 행동으로 보여 준 장면을 씁니다."],
  ["저는 항상 최선을 다하는 자세로 임하였습니다.", "최선은 모두가 다해요. 남과 다르게 한 행동 하나를 씁니다."],
  ["결과적으로 팀워크와 리더십, 문제 해결 능력을 모두 기를 수 있었습니다.", "한 항목에 역량 하나. 세 개를 다 쓰면 하나도 안 남아요."],
  ["이 과정에서 많은 시행착오를 겪었지만 포기하지 않았습니다.", "어떤 시행착오였는지 한 가지를 사실로 씁니다."],
  ["앞으로도 끊임없이 배우고 성장하는 인재가 되겠습니다.", "다짐 대신 회사에 줄 이익을 씁니다."],
  ["뿐만 아니라 책임감과 성실함 또한 갖추게 되었습니다.", "'뿐만 아니라'로 역량을 늘어놓으면 번역투처럼 보여요. 빼도 됩니다."],
];
function gCS(host, ez, finish) {
  const T = 30 * ez;
  const set = pick(CS_SETS);
  // 나쁜 문장 3~4개: 서두(절반 확률, 맨 앞) + 이야기 전용 1~2 + 상투어 1~2
  const bads = [];
  const sens = set.good.map((t) => ({ t, bad: false }));
  shuffle(set.bad).slice(0, 1 + rint(2)).forEach(([k, t, fix]) => { const at = 1 + rint(sens.length - 1); const o = { t, bad: true, kind: k === "n" ? "숫자 없는 성과" : "다른 이야기", fix }; sens.splice(at, 0, o); bads.push(o); });
  shuffle(CS_AI).slice(0, 1 + rint(2)).forEach(([t, fix], i) => { const at = i === 0 && rnd() < 0.6 ? sens.length : 1 + rint(sens.length - 1); const o = { t, bad: true, kind: "AI 티 상투어", fix }; sens.splice(at, 0, o); bads.push(o); });
  if (rnd() < 0.55) { const [t, fix] = pick(CS_HEAD); const o = { t, bad: true, kind: "두괄식 아님", fix }; sens.unshift(o); bads.push(o); }
  const F = frame(host, "cs", "빨간펜", "", "", `<button class="mg-btn" data-mg-done>다 찾았어요</button>`);
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-paper"><div class="mg-ttl">${set.ttl}</div>${sens.map((s, i) => `<button class="mg-sen" data-i="${i}">${s.t}</button> `).join("")}</div>`);
  let found = 0, wrong = 0, over = false;
  const upd = () => (F.sc.textContent = `${found}/${bads.length} · 틀림 ${wrong}`);
  const paper = F.stage.querySelector(".mg-paper");
  // 빨간 펜이 문장 위를 왼쪽→오른쪽으로 지나가며 줄마다 손글씨처럼 긋는다. 멀쩡한 문장이면 긋다 멈추고 ✕
  const strike = (b, ok) => new Promise((res) => {
    const P = paper.getBoundingClientRect(), lines = [...b.getClientRects()].filter((r) => r.width > 4);
    const pen = document.createElement("div"); pen.className = "mg-pen"; pen.textContent = "🖊️";
    if (!lines.length || !pen.animate) return res();
    paper.appendChild(pen);
    const todo = ok ? lines : lines.slice(0, 1); let i = 0;
    const next = () => {
      if (i >= todo.length) { pen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = () => pen.remove(); return res(); }
      const r = todo[i++], x0 = r.left - P.left + paper.scrollLeft, y = r.top - P.top + paper.scrollTop + r.height * 0.56;
      const w = ok ? r.width : r.width * (0.28 + rnd() * 0.22), ph = rnd() * 6, tilt = (rnd() - 0.5) * 3;
      let d = "M2 " + (7 + Math.sin(ph) * 1.2).toFixed(1);
      for (let x = 8; x <= w + 2; x += 8) d += " L" + (x + 2).toFixed(1) + " " + (7 + Math.sin(x * 0.09 + ph) * 1.3 + (rnd() - 0.5) * 1.1 + tilt * x / Math.max(w, 1)).toFixed(1);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "mg-strk");
      svg.setAttribute("width", Math.ceil(w + 6)); svg.setAttribute("height", 14); svg.style.left = x0 - 2 + "px"; svg.style.top = y - 7 + "px";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", d); svg.appendChild(path); paper.appendChild(svg);
      const L = path.getTotalLength ? path.getTotalLength() : w; path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      const dur = clamp(w * 1.5, 160, 520);
      SFX.scratch(dur / 1000 * (ok ? 1 : 0.6));
      path.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, fill: "forwards", easing: "ease-in-out" });
      pen.animate([{ transform: `translate(${x0}px,${y - 22}px) rotate(-8deg)` }, { transform: `translate(${x0 + w}px,${y - 22 + tilt}px) rotate(4deg)` }], { duration: dur, fill: "forwards", easing: "ease-in-out" }).onfinish = () => {
        if (!ok) { const xx = document.createElement("div"); xx.className = "mg-xx"; xx.textContent = "✕"; xx.style.left = x0 + w + 10 + "px"; xx.style.top = y + "px"; paper.appendChild(xx); }
        setTimeout(next, ok ? 50 : 150);
      };
    };
    next();
  });
  // 다 찾으면 '참 잘했어요' 도장
  let doneT = null;
  const goodStamp = () => { const e = document.createElement("div"); e.className = "mg-goodstamp"; e.innerHTML = "참<br>잘했어요"; F.stage.appendChild(e); setTimeout(() => { SFX.stamp(); vib(30); }, 120); };
  F.stage.querySelectorAll(".mg-sen").forEach((b) => b.onclick = () => {
    if (over) return; const s = sens[+b.dataset.i];
    if (s.bad) {
      if (b.classList.contains("hit")) return; b.classList.add("hit"); found++; F.msg(`찾았어요: ${s.kind}`); F.hit(b, 1, "#ff6b6b"); upd();
      if (found >= bads.length) doneT = tm.left();
      strike(b, true).then(() => { if (found >= bads.length && !over && !paper.dataset.st) { paper.dataset.st = 1; goodStamp(); setTimeout(end, 1000); } });
    }
    else { if (b.classList.contains("miss")) return; b.classList.add("miss"); wrong++; F.msg("괜찮은 문장이에요. 감점"); F.miss(b); upd(); strike(b, false); }
  });
  const end = () => {
    if (over) return; over = true; tm.stop();
    const tl = doneT ?? tm.left();
    const s = (found - wrong * 0.5) / bads.length * 0.85 + (found >= bads.length ? 0.15 * Math.min(1, tl / (T * 0.5)) : 0);
    const ex = bads.map((b) => `<div><small>${b.kind}${sens.find((x) => x === b) && F.stage.querySelector(`.mg-sen[data-i="${sens.indexOf(b)}"]`).classList.contains("hit") ? " · 찾음" : " · 놓침"}</small><s>${b.t}</s><br><em>→ ${b.fix}</em></div>`).join("");
    finish(s, `고칠 문장 ${found}/${bads.length}개 찾음${wrong ? ` · 잘못 짚은 문장 ${wrong}개` : ""}`, `<div><small>조로 원칙</small>두괄식 · 소제목 · 사실과 숫자 · 한 항목 한 이야기</div>${ex}`, [["찾은 문장", found / bads.length], ["정확도", found + wrong ? found / (found + wrong) : 0], ["속도", found >= bads.length ? Math.min(1, tl / (T * 0.5)) : 0]]);
  };
  F.foot.querySelector("[data-mg-done]").onclick = end;
  const tm = timer(T, F.bar, end);
  upd();
}

// ───────── 3. 에어씨앤씨 외국어 답장 ─────────
// [국기, 메시지, 뜻, 정답[문장, 뜻], 오답1, 오답2]
const AB_MSG = [
  ["🇺🇸", "What time is check-in?", "체크인 몇 시예요?", ["Check-in is from 3 PM.", "오후 3시부터예요."], ["Checkout is at 11 AM.", "퇴실은 11시예요."], ["The nearest station is 5 minutes away.", "역은 5분 거리예요."]],
  ["🇺🇸", "Is there Wi-Fi in the room?", "방에 와이파이 있어요?", ["Yes, the password is on the fridge.", "네, 비밀번호는 냉장고에 붙어 있어요."], ["Towels are in the bathroom.", "수건은 욕실에 있어요."], ["You can't smoke inside.", "실내 흡연은 안 돼요."]],
  ["🇬🇧", "Can I leave my luggage after checkout?", "퇴실 후 짐 맡길 수 있나요?", ["Sure, you can leave it until 6 PM.", "그럼요, 저녁 6시까지 맡길 수 있어요."], ["The heater remote is on the table.", "난방 리모컨은 탁자 위에 있어요."], ["Please separate the recycling.", "분리수거 부탁해요."]],
  ["🇦🇺", "The hot water isn't working.", "온수가 안 나와요.", ["Sorry! Please turn on the boiler switch by the door.", "죄송해요! 문 옆 보일러 스위치를 켜 주세요."], ["Enjoy your stay!", "즐거운 여행 되세요!"], ["Check-in is from 3 PM.", "체크인은 3시부터예요."]],
  ["🇺🇸", "Any good restaurants nearby?", "근처 맛집 있어요?", ["Try the noodle place two blocks away.", "두 블록 옆 국숫집 가 보세요."], ["The password is 1234.", "비밀번호는 1234예요."], ["Late checkout costs extra.", "늦은 퇴실은 추가 요금이 있어요."]],
  ["🇯🇵", "チェックアウトは何時ですか？", "체크아웃 몇 시예요?", ["11時です。", "11시예요."], ["駅から5分です。", "역에서 5분이에요."], ["タオルは浴室にあります。", "수건은 욕실에 있어요."]],
  ["🇯🇵", "鍵の暗証番号を忘れました。", "도어락 비밀번호를 잊었어요.", ["メッセージで送りますね。", "메시지로 보내 드릴게요."], ["おいしいラーメン屋があります。", "맛있는 라멘집이 있어요."], ["ゴミは分別してください。", "쓰레기는 분리해 주세요."]],
  ["🇯🇵", "空港までどうやって行けばいいですか？", "공항까지 어떻게 가요?", ["駅から空港鉄道に乗ってください。", "역에서 공항철도를 타세요."], ["エアコンのリモコンは机の上です。", "에어컨 리모컨은 책상 위에 있어요."], ["チェックインは15時からです。", "체크인은 3시부터예요."]],
  ["🇨🇳", "可以提前入住吗？", "일찍 체크인할 수 있나요?", ["今天房间空着，1点可以入住。", "오늘 방이 비어서 1시에 들어오셔도 돼요."], ["请不要在室内吸烟。", "실내 흡연 금지예요."], ["地铁站走路五分钟。", "지하철역까지 걸어서 5분이에요."]],
  ["🇨🇳", "房间里有吹风机吗？", "방에 드라이기 있어요?", ["有，在洗手台下面的抽屉里。", "있어요, 세면대 아래 서랍에요."], ["退房时间是11点。", "퇴실은 11시예요."], ["附近有便利店。", "근처에 편의점이 있어요."]],
  ["🇨🇳", "楼上太吵了。", "위층이 너무 시끄러워요.", ["非常抱歉，我马上联系他们。", "정말 죄송해요, 바로 연락해 볼게요."], ["祝您旅途愉快！", "즐거운 여행 되세요!"], ["密码在冰箱上。", "비밀번호는 냉장고에 있어요."]],
  ["🇫🇷", "Do you have an iron? (I'm from France)", "다리미 있나요? (프랑스에서 왔어요)", ["Yes, it's in the closet.", "네, 옷장 안에 있어요."], ["The bus stop is across the street.", "버스 정류장은 길 건너예요."], ["Please lock the door.", "문 잠가 주세요."]],
  ["🇺🇸", "We'd like one more blanket.", "담요 하나 더 주세요.", ["I'll bring one in 10 minutes.", "10분 안에 가져다 드릴게요."], ["The Wi-Fi is fast.", "와이파이가 빨라요."], ["Breakfast is not included.", "조식은 포함이 아니에요."]],
  ["🇸🇬", "Is it okay to cook in the kitchen?", "부엌에서 요리해도 되나요?", ["Of course, just open the window please.", "그럼요, 창문만 열어 주세요."], ["Checkout is at 11 AM.", "퇴실은 11시예요."], ["There's no parking.", "주차는 안 돼요."]],
  ["🇯🇵", "近くにコンビニはありますか？", "근처에 편의점 있어요?", ["はい、建物の1階にあります。", "네, 건물 1층에 있어요."], ["11時にチェックアウトです。", "11시 퇴실이에요."], ["暖房はこのボタンです。", "난방은 이 버튼이에요."]],
];
// 외국어 실력만큼 한국어 뜻이 보인다(낱말 단위로 가림). 실력 100이면 다 보인다
const seen = (skill) => clamp(0.35 + (+skill || 0) / 110, 0.35, 1);
function maskKo(ko, v, salt) { return [...String(ko)].map((ch, k) => { if (/[s?!.,~]/.test(ch)) return ch; const h = (Math.sin((salt + 1) * 97.13 + k * 12.989) * 43758.5453) % 1; return Math.abs(h) < v ? ch : "*"; }).join(""); }
function gAB(host, ez, finish, skill = 0) {
  const vis = seen(skill);
  const per = 11 * ez, N = 5;
  const qs = shuffle(AB_MSG).slice(0, N);
  const F = frame(host, "airbnb", "외국어 답장", "", "img/bg/airbnb.webp");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-chat"></div>`);
  const chat = F.stage.querySelector(".mg-chat");
  let i = 0, sum = 0, ok = 0, spd = 0, tm = null, over = false;
  const stars = [];
  // 별점: 방금 받은 별은 하나씩 튀어나온다
  const starsHtml = (fresh) => stars.map((s, k) => (fresh && k === stars.length - 1 ? `<span>${[...s].map((c, j) => `<span class="new" style="animation-delay:${0.25 + j * 0.15}s">${c}</span>`).join("")}</span>` : `<span>${s}</span>`)).join(" ");
  const note = `<div class="mg-langnote">외국어 ${Math.round(+skill || 0)} · 한국어 뜻이 ${Math.round(vis * 100)}% 보여요. 외국어 실력이 오를수록 더 많이 보여요.</div>`;
  // 타이핑 점(…) 뒤에 메시지가 도착
  const show = () => {
    if (i >= N) return end();
    F.sc.textContent = `${i + 1}/${N}`; F.bar.style.transform = "scaleX(1)";
    chat.innerHTML = `${note}<div class="mg-bub typing"><i></i><i></i><i></i></div><div class="mg-stars">${starsHtml(false)}</div>`;
    setTimeout(arrive, 600 + rnd() * 500);
  };
  const arrive = () => {
    if (over) return;
    const [fl, m, ko, a, b, c] = qs[i];
    const opts = shuffle([[a, 1], [b, 0], [c, 0]]);
    SFX.pop();
    chat.innerHTML = `${note}<div class="mg-bub in"><div class="mg-fl">${fl} 손님 메시지 ${i + 1}</div>${m}<small>${maskKo(ko, vis, i + 1)}</small></div><div class="mg-ans">${opts.map(([[t, k], r], j) => `<button data-r="${r}">${t}<small>${maskKo(k, vis, i * 7 + j + 3)}</small></button>`).join("")}</div><div class="mg-stars">${starsHtml(false)}</div>`;
    let done = false;
    const answer = (btn) => {
      if (done) return; done = true; const tl = tm.left(); tm.stop();
      const right = btn && btn.dataset.r === "1";
      chat.querySelectorAll(".mg-ans button").forEach((x) => { if (x.dataset.r === "1") x.classList.add("ok"); else if (x === btn) x.classList.add("ng"); x.disabled = true; });
      const v = right ? 0.62 + 0.38 * Math.min(1, tl / per * 1.25) : 0; sum += v; if (right) { ok++; spd += tl / per; }
      const st = right ? (v > 0.8 ? "★★★" : v > 0.65 ? "★★" : "★") : "✕"; stars.push(st);
      if (right) { F.hit(btn, st.length, "#ffd166"); btn.classList.add("send"); SFX.whoosh(); [...st].forEach((_, j) => setTimeout(SFX.pop, 300 + j * 150)); }
      else F.miss(btn || null);
      const se = chat.querySelector(".mg-stars"); if (se) se.innerHTML = starsHtml(true);
      F.msg(right ? (v > 0.8 ? "빛의 속도 답장!" : "답장 완료") : btn ? "엉뚱한 답장이에요" : "시간 초과! 답장을 못 했어요");
      i++; setTimeout(show, right ? 950 : 1200);
    };
    chat.querySelectorAll(".mg-ans button").forEach((x) => x.onclick = () => answer(x));
    tm = timer(per, F.bar, () => answer(null));
  };
  const end = () => { if (over) return; over = true; const s = sum / N; finish(s, `답장 ${ok}/${N} 성공 · ${stars.join(" ")}`, "", [["정답", ok / N], ["답장 속도", ok ? spd / ok : 0]]); };
  show();
}

// ───────── 4. 무인카페 CCTV 먹튀 잡기 (도트 캔버스) ─────────
// 160x200 논리 픽셀을 정수배로 키워 그린다. 사람은 코드로 조합한 3~4등신 도트(16x31 칸), 프레임은 사람마다 미리 그려 둔다.
const UW = 160, UH = 200;
const U_SKIN = ["#f5d0b0", "#ecc09c", "#d9a47c", "#b07a52", "#8d5a3b"];
const U_HAIR = ["#2a2018", "#3b2a1e", "#5a3b22", "#8a5a2b", "#c9a050", "#1b1b22", "#6b2a1a"];
const U_SHIRT = ["#d94f4f", "#4f7bd9", "#3e9e6a", "#e0b040", "#8a5fc0", "#e6e6e6", "#2f3d5c", "#d97a3a", "#5bb8c8", "#c94f8a"];
const U_PANTS = ["#2c3550", "#3a3a42", "#5a4630", "#1f2a3a", "#6b6f78", "#2f4a3a"];
const U_SHOE = ["#222", "#5a3a22", "#e8e8e8", "#3a3a3a"];
const U_PACK = ["#c94f4f", "#3a6ea5", "#e0a030", "#4a4a4a", "#5fa060"];
const U_HAT = ["#d94f4f", "#2f3d5c", "#e0e0e0", "#3e9e6a", "#222"];
const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return "#" + [r, g, b].map((v) => Math.round(v * f).toString(16).padStart(2, "0")).join(""); };
// 손님 겉모습: 학생·직장인·어르신·10대·보통
function uSpec(type) {
  const s = { skin: pick(U_SKIN), hair: pick(U_HAIR), style: pick(["short", "long", "bob", "bun", "spiky", "buzz"]), shirt: pick(U_SHIRT), pants: pick(U_PANTS), shoe: pick(U_SHOE), hat: null, pack: null, hood: null, glasses: rnd() < 0.15, kid: false, elder: false };
  if (type === "student") { if (rnd() < 0.7) s.pack = pick(U_PACK); if (rnd() < 0.25) s.hat = pick(U_HAT); }
  if (type === "worker") { s.shirt = pick(["#e6e6e6", "#bcd0e8", "#9aa4b2", "#2f3d5c", "#4a4a52"]); s.pants = pick(["#1f2a3a", "#2c2c34", "#3a3a42"]); s.shoe = pick(["#222", "#3a2a1a"]); s.style = pick(["short", "bob", "buzz", "long"]); s.glasses = rnd() < 0.4; }
  if (type === "elder") { s.elder = true; s.hair = pick(["#bdbdbd", "#e0e0e0", "#9e9e9e"]); s.style = pick(["bun", "buzz", "short"]); s.shirt = pick(["#9a6a8a", "#7a8a6a", "#b08060", "#6a7a9a"]); s.glasses = rnd() < 0.6; }
  if (type === "teen") { s.kid = true; s.shirt = pick(["#d94f4f", "#e0b040", "#5bb8c8", "#8a5fc0", "#3e9e6a", "#222"]); if (rnd() < 0.5) s.hood = shade(s.shirt, 0.85); else if (rnd() < 0.6) s.hat = pick(U_HAT); s.style = pick(["short", "spiky", "bob", "long"]); }
  s.shirt2 = shade(s.shirt); return s;
}
// 한 프레임 그리기. o: { v: f 앞 / b 뒤 / s 옆(오른쪽), f: 걸음 0~3, carry: 0 없음 1 컵 2 컵 탑, arm: "up", look: -1·0·1, sit }
function uPaint(g, s, o) {
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const L = s.kid ? 4 : s.elder ? 5 : 6, T = s.kid ? 6 : 7, shoeY = 28, legY = shoeY - L;
  const f = o.f || 0, bob = o.sit ? 0 : (f === 1 || f === 3) ? -1 : 0;
  let torsoY = legY - T + bob; if (o.sit) torsoY += 3;
  const hy = torsoY - 7, sk = s.skin, hc = s.hair, pd = shade(s.pants, 0.8);
  const hand = torsoY + T - 1;
  if (o.v === "s") {
    // 옆모습(오른쪽을 본다)
    if (o.sit) { P(6, torsoY + T, 6, 2, s.pants); P(10, torsoY + T + 2, 2, 3, s.pants); P(10, torsoY + T + 5, 3, 1, s.shoe); }
    else {
      const a = f === 1 ? [5, 9] : f === 3 ? [9, 5] : [7, 8];
      P(a[0], legY, 2, L, pd); P(a[0], shoeY, 3, 2, shade(s.shoe, 0.8)); P(a[1], legY, 2, L, s.pants); P(a[1], shoeY, 3, 2, s.shoe);
    }
    if (s.pack) P(3, torsoY + 1, 3, 5, s.pack);
    P(6, torsoY, 5, T, s.shirt);
    const sw = o.sit ? 2 : f === 1 ? 1 : f === 3 ? -1 : 0;
    P(7 + Math.sign(sw), torsoY + 1, 2, T - 2, s.shirt2); P(7 + sw * 2, hand, 2, 1, sk);
    if (s.hood) P(4, hy - 1, 6, 8, s.hood);
    P(6, hy + 1, 6, 6, sk); P(12, hy + 4, 1, 1, sk); P(10, hy + 3, 1, 1, "#222");
    const st = s.style;
    if (st === "buzz") P(6, hy, 6, 1, hc), P(5, hy + 1, 2, 2, hc);
    else { P(5, hy, 7, 2, hc); P(5, hy + 2, 2, st === "long" ? 7 : st === "bob" ? 4 : 3, hc); if (st === "spiky") { P(6, hy - 1, 1, 1, hc); P(8, hy - 1, 1, 1, hc); P(10, hy - 1, 1, 1, hc); } if (st === "bun") P(3, hy + 1, 2, 3, hc); }
    if (s.hat) { P(5, hy - 1, 7, 2, s.hat); P(11, hy + 1, 3, 1, shade(s.hat)); }
    if (s.glasses) P(9, hy + 3, 3, 1, "#333");
    if (o.carry === 1) { P(10 + sw * 2, hand - 3, 2, 3, "#f4f4f4"); P(10 + sw * 2, hand - 3, 2, 1, "#9b6a3a"); }
    if (o.carry === 2) for (let k = 0; k < 9; k++) P(10 + sw * 2, hand - 9 + k, 3, 1, k % 2 ? "#cfcfcf" : "#fafafa");
    return;
  }
  const back = o.v === "b";
  // 다리
  const l1 = f === 1 ? -1 : 0, r1 = f === 3 ? -1 : 0;
  P(5, legY + l1, 3, L, s.pants); P(5, shoeY + l1, 3, 2, s.shoe); P(8, legY + r1, 3, L, s.pants); P(8, shoeY + r1, 3, 2, s.shoe);
  P(7, legY, 2, 2, pd);
  // 몸·팔
  P(4, torsoY, 8, T, s.shirt); P(4, torsoY + T - 1, 8, 1, s.shirt2);
  const swL = f === 1 ? 1 : f === 3 ? -1 : 0;
  P(2, torsoY + 1, 2, T - 2 + swL, s.shirt2); P(2, torsoY + T - 1 + swL, 2, 1, sk);
  if (o.arm === "up") { P(12, hy + 2, 2, torsoY - hy + 1, s.shirt2); P(12, hy + 1, 2, 1, sk); P(11, hy - 1, 4, 2, "#e9c46a"); P(11, hy - 1, 4, 1, "#fff3b0"); }
  else { P(12, torsoY + 1, 2, T - 2 - swL, s.shirt2); P(12, torsoY + T - 1 - swL, 2, 1, sk); }
  if (back && s.pack) { P(5, torsoY + 1, 6, 5, s.pack); P(5, torsoY + 1, 6, 1, shade(s.pack, 1.2 > 1 ? 0.9 : 0.9)); }
  if (!back && s.pack) { P(5, torsoY, 1, 4, s.pack); P(10, torsoY, 1, 4, s.pack); }
  // 머리
  const lk = o.look || 0;
  if (s.hood) P(3, hy - 1, 10, 8, s.hood);
  P(5, hy + 1, 6, 6, sk);
  if (back) {
    if (s.style === "buzz") P(4, hy, 8, 5, hc); else P(4, hy, 8, 7, hc);
    if (s.style === "long") P(4, hy + 7, 8, 3, hc);
    if (s.style === "bun") P(6, hy - 2, 4, 2, hc);
    if (s.hood) P(3, hy - 1, 10, 8, s.hood);
  } else {
    const st = s.style;
    if (st === "buzz") { P(5, hy, 6, 1, hc); P(4, hy + 1, 8, 1, hc); }
    else {
      P(4, hy, 8, 2, hc);
      const side = st === "long" ? 7 : st === "bob" ? 4 : 2;
      P(4, hy + 2, 1, side, hc); P(11, hy + 2, 1, side, hc);
      if (st === "long" || st === "bob") P(5 + Math.max(0, lk), hy + 2, 5, 1, hc);
      if (st === "spiky") for (let x = 4; x < 12; x += 2) P(x, hy - 1, 1, 1, hc);
      if (st === "bun") P(6, hy - 2, 4, 2, hc);
    }
    P(6 + lk, hy + 4, 1, 1, "#222"); P(9 + lk, hy + 4, 1, 1, "#222");
    P(7 + lk, hy + 6, 2, 1, shade(sk, 0.8));
    if (s.glasses) { P(5 + lk, hy + 4, 3, 1, "#333"); P(8 + lk, hy + 4, 3, 1, "#333"); P(6 + lk, hy + 4, 1, 1, "#9cf"); P(9 + lk, hy + 4, 1, 1, "#9cf"); }
  }
  if (s.hat) { P(4, hy - 1, 8, 2, s.hat); if (!back) P(4, hy + 1, 8, 1, shade(s.hat)); }
  if (s.hood && !back) { P(3, hy, 1, 7, s.hood); P(12, hy, 1, 7, s.hood); P(4, hy - 1, 8, 1, s.hood); }
  const hx = o.arm === "up" ? 2 : 12;
  if (o.carry === 1) { P(hx, hand - 2, 2, 3, "#f4f4f4"); P(hx, hand - 2, 2, 1, "#9b6a3a"); }
  if (o.carry === 2) for (let k = 0; k < 9; k++) P(hx - (hx > 8 ? 0 : 1), hand - 8 + k, 3, 1, k % 2 ? "#cfcfcf" : "#fafafa");
}
// 테두리(어두운 1픽셀)를 둘러 CCTV에서도 잘 보이게
function uOutline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 0;
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * W + x) * 4);
  for (const i of add) { a[i] = 18; a[i + 1] = 18; a[i + 2] = 26; a[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}
function uSprite(p, key, o, flip) {
  const k = key + (flip ? "l" : "");
  if (p.cache[k]) return p.cache[k];
  const c = document.createElement("canvas"); c.width = 16; c.height = 31;
  const g = c.getContext("2d");
  if (flip) { g.translate(16, 0); g.scale(-1, 1); }
  uPaint(g, p.spec, o); g.setTransform(1, 0, 0, 1, 0, 0); uOutline(c);
  return (p.cache[k] = c);
}
// 시험용: 여러 종류 캐릭터를 한 장에 나열
export function mgDebugSprites(cv) {
  const types = ["student", "worker", "elder", "teen", "plain", "student", "worker", "teen"], poses = [["f", 0], ["f", 1], ["f", 3], ["b", 0], ["s", 1], ["s", 3], ["press"], ["sit"], ["cup"], ["stack"]];
  cv.width = poses.length * 18; cv.height = types.length * 33;
  const g = cv.getContext("2d"); g.fillStyle = "#cbbfa8"; g.fillRect(0, 0, cv.width, cv.height);
  types.forEach((t, r) => { const p = { spec: uSpec(t), cache: {} }; poses.forEach(([v, f], c) => {
    const o = v === "press" ? { v: "b", arm: "up" } : v === "sit" ? { v: "s", sit: true } : v === "cup" ? { v: "f", carry: 1 } : v === "stack" ? { v: "s", f: 1, carry: 2 } : { v, f };
    g.drawImage(uSprite(p, v + f, o, false), c * 18 + 1, r * 33 + 1); }); });
}
const U_DOOR = [19, 50], U_DOOR_IN = [19, 46], U_KIOSK = [58, 58], U_MACH = [103, 57], U_SHELF = [144, 56];
const U_TABLES = [[44, 118], [112, 118], [78, 168]];
const U_CHAIRS = [[32, 121, 1, 0], [56, 121, -1, 0], [100, 121, 1, 1], [124, 121, -1, 1], [66, 171, 1, 2], [90, 171, -1, 2]]; // x, y, 보는 방향, 탁자
function uBg() {
  const c = document.createElement("canvas"); c.width = UW; c.height = UH; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 바닥 타일
  for (let y = 48; y < UH; y += 10) for (let x = 0; x < UW; x += 10) { P(x, y, 10, 10, ((x + y) / 10) % 2 ? "#d8cdb8" : "#cbbfa8"); P(x, y, 10, 1, "#b9ad96"); P(x, y, 1, 10, "#c2b6a0"); }
  // 벽
  P(0, 0, UW, 48, "#cdbb9c"); for (let x = 0; x < UW; x += 16) P(x, 6, 1, 38, "#bfae90"); P(0, 0, UW, 6, "#8f7c62"); P(0, 44, UW, 4, "#7d6a52");
  // 유리문 틀과 바깥 거리
  P(8, 12, 22, 35, "#4b4b56"); P(10, 14, 18, 32, "#1d2530"); P(11, 30, 4, 1, "#e0c060"); P(20, 26, 3, 1, "#e0c060"); P(10, 40, 18, 6, "#2a3340");
  P(9, 6, 20, 5, "#2f3a2f"); for (let x = 11; x < 27; x += 2) P(x, 8, 1, 1, "#9fe0a8"); // 문 위 간판
  P(10, 48, 18, 6, "#4a5a4a"); // 발판
  // 메뉴판
  P(86, 6, 40, 13, "#2f3a2f"); for (let r = 0; r < 3; r++) { P(89, 9 + r * 3, 14, 1, "#cfe8d0"); P(112, 9 + r * 3, 10, 1, "#e9c46a"); }
  // 키오스크 몸통
  P(51, 46, 14, 3, "#2a2e36"); P(52, 20, 12, 27, "#3a3f4a"); P(53, 21, 10, 1, "#5a6070"); P(54, 23, 8, 10, "#111"); P(55, 36, 6, 2, "#999"); P(56, 40, 4, 3, "#2a2e36");
  // 카운터·커피 머신
  P(84, 30, 46, 3, "#a8875f"); P(84, 33, 46, 15, "#8a6a4a"); for (let x = 86; x < 128; x += 8) P(x, 35, 6, 11, "#7d5f42");
  P(96, 12, 15, 19, "#2b2b30"); P(98, 14, 11, 5, "#4a4a52"); P(99, 15, 1, 1, "#e94"); P(101, 15, 1, 1, "#5e5"); P(103, 21, 2, 4, "#777"); P(99, 27, 9, 2, "#555"); P(96, 12, 15, 1, "#44444c");
  P(116, 22, 8, 8, "#d9d9d9"); P(117, 23, 6, 1, "#bbb"); // 우유 냉장고
  // 컵 진열대(컵은 따로 그림)
  P(131, 12, 26, 36, "#6b5038"); for (const y of [21, 31, 41]) P(131, y, 26, 2, "#4a3626"); P(131, 12, 26, 1, "#8a6a4a");
  return c;
}
function gUC(host, ez, finish) {
  const T = 30;
  const F = frame(host, "ucafe", "CCTV 먹튀 잡기", "mg-cctv2");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-cvw"><canvas width="${UW}" height="${UH}"></canvas><div class="mg-rec">● REC</div><div class="mg-clock"></div><div class="mg-bubs"></div></div>`);
  const wrap = F.stage.querySelector(".mg-cvw"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), clock = wrap.querySelector(".mg-clock"), bubs = wrap.querySelector(".mg-bubs");
  // 정수배 확대
  let K = 2;
  const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / UW, sh / UH); K = r >= 2 ? Math.floor(r) : Math.max(1, r); wrap.style.width = UW * K + "px"; wrap.style.height = UH * K + "px"; };
  fit();
  const BG = uBg();
  // 덧씌우기(주사선·가장자리 어둡게)는 한 번만 만든다
  const OV = document.createElement("canvas"); OV.width = UW; OV.height = UH; { const o = OV.getContext("2d"); for (let y = 0; y < UH; y += 2) { o.fillStyle = "rgba(0,0,0,.16)"; o.fillRect(0, y, UW, 1); } const rg = o.createRadialGradient(UW / 2, UH / 2, 40, UW / 2, UH / 2, 135); rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(0,10,4,.75)"); o.fillStyle = rg; o.fillRect(0, 0, UW, UH); }
  const hh = 22 + rint(2), mm0 = rint(50);
  let caught = 0, missed = 0, wrong = 0, over = false, raf = 0, last = 0, t0 = 0, nextAt = 0.4, door = 0, noiseT = 2 + rnd() * 3, noiseOn = 0, secShown = -1;
  let cups = 15, teenOn = false;
  const ppl = [], chairs = U_CHAIRS.map(([x, y, d, t]) => ({ x, y, d, t, fall: 0, used: null }));
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = x * K + "px"; b.style.top = (y - 33) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  // 손님 만들기
  const mk = (type, route, o = {}) => ({ spec: uSpec(type), cache: {}, x: U_DOOR_IN[0] + (o.dx || 0), y: U_DOOR_IN[1], route, step: 0, wait: 0, walkT: rnd() * 4, v: "f", flip: false, carry: 0, pose: null, look: 0, alpha: 0, bad: !!o.bad, kind: o.kind || "ok", group: o.group || null, sp: o.sp || 16, fast: false, caught: false, angry: 0, seat: o.seat || null, gone: false });
  const freeSeat = () => { const fr = chairs.filter((c) => !c.used && !c.fall); return fr.length ? pick(fr) : null; };
  const spawn = (el) => {
    if (ppl.filter((p) => !p.gone).length >= 8) return;
    const prog = el / T, sp = (14 + prog * 12 + rnd() * 3) / ez, badP = 0.22 + 0.2 * prog;
    const type = () => pick(["student", "worker", "elder", "plain", "student", "worker"]);
    const R = (pt, act, wait) => ({ x: pt[0] + (rnd() - 0.5) * 4, y: pt[1] + (rnd() - 0.5) * 3, act, wait });
    if (rnd() < badP) {
      const r = rnd();
      if (r < 0.28 && prog > 0.2 && !teenOn) {
        const seat = freeSeat() || chairs[0], grp = { done: false, kind: "teen", members: [] }; teenOn = true;
        const n = 2 + rint(2);
        for (let i = 0; i < n; i++) { const p = mk("teen", [{ x: seat.x + (i - 1) * 7, y: seat.y + 6 + (i % 2) * 3, act: i === 0 ? "kick" : "noise", wait: 1.8, chair: seat }, { x: U_DOOR[0], y: U_DOOR[1], act: "exit" }], { bad: true, kind: "teen", group: grp, sp: sp * 1.2, dx: (i - 1) * 5 }); grp.members.push(p); ppl.push(p); }
        return;
      }
      if (r < 0.6) { ppl.push(mk(type(), [R(U_MACH, "cup", 1.1), { x: U_MACH[0], y: U_MACH[1] + 8, act: "look", wait: 1.2 }, { x: U_DOOR[0], y: U_DOOR[1], act: "exit" }], { bad: true, kind: "dash", sp })); return; }
      ppl.push(mk(type(), [R(U_SHELF, "grab", 2), { x: U_DOOR[0], y: U_DOOR[1], act: "exit" }], { bad: true, kind: "cups", sp })); return;
    }
    const r = rnd(), seat = r < 0.35 ? freeSeat() : null;
    const route = [];
    if (r > 0.75) route.push(R(U_SHELF, "grab1", 0.7));
    route.push(R(U_KIOSK, "press", 1.2), R(U_MACH, "cup", 1.3));
    if (seat) { seat.used = true; route.push({ x: seat.x, y: seat.y, act: "sit", wait: 2.2 + rnd() * 1.5, chair: seat }); }
    route.push({ x: U_DOOR[0], y: U_DOOR[1], act: "exit" });
    ppl.push(mk(type(), route, { sp: sp * (rnd() < 0.15 ? 0.75 : 1), seat }));
  };
  // 논리 좌표 → 무대 픽셀(효과 위치)
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / UW * r.width, r.top - s.top + y / UH * r.height]; };
  const catchP = (p) => {
    const grp = p.group ? p.group.members : [p];
    if (p.group) p.group.done = true;
    grp.forEach((q) => { q.caught = true; q.capT = 0; q.pose = null; q.v = "f"; });
    caught++;
    bubble(p.x, p.y, "잡았다!", "red"); F.hit(stageXY(p.x, p.y - 14), p.kind === "teen" ? 3 : 2, "#ff5a5a");
    F.msg(p.kind === "dash" ? "결제 안 한 손님 잡았다!" : p.kind === "cups" ? "컵 도둑 잡았다!" : "의자 넘어뜨린 무리 잡았다!");
    if (p.kind === "teen") teenOn = false;
    upd();
  };
  const tap = (lx, ly) => {
    if (over) return;
    let hit = null;
    for (const p of ppl) { if (p.gone || p.caught || p.alpha < 0.5) continue; if (lx >= p.x - 8 && lx <= p.x + 8 && ly >= p.y - 28 && ly <= p.y + 3 && (!hit || p.y > hit.y)) hit = p; }
    if (!hit) return;
    if (hit.bad) catchP(hit);
    else if (!hit.angry) { hit.angry = 1.6; wrong++; F.msg("단골이 화났어요. 감점"); bubble(hit.x, hit.y, "왜요?!", "angry"); F.miss(stageXY(hit.x, hit.y - 14)); upd(); }
  };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); tap((e.clientX - r.left) / r.width * UW, (e.clientY - r.top) / r.height * UH); });
  const upd = () => (F.sc.textContent = `잡음 ${caught} · 놓침 ${missed}`);
  // 한 사람 움직이기
  const step = (p, dt) => {
    if (p.caught) { p.capT += dt; if (p.capT > 1.1) { p.alpha -= dt * 3; if (p.alpha <= 0) p.gone = true; } return; }
    if (p.alpha < 1 && p.step === 0) p.alpha = Math.min(1, p.alpha + dt * 4);
    if (p.angry > 0) p.angry -= dt;
    const w = p.route[p.step];
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.pose === "look") p.look = Math.sin(p.wait * 9) > 0 ? 1 : -1;
      if (p.pose === "grab" && cups > 0 && Math.random() < dt * 3) { cups--; p.carry = 2; }
      if (p.wait <= 0) {
        if (w.act === "cup") p.carry = 1;
        if (w.act === "grab1" && cups > 0) { cups--; p.carry = 1; }
        if (w.act === "grab") p.carry = 2;
        if (w.act === "look") p.fast = true;
        if (w.act === "sit" && w.chair) w.chair.used = null;
        if (w.act === "kick") { /* 의자는 쓰러진 채 */ }
        p.pose = null; p.look = 0; p.step++;
      }
      return;
    }
    const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy), sp = p.sp * (p.fast ? 1.9 : 1) * (p.spec.elder ? 0.75 : 1), mv = sp * dt;
    if (d <= mv) {
      p.x = w.x; p.y = w.y;
      if (w.act === "exit") {
        // 문으로 나간다
        if (Math.hypot(p.x - U_DOOR_IN[0], p.y - U_DOOR_IN[1]) > 1) { p.route.push({ x: U_DOOR_IN[0], y: U_DOOR_IN[1], act: "gone" }); p.step++; return; }
      }
      if (w.act === "gone") {
        p.gone = true;
        if (p.bad && !p.caught) { const grp = p.group ? p.group.members : [p]; if (grp.every((q) => q.gone) && !(p.group && p.group.missed)) { if (p.group) p.group.missed = true; missed++; if (p.kind === "teen") teenOn = false; bubble(U_DOOR[0] + 8, U_DOOR[1], "놓쳤다…", "miss"); F.miss(null); F.msg(p.kind === "dash" ? "앗, 먹튀 손님이 나갔어요…" : p.kind === "cups" ? "컵을 잔뜩 들고 나갔어요…" : "무리가 그냥 나갔어요…"); upd(); } }
        return;
      }
      p.wait = w.wait || 0.01; p.pose = w.act;
      if (w.act === "kick" && w.chair) w.chair.fall = 1;
      return;
    }
    p.x += dx / d * mv; p.y += dy / d * mv; p.walkT += dt * sp / 9;
    if (Math.abs(dx) > Math.abs(dy) * 0.9) { p.v = "s"; p.flip = dx < 0; } else { p.v = dy < 0 ? "b" : "f"; }
  };
  // 사람 한 명 그리기
  const drawP = (p, tm) => {
    let key, o, flip = false;
    if (p.caught) { key = "cf" + p.carry; o = { v: "f", carry: p.carry }; }
    else if (p.wait > 0 && p.pose) {
      const pz = p.pose;
      if (pz === "press") { key = "press" + (Math.floor(tm * 4) % 2); o = { v: "b", arm: Math.floor(tm * 4) % 2 ? "up" : null }; }
      else if (pz === "cup" || pz === "grab1" || pz === "grab") { key = "bk" + p.carry; o = { v: "b", carry: p.carry }; }
      else if (pz === "look") { key = "lk" + p.look + p.carry; o = { v: "f", look: p.look, carry: p.carry }; }
      else if (pz === "sit") { const ch = p.route[p.step].chair; flip = ch && ch.d < 0; key = "sit" + p.carry; o = { v: "s", sit: true, carry: p.carry }; }
      else { const f = Math.floor(tm * 6) % 4; key = "f" + f; o = { v: "f", f }; }
    } else { const f = Math.floor(p.walkT) % 4; key = p.v + f + p.carry; o = { v: p.v, f, carry: p.carry }; flip = p.v === "s" && p.flip; }
    const c = uSprite(p, key, o, flip);
    g.globalAlpha = clamp(p.alpha, 0, 1);
    const x = Math.round(p.x - 8), y = Math.round(p.y - 29);
    g.drawImage(c, x, y);
    g.globalAlpha = 1;
    if (p.caught && Math.floor(p.capT * 7) % 2 === 0) { g.strokeStyle = "#ff3030"; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 1.5, 15, 29); }
    if (p.angry > 0) { g.fillStyle = "#ff4040"; const ax = x + 12, ay = y + 1; g.fillRect(ax, ay, 1, 1); g.fillRect(ax + 2, ay, 1, 1); g.fillRect(ax + 1, ay + 1, 1, 1); g.fillRect(ax, ay + 2, 1, 1); g.fillRect(ax + 2, ay + 2, 1, 1); }
    if (p.kind === "teen" && !p.caught && (p.pose === "kick" || p.pose === "noise" || p.fast || p.step > 0)) { g.fillStyle = "#ffe066"; const nx = x + 13 + (Math.floor(tm * 8) % 2), ny = y + 3; g.fillRect(nx, ny, 1, 3); g.fillRect(nx, ny + 4, 1, 1); g.fillRect(nx - 15, ny + 1, 1, 2); }
  };
  const drawChair = (c) => {
    const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    if (c.fall) { P(c.x - 7, c.y - 3, 11, 2, "#6a4630"); P(c.x - 2, c.y - 6, 2, 5, "#8a6648"); P(c.x + 3, c.y - 4, 3, 1, "#5a3a22"); P(c.x - 8, c.y - 1, 1, 1, "#999"); P(c.x + 6, c.y - 2, 1, 1, "#999"); return; }
    const bx = c.d > 0 ? c.x - 5 : c.x + 3;
    P(bx, c.y - 15, 2, 11, "#6a4630"); P(c.x - 4, c.y - 6, 8, 2, "#8a6648"); P(c.x - 3, c.y - 4, 1, 4, "#5a3a22"); P(c.x + 2, c.y - 4, 1, 4, "#5a3a22");
  };
  const drawTable = ([x, y]) => { const P = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(a, b, w, h); }; P(x - 9, y - 13, 18, 6, "#d9c4a3"); P(x - 9, y - 7, 18, 1, "#a88f6c"); P(x - 1, y - 6, 2, 6, "#5c4b3a"); P(x - 4, y - 1, 8, 1, "#5c4b3a"); };
  const drawPlant = (x, y) => { const P = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(a, b, w, h); }; P(x - 3, y - 5, 6, 5, "#a0522d"); P(x - 3, y - 5, 6, 1, "#c0703d"); P(x - 4, y - 11, 8, 6, "#3e8e4a"); P(x - 2, y - 14, 4, 3, "#4fae5a"); P(x - 5, y - 9, 2, 2, "#2f6e3a"); P(x + 3, y - 10, 2, 2, "#2f6e3a"); };
  const render = (tm) => {
    g.drawImage(BG, 0, 0);
    // 유리문(미닫이): 사람이 가까우면 열린다
    const near = ppl.some((p) => !p.gone && Math.hypot(p.x - U_DOOR[0], p.y - U_DOOR[1]) < 16);
    door = clamp(door + (near ? 0.06 : -0.04), 0, 1);
    g.save(); g.beginPath(); g.rect(10, 14, 18, 32); g.clip();
    const o = Math.round(door * 8);
    for (const [px0, dir] of [[10, -1], [19, 1]]) { const px = px0 + dir * o; g.fillStyle = "rgba(156,195,207,.55)"; g.fillRect(px, 14, 9, 32); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(px + 2, 16, 1, 6); g.fillRect(px + 3, 15, 1, 3); g.fillStyle = "#4b4b56"; g.fillRect(px + (dir < 0 ? 8 : 0), 14, 1, 32); }
    g.restore();
    // 키오스크 화면 깜빡, 누르는 사람이 있으면 결제 화면
    const paying = ppl.some((p) => p.pose === "press" && p.wait > 0);
    g.fillStyle = paying ? (Math.floor(tm * 6) % 2 ? "#e9c46a" : "#7fd1ff") : Math.floor(tm * 1.5) % 2 ? "#3a7bd5" : "#2f68b8"; g.fillRect(55, 24, 6, 8);
    g.fillStyle = "#cfe8ff"; g.fillRect(56, 26, 4, 1); g.fillRect(56, 28, 3, 1);
    // 커피 머신 김
    const brew = ppl.some((p) => p.pose === "cup" && p.wait > 0);
    for (let i = 0; i < (brew ? 4 : 1); i++) { const ph = (tm * 0.9 + i * 0.27) % 1; g.fillStyle = `rgba(240,240,240,${0.7 * (1 - ph)})`; g.fillRect(103 + Math.round(Math.sin((tm + i) * 5) * 1.5), 24 - Math.round(ph * 16), 2, 1); }
    // 진열대 컵
    for (let i = 0; i < cups; i++) { const row = Math.floor(i / 5), col = i % 5; g.fillStyle = "#f4f4f4"; g.fillRect(134 + col * 4, 17 + row * 10, 3, 4); g.fillStyle = "#ccc"; g.fillRect(134 + col * 4, 17 + row * 10, 3, 1); }
    // 깊이 순서대로: 탁자·의자·화분·사람
    const items = [];
    U_TABLES.forEach((t) => items.push([t[1], () => drawTable(t)]));
    chairs.forEach((c) => items.push([c.y - 1, () => drawChair(c)]));
    items.push([66, () => drawPlant(152, 66)], [190, () => drawPlant(8, 190)], [150, () => drawPlant(152, 150)]);
    ppl.forEach((p) => { if (!p.gone) items.push([p.y + (p.pose === "sit" && p.wait > 0 ? 0.5 : 0), () => drawP(p, tm)]); });
    items.sort((a, b) => a[0] - b[0]).forEach((it) => it[1]());
    // CCTV 톤: 흑백 → 녹색 → 어두운 곳 살짝 띄우기
    g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(128,128,128,.6)"; g.fillRect(0, 0, UW, UH);
    g.globalCompositeOperation = "multiply"; g.fillStyle = "#c4f3cb"; g.fillRect(0, 0, UW, UH);
    g.globalCompositeOperation = "screen"; g.fillStyle = "#0b2212"; g.fillRect(0, 0, UW, UH);
    g.globalCompositeOperation = "source-over";
    // 잡힌 사람 빨간 테두리는 색을 살려 다시
    ppl.forEach((p) => { if (p.caught && !p.gone && Math.floor(p.capT * 7) % 2 === 0) { g.strokeStyle = "#ff3030"; g.strokeRect(Math.round(p.x - 8) + 0.5, Math.round(p.y - 29) + 1.5, 15, 29); } if (p.angry > 0 && !p.gone) { g.fillStyle = "#ff4040"; const ax = Math.round(p.x) + 4, ay = Math.round(p.y) - 28; g.fillRect(ax, ay, 1, 1); g.fillRect(ax + 2, ay, 1, 1); g.fillRect(ax + 1, ay + 1, 1, 1); g.fillRect(ax, ay + 2, 1, 1); g.fillRect(ax + 2, ay + 2, 1, 1); } });
    g.drawImage(OV, 0, 0);
    // 가끔 노이즈 줄
    if (noiseOn > 0) { for (let k = 0; k < 3; k++) { const y = Math.floor(rnd() * UH); g.fillStyle = "rgba(200,255,210,.18)"; g.fillRect(0, y, UW, 1 + rint(2)); } for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(220,255,230,${rnd() * 0.4})`; g.fillRect(rint(UW), rint(UH), 1, 1); } }
  };
  const loop = (now) => {
    if (over) return;
    if (!t0) { t0 = now; last = now; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const el = (now - t0) / 1000;
    const s = Math.floor(el); if (s !== secShown) { secShown = s; const mm = (mm0 + Math.floor(s / 60)) % 60; clock.textContent = `CAM 02  ${hh}:${String(mm).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
    if (el >= nextAt) { spawn(el); nextAt = el + (3.0 - 1.9 * Math.min(1, el / T)) * (0.75 + rnd() * 0.5); }
    noiseT -= dt; if (noiseT <= 0) { noiseOn = 0.14; noiseT = 2 + rnd() * 3; } if (noiseOn > 0) noiseOn -= dt;
    for (const p of ppl) if (!p.gone) step(p, dt);
    for (let i = ppl.length - 1; i >= 0; i--) if (ppl[i].gone) ppl.splice(i, 1);
    render(el);
    raf = requestAnimationFrame(loop);
  };
  const end = () => {
    if (over) return; over = true; cancelAnimationFrame(raf);
    const judged = caught + missed, acc = judged ? caught / judged : 1;
    const s = acc * 0.9 + 0.1 - wrong * 0.12;
    finish(s, `먹튀 ${caught}명 잡음 · ${missed}명 놓침${wrong ? ` · 정상 손님 ${wrong}명 오해` : ""}`, "", [["잡은 비율", acc], ["오해 없이", Math.max(0, 1 - wrong * 0.25)]]);
  };
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.uc = { ppl, cv };
  timer(T, F.bar, end);
  upd(); render(0); raf = requestAnimationFrame(loop);
}

// ───────── 5. 인별그램 사진 한 장 ─────────
const SUBJ = [["☕", "카페 라떼"], ["🐶", "산책하는 강아지"], ["🌅", "노을"], ["🍰", "딸기 케이크"], ["🐱", "골목 고양이"], ["🌸", "벚꽃 잎"], ["🍜", "김 나는 라멘"], ["🛹", "스케이트보드"], ["🎈", "풍선"], ["🦋", "나비"], ["🍦", "아이스크림"], ["🚲", "자전거"]];
const CAM_BG = ["cafe", "rooftop", "gallery", "home", "popup", "alley"];
// 셔터 소리: 누른 뒤에만 재생(브라우저 정책)
let AC = null;
function shutterSound() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
    const t = AC.currentTime, len = 0.09, buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    for (const [at, g0] of [[0, 0.5], [0.07, 0.35]]) {
      const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain();
      src.buffer = buf; hp.type = "highpass"; hp.frequency.value = 1800; g.gain.value = g0;
      src.connect(hp).connect(g).connect(AC.destination); src.start(t + at);
    }
  } catch (e) {}
}
function gIN(host, ez, finish) {
  const N = 3, subs = shuffle(SUBJ).slice(0, N), bg = `img/bg/${pick(CAM_BG)}.webp`;
  const F = frame(host, "insta", "사진 한 장", "mg-cam", bg, `<div class="mg-shots">${subs.map(() => "<span>-</span>").join("")}</div><button class="mg-shut" data-shut aria-label="셔터"></button>`);
  F.foot.style.alignItems = "center"; F.foot.style.justifyContent = "space-between";
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-frame"></div><div class="mg-subj"></div><div class="mg-flash"></div><div class="mg-click">찰칵!</div>`);
  const frameEl = F.stage.querySelector(".mg-frame"), shotV = [];
  const subj = F.stage.querySelector(".mg-subj"), flash = F.stage.querySelector(".mg-flash"), click = F.stage.querySelector(".mg-click"), shots = F.foot.querySelectorAll(".mg-shots span");
  let k = 0, raf = 0, over = false, sum = 0, passes = 0, t0 = 0, cur = null, busy = false, likesAll = 0;
  F.bar.style.transform = "scaleX(1)";
  const setup = () => {
    if (k >= N) return end();
    const dir = rnd() < 0.5 ? 1 : -1, speed = (0.22 + k * 0.08 + rnd() * 0.08) / ez; // 화면 폭 비율/초
    cur = { dir, speed, y0: 35 + rnd() * 30, amp: 4 + rnd() * 14, f: 1.2 + rnd() * 2.2, ph: rnd() * 6 };
    subj.textContent = subs[k][0]; subj.style.visibility = ""; passes = 0; t0 = performance.now(); busy = false; F.sc.textContent = `${k + 1}/${N}장`;
    F.msg(`${subs[k][1]}이(가) 지나가요`);
  };
  const pos = () => {
    const t = (performance.now() - t0) / 1000, run = (t * cur.speed) % 1.3;
    const p = run - 0.15, x = cur.dir > 0 ? p * 100 : 100 - p * 100;
    const y = cur.y0 + Math.sin(t * cur.f + cur.ph) * cur.amp;
    passes = Math.floor(t * cur.speed / 1.3);
    return [x, y];
  };
  const loop = () => {
    if (over) return;
    if (!busy) { const [x, y] = pos(); subj.style.left = x + "%"; subj.style.top = y + "%"; { const W = F.stage.clientWidth, H = F.stage.clientHeight; frameEl.classList.toggle("focus", Math.hypot((x - 50) / 100 * W, (y - 50) / 100 * H) < Math.min(W, H) * 0.09); } F.bar.style.transform = `scaleX(${clamp(1 - passes / 3, 0, 1)})`; if (passes >= 3) shoot(true); }
    raf = requestAnimationFrame(loop);
  };
  // 폴라로이드: 찍힌 장면이 툭 떨어지며 기울어지고, 좋아요가 팡 올라간다
  const polaroid = (x, y, v) => {
    const good = v >= 0.6, likes = Math.round(20 + v * v * 900 + rnd() * 40); likesAll += likes;
    const rot = (rnd() * 14 - 7).toFixed(1);
    const el = document.createElement("div"); el.className = "mg-pola" + (good ? "" : " blur"); el.style.setProperty("--r", rot + "deg");
    el.innerHTML = `<div class="mg-pimg" style="background-image:url(${bg});background-position:${x}% ${y}%"><span style="left:${50 + (x - 50) * 1.6}%;top:${50 + (y - 50) * 1.6}%">${subs[k][0]}</span></div><div class="mg-pcap">${good ? (v > 0.85 ? "인생샷!" : "잘 찍혔다!") : "아깝다…"}</div><div class="mg-plike">❤️ <b>0</b></div>`;
    F.stage.appendChild(el);
    const b = el.querySelector(".mg-plike b"), t1 = performance.now(), dur = good ? 900 : 500;
    const cnt = () => { const p = Math.min(1, (performance.now() - t1 - 350) / dur); if (p > 0) b.textContent = Math.round(likes * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1 && el.isConnected) requestAnimationFrame(cnt); else if (good) el.querySelector(".mg-plike").classList.add("pang"); };
    requestAnimationFrame(cnt);
    if (good) for (let i = 0; i < (v > 0.85 ? 16 : 9); i++) { const h = document.createElement("i"); h.className = "mg-heart"; h.textContent = pick(["❤️", "💖", "💗", "🧡"]); h.style.left = 30 + rnd() * 40 + "%"; h.style.setProperty("--dx", (rnd() * 160 - 80) + "px"); h.style.setProperty("--dy", -(80 + rnd() * 140) + "px"); h.style.animationDelay = 0.35 + rnd() * 0.5 + "s"; F.stage.appendChild(h); setTimeout(() => h.remove(), 2000); }
    setTimeout(() => el.classList.add("away"), 1500); setTimeout(() => el.remove(), 1900);
    return likes;
  };
  const shoot = (miss) => {
    if (over || k >= N || busy) return;
    busy = true; let v = 0;
    if (!miss) {
      const [x, y] = pos(), W = F.stage.clientWidth || 1, H = F.stage.clientHeight || 1;
      const dx = (x - 50) / 100 * W, dy = (y - 50) / 100 * H, d = Math.hypot(dx, dy), R = Math.min(W, H) * 0.42;
      v = Math.pow(clamp(1 - d / R, 0, 1), 0.8);
      shutterSound();
      flash.classList.toggle("soft", v < 0.6); flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
      click.classList.remove("on"); void click.offsetWidth; click.classList.add("on");
      subj.style.visibility = "hidden";
      polaroid(x, y, v); frameEl.classList.remove("focus");
      if (v >= 0.6) F.hit([F.stage.clientWidth / 2, F.stage.clientHeight * 0.28], Math.round(v * 10), "#ff8fc8"); else F.miss(null);
    }
    sum += v; shotV.push(v);
    shots[k].innerHTML = miss ? "놓침" : `<b>${Math.round(v * 100)}</b>`;
    if (miss) F.msg("세 번 지나가는 동안 못 찍었어요");
    k++; setTimeout(k < N ? setup : end, miss ? 600 : 2000);
  };
  const end = () => {
    if (over) return; over = true; cancelAnimationFrame(raf);
    const s = sum / N;
    finish(s, `구도 평균 ${Math.round(s * 100)}점 · 좋아요 ${likesAll.toLocaleString()}개`, "", shotV.map((v, j) => [`${j + 1}번째 사진`, v]));
  };
  F.foot.querySelector("[data-shut]").onclick = () => { if (cur && !busy) shoot(false); };
  setup(); raf = requestAnimationFrame(loop);
}

const GAMES = { pr: gPR, cs: gCS, airbnb: gAB, ucafe: gUC, insta: gIN2 };

// 다른 파일(mg_in.js 등)에서 쓰는 공통 도구
// 2탄 등록(처음 부를 때 한 번). mg2 파일들이 다 읽힌 뒤라 안전
let mg2Done = false;
function mg2Init() {
  if (mg2Done) return; mg2Done = true;
  for (const g of MG2) { MG[g.key] = { n: g.n, desc: g.desc, how: g.how, base: g.base }; GAMES[g.key] = g.run; JC[g.key] = JC[g.base]; }
}
// 투잡(base)의 미니게임 목록: 1탄 + 2탄
export function mgKeys(base) { mg2Init(); return Object.keys(MG).filter((k) => k === base || MG[k].base === base); }
export { mg2Init };
export { easeOf, gradeOf, uSpec, uSprite, uPaint, uOutline };
export { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, shutterSound };
