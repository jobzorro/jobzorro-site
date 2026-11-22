// After 6PM 투잡 미니게임 5개 (v4.15)
// mgRun(job, host, { skill }) → Promise<{ score: 0~1, grade, line }>
// 한 판 20~40초, 한 손 터치. 실력(skill 0~200)은 시간 여유·속도에만 반영하고 점수는 손 실력으로 낸다.

export const MG = {
  pr: { n: "파티는 끝났다", desc: "다음 손님 오기 전에 파티룸을 되살려요", how: ["시작하면 <b>체크인 때 사진</b>이 3초 보여요. 소파·스피커·조명 같은 가구·기기 자리를 기억해요.", "손님이 놀고 가서 엉뚱한 곳에 간 가구·기기를 <b>끌어서</b> 원래 자리에 놓아요. 가까우면 딱 붙어요.", "컵·피자 상자·캔 같은 쓰레기는 톡톡 치우고, 반짝이는 <b>분실물</b>(지갑·휴대폰·열쇠 등)은 아래 <b>분실물</b> 버튼으로 바꾼 뒤 눌러 모아요. 버리면 감점.", "기억이 안 나면 <b>사진</b> 버튼을 누르고 있는 동안 체크인 때 자리가 잔상으로 겹쳐 보여요(3번)."] },
  cs: { n: "자소서 심폐소생술", desc: "자소서에서 고칠 문장을 찾아요", how: ["자소서 한 항목이 나와요. <b>고쳐야 할 문장</b>을 찾아 톡.", "고칠 문장: 결론 없는 서두, AI 티 나는 상투어, 숫자 없는 막연한 성과, 다른 이야기로 새는 문장.", "멀쩡한 문장을 누르면 감점이에요."] },
  airbnb: { n: "인간 번역기", desc: "외국인 손님 메시지에 바로 답해요", how: ["손님 메시지 5개가 차례로 와요.", "맞는 답장 3개 중 하나를 골라요. 작은 글씨가 한국어 뜻인데, 외국어 실력이 낮으면 ***로 가려져요.", "빨리 맞힐수록 별점이 올라요."] },
  ucafe: { n: "사장님은 잠복 중", desc: "밤 무인카페 CCTV, 수상한 손님을 잡아요", how: ["손님은 <b>문 → 키오스크(카드 결제) → 커피 머신 → 문</b>으로 다녀요. 앉았다 가는 손님도 있어요.", "수상한 손님을 나가기 전에 톡! <b>키오스크를 건너뛰고</b> 커피만 들고 두리번거리다 빨리 나가는 손님, 진열대에서 <b>컵을 잔뜩</b> 쌓아 가는 손님, <b>의자를 넘어뜨리는</b> 10대 무리.", "정상 손님을 누르면 단골이 화나서 감점. 처음엔 한산하다가 점점 붐벼요."] },
  insta: { n: "이건 인생샷 각", desc: "여행 중 갑자기 나타난 장관을 찍어 떡상해요", how: ["여행지에서 '뭘 올리지…' 하는 순간, 갑자기 <b>고래·토네이도·유성·번개·오로라·불꽃</b> 중 하나가 나타나요.", "처음엔 화면 밖에 있어요. <b>화면을 끌어</b> 카메라를 돌려 가운데 초점 틀(초록)에 담아요.", "오른쪽 <b>분위기</b> 막대가 꼭대기에 닿을 때 셔터! 구도와 타이밍으로 좋아요가 정해져요."] },
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
.mg-foot .mg-btn.mg-re{flex-direction:column!important;gap:1px;line-height:1.2;font-weight:900;border-color:var(--mgg)!important;color:var(--mgg)!important}.mg-btn.mg-re small{display:block;font-size:11px;font-weight:600;opacity:.8;color:#fff}
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
.mg-airbnb .mg-stage{background-size:cover;background-position:62% 50%}
.mg-airbnb .mg-chat{z-index:1;background:linear-gradient(180deg,#0e102026 0%,#0e102040 28%,#0e1020d8 50%,#0e1020f4)}
.ab-gu{position:absolute;top:6px;left:5%;z-index:0;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transform:translateX(-36px);transition:opacity .35s,transform .4s cubic-bezier(.2,1.2,.4,1);filter:drop-shadow(0 8px 14px #000a);pointer-events:none;-webkit-mask-image:linear-gradient(#000 72%,transparent 98%);mask-image:linear-gradient(#000 72%,transparent 98%)}
.ab-gu.on{opacity:1;transform:none}
.ab-gu.out{opacity:0;transform:translateX(46px);transition:opacity .3s,transform .35s ease-in}
.ab-gu i{position:absolute;right:2%;top:58%;font-style:normal;font-size:22px;filter:drop-shadow(0 2px 3px #000)}
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
@media (max-height:680px){.cs-top{height:62px}.mg-cs .mg-paper{top:62px!important}.cs-me{width:52px;height:68px}.cs-say{left:66px;font-size:12px}.mg-parts button i{font-size:18px}.mg-cafe{gap:7px;padding:9px}.mg-paper{font-size:13.5px;line-height:1.65}.mg-intro ol{font-size:13px}.mg-subj{font-size:44px}.mg-shut{width:58px;height:58px}}
`;
function inject() {
  if (typeof document === "undefined" || document.getElementById("mgcss")) return;
  const s = document.createElement("style"); s.id = "mgcss"; s.textContent = CSS + CSS2; document.head.appendChild(s);
}
const CSS2 = `
/* 빨간펜: 펜이 직접 줄을 긋는다 */
.mg-sen.hit{text-decoration:none!important;color:#8e2b2b!important;background:#ffcdd233!important}
.mg-strk{position:absolute;pointer-events:none;overflow:visible;z-index:3}
.mg-strk path{fill:none;stroke:#d32f2f;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:.92}
.mg-pen{position:absolute;left:0;top:0;z-index:4;font-size:24px;line-height:1;pointer-events:none;filter:drop-shadow(1px 3px 2px #0006)}
.mg-pen svg{display:block;transform:translate(-4px,-6px)}
.mg-cs .mg-stage{background:#2a2236 url(img/bg/consult.webp) 30% 40%/cover no-repeat}
.cs-top{position:absolute;left:0;right:0;top:0;height:78px;z-index:1;background:linear-gradient(90deg,#120e1ccc,#120e1c55 45%,#120e1c99)}
.cs-me{position:absolute;left:8px;bottom:0;width:64px;height:84px;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .4s;filter:drop-shadow(0 4px 8px #000a)}
.cs-me.on{opacity:1}
.cs-say{position:absolute;left:80px;right:10px;top:50%;transform:translateY(-50%);background:#fffdf8;color:#2a2230;font-size:13px;font-weight:800;line-height:1.35;padding:7px 11px;border-radius:14px 14px 14px 4px;box-shadow:0 3px 10px #0007;word-break:keep-all}
.cs-say::before{content:"";position:absolute;left:-6px;bottom:8px;border:6px solid transparent;border-right-color:#fffdf8;border-left:0}
.cs-say.pop{animation:cspop .3s cubic-bezier(.3,1.6,.5,1)}
@keyframes cspop{from{transform:translateY(-50%) scale(.85);opacity:.3}}
.mg-cs .mg-paper{top:78px!important;border-radius:4px 4px 0 0}
.mg-xx{position:absolute;z-index:4;color:#d32f2f;font-weight:900;font-size:24px;line-height:1;transform:translate(-50%,-50%) scale(0);animation:mgxx .3s forwards;pointer-events:none}
@keyframes mgxx{to{transform:translate(-50%,-50%) scale(1) rotate(-8deg)}}
/* 퇴실 청소 도트 */
.mg-prst{background:#0d0818!important}
.mg-prw{position:absolute;inset:0}
.mg-prw canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.mg-prpola{position:absolute;left:50%;top:48%;width:80%;z-index:5;background:#fbfaf5;padding:6px 6px 0;border-radius:3px;box-shadow:0 12px 28px #000c;transform:translate(-50%,-50%) rotate(-3deg);animation:mgprin .5s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
.mg-prpola img{display:block;width:100%;aspect-ratio:160/200;object-fit:cover;background:#3a2552}
.mg-prpola b{display:block;color:#3a3340;font-size:12.5px;text-align:center;padding:6px 0 8px;font-weight:800;white-space:nowrap}
.mg-prpola b i{font-style:normal;color:#c2416b;font-size:15px;margin-left:2px}
@keyframes mgprin{from{transform:translate(-50%,-140%) rotate(8deg);opacity:0}}
.mg-prpola.away{transition:transform .45s ease-in,opacity .45s;transform:translate(60%,-160%) rotate(24deg) scale(.5);opacity:0}
.mg-prcap{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:5;background:#fff;color:#333;font-size:12px;font-weight:800;padding:4px 10px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px #0008;display:none;pointer-events:none}
.mg-prcap.on{display:block}
.mg-pr .mg-foot .mg-btn{font-size:13.5px;padding:7px 4px;display:flex;align-items:center;justify-content:center;gap:4px}
.mg-pr .mg-foot .mg-btn img{width:24px;height:auto;flex:0 0 auto;filter:drop-shadow(0 1px 1px #0008)}
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
.mg-prop small{display:block;font-size:11px;color:#b8ffcf;margin-top:3px;font-family:ui-monospace,monospace;white-space:nowrap}
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
.mg-cctv2{background:#06100a!important}
.mg-cvw{position:absolute;inset:0}
.mg-cvw canvas{width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
.uc-zoom{position:absolute;right:8px;bottom:8px;z-index:24;width:100px;padding:4px 4px 3px;background:#0c0f0d;border:2px solid #ff3b3b;border-radius:8px;box-shadow:0 6px 16px #000b;opacity:0;transform:scale(.6) rotate(6deg);transition:opacity .15s,transform .25s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
.uc-zoom.on{opacity:1;transform:rotate(-3deg)}
.uc-zoom.ok{border-color:#ffb02e}
.uc-zoom i{display:block;width:100%;aspect-ratio:240/312;background-size:300% 346.15%;background-repeat:no-repeat;border-radius:4px;background-color:#26362c}
.uc-zoom b{display:block;font-size:11px;color:#fff;text-align:center;margin-top:3px;font-weight:900;white-space:nowrap;letter-spacing:-.3px}
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
// 미니게임 2탄·3탄·새 투잡 게임(mg2/*.js)과 인별그램 1탄(mg_in.js)은 실제로 할 때만 받는다(11-21, 첫 화면을 가볍게).
// 받기 전에 필요한 이름·설명·색은 아래 목록에서 읽는다. 받으면 파일 안 값(GAME)으로 덮어쓴다.
// ── MG2_LIST 시작 (자동 생성: tools/mg_manifest.cjs — 직접 고치지 말 것) ──
const MG2_LIST = {
  airbnb2: {"base":"airbnb","n":"인간 돋보기","desc":"손님 오기 전, 지난번 완벽했던 방 사진과 지금 방을 비교해 다른 곳을 찾아요.","how":["위는 <b>지난번 손님 맞이 사진</b>, 아래는 <b>지금 방</b>이에요","아래 그림에서 <b>다른 곳 5개</b>를 톡! 틀리면 감점과 시간 -1초","<b>돋보기</b>를 누르고 사진을 꾹 누르면 크게 보여요. 손님이 문 앞까지 와요!"]},
  airbnb3: {"base":"airbnb","n":"인간 내비게이션","desc":"역에서 헤매는 외국인 손님에게 숙소까지 길을 그려 줘요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 캐리어 끄는 손님이 역·정류장에서 <b>\"Where is it?\"</b> 하고 전화해요.","손님을 <b>꾹 누른 채</b> 골목을 따라 <b>숙소 핀</b>까지 손가락으로 길을 그려요. 손님이 그 길 그대로 걸어가요.","<b>공사장</b>은 못 지나가요. <b>계단</b>(캐리어로 지침)·<b>비 오는 골목</b>·<b>일방통행 역방향</b>·<b>먼 길</b>은 감점! 빨리 안내할수록 좋아요."]},
  chicken1: {"base":"chicken","n":"치킨은 겉바속촉","desc":"황금색일 때 건져야 리뷰가 ★5","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문표가 들어오면 <b>반죽한 닭</b>을 끌어 <b>튀김 바구니</b>에 넣어요.","튀김 색이 연노랑 → <b>황금</b> → 갈색 → 탄 색으로 변해요. <b>황금색일 때</b> 바구니를 <b>위로 쓱</b> 끌어 올려요. 타면 버리고 다시 튀겨야 해요.","주문표대로 <b>소스 통을 톡</b> → 볼을 <b>문질러</b> 버무리고, 박스에 <b>치킨무를 톡</b>! 무를 빠뜨리면 별점이 깎여요. 불이 세지면 <b>불 손잡이를 톡</b>."],"jc":"#ffb03b"},
  chicken2: {"base":"chicken","n":"치킨은 식기 전에","desc":"축구 하는 밤, 식기 전에 라이더를 보내요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 치킨이 튀겨지면 가게 앞에 박스가 쌓여요. <b>라이더를 끌어</b> 주문 핀까지 길을 그어요.","가까운 주문은 핀 <b>여러 개를 차례로 지나가게</b> 끌면 한 번에 묶어 보내요(가방 최대 3개). 핀 아래 막대는 <b>식는 시계</b>, 파랗게 식으면 별점이 깎여요.","라이더가 그만두면 <b>배달대행</b>을 톡(수수료가 나가요). <b>오배송</b>은 ? 핀에서 회수 → ! 핀으로, <b>단체 주문</b>은 박스를 한 번에 실어요."],"jc":"#ffb03b"},
  chicken3: {"base":"chicken","n":"치킨은 사람 장사","desc":"일요일 밤, 다음 주 근무표 짜기","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 아래 <b>알바 카드</b>를 끌어 위 근무표 칸에 놓아요. 놓기 전에 <b>옆으로 쓱</b> 밀거나 <b>블록 끝을 끌면</b> 여러 날이 한 번에 채워져요.","빨간 <b>피크</b>(금·토, 축구 경기 날)는 <b>두 명</b>, 그중 <b>튀김</b>과 <b>배달</b>이 꼭 있어야 해요. 카드의 가능 시간·숙련·성격(지각 잦음, 시험 기간)을 보고 골라요.","<b>인건비 막대</b>가 예산을 넘으면 안 돼요. 한 사람이 <b>주 15시간</b>을 넘기면 주휴수당이 붙어 확 뛰어요. 빈 칸은 <b>사장님이 직접</b> 들어가요(체력↓). 중간에 '못 나와요' 문자가 올 수도…"],"jc":"#ffb03b"},
  cs2: {"base":"cs","n":"면접관 독심술","desc":"멘티 모의면접, 면접관 마음을 읽고 답을 짜 줘요","how":["면접관이 질문해요. 먼저 <b>면접관이 정말 확인하려는 것</b>(질문 의도)을 3개 중에서 골라요.","답 카드 6장 중 3장을 <b>결론 → 근거 사례 → 회사 연결</b> 순서로 톡톡. 두괄식, 사실과 숫자, 회사에 줄 이익이 정답이에요.","함정 카드 조심! 장황한 서두, AI 티 나는 상투어, 숫자 없는 말, 회사와 무관한 말, 남 탓. 시간이 줄면 멘티가 땀을 흘려요. 면접관 <b>표정</b>도 잘 봐요."]},
  cs3: {"base":"cs","n":"공고 중매술","desc":"멘티에게 맞는 공고만 쏙쏙, 서류 합격 알림을 쌓아요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 위에 <b>멘티 프로필</b>(희망 직무·경력·지역)이 있고, 채용공고가 한 장씩 날아와요.","맞는 공고는 <b>오른쪽으로 밀어 지원!</b> 직무·경력·근무지가 안 맞거나 <b>수상한 문구</b>(열정페이 같은)가 있으면 <b>왼쪽으로 패스</b>. <b>오픈 예정</b> 공고는 <b>위로 밀어 찜</b>.","<b>대기업</b>은 비슷한 직무여도 지원하면 보너스(회사가 직무보다 중요!). <b>D-1·D-DAY</b> 공고는 불타기 전에 빨리. 많이, 정확하게 지원할수록 멘티 폰에 <b>서류 합격</b>이 쌓여요."]},
  insta2: {"base":"insta","n":"이건 라방 떡상 각","desc":"떨리는 첫 라이브, 채팅을 받아 치며 시청자를 모아요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 채팅이 아래에서 올라오면 <b>좋은 질문·칭찬</b>은 톡 해서 답하면 시청자와 하트가 늘어요.","<b>악플·도배·광고</b>는 옆으로 <b>밀어서</b> 가려요. 악플에 답하거나, 가리지 않고 두면 분위기가 싸해져요.","<b>금색</b> 협찬 문의·후원은 큰 보너스! 중간에 <b>링크 주세요!</b>가 몰리면 원이 꽉 찼을 때 <b>공구 링크</b> 버튼을 눌러요. 그다음엔 떡상 구간이 와요."]},
  insta3: {"base":"insta","n":"이건 칼박 숏폼 각","desc":"퇴근 후 찍은 영상을 음악 박자에 맞춰 잘라 떡상 릴스를 만들어요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 음악에 맞춰 <b>가위 표시</b>가 흘러와요. <b>빨간 선</b>에 닿는 순간 화면 아무 데나 톡 하면 컷이 바뀌어요.","<b>보라 화살표</b>는 전환 효과! 그 방향으로 <b>쓱 밀어요</b>. <b>노란 자막 막대</b>는 꾹 누르고 있다가 막대 끝에서 떼요.","박자에 딱 맞으면 <b>Perfect</b>, 어긋나면 화면이 튀어요. 다 끝나면 내가 만든 릴스가 재생되고 <b>조회수</b>가 정해져요!"]},
  pr2: {"base":"pr","n":"파티는 빈틈없이","desc":"금·토·일 파티룸 주말 달력에 예약을 꽉꽉 끼워 넣어요.","how":["위에 뜬 예약 알림을 <b>끌어서</b> 달력 빈 칸에 끼워요. 한 칸은 2시간이에요.","예약 사이엔 <b>청소 1칸</b>이 꼭 필요해요. 붙이면 빨갛게 안 돼요. <b>위로 밀면 거절</b>.","<b>금색 단체 예약</b>은 큰돈! 한 요일을 꽉 채우면 <b>만실</b> 보너스."]},
  pr3: {"base":"pr","n":"파티는 소곤소곤","desc":"밤 11시, 파티룸의 흥은 지키고 이웃은 재워요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 파티룸 3칸이 영업 중이고, <b>옆집·아래층</b> 이웃은 자고 있어요.","손님들이 자꾸 볼륨을 올려요. <b>시끄러운 방을 톡</b>하면 '조금만 낮춰 주세요' 문자가 가서 한 칸 내려가요. <b>열린 창문</b>은 톡해서 닫아요.","너무 낮추면 손님이 <b>노잼</b>이라 별점이 떨어져요. 스피커 칸이 <b>초록</b>이면 딱 좋아요. <b>생일 케이크 떼창</b>은 막지 말고 다른 방을 미리 낮춰요. 이웃이 <b>112</b>에 신고하면 경찰차가 오기 전에 전부 조용히!"]},
  tarot1: {"base":"tarot","n":"카드빨보다 말빨","desc":"플리마켓 타로 부스, 카드보다 상담이 본업이에요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님이 고민을 말하면 가운데 <b>덱을 좌우로 문질러</b> 섞어요.","카드 3장이 펼쳐지면 손님이 고른 <b>반짝이는 카드</b>를 톡! 카드가 <b>거꾸로</b> 나오면 역방향 뜻이에요. 방향에 맞는 뜻을 골라요.","손님 <b>표정</b>을 보고 말투를 골라요. 글썽이며 꼼지락대면 <b>따뜻하게</b>, 팔짱 끼고 한숨 쉬면 <b>솔직하게</b>. 만족하면 팁과 단골 예약이 붙어요."],"jc":"#b48cff"},
  tarot2: {"base":"tarot","n":"눈치빨 상담실","desc":"카페 상담실 타로, 카드보다 상담이 본업이에요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님이 별일 아닌 척 이야기하는 동안 <b>몸짓에 단서</b>가 잠깐씩 스쳐요.","<b>반지 만지작·폰 알림·사원증 줄·문 쪽 시선·한숨·다리 떨기·통지서</b>가 보이면 톡! 커피 홀짝·머리 넘기기·창밖 보기는 <b>가짜</b>라 누르면 감점이에요.","마지막에 <b>진짜 고민</b> 카드 3장 중 하나를 골라요. 단서를 많이 모을수록 안 맞는 카드가 흐려져요. 손님 3명을 상담해요. 손님 <b>표정</b>도 힌트예요."],"jc":"#b48cff"},
  tarot3: {"base":"tarot","n":"멘탈빨 야시장","desc":"연말 야시장, 줄은 길고 멘탈은 한정판이에요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 연말 야시장, 줄 선 손님을 <b>끌어서 빈 의자</b>에 앉혀요.","<b>밝은 말풍선</b>은 가벼운 고민 → <b>빠른 1장</b>, <b>어두운 말풍선</b>은 무거운 고민 → <b>3장 스프레드</b>. 손 잡은 커플은 <b>나란히 두 자리</b>에!","상담할수록 <b>멘탈</b>이 닳아요. 바닥나기 전에 <b>따뜻한 차</b> 한 잔. 술 취한 손님은 <b>왼쪽으로 쭉 밀어</b> 정중히 돌려보내요."],"jc":"#b48cff"},
  tutoring1: {"base":"tutoring","n":"쌤 렉 걸렸어요","desc":"퇴근 후 화상과외! 딴짓하는 학생을 불러 수업에 집중시켜요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 화상 수업 화면에서 <b>딴짓하는 학생</b>을 찾아 화면을 눌러 이름을 불러요.","<b>졸면 톡톡</b>(빠르게 두 번), <b>폰 보면 쓱 밀기</b>(퀴즈 던지기), <b>카메라 끄면 꾹</b> 길게, <b>고양이·음소거는 톡</b> 한 번!","잘 듣는 학생을 부르면 서운해해요. 중간 <b>오늘의 퀴즈</b> 때 모두 집중해 있으면 보너스예요."],"jc":"#7fe0c0"},
  tutoring2: {"base":"tutoring","n":"쌤 이제 알겠어요","desc":"학생이 보낸 문제! 풀이 카드를 순서대로 칠판에 붙여 이해시켜요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 학생이 모르는 문제를 보내면 아래 <b>풀이 카드</b>를 <b>칠판으로 끌어 올려요</b>.","<b>위에서부터 순서대로</b> 붙여야 해요. 순서가 틀리면 학생 머리 위 <b>물음표가 커져요</b>.","<b>틀린 공식(함정 카드)</b>이 섞여 있어요. 칠판 옆 <b>휴지통</b>에 버리면 보너스! 문제는 갈수록 길어져요."],"jc":"#7fe0c0"},
  tutoring3: {"base":"tutoring","n":"쌤 통화 잠깐만요","desc":"퇴근길 지하철, 과외 학부모 전화! 말 한마디에 재등록이 갈려요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 학부모 말이 오면 알맞은 <b>답 카드를 위로 쓱</b> 끌어 올려 보내요.","<b>솔직한 진단·구체적 계획</b>은 기분이 오르고, <b>무리한 약속·학생 탓</b>은 함정! 늦게 답해도 기분이 내려가요.","<b>터널</b>에선 신호가 끊기기 전에 빨리, <b>소음</b> 땐 말풍선을 톡 눌러 다시 듣고, <b>단톡방 알림</b>은 옆으로 밀어 치워요."],"jc":"#7fe0c0"},
  ucafe2: {"base":"ucafe","n":"사장님은 원격 중","desc":"폭염 낮, 몰려드는 손님을 원격으로 버텨요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님은 알아서 주문하고 음료를 받아 가요. 당신은 <b>사장님(원격)</b>이에요. 한 잔 만들 때마다 <b>얼음·컵·원두·우유·빨대</b>가 줄어요.","<b>내가 할 일 ①</b> 아래 재고 칸을 <b>톡</b>하면 창고 상자 하나로 가득 채워요. 가져오는 데 <b>1초</b> 걸리니 비기 전에 미리! 상자는 한정이라 덜 빈 칸을 채우면 아까워요. 하나라도 비면 손님이 화내고 그냥 가요.","<b>내가 할 일 ②</b> 사고가 나면 바로! 노란 손가락이 할 일을 짚어 줘요. <b>얼음 기계 고장</b>은 기계를 연타, <b>쏟은 음료</b>는 문질러 닦기, <b>에어컨 꺼짐</b>은 에어컨을 톡. 늦으면 미끄러지고, 더워서 손님이 못 기다려요."]},
  ucafe3: {"base":"ucafe","n":"사장님은 연구 중","desc":"시음회 날! 층층이 예쁜 신메뉴를 정확히 쌓아요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문 카드에 층층이 쌓인 음료 그림과 <b>순서</b>가 나와요.","아래 재료 버튼을 <b>꾹 누르고 있는 동안</b> 컵에 부어져요. 컵 옆 <b>노란 눈금선</b>에서 손을 떼요. 공중에 남은 줄기도 마저 떨어지니 <b>살짝 일찍</b>! 넘치거나 순서가 틀리면 층이 섞여요.","<b>얼음</b>은 집게가 컵 위에 올 때 톡, <b>토핑·시럽</b>은 컵 위를 손가락으로 쓱쓱. 잔이 커질수록 층이 많아지고, 다 만들면 손님이 마셔 보고 반응해요."]},
  vibe1: {"base":"vibe","n":"이게 되네?","desc":"의뢰인 말을 칩으로 조립해 코딩 AI 코디에게 시켜요","how":["처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 의뢰인이 말풍선으로 원하는 걸 <b>두루뭉술하게</b> 말해요.","아래 <b>프롬프트 칩</b>(기능·색·화면·조건)을 끌어서(톡도 돼요) 위 <b>프롬프트 창</b>에 넣고 <b>실행</b>! 코디가 앱을 만들어 미리보기에 띄워요.","<b>대충 알아서</b> 같은 모호한 칩은 함정이에요. 결과가 다르면 <b>수정 요청</b>이 와요. 빨간 칩을 톡 해서 빼고 다시 실행. 의뢰 3건, 빨리 끝내면 보너스!"],"jc":"#7c9cff"},
  vibe2: {"base":"vibe","n":"이게 왜 안 돼?","desc":"오픈 직전 앱에 버그 신고가 쏟아져요. 벌레를 잡고 코디에게 맞는 수정을 시켜요","how":["처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 의뢰인 폰 화면에 <b>버그 벌레</b>가 기어다니며 앱을 깨뜨려요.","<b>벌레</b>(또는 깨진 곳)를 <b>톡!</b> 하면 코디가 고치는 법 3개를 알려 줘요. 화면을 보고 <b>맞는 방법</b>을 골라요.","<b>틀리면 다른 데가 새로 깨지고</b>, 오래 두면 벌레가 <b>알</b>을 까서 늘어나요. 다 잡으면 <b>출시!</b>"],"jc":"#7c9cff"},
  vibe3: {"base":"vibe","n":"이게 왜 터져?","desc":"떡상한 내 앱! 밤새 서버가 안 터지게 지켜요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 내 앱이 커뮤니티에서 <b>떡상</b>! 사용자가 서버로 몰려와요.","<b>빨간 서버</b>(과부하)를 잡고 <b>한가한 서버</b>로 끌면 트래픽이 옮겨 가요. 꽉 찬 채로 버티면 <b>503</b>으로 터져요.","빨간 <b>해킹 점</b>은 톡! 막고, 사람이 넘치면 <b>캐시</b>·<b>서버 추가</b>(월 비용↑). 새벽 3시 졸음엔 <b>커피 톡</b>!"],"jc":"#7c9cff"},
  webnovel1: {"base":"webnovel","n":"작가님 마감이요","desc":"밤 11시 55분, 자정 업로드까지 오늘 회차 5,000자를 채워요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 퇴근하고 책상 앞, 자정까지 오늘 회차 <b>5,000자</b>를 채워요.","아래로 내려오는 문장 조각 중 <b>오늘 장르와 같은 색</b>만 톡! <b>타자 라인</b>에서 누르면 '완벽', 너무 일찍 누르면 덜 써져요. 다른 장르·<b>빨간 밑줄 오타</b>·딴짓은 흘려보내요.","눈꺼풀이 내려오면 <b>커피</b>를 톡. 자정 종이 울리면 <b>업로드</b> 버튼을 바로 눌러요!"],"jc":"#5fb8ff"},
  webnovel2: {"base":"webnovel","n":"작가님 절단신공","desc":"오늘 회차는 다 썼다. 어디서 '다음 화에 계속'으로 끊을지가 결제를 가른다","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 원고가 위로 흘러가고, 오른쪽 <b>긴장도 그래프</b>가 같이 흘러가요.","그래프가 <b>빨간 점선(절단각)</b>을 넘은 꼭대기 줄이 <b>가위선</b>에 오면 톡! 점선 아래 작은 봉우리는 가짜 꼭대기예요.","<b>분량 OK</b> 선이 지나기 전에 자르면 \"분량 실화?\", 꼭대기를 지나면 <b>독자 이탈</b>이 올라요. 회차 4개를 이어서 끊어요."],"jc":"#5fb8ff"},
  webnovel3: {"base":"webnovel","n":"작가님 1위 가즈아","desc":"노블리 공모전 마지막 날 밤, 자정 마감까지 순위를 끌어올려요","how":["처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 저녁 7시부터 <b>자정 마감</b>까지, 위쪽 <b>실시간 랭킹</b>에서 내 작품을 3위 안으로!","<b>원고는 5편뿐.</b> 가운데 그래프의 <b>노란 칸(밤 10~12시 피크)</b>에 <b>연재 올리기</b>를 하면 조회가 폭발해요. 그 전엔 아껴 둬요.","피크 전엔 준비: 떠오르는 <b>독자 댓글</b>에 답글 톡(<b>악플은 무시</b>), <b>표지 바꾸기</b>(1번), <b>이벤트 참여</b>. 라이벌의 <b>연참 폭탄</b>도 조심!"],"jc":"#5fb8ff"},
};
// ── MG2_LIST 끝 ──
const LOADED = {}; // key → 받은 GAME
const LOADING = {}; // key → 받는 중인 Promise
// 1탄 중 따로 받는 것: 파일과 꺼낼 것
// 브라우저는 한 번 실패한 모듈 주소를 다시 받지 않으므로, 실패 뒤에는 주소 끝에 ?r=n 을 붙여 다시 받는다
const FAILN = {}, retryQ = (key) => (FAILN[key] ? `?r=${FAILN[key]}` : "");
const LAZY1 = { insta: () => import("./mg_in.js" + retryQ("insta")).then((m) => { addCss("insta", m.IN_CSS); GAMES.insta = m.gIN2; return { key: "insta" }; }) };
function addCss(key, css) {
  if (typeof document === "undefined" || !css || document.getElementById("mgcss-" + key)) return;
  const s = document.createElement("style"); s.id = "mgcss-" + key; s.textContent = css; document.head.appendChild(s);
}
// 미니게임 파일 받기. 이미 받았으면 바로. 실패하면 다음에 다시 시도할 수 있게 지운다
export function mgLoad(key) {
  if (GAMES[key]) return Promise.resolve(LOADED[key] || { key });
  if (LOADING[key]) return LOADING[key];
  const p = (LAZY1[key] ? LAZY1[key]() : MG2_LIST[key] ? import(`./mg2/${key}.js${retryQ(key)}`).then((m) => {
    const g = m.GAME; if (!g || typeof g.run !== "function") throw new Error("미니게임 파일이 비었어요: " + key);
    mg2Init(); LOADED[key] = g; addCss(key, g.css);
    MG[key] = { n: g.n, desc: g.desc, how: g.how, base: g.base }; GAMES[key] = g.run; if (g.jc) JC[key] = g.jc;
    return g;
  }) : Promise.reject(new Error("없는 미니게임: " + key))).then((g) => { delete LOADING[key]; return g; }, (e) => { delete LOADING[key]; FAILN[key] = (FAILN[key] || 0) + 1; throw e; });
  LOADING[key] = p;
  return p;
}
// 곧 할 미니게임(key)을 조용히 미리 받아 둔다. 실패는 무시하고 1분 동안은 다시 시도하지 않는다(오프라인에서 화면마다 받기 방지)
const PF_FAIL = {};
export function mgPrefetch(key) {
  try { if (!key || GAMES[key] || LOADING[key] || !(MG2_LIST[key] || LAZY1[key]) || Date.now() - (PF_FAIL[key] || 0) < 60000) return; mgLoad(key).catch(() => { PF_FAIL[key] = Date.now(); }); } catch (e) {}
}
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
  { const g2 = LOADED[job]; if (g2) { try { return g2.steps ? g2.steps() : []; } catch (e) { return []; } } }
  if (job === "ucafe") { try { return ucSteps(); } catch (e) { return [["🖥️", "결제"], ["☕", "커피"], ["🚪", "나감"]]; } }
  if (job === "airbnb") { try { return abSteps(); } catch (e) {} }
  if (job === "pr") { try { return prSteps(); } catch (e) { return [["", "사진 기억"], ["", "끌어서 제자리"], ["", "톡톡 청소"]]; } }
  if (job === "cs") { try { const M = csPick(); return [[`<span style="position:relative;display:block;width:50px;height:62px;border-radius:10px;overflow:hidden;background:#3a3048 url(img/body/${M.k}.webp) ${ucBgPos("shy")}/300% 346.15% no-repeat;box-shadow:0 3px 8px #0006"><b style="position:absolute;right:1px;bottom:1px;font-size:16px;line-height:1">📄</b></span>`, "자소서 읽기"], [CS_PEN, "고칠 문장 톡"], ["💮", "참 잘했어요"]]; } catch (e) {} }
  return { cs: [["📄", "자소서 읽기"], ["🖊️", "고칠 문장 톡"], ["💮", "참 잘했어요"]], airbnb: [["💬", "손님 메시지"], ["👆", "맞는 답장"], ["⭐", "빠를수록 별"]], insta: [["✈️", "여행 중"], ["🌪️", "어어?!"], ["📸", "결정적 순간"]] }[job];
}
const REVIEW = { 대성공: ["손이 기억하는 프로의 솜씨!", "이 정도면 사장님 소리 들어요", "완벽 그 자체예요"], 성공: ["꽤 잘했어요. 손님도 만족!", "안정적인 운영이에요", "한 끗만 더 가면 대성공!"], 보통: ["무난했어요. 다음엔 더 잘할 수 있어요", "평범한 하루였어요"], 아쉬움: ["오늘은 운이 없었어요", "연습하면 금방 늘어요", "내일은 다를 거예요"] };

// "한 번 더?" 문지기. 지금은 무료로 바로 통과. 나중에 광고 보기·유료 아이템으로 바꿀 때
// setRetryGate(async ({ job, score, grade }) => { …광고 보고 오면 true… }) 한 줄이면 된다(false 면 그대로 결과 화면).
let retryGate = async () => true;
export function setRetryGate(fn) { retryGate = typeof fn === "function" ? fn : async () => true; }
export function mgRun(job, host, opts = {}) {
  inject(); mg2Init();
  if (!MG[job]) return Promise.resolve({ score: 0.5, grade: "보통", line: "미니게임이 없어 보통 결과로 했어요" });
  if (GAMES[job]) return mgRun1(job, host, opts);
  // 아직 안 받은 게임: 받는 동안 짧게 알리고, 못 받으면(오프라인 등) 안내 후 { loadFail } 로 끝낸다
  const def = MG[job];
  host.innerHTML = `<div class="mg mg-${job}" style="--jc:${JC[job]}"><div class="mg-intro mg-loading"><div class="mg-logo"><b>${def.n}</b><small>미니게임</small></div><div class="mg-d">불러오는 중…</div></div></div>`;
  return mgLoad(job).then(() => mgRun1(job, host, opts), (e) => new Promise((resolve) => {
    try { console.warn("미니게임 받기 실패", job, e); } catch (e2) {}
    if (!host.isConnected) return resolve({ loadFail: true });
    host.innerHTML = `<div class="mg mg-${job}" style="--jc:${JC[job]}"><div class="mg-intro"><div class="mg-logo"><b>${def.n}</b><small>미니게임</small></div><div class="mg-d">미니게임을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.<br>이번 판은 능력치대로 <b>보통 결과</b>로 해요.</div></div><div class="mg-foot"><button class="mg-btn gold" data-mg-ok>확인</button></div></div>`;
    host.querySelector("[data-mg-ok]").onclick = () => resolve({ loadFail: true });
  }));
}
function mgRun1(job, host, opts) {
  const def = MG[job];
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

// ───────── 1. 파티룸 퇴실 청소 (고해상도 벡터 그림 + 창밖은 실제 그림) ─────────
// 좌표·판정은 160x200 논리 칸 그대로. 그림은 기기 해상도로 매끈하게 그린다(11-22 도트 → 벡터).
// 캔버스가 무대 전체를 덮고, 논리 칸은 가운데에 둔다. 남는 위는 벽·천장, 아래는 마루를 이어 그린다.
// 체크인 사진(폴라로이드) 3초 → 손님이 놀고 간 방. 가구·기기는 끌어서 제자리에(가까우면 딱 붙음), 쓰레기는 톡톡, 분실물은 분실물 모드로 모은다.
const PW = 160, PH = 200, P_FLOOR = 62;
const PR_BULB = ["#ff5f7a", "#ffd166", "#5fe0a0", "#5fb8ff", "#c77dff"];
// 받침 글자 따라 조사(을/를, 은/는)
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
// ── 벡터 붓 ──
const PRP = 2; // 소품 그림 둘레 여유(논리 칸)
const rrp = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const lgr = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const rgr = (g, x, y, r0, r1, st, x1 = x, y1 = y) => { const q = g.createRadialGradient(x, y, r0, x1, y1, r1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const fr = (g, c, x, y, w, h, r = 0) => { g.fillStyle = c; if (r) { rrp(g, x, y, w, h, r); g.fill(); } else g.fillRect(x, y, w, h); };
const el = (g, c, x, y, rx, ry = rx, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 6.2832); g.fill(); };
const ln = (g, c, lw, pts) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
// 4갈래 반짝이
const twinkle = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); };
// 벡터 한 장: 논리 크기 w×h 를 R배 캔버스에 그리고 어두운 테두리 그림자를 두른다(어두운 방에서도 잘 보이게)
function prV(w, h, fn, R, halo = true) {
  const c = document.createElement("canvas"); c.width = Math.ceil((w + PRP * 2) * R); c.height = Math.ceil((h + PRP * 2) * R);
  const g = c.getContext("2d"); g.setTransform(R, 0, 0, R, PRP * R, PRP * R); fn(g, w, h);
  if (!halo) { c.R = R; return c; }
  const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const q = o.getContext("2d");
  q.shadowColor = "rgba(12,4,24,.85)"; q.shadowBlur = Math.max(1.5, R * 0.8); q.drawImage(c, 0, 0); q.shadowColor = "transparent"; q.drawImage(c, 0, 0);
  o.R = R; return o;
}
// 같은 모양을 한 색으로 덮은 사본(체크인 사진 잔상·딱 붙을 때 번쩍)
function prTint(c, col, a) { const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height); o.R = c.R; return o; }
// 가구·기기: 이름, 크기, 원래 자리(밑변 가운데), 깊이 보정, 벽에 거는 것, 그림(벡터)
const PR_FURN = [
  { id: "screen", n: "스크린", w: 42, h: 28, home: [112, 42], zb: -100, wall: 1, d: (g, w) => {
    fr(g, lgr(g, 0, 0, 0, 3.4, [[0, "#7a7a8c"], [0.5, "#4a4a58"], [1, "#24242e"]]), 0, 0, w, 3.4, 1.4);
    fr(g, "rgba(255,255,255,.35)", 1, 0.5, w - 2, 0.4);
    fr(g, lgr(g, 0, 3, 0, 24, [[0, "#cfcfdd"], [0.12, "#f7f7fc"], [0.8, "#ededf5"], [1, "#d6d6e4"]]), 2, 3.2, w - 4, 20.8);
    g.strokeStyle = "#30303c"; g.lineWidth = 0.7; g.strokeRect(2.6, 3.8, w - 5.2, 19.6);
    fr(g, lgr(g, 0, 24, 0, 26.2, [[0, "#6a6a7c"], [1, "#22222c"]]), 1, 23.8, w - 2, 2.4, 1.1);
    ln(g, "#8a8a98", 0.45, [[w / 2, 26], [w / 2, 27.2]]); el(g, "#c8c8d6", w / 2, 27.4, 0.9, 0.7);
  } },
  { id: "frame", n: "액자", w: 16, h: 13, home: [54, 46], zb: -100, wall: 1, d: (g) => {
    fr(g, lgr(g, 0, 0, 16, 13, [[0, "#fbe39a"], [0.45, "#d4a84a"], [1, "#8a5e1a"]]), 0, 0, 16, 13, 0.9);
    fr(g, "#5a3a10", 1.5, 1.5, 13, 10);
    fr(g, lgr(g, 0, 2, 0, 11, [[0, "#6fb8ec"], [1, "#e2f4ff"]]), 2, 2, 12, 9);
    el(g, "#ffe07a", 10.6, 4.4, 1.4);
    poly(g, "#5aa870", [[2, 11], [2, 7.6], [5, 5.4], [8, 7.4], [11, 5.8], [14, 7.9], [14, 11]]);
    poly(g, "#3d7d52", [[2, 11], [2, 9.4], [7, 8], [14, 9.9], [14, 11]]);
    g.strokeStyle = "rgba(255,240,200,.6)"; g.lineWidth = 0.35; g.strokeRect(0.4, 0.4, 15.2, 12.2);
  } },
  { id: "console", n: "게임기", w: 16, h: 9, home: [112, 53], zb: 0, d: (g) => {
    fr(g, lgr(g, 0, 0, 0, 9, [[0, "#ffffff"], [0.55, "#e6e6f0"], [1, "#a6a6b8"]]), 0, 0.6, 16, 7.6, 1.5);
    fr(g, "rgba(255,255,255,.9)", 1.2, 1, 13.6, 0.5, 0.25);
    fr(g, "#262630", 2, 3.3, 8, 1, 0.5);
    el(g, "#33ccff", 12.7, 3.6, 0.75); el(g, "#ff5566", 12.7, 5.7, 0.75);
    el(g, "rgba(51,204,255,.35)", 12.7, 3.6, 1.6);
    fr(g, "#4a4a55", 1.2, 8.1, 2.2, 0.9, 0.4); fr(g, "#4a4a55", 12.6, 8.1, 2.2, 0.9, 0.4);
  } },
  { id: "speaker", n: "스피커", w: 12, h: 24, home: [146, 84], zb: 0, d: (g) => {
    fr(g, lgr(g, 0, 0, 12, 0, [[0, "#44444f"], [0.45, "#2a2a33"], [1, "#141419"]]), 0, 0, 12, 22.2, 1.5);
    fr(g, "rgba(255,255,255,.18)", 0.8, 0.5, 10.4, 0.5, 0.25);
    g.fillStyle = rgr(g, 6, 5, 0.2, 2.4, [[0, "#9a9ab4"], [0.35, "#262630"], [0.8, "#1a1a22"], [1, "#6a6a80"]]); g.beginPath(); g.arc(6, 5, 2.4, 0, 6.2832); g.fill();
    g.fillStyle = rgr(g, 6, 14, 0.3, 4.7, [[0, "#b0b0c8"], [0.18, "#3a3a4a"], [0.6, "#16161e"], [0.88, "#2a2a36"], [1, "#7a7a90"]]); g.beginPath(); g.arc(6, 14, 4.7, 0, 6.2832); g.fill();
    g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 0.35; g.beginPath(); g.arc(6, 14, 3.6, 3.6, 5.2); g.stroke();
    el(g, "#44ff88", 10, 1.7, 0.45); el(g, "rgba(68,255,136,.35)", 10, 1.7, 1.1);
    fr(g, "#0c0c10", 1, 22, 2.2, 2, 0.6); fr(g, "#0c0c10", 8.8, 22, 2.2, 2, 0.6);
  } },
  { id: "mic", n: "노래방 마이크", w: 9, h: 26, home: [131, 102], zb: 0, d: (g) => {
    el(g, "#1e1e26", 4.5, 24.9, 4.4, 1.2); el(g, lgr(g, 0, 23.6, 0, 25.4, [[0, "#6a6a78"], [1, "#2e2e38"]]), 4.5, 24.4, 4, 0.95);
    fr(g, lgr(g, 3.9, 0, 5.1, 0, [[0, "#9a9aa8"], [0.5, "#f4f4fa"], [1, "#6a6a78"]]), 3.95, 8.6, 1.1, 15.6);
    fr(g, lgr(g, 3, 0, 6, 0, [[0, "#ff8ab4"], [0.45, "#e0447a"], [1, "#9a2452"]]), 3, 4.2, 3, 4.8, 1);
    fr(g, "#2a2a30", 3.3, 8.6, 2.4, 0.8, 0.3);
    g.fillStyle = rgr(g, 3.7, 1.5, 0.2, 2.9, [[0, "#ffffff"], [0.45, "#c8c8d6"], [1, "#5e5e6c"]], 4.5, 2.5); g.beginPath(); g.arc(4.5, 2.5, 2.5, 0, 6.2832); g.fill();
    g.save(); g.beginPath(); g.arc(4.5, 2.5, 2.4, 0, 6.2832); g.clip(); g.strokeStyle = "rgba(50,50,62,.4)"; g.lineWidth = 0.22;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(4.5 + k * 0.8 - 3, -1); g.lineTo(4.5 + k * 0.8 + 3, 6); g.stroke(); g.beginPath(); g.moveTo(4.5 + k * 0.8 + 3, -1); g.lineTo(4.5 + k * 0.8 - 3, 6); g.stroke(); } g.restore();
  } },
  { id: "lamp", n: "스탠드 조명", w: 12, h: 32, home: [13, 94], zb: 0, d: (g) => {
    el(g, "#22222a", 6, 31, 4.2, 1.1); el(g, lgr(g, 0, 29.6, 0, 31.4, [[0, "#d8b060"], [1, "#6a5020"]]), 6, 30.5, 3.6, 0.9);
    fr(g, lgr(g, 5.3, 0, 6.7, 0, [[0, "#a07830"], [0.45, "#f4d88a"], [1, "#8a6420"]]), 5.35, 9, 1.3, 21);
    poly(g, lgr(g, 0, 0, 12, 0, [[0, "#e8b858"], [0.35, "#fff1c4"], [0.7, "#f8d888"], [1, "#c8902e"]]), [[3.2, 0], [8.8, 0], [11.8, 9.2], [0.2, 9.2]]);
    el(g, "#fff6d8", 6, 9.2, 5.8, 0.8);
    el(g, "#ffd26a", 6, 9.3, 4.4, 0.5);
    fr(g, "rgba(255,255,255,.55)", 3.6, 0.3, 4.8, 0.4);
  } },
  { id: "sofa", n: "소파", w: 38, h: 20, home: [46, 110], zb: 0, d: (g) => {
    const vel = (y0, y1) => lgr(g, 0, y0, 0, y1, [[0, "#f07aa0"], [0.4, "#cf4a76"], [1, "#9a2c56"]]);
    fr(g, vel(0, 11), 3, 0, 32, 11.5, 3);
    ln(g, "rgba(110,20,60,.55)", 0.5, [[13.6, 1.5], [13.6, 9.8]]); ln(g, "rgba(110,20,60,.55)", 0.5, [[24.4, 1.5], [24.4, 9.8]]);
    [[8.3, 4.5], [19, 4.5], [29.7, 4.5]].forEach(([x, y]) => { el(g, "#8e2a4e", x, y, 0.55); el(g, "rgba(255,190,215,.5)", x - 0.15, y - 0.15, 0.25); });
    fr(g, vel(9, 16), 5, 9.4, 28, 6.4, 1.8); fr(g, "rgba(255,200,220,.35)", 6, 9.8, 26, 0.7, 0.35);
    ln(g, "rgba(110,20,60,.6)", 0.5, [[19, 10], [19, 15.4]]);
    fr(g, vel(4, 17), 0, 4.2, 6, 12.4, 2.6); fr(g, vel(4, 17), 32, 4.2, 6, 12.4, 2.6);
    fr(g, "rgba(255,200,220,.4)", 0.8, 4.6, 4.4, 0.8, 0.4); fr(g, "rgba(255,200,220,.4)", 32.8, 4.6, 4.4, 0.8, 0.4);
    fr(g, lgr(g, 0, 15, 0, 18.5, [[0, "#a8345c"], [1, "#6e1c3c"]]), 1, 15.2, 36, 3.2, 1.2);
    fr(g, "#3a2418", 3, 18.2, 2, 1.8, 0.4); fr(g, "#3a2418", 33, 18.2, 2, 1.8, 0.4);
    g.save(); g.translate(10.6, 6.6); g.rotate(-0.12); fr(g, lgr(g, 0, -3.4, 0, 3.4, [[0, "#ffe08a"], [1, "#d8a02a"]]), -3.8, -3.4, 7.6, 6.8, 1.8); ln(g, "rgba(150,100,20,.5)", 0.3, [[-3, 0], [3, 0]]); g.restore();
    g.save(); g.translate(28, 7.2); g.rotate(0.1); fr(g, lgr(g, 0, -2.9, 0, 2.9, [[0, "#9ae6f4"], [1, "#3aa6c0"]]), -3.3, -2.9, 6.6, 5.8, 1.6); g.restore();
  } },
  { id: "table", n: "탁자", w: 28, h: 12, home: [68, 142], zb: 0, d: (g) => {
    fr(g, "#4a2e18", 2, 8, 2.2, 4, 0.5); fr(g, "#4a2e18", 23.8, 8, 2.2, 4, 0.5); fr(g, "#5a3820", 4, 10, 20, 0.9);
    fr(g, lgr(g, 0, 0, 28, 6, [[0, "#e0aa72"], [0.5, "#c08452"], [1, "#a06a3c"]]), 0, 0, 28, 6.2, 1.2);
    g.strokeStyle = "rgba(120,70,30,.35)"; g.lineWidth = 0.3; for (const [y, a, b] of [[1.8, 3, 14], [3.2, 9, 25], [4.6, 2, 11], [4.4, 16, 26]]) { g.beginPath(); g.moveTo(a, y); g.quadraticCurveTo((a + b) / 2, y - 0.5, b, y); g.stroke(); }
    fr(g, "rgba(255,230,190,.5)", 1, 0.4, 26, 0.5, 0.25);
    fr(g, lgr(g, 0, 6, 0, 8.2, [[0, "#8a5a32"], [1, "#5e3a1e"]]), 0, 6, 28, 2.2, 0.6);
  } },
  { id: "projector", n: "빔프로젝터", w: 14, h: 9, home: [68, 136], zb: 8, d: (g) => {
    fr(g, lgr(g, 0, 0, 0, 9, [[0, "#ffffff"], [0.6, "#e6e6ee"], [1, "#a8a8b8"]]), 0, 0.8, 14, 7.4, 1.5);
    g.strokeStyle = "rgba(120,120,140,.5)"; g.lineWidth = 0.35; for (const x of [2, 3.4, 4.8, 6.2]) { g.beginPath(); g.moveTo(x, 3); g.lineTo(x, 6.2); g.stroke(); }
    el(g, "#22222c", 11, 4.4, 2.5); g.fillStyle = rgr(g, 10.5, 3.9, 0.1, 1.8, [[0, "#c8f0ff"], [0.4, "#3aa0e8"], [1, "#0a1a30"]]); g.beginPath(); g.arc(11, 4.4, 1.7, 0, 6.2832); g.fill();
    el(g, "#44ff66", 2, 1.9, 0.4);
    fr(g, "#4a4a55", 1, 8, 2, 1, 0.4); fr(g, "#4a4a55", 11, 8, 2, 1, 0.4);
  } },
  { id: "chair", n: "의자", w: 12, h: 20, home: [110, 150], zb: 0, d: (g) => {
    ln(g, "#3a3a40", 0.7, [[3.4, 11], [3.6, 19.2]]); ln(g, "#3a3a40", 0.7, [[8.6, 11], [8.4, 19.2]]);
    ln(g, "#8a8a94", 0.8, [[1.3, 11], [1, 19.6]]); ln(g, "#8a8a94", 0.8, [[10.7, 11], [11, 19.6]]);
    fr(g, lgr(g, 0, 0, 12, 0, [[0, "#5ccbe0"], [0.5, "#3fb0c9"], [1, "#2a8aa2"]]), 1, 0, 10, 8.4, 2.2);
    fr(g, "rgba(20,90,110,.55)", 2.2, 2.2, 7.6, 0.7, 0.35); fr(g, "rgba(20,90,110,.55)", 2.2, 5, 7.6, 0.7, 0.35);
    fr(g, "rgba(255,255,255,.4)", 2, 0.5, 8, 0.6, 0.3);
    fr(g, lgr(g, 0, 8, 0, 11.4, [[0, "#7fdcee"], [1, "#2a8aa2"]]), 0, 8, 12, 3.3, 1.3);
  } },
  { id: "guitar", n: "기타", w: 10, h: 26, home: [150, 142], zb: 0, d: (g) => {
    fr(g, lgr(g, 0, 0, 0, 3, [[0, "#4a2e1c"], [1, "#2a180c"]]), 3, 0, 4, 3.2, 0.8);
    [[2.2, 0.8], [7.8, 0.8], [2.2, 2.2], [7.8, 2.2]].forEach(([x, y]) => el(g, "#e8e8f0", x, y, 0.45));
    fr(g, lgr(g, 4, 0, 6, 0, [[0, "#5a3820"], [0.5, "#8a5a34"], [1, "#4a2c18"]]), 4, 3, 2, 10.5);
    g.strokeStyle = "#d8c070"; g.lineWidth = 0.22; for (let y = 4.4; y < 13; y += 1.6) { g.beginPath(); g.moveTo(4, y); g.lineTo(6, y); g.stroke(); }
    g.fillStyle = lgr(g, 0, 0, 10, 0, [[0, "#f4a050"], [0.4, "#e07a2a"], [1, "#a84a14"]]);
    g.beginPath(); g.ellipse(5, 15.2, 3.2, 3.1, 0, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(5, 20.6, 4.6, 4.8, 0, 0, 6.2832); g.fill();
    g.strokeStyle = "rgba(60,25,5,.55)"; g.lineWidth = 0.35; g.beginPath(); g.ellipse(5, 20.6, 4.4, 4.6, 0, 0, 6.2832); g.stroke();
    el(g, "#2a1508", 5, 17.6, 1.35); el(g, "rgba(255,220,170,.35)", 3.4, 20, 1, 2.2, -0.3);
    fr(g, "#3a2010", 3.4, 22.3, 3.2, 0.8, 0.3);
    g.strokeStyle = "rgba(240,240,250,.75)"; g.lineWidth = 0.15; for (const x of [4.5, 5, 5.5]) { g.beginPath(); g.moveTo(x, 3); g.lineTo(x, 22.4); g.stroke(); }
  } },
  { id: "plant", n: "화분", w: 14, h: 20, home: [148, 194], zb: 0, d: (g) => {
    const leaf = (x, y, rx, ry, rot, c1, c2) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = lgr(g, -rx, 0, rx, 0, [[0, c1], [1, c2]]); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.2832); g.fill(); ln(g, "rgba(20,70,35,.55)", 0.25, [[-rx * 0.85, 0], [rx * 0.85, 0]]); g.restore(); };
    leaf(3.4, 8, 3.6, 1.7, 0.5, "#2f7a3e", "#5ac070"); leaf(10.6, 7.4, 3.6, 1.7, -0.55, "#5ac070", "#2f7a3e");
    leaf(6, 4.4, 4, 1.8, -1.2, "#3e9e5a", "#7fdc8e"); leaf(8.6, 3.6, 3.8, 1.7, 1.25, "#7fdc8e", "#3e9e5a");
    leaf(7, 9.6, 3.2, 1.5, 0.05, "#2a6a34", "#4fae60");
    el(g, "#3a2414", 7, 13, 4.6, 1);
    poly(g, lgr(g, 3, 0, 11, 0, [[0, "#e88a5a"], [0.45, "#c8643a"], [1, "#8e4020"]]), [[3, 13.6], [11, 13.6], [10, 20], [4, 20]]);
    fr(g, lgr(g, 0, 12, 0, 14.4, [[0, "#f0a070"], [1, "#b05a30"]]), 2.2, 12, 9.6, 2.3, 0.7);
  } },
];
// 쓰레기·분실물: [폭, 높이, 그림, 테두리 없음]
const PR_TRASH = {
  cup: [6, 7, (g) => { poly(g, lgr(g, 0, 0, 6, 0, [[0, "#ff6a6a"], [0.4, "#d8383a"], [1, "#901c20"]]), [[0, 0.8], [6, 0.8], [5, 7], [1, 7]]); el(g, "#f8f8f8", 3, 0.8, 3, 0.75); el(g, "#701418", 3, 0.85, 2.4, 0.5); fr(g, "rgba(255,255,255,.35)", 1.3, 2, 0.5, 4.2, 0.25); }],
  pizza: [11, 6, (g) => { fr(g, lgr(g, 0, 1, 0, 6, [[0, "#f0d8a8"], [1, "#a8824a"]]), 0, 1.4, 11, 4.6, 0.6); fr(g, "#c9a46a", 0, 1.4, 11, 0.8, 0.3); poly(g, "#f2c14e", [[5, 0.4], [10.4, 0.6], [7.2, 3.6]]); fr(g, "#e0a040", 5, 0, 5.4, 0.9, 0.4); el(g, "#c83030", 7.2, 1.3, 0.55); el(g, "#c83030", 8.9, 1.2, 0.5); el(g, "#c83030", 7.6, 2.4, 0.4); }],
  can: [7, 4, (g) => { fr(g, lgr(g, 0, 0, 0, 4, [[0, "#8fd0ff"], [0.35, "#3a8fd0"], [1, "#1c5a90"]]), 0, 0, 7, 4, 1.6); fr(g, "rgba(255,255,255,.75)", 2, 1.4, 3, 1.1, 0.5); el(g, lgr(g, 0, 0, 0, 4, [[0, "#f0f0f6"], [1, "#9a9aa8"]]), 0.6, 2, 0.6, 2); el(g, lgr(g, 0, 0, 0, 4, [[0, "#f0f0f6"], [1, "#9a9aa8"]]), 6.4, 2, 0.6, 2); }],
  balloon: [6, 10, (g) => { g.fillStyle = rgr(g, 2.2, 2, 0.2, 3.4, [[0, "#ffd0e4"], [0.35, "#ff6fa8"], [1, "#c03a78"]], 3, 3); g.beginPath(); g.ellipse(3, 3.2, 2.9, 3.1, 0.15, 0, 6.2832); g.fill(); poly(g, "#c03a78", [[2.4, 6.1], [3.6, 6.1], [3, 7]]); ln(g, "#e8e8f0", 0.3, [[3, 7], [3.8, 8.2], [2.6, 9.2], [3.2, 10]]); el(g, "rgba(255,255,255,.7)", 1.8, 1.8, 0.5, 0.8, -0.4); }],
  chips: [7, 8, (g) => { const zz = (y, d) => { const p = []; for (let x = 0; x <= 7; x += 1) p.push([x, y + ((x % 2) ? d : 0)]); return p; }; poly(g, lgr(g, 0, 0, 7, 0, [[0, "#ffc94a"], [0.5, "#f2a62a"], [1, "#b8701a"]]), [...zz(0.6, 0.6), [7, 7.4], ...zz(7.4, -0.6).reverse()]); fr(g, "#d8d8e0", 0, 0, 7, 1, 0.3); fr(g, "#d8d8e0", 0, 7, 7, 1, 0.3); el(g, "#d8383a", 3.5, 4, 1.7, 1.3); el(g, "#ffe8a0", 3.5, 4, 0.9, 0.6); }],
  napkin: [6, 5, (g) => { poly(g, lgr(g, 0, 0, 6, 5, [[0, "#ffffff"], [1, "#d0d0da"]]), [[1, 0.2], [3.4, 0], [5.6, 0.9], [6, 3], [4.8, 5], [2, 4.8], [0, 3.6], [0.3, 1.4]]); ln(g, "rgba(150,150,170,.6)", 0.3, [[1.2, 1.6], [2.8, 2.6], [4.4, 1.4]]); ln(g, "rgba(150,150,170,.5)", 0.25, [[2.2, 3.8], [3.6, 3], [4.8, 3.8]]); }],
  bottle: [10, 4, (g) => { fr(g, lgr(g, 0, 0, 0, 4, [[0, "#8ae09a"], [0.35, "#2f7a40"], [1, "#16401e"]]), 0, 0, 7.2, 4, 1.6); fr(g, lgr(g, 0, 1, 0, 3, [[0, "#6ac07a"], [1, "#1e5a2a"]]), 6.6, 1, 2.6, 2, 0.6); fr(g, "#f2e8c0", 1.8, 0.6, 3, 2.8, 0.3); fr(g, "#c9a050", 9, 1, 1, 2, 0.3); fr(g, "rgba(255,255,255,.5)", 0.8, 0.6, 5.6, 0.4, 0.2); }],
  confetti: [9, 4, (g) => { [[0.5, 2.5, 0.4], [2.2, 0.6, -0.6], [3.4, 3, 0.9], [5.2, 1.2, -0.2], [6.4, 3.2, 0.5], [8.2, 0.6, 1.1], [1.4, 1.2, -1], [7.2, 2.2, 0.2], [4.3, 0.4, 0.7], [8.4, 3.3, -0.4]].forEach(([x, y, r], i) => { g.save(); g.translate(x, y); g.rotate(r); fr(g, PR_BULB[i % 5], -0.6, -0.3, 1.2, 0.6); g.restore(); }); }, true],
  cake: [8, 5, (g) => { el(g, lgr(g, 0, 3, 0, 5, [[0, "#ffffff"], [1, "#c8c8d4"]]), 4, 4, 4, 1); poly(g, lgr(g, 0, 0, 0, 3.6, [[0, "#ffe0ea"], [1, "#e898b0"]]), [[1.6, 3.8], [6.6, 3.8], [6, 0.9], [2.4, 0.9]]); fr(g, "#fff8f8", 2.2, 0.4, 4, 1, 0.5); el(g, "#e0303a", 4.2, 0.5, 0.75); fr(g, "rgba(180,60,90,.45)", 1.9, 2.2, 4.4, 0.4); }],
  takeout: [7, 8, (g) => { ln(g, "#c9a050", 0.5, [[3.8, 2.6], [5.2, 0]]); poly(g, lgr(g, 0, 0, 7, 0, [[0, "#ffffff"], [1, "#c8c8d4"]]), [[0.8, 2.8], [6.2, 2.8], [5.6, 8], [1.4, 8]]); fr(g, "#e4e4ea", 0.2, 2, 6.6, 1.1, 0.5); fr(g, "#b07a4a", 1.1, 4.4, 4.8, 1.8); el(g, "#f4f4f8", 3.5, 5.3, 0.6); }],
  hat: [6, 8, (g) => { g.save(); g.beginPath(); g.moveTo(3, 0.6); g.lineTo(6, 8); g.lineTo(0, 8); g.closePath(); g.clip(); g.fillStyle = "#c77dff"; g.fillRect(0, 0, 6, 8); g.fillStyle = "#5fb8ff"; for (let y = 1.5; y < 8; y += 2.4) g.fillRect(0, y, 6, 1.1); g.restore(); el(g, "#ffd166", 3, 0.7, 0.9); el(g, "rgba(0,0,0,.18)", 3, 7.9, 3, 0.4); }],
  wallet: [8, 6, (g) => { fr(g, lgr(g, 0, 0, 0, 6, [[0, "#a8744a"], [1, "#5a3420"]]), 0, 0, 8, 6, 1); fr(g, lgr(g, 0, 0, 0, 2.6, [[0, "#c08a5a"], [1, "#8a5a34"]]), 0, 0, 8, 2.6, 1); ln(g, "rgba(255,230,190,.5)", 0.25, [[0.7, 5.3], [7.3, 5.3]]); el(g, "#f0d070", 6.4, 2.6, 0.6); }],
  phone: [5, 8, (g) => { fr(g, "#1a1a22", 0, 0, 5, 8, 1); fr(g, lgr(g, 0, 0, 5, 8, [[0, "#9cd0ff"], [0.5, "#3a7fe0"], [1, "#2a3a90"]]), 0.5, 0.8, 4, 6, 0.4); poly(g, "rgba(255,255,255,.3)", [[0.5, 0.8], [3, 0.8], [0.5, 4]]); el(g, "#555", 2.5, 7.4, 0.35); }],
  keys: [8, 6, (g) => { g.strokeStyle = "#d8d8e0"; g.lineWidth = 0.55; g.beginPath(); g.arc(1.8, 2, 1.4, 0, 6.2832); g.stroke(); fr(g, lgr(g, 0, 1.8, 0, 3, [[0, "#ffe080"], [1, "#b89030"]]), 3, 1.6, 4.8, 1.2, 0.5); fr(g, "#d0a840", 5.2, 2.6, 0.7, 0.9); fr(g, "#d0a840", 6.8, 2.6, 0.7, 0.7); fr(g, "#ff7ab0", 0.2, 3.4, 2.4, 2.4, 0.6); }],
  shades: [9, 4, (g) => { fr(g, "#2a2a30", 0, 0, 9, 0.8, 0.4); for (const x of [0.2, 5]) { fr(g, lgr(g, 0, 0, 0, 4, [[0, "#5a5a80"], [1, "#101018"]]), x, 0.4, 3.8, 3.4, 1.4); el(g, "rgba(200,220,255,.6)", x + 1.1, 1.4, 0.6, 0.35, -0.5); } }],
  ring: [5, 5, (g) => { g.strokeStyle = lgr(g, 0, 1, 5, 5, [[0, "#fff0a0"], [0.5, "#e0a830"], [1, "#a07018"]]); g.lineWidth = 0.9; g.beginPath(); g.ellipse(2.5, 3, 2, 1.6, 0, 0, 6.2832); g.stroke(); poly(g, "#bff2ff", [[2.5, 0], [3.4, 0.8], [2.5, 1.7], [1.6, 0.8]]); poly(g, "rgba(255,255,255,.9)", [[2.5, 0], [2.9, 0.7], [2.5, 1]]); }],
  buds: [6, 5, (g) => { fr(g, lgr(g, 0, 0, 0, 5, [[0, "#ffffff"], [1, "#c4c4d0"]]), 0, 0, 6, 5, 2); ln(g, "rgba(140,140,160,.7)", 0.3, [[0.3, 2.2], [5.7, 2.2]]); el(g, "#4fe07a", 3, 3.6, 0.4); el(g, "rgba(79,224,122,.4)", 3, 3.6, 0.9); }],
};
const PR_TR = ["cup", "pizza", "can", "balloon", "chips", "napkin", "bottle", "confetti", "cake", "takeout", "hat", "cup", "can"];
const PR_LOST = [["wallet", "지갑"], ["phone", "휴대폰"], ["keys", "열쇠"], ["shades", "선글라스"], ["ring", "반지"], ["buds", "이어폰"]];
const PR_ICON = {
  broom: [10, 12, (g) => { ln(g, "#8a5a2b", 0.9, [[9, 0.4], [5, 7.6]]); fr(g, "#cc3333", 3, 7, 4.4, 1.3, 0.4); poly(g, lgr(g, 0, 8, 0, 12, [[0, "#f8e090"], [1, "#c9a040"]]), [[3, 8.2], [7.4, 8.2], [9, 12], [0.6, 12]]); ln(g, "rgba(150,110,30,.7)", 0.3, [[3.6, 8.6], [2.4, 11.8]]); ln(g, "rgba(150,110,30,.7)", 0.3, [[5.2, 8.6], [5, 11.8]]); ln(g, "rgba(150,110,30,.7)", 0.3, [[6.8, 8.6], [7.6, 11.8]]); }],
  box: [12, 10, (g) => { fr(g, lgr(g, 0, 2, 0, 10, [[0, "#e0b878"], [1, "#9a7040"]]), 0, 2, 12, 8, 0.8); poly(g, "#e8c890", [[0, 2], [5, 2], [4, -0.2], [0.6, 0.4]]); poly(g, "#e8c890", [[7, 2], [12, 2], [11.4, 0.4], [8, -0.2]]); fr(g, "#f0e0b0", 5, 2, 2, 8); }],
  cam: [12, 9, (g) => { fr(g, "#3a3a46", 3, 0, 5, 2.4, 0.6); fr(g, lgr(g, 0, 2, 0, 9, [[0, "#6a6a7a"], [1, "#2a2a34"]]), 0, 1.8, 12, 7.2, 1.4); el(g, "#15151c", 6, 5.4, 2.6); g.fillStyle = rgr(g, 5.4, 4.8, 0.1, 1.8, [[0, "#c8f0ff"], [0.5, "#3a9ad8"], [1, "#0a1a30"]]); g.beginPath(); g.arc(6, 5.4, 1.8, 0, 6.2832); g.fill(); fr(g, "#fff", 9.2, 2.8, 1.8, 0.9, 0.4); }],
};
// 창밖 실제 그림(파티룸 배경의 밤 도시 창)
let PR_IMG = null;
const prImg = () => { if (!PR_IMG && typeof Image !== "undefined") { PR_IMG = new Image(); PR_IMG.src = "img/bg/partyroom.webp"; } return PR_IMG; };
const prImgOk = () => { const m = prImg(); return !!(m && m.complete && m.naturalWidth > 0); };
// 고정 배경: 벽·창·마루·러그·TV장. X0~X1, Y0~Y1 논리 범위를 칠한다(무대가 길면 위아래로 더)
function prBgDraw(g, X0, Y0, X1, Y1) {
  const XW = X1 - X0;
  // 벽
  g.fillStyle = lgr(g, 0, Y0, 0, P_FLOOR, [[0, "#140a22"], [Math.min(0.7, Math.max(0, -Y0 / (P_FLOOR - Y0))), "#2a1840"], [0.75, "#3d2658"], [1, "#2e1b45"]]); g.fillRect(X0, Y0, XW, P_FLOOR - Y0);
  for (let x = Math.floor(X0 / 8) * 8; x < X1; x += 8) { g.fillStyle = "rgba(255,255,255,.028)"; g.fillRect(x, Y0, 3.2, 46 - Y0); }
  g.fillStyle = "rgba(200,160,255,.07)"; for (let y = 10; y < 44; y += 8) for (let x = Math.floor(X0 / 8) * 8 + ((y / 8) % 2) * 4 + 2; x < X1; x += 8) { g.beginPath(); g.moveTo(x, y - 1.1); g.lineTo(x + 0.8, y); g.lineTo(x, y + 1.1); g.lineTo(x - 0.8, y); g.fill(); }
  // 천장 몰딩·간접등 자리
  fr(g, lgr(g, 0, -1, 0, 4, [[0, "#0e0718"], [1, "#24163a"]]), X0, -1, XW, 4.5);
  fr(g, "rgba(255,255,255,.08)", X0, 3.3, XW, 0.4);
  if (Y0 < -10) { for (let x = 20; x < PW; x += 40) { g.fillStyle = rgr(g, x, Y0 + 3, 0, 14, [[0, "rgba(255,220,170,.22)"], [1, "rgba(255,220,170,0)"]]); g.fillRect(x - 14, Y0, 28, 20); el(g, "#3a2a48", x, Y0 + 2.2, 2.6, 0.9); el(g, "#ffe8c0", x, Y0 + 2.4, 1.6, 0.5); } }
  // 아래 벽판
  fr(g, lgr(g, 0, 46, 0, 62, [[0, "#3a2552"], [1, "#24163a"]]), X0, 46, XW, 16);
  fr(g, "#6a4a8c", X0, 46, XW, 0.8); fr(g, "rgba(0,0,0,.25)", X0, 46.8, XW, 0.6);
  for (let x = Math.floor((X0 - 4) / 20) * 20 + 4; x < X1; x += 20) { fr(g, "rgba(0,0,0,.18)", x, 50, 16, 9, 0.8); fr(g, "rgba(255,255,255,.06)", x + 0.4, 58.4, 15.2, 0.5); }
  fr(g, lgr(g, 0, 59.6, 0, 62, [[0, "#4a3260"], [1, "#160c22"]]), X0, 59.6, XW, 2.4);
  // 마루: 판자마다 색을 조금씩
  const seed = (a) => { const s = Math.sin(a * 127.1) * 43758.5453; return s - Math.floor(s); };
  for (let r = 0, y = P_FLOOR; y < Y1; y += 7, r++) {
    const off = (r * 11) % 24;
    for (let x = off - 24 + Math.floor(X0 / 24) * 24; x < X1; x += 24) {
      const t = seed(r * 31 + x * 0.7), base = [140 + t * 16, 92 + t * 11, 60 + t * 8].map(Math.round);
      g.fillStyle = lgr(g, 0, y, 0, y + 7, [[0, `rgb(${base[0] + 10},${base[1] + 7},${base[2] + 5})`], [1, `rgb(${base[0] - 12},${base[1] - 9},${base[2] - 7})`]]); g.fillRect(x, y, 24, 7);
      g.strokeStyle = "rgba(70,40,20,.22)"; g.lineWidth = 0.25; g.beginPath(); g.moveTo(x + 2, y + 2.4 + t); g.bezierCurveTo(x + 8, y + 1.6 + t, x + 14, y + 3.4, x + 22, y + 2.6 + t); g.stroke();
      fr(g, "rgba(60,30,14,.32)", x, y, 0.35, 7);
    }
    fr(g, "rgba(50,24,10,.42)", X0, y, XW, 0.4); fr(g, "rgba(255,220,180,.10)", X0, y + 0.4, XW, 0.35);
  }
  // 벽 아래 그늘·창빛 반사·광택
  fr(g, lgr(g, 0, P_FLOOR, 0, P_FLOOR + 40, [[0, "rgba(20,8,30,.55)"], [1, "rgba(20,8,30,0)"]]), X0, P_FLOOR, XW, 40);
  g.fillStyle = lgr(g, 0, P_FLOOR, 0, P_FLOOR + 60, [[0, "rgba(170,190,255,.16)"], [1, "rgba(170,190,255,0)"]]); poly(g, g.fillStyle, [[6, P_FLOOR], [36, P_FLOOR], [46, P_FLOOR + 60], [10, P_FLOOR + 60]]);
  g.fillStyle = rgr(g, 80, 120, 4, 110, [[0, "rgba(255,200,140,.10)"], [1, "rgba(255,200,140,0)"]]); g.fillRect(X0, P_FLOOR, XW, Y1 - P_FLOOR);
  // 러그
  g.fillStyle = "rgba(10,4,20,.35)"; rrp(g, 31, 119.5, 76, 52, 2); g.fill();
  fr(g, "#1e4a62", 32, 118, 74, 52, 1.6); fr(g, "#c94f6a", 34, 120, 70, 48, 1.2); fr(g, lgr(g, 0, 122, 0, 166, [[0, "#3a82a6"], [1, "#25607e"]]), 36, 122, 66, 44, 1);
  g.strokeStyle = "rgba(242,193,78,.85)"; g.lineWidth = 0.6;
  for (let k = 0; k < 3; k++) { const cx = 52 + k * 17, cy = 144; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 7, cy); g.lineTo(cx, cy + 7); g.lineTo(cx - 7, cy); g.closePath(); g.stroke(); el(g, "#ff8ac8", cx, cy, 1.1); g.beginPath(); g.moveTo(cx, cy - 3.6); g.lineTo(cx + 3.6, cy); g.lineTo(cx, cy + 3.6); g.lineTo(cx - 3.6, cy); g.closePath(); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 0.4; g.strokeRect(37.5, 123.5, 63, 41);
  g.strokeStyle = "#e8dcc0"; g.lineWidth = 0.35; for (let y = 120; y < 168; y += 1.6) { g.beginPath(); g.moveTo(32, y); g.lineTo(30, y + 0.3); g.moveTo(106, y); g.lineTo(108, y + 0.3); g.stroke(); }
  // 창문: 밤 도시(실제 그림)
  fr(g, "rgba(0,0,0,.3)", 5.4, 7.6, 31.6, 39.4, 1);
  fr(g, lgr(g, 6, 0, 36, 0, [[0, "#e4d6f8"], [0.5, "#cbb8e6"], [1, "#9a86b8"]]), 6, 8, 30, 38, 0.8);
  g.save(); g.beginPath(); g.rect(8, 10, 26, 34); g.clip();
  if (prImgOk()) { g.drawImage(PR_IMG, 108, 16, 182, 206, 8, 10, 26, 34); g.fillStyle = "rgba(20,10,60,.18)"; g.fillRect(8, 10, 26, 34); }
  else {
    fr(g, lgr(g, 0, 10, 0, 44, [[0, "#141a3a"], [1, "#2a2f62"]]), 8, 10, 26, 34); el(g, "#f4f0c8", 27.5, 14.5, 2);
    [[8, 32, 6, 12], [14, 27, 6, 17], [21, 34, 6, 10], [27, 29, 7, 15]].forEach(([x, y, w, h]) => fr(g, "#0b0e22", x, y, w, h));
    g.fillStyle = "#ffd56a"; [[10, 35], [16, 30], [17, 34], [23, 37], [29, 32], [31, 35]].forEach(([x, y]) => g.fillRect(x, y, 0.8, 0.8));
  }
  poly(g, "rgba(255,255,255,.10)", [[8, 26], [18, 10], [23, 10], [8, 34]]);
  g.restore();
  fr(g, lgr(g, 20, 0, 22, 0, [[0, "#b8a4d8"], [0.5, "#ece2fa"], [1, "#9a86b8"]]), 20, 10, 2, 34); fr(g, "#cbb8e6", 8, 26, 26, 1); fr(g, "rgba(0,0,0,.2)", 8, 27, 26, 0.4);
  fr(g, lgr(g, 0, 45.6, 0, 49, [[0, "#f4ecff"], [1, "#8a7aa8"]]), 4, 45.6, 34, 3, 0.6);
  // 커튼
  for (const [x, dir] of [[3, 1], [35, -1]]) {
    g.fillStyle = lgr(g, x, 0, x + 4, 0, [[0, "#6a2a58"], [0.3, "#b0508a"], [0.55, "#7a3066"], [0.8, "#a84a80"], [1, "#5a2048"]]);
    g.beginPath(); g.moveTo(x, 6.5); g.lineTo(x + 4, 6.5); g.quadraticCurveTo(x + 4 - dir * 0.4, 30, x + 4 + dir * 0.6, 47); g.lineTo(x - dir * 0.6, 47); g.quadraticCurveTo(x + dir * 0.4, 30, x, 6.5); g.fill();
    fr(g, "#e0b860", x - 0.2, 28, 4.4, 1.2, 0.5);
  }
  fr(g, lgr(g, 0, 5.6, 0, 7.4, [[0, "#f0d080"], [1, "#8a6420"]]), 1, 5.6, 40, 1.6, 0.8); el(g, "#f0d080", 1.2, 6.4, 1.1); el(g, "#f0d080", 40.8, 6.4, 1.1);
  // TV 장(고정)
  g.fillStyle = "rgba(10,4,20,.35)"; g.fillRect(93, 69.4, 40, 1.6);
  fr(g, lgr(g, 0, 52, 0, 54.4, [[0, "#a0704c"], [1, "#6a4430"]]), 92, 52, 40, 2.4, 0.6);
  fr(g, lgr(g, 0, 54, 0, 68, [[0, "#5a3826"], [1, "#3a2216"]]), 92, 54.2, 40, 13.8, 0.4);
  for (const x of [93.2, 112.6]) { fr(g, "rgba(255,255,255,.06)", x, 55.2, 18.2, 11.6, 0.6); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.35; g.strokeRect(x + 0.2, 55.4, 17.8, 11.2); }
  el(g, "#e8c060", 109.6, 61, 0.55); el(g, "#e8c060", 115.4, 61, 0.55);
  fr(g, "#22140a", 94, 68, 2, 2, 0.4); fr(g, "#22140a", 128, 68, 2, 2, 0.4);
  // 스크린 걸이·액자 못·콘센트
  el(g, "#8a8a98", 93, 14, 1); el(g, "#8a8a98", 131, 14, 1); el(g, "#b8b8c8", 54, 32.4, 0.6);
  fr(g, "#e4dcec", 140, 52, 4, 5, 0.6); el(g, "#555", 141.3, 54.6, 0.35); el(g, "#555", 142.7, 54.6, 0.35);
  // 줄전구 전선
  g.strokeStyle = "#0e0818"; g.lineWidth = 0.4; g.beginPath(); for (let x = 42; x < PW; x += 1) { const y = 5 + 3 * Math.sin(((x - 42) / 118) * Math.PI); x === 42 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  // 미러볼 줄
  ln(g, "#5a5a68", 0.35, [[78, -1], [78, 10.5]]);
  // 무대 밖 부분은 살짝 어둡게(놀이 칸이 또렷하게)
  if (Y0 < -2) fr(g, lgr(g, 0, Y0, 0, 0, [[0, "rgba(6,2,14,.55)"], [1, "rgba(6,2,14,0)"]]), X0, Y0, XW, -Y0);
  if (Y1 > PH + 2) fr(g, lgr(g, 0, PH, 0, Y1, [[0, "rgba(6,2,14,0)"], [1, "rgba(6,2,14,.6)"]]), X0, PH, XW, Y1 - PH);
}
// 네온 하트 모양(가운데 52.5, 15)
const prHeart = (g) => { const x = 52.5, y = 11.2; g.beginPath(); g.moveTo(x, y + 2.2); g.bezierCurveTo(x - 1.2, y - 0.6, x - 5.6, y - 0.4, x - 5.2, y + 3); g.bezierCurveTo(x - 4.8, y + 5.6, x - 1.6, y + 7, x, y + 8.6); g.bezierCurveTo(x + 1.6, y + 7, x + 4.8, y + 5.6, x + 5.2, y + 3); g.bezierCurveTo(x + 5.6, y - 0.4, x + 1.2, y - 0.6, x, y + 2.2); g.closePath(); };
const PR_SC = {};
function prSprites(R) {
  const key = Math.round(R * 100);
  if (PR_SC[key]) return PR_SC[key];
  const S = { R, f: {}, gh: {}, wh: {}, t: {} };
  for (const d of PR_FURN) { const c = prV(d.w, d.h, d.d, R); S.f[d.id] = c; S.gh[d.id] = prTint(c, "#bfe9ff", 0.55); S.wh[d.id] = prTint(c, "#ffffff", 1); }
  for (const [k, [w, h, fn, nol]] of Object.entries(PR_TRASH)) S.t[k] = prV(w, h, fn, R, !nol);
  for (const [k, [w, h, fn]] of Object.entries(PR_ICON)) S[k] = prV(w, h, fn, R);
  return (PR_SC[key] = S);
}
// 아이콘(바닥 버튼·방법 화면): 기기 해상도 그림 주소
let PR_IC = null;
const prIcons = () => { if (PR_IC) return PR_IC; const S = prSprites(4); return (PR_IC = { broom: S.broom.toDataURL(), box: S.box.toDataURL(), cam: S.cam.toDataURL() }); };
// 체크인 사진 한 장(논리 160x200 를 R배): 배경 + 제자리 가구
function prShot(R) {
  const c = document.createElement("canvas"); c.width = Math.round(PW * R); c.height = Math.round(PH * R); const g = c.getContext("2d");
  g.setTransform(R, 0, 0, R, 0, 0); prBgDraw(g, 0, 0, PW, PH);
  const S = prSprites(R); g.setTransform(1, 0, 0, 1, 0, 0);
  PR_FURN.slice().sort((a, b) => a.home[1] + a.zb - b.home[1] - b.zb).forEach((f) => { const s = S.f[f.id], w = s.width, h = s.height; g.drawImage(s, Math.round(f.home[0] * R - w / 2), Math.round((f.home[1] + PRP) * R - h)); });
  return c;
}
// 방법 화면 그림 3칸
function prSteps() {
  const st = "image-rendering:auto;height:auto";
  const shot = () => { const c = prShot(0.9), o = document.createElement("canvas"); o.width = c.width + 12; o.height = c.height + 30; const g = o.getContext("2d"); g.fillStyle = "#fbfaf5"; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 6, 6); g.fillStyle = "#c8c0b0"; g.fillRect(o.width / 2 - 26, c.height + 16, 52, 3); return o.toDataURL(); };
  if (!prImgOk()) prImg().addEventListener("load", () => { try { const u = shot(); document.querySelectorAll("img[data-prshot]").forEach((e) => (e.src = u)); } catch (e) {} }, { once: true });
  const S = prSprites(3);
  const mk = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w * 3; c.height = h * 3; const g = c.getContext("2d"); fn(g); return c.toDataURL(); };
  const put = (g, s, x, y, a = 1) => { g.globalAlpha = a; g.drawImage(s, x * 3, y * 3); g.globalAlpha = 1; };
  const b = mk(40, 30, (g) => { put(g, S.f.speaker, 0, 1); put(g, S.gh.speaker, 24, 1, 0.8); g.setTransform(3, 0, 0, 3, 0, 0); ln(g, "#ffffff", 1.1, [[15, 15], [23, 15]]); ln(g, "#ffffff", 1.1, [[20, 12], [23, 15], [20, 18]]); });
  const c = mk(34, 18, (g) => { put(g, S.t.cup, 0, 7); put(g, S.t.chips, 7, 6); put(g, S.broom, 19, 2); g.setTransform(3, 0, 0, 3, 0, 0); [[6, 4], [15, 3], [3, 2.6], [17, 6]].forEach(([x, y]) => el(g, "rgba(232,220,200,.9)", x, y, 0.6)); });
  return [[`<img data-prshot src="${shot()}" alt="" style="${st};width:52px;transform:rotate(-4deg);box-shadow:0 3px 8px #0007">`, "사진 기억"], [`<img src="${b}" alt="" style="${st};width:72px">`, "끌어서 제자리"], [`<img src="${c}" alt="" style="${st};width:68px">`, "톡톡 청소"]];
}
function gPR(host, ez, finish) {
  const T = 30 * ez, PEEK = 3, SNAP = 16;
  const IC = prIcons();
  const F = frame(host, "pr", "파티는 끝났다", "mg-prst", "", `<button class="mg-btn on" data-mode="clean"><img src="${IC.broom}" alt="">치우기</button><button class="mg-btn" data-mode="keep"><img src="${IC.box}" alt="">분실물</button><button class="mg-btn" data-photo><img src="${IC.cam}" alt="">사진 <span>3</span></button>`);
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-prw"><canvas></canvas><div class="mg-prpola"><img alt="체크인 때 방 사진"><b>체크인 때 사진 · 자리를 기억해요 <i>${PEEK}</i></b></div><div class="mg-prcap">체크인 때 사진</div></div>`);
  const wrap = F.stage.querySelector(".mg-prw"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), pola = wrap.querySelector(".mg-prpola"), cap = wrap.querySelector(".mg-prcap");
  // 크기: 무대 전체를 덮고, 논리 칸(160x200)이 꽉 차게 가운데. 남는 위·아래는 벽·마루를 이어 그린다
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  let SW = 0, SH = 0, K = 2, R = 4, X0 = 0, Y0 = 0, X1 = PW, Y1 = PH, BG = null, S = null;
  const fit = () => {
    const sw = F.stage.clientWidth || 320, sh = F.stage.clientHeight || 400;
    if (sw === SW && sh === SH && BG) return; SW = sw; SH = sh;
    K = Math.min(sw / PW, sh / PH); R = K * DPR;
    const ex = sw / K - PW, ey = sh / K - PH; X0 = -ex / 2; X1 = PW + ex / 2; Y0 = -ey * 0.55; Y1 = PH + ey * 0.45;
    cv.width = Math.round(sw * DPR); cv.height = Math.round(sh * DPR);
    S = prSprites(R);
    BG = document.createElement("canvas"); BG.width = cv.width; BG.height = cv.height; const b = BG.getContext("2d"); b.setTransform(R, 0, 0, R, -X0 * R, -Y0 * R); prBgDraw(b, X0, Y0, X1, Y1);
  };
  fit();
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
    const w = PR_TRASH[kind][0], h = PR_TRASH[kind][1], sofa = byId("sofa");
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
    const t = { kind, w, h, x: Math.round(x), y: Math.round(y), lost: lost || null, gone: false, save: false, die: -9, app: started ? tt : 1e9, wob: -9, ph: rnd() * 1.4, rot: (rnd() - 0.5) * 0.5 };
    tr.push(t); return t;
  };
  const n0 = 8 + rint(4); for (let i = 0; i < n0; i++) addT(pick(PR_TR));
  const nl = rnd() < 0.8 ? 1 + rint(2) : 0; shuffle(PR_LOST).slice(0, nl).forEach(([k, nm]) => addT(k, nm));
  const total0 = disp.length + tr.length;
  const left = () => tr.filter((t) => !t.gone).length;
  // 효과: 먼지, 반짝 별, 빗자루
  const pts = [], fxs = [], brooms = [];
  const dust = (x, y, n, w = 6) => { for (let i = 0; i < n; i++) { const l = 0.45 + rnd() * 0.4; pts.push({ x: x + (rnd() - 0.5) * w, y: y - rnd() * 3, vx: (rnd() - 0.5) * 26, vy: -6 - rnd() * 16, l, m: l, c: pick(["#efe4d0", "#d4c8b0", "#b0a28c", "#f8f0e0"]), s: 0.5 + rnd() * 0.7 }); } };
  const stars = (x, y, n, sp = 12) => { for (let i = 0; i < n; i++) fxs.push({ x: x + (rnd() - 0.5) * sp * 2, y: y + (rnd() - 0.5) * sp, t0: tt + rnd() * 0.15, l: 0.45 + rnd() * 0.3 }); };
  const star = (x, y, p) => { const k = 1 + (p < 0.5 ? p : 1 - p) * 7; g.globalAlpha = 1 - p * 0.4; el(g, "rgba(255,243,160,.35)", x, y, k * 0.7); twinkle(g, x, y, k, "#fff6b0"); el(g, "#ffffff", x, y, 0.5); g.globalAlpha = 1; };
  // 좌표(논리 ↔ 화면)
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [X0 + ((e.clientX - r.left) / r.width) * (X1 - X0), Y0 + ((e.clientY - r.top) / r.height) * (Y1 - Y0)]; };
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + ((x - X0) / (X1 - X0)) * r.width, r.top - s.top + ((y - Y0) / (Y1 - Y0)) * r.height]; };
  const toClient = (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + ((x - X0) / (X1 - X0)) * r.width, r.top + ((y - Y0) / (Y1 - Y0)) * r.height]; };
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
    } else { f.drop = tt; dust(f.x, f.y, 5, f.w); tone(150, 0.08, "sine", 0.16, -40); }
    upd();
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((k) => cv.addEventListener(k, drop));
  F.foot.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; F.foot.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b)); SFX.tok(); }));
  // 사진: 누르고 있는 동안 체크인 때 모습이 겹쳐 보임(최대 1.5초), 3번까지
  const pb = F.foot.querySelector("[data-photo]"); let pt = 0;
  const hidePhoto = () => { if (!showing) return; showing = false; clearTimeout(pt); cap.classList.remove("on"); };
  pb.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!started || over || showing) return; if (photos <= 0) { F.msg("사진은 다 봤어요"); return; } photos--; pb.querySelector("span").textContent = photos; if (!photos) pb.disabled = true; showing = true; cap.classList.add("on"); noise(0.05, 3200, 0.1); tone(1400, 0.04, "square", 0.05, 0, 0.05); pt = setTimeout(hidePhoto, 1500); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((k) => pb.addEventListener(k, () => setTimeout(hidePhoto, 250)));
  // 그리기(논리 좌표로 변환해 둔 상태에서). 소품 그림은 R배라 논리 크기 = 픽셀/R
  const drawSpr = (c, x, y, a = 1, sc = 1, rot = 0) => {
    const w = c.width / c.R, h = c.height / c.R;
    g.globalAlpha = a;
    if (sc === 1 && !rot) g.drawImage(c, x - w / 2, y - h + PRP, w, h);
    else { g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.drawImage(c, -w * sc / 2, (-h + PRP) * sc, w * sc, h * sc); g.restore(); }
    g.globalAlpha = 1;
  };
  const shadowE = (x, y, w, a) => { g.fillStyle = `rgba(8,2,18,${a})`; g.beginPath(); g.ellipse(x, y - 0.3, w / 2, Math.max(0.8, w * 0.09), 0, 0, 6.2832); g.fill(); };
  const drawF = (f, clean) => {
    let x = clean ? f.home[0] : f.x, y = clean ? f.home[1] : f.y, lift = 0;
    if (!clean) {
      if (drag && drag.f === f) lift = Math.min(1, (tt - drag.t0) / 0.08) * 5;
      else if (tt - f.drop < 0.3) { const p = (tt - f.drop) / 0.3; lift = p < 0.5 ? 5 * (1 - p / 0.5) : 2 * Math.sin(((p - 0.5) / 0.5) * Math.PI); }
      if (tt - f.wob < 0.3) x += Math.sin((tt - f.wob) * 40) * 1.5;
    }
    const onWall = f.wall && Math.abs(x - f.home[0]) < 1 && Math.abs(y - f.home[1]) < 1;
    if (!onWall) shadowE(x, y, Math.max(4, f.w - lift), lift > 0.5 ? 0.42 : 0.32);
    drawSpr(S.f[f.id], x, y - lift);
    if (!clean && tt >= f.flash && tt - f.flash < 0.45) drawSpr(S.wh[f.id], x, y, 1 - (tt - f.flash) / 0.45);
  };
  const drawT = (t) => {
    if (tt < t.app) return;
    let sc = 1, a = 1, x = t.x, y = t.y;
    const pa = tt - t.app; if (pa < 0.25) { const p = pa / 0.25; sc = p < 0.6 ? (p / 0.6) * 1.3 : 1.3 - ((p - 0.6) / 0.4) * 0.3; }
    if (t.gone) { const p = (tt - t.die) / (t.save ? 0.5 : 0.25); if (p >= 1) return; if (t.save) { y -= p * 14; a = 1 - p; } else sc = 1 - p; }
    if (tt - t.wob < 0.3) x += Math.sin((tt - t.wob) * 40) * 1.5;
    if (!t.gone) shadowE(x, y, t.w, 0.28);
    drawSpr(S.t[t.kind], x, y, a, sc, t.rot);
    // 분실물은 가끔 반짝
    if (t.lost && !t.gone && sc === 1) { const ph = (tt * 0.8 + t.ph) % 1.4; if (ph < 0.36) { const k = 1.2 + Math.sin((ph / 0.36) * Math.PI) * 2.2; twinkle(g, x + t.w / 2, y - t.h, k, "#fff8c0"); el(g, "#ffffff", x + t.w / 2, y - t.h, 0.45); } }
  };
  const render = (clean) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.drawImage(BG, 0, 0);
    g.setTransform(R, 0, 0, R, -X0 * R, -Y0 * R);
    const XW = X1 - X0, YH = Y1 - Y0;
    // 천장 네온 띠(색이 돈다)
    const hue = Math.round(clean ? 300 : tt * 50) % 360;
    g.fillStyle = `hsla(${hue},95%,60%,.25)`; g.fillRect(X0, 3.6, XW, 4); g.fillStyle = `hsl(${hue},95%,78%)`; g.fillRect(X0, 3.7, XW, 0.9);
    // 네온 하트
    const hOn = clean || !(Math.sin(tt * 7.3) > 0.9 && Math.sin(tt * 2.3) > 0);
    prHeart(g); g.lineWidth = 0.9; g.lineJoin = "round";
    if (hOn) { g.save(); g.shadowColor = "#ff4fb0"; g.shadowBlur = 6 * R; g.strokeStyle = "#ff8ac8"; g.stroke(); g.restore(); g.strokeStyle = "#ffe0f0"; g.lineWidth = 0.35; g.stroke(); }
    else { g.strokeStyle = "#5a2448"; g.stroke(); }
    // 줄전구
    for (let x = 46, i = 0; x < PW; x += 8, i++) { const y = 6 + 3 * Math.sin(((x - 42) / 118) * Math.PI), c = PR_BULB[i % 5], lit = clean || (Math.floor(tt * 2.5) + i) % 3 !== 0; if (lit) { g.fillStyle = rgr(g, x, y + 0.6, 0, 4, [[0, c + "88"], [1, c + "00"]]); g.fillRect(x - 4, y - 3.4, 8, 8); } el(g, lit ? c : shade(c, 0.4), x, y + 0.8, 0.9, 1.15); if (lit) el(g, "rgba(255,255,255,.8)", x - 0.3, y + 0.4, 0.3); }
    // 미러볼
    { const mx = 78, my = 14, mr = 3.6; g.fillStyle = rgr(g, mx - 1.2, my - 1.2, 0.2, mr + 0.4, [[0, "#ffffff"], [0.4, "#c8c8dc"], [1, "#5a5a74"]]); g.beginPath(); g.arc(mx, my, mr, 0, 6.2832); g.fill();
      g.save(); g.beginPath(); g.arc(mx, my, mr, 0, 6.2832); g.clip(); const sh = (tt * 2) % 1.2;
      for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const fx = mx + i * 1.2 - sh, fy = my + j * 1.2; if ((i * 7 + j * 3 + Math.floor(tt * 6)) % 5 === 0) { g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(fx, fy, 0.8, 0.8); } }
      g.strokeStyle = "rgba(40,40,60,.35)"; g.lineWidth = 0.15; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(mx + i * 1.2 - sh, my - mr); g.lineTo(mx + i * 1.2 - sh, my + mr); g.moveTo(mx - mr, my + i * 1.2); g.lineTo(mx + mr, my + i * 1.2); g.stroke(); } g.restore(); }
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
      fr(g, lgr(g, 0, sy, 0, sy + sh, [[0, "#3a3fa8"], [0.6, "#24307a"], [1, "#1a1f5a"]]), sx, sy, sw, sh);
      for (let i = 0; i < 5; i++) el(g, PR_BULB[i], sx + 6.5 + i * 7, sy + 8.5 - Math.abs(Math.sin(tt * 4 + i)) * 4, 1.5);
      fr(g, "#ffffff", sx + 5, sy + 15, 28, 0.9, 0.4); fr(g, "#ff6fa8", sx + 5, sy + 15, (tt * 7) % 29, 0.9, 0.4); fr(g, "#c8c8e8", sx + 9, sy + 18, 20, 0.7, 0.3);
      g.globalCompositeOperation = "lighter"; g.fillStyle = lgr(g, pj.home[0], pj.home[1], sx + sw / 2, sy + sh, [[0, "rgba(255,250,220,.14)"], [1, "rgba(255,250,220,.03)"]]);
      g.beginPath(); g.moveTo(pj.home[0] + 4, pj.home[1] - 5); g.lineTo(sx, sy + sh); g.lineTo(sx + sw, sy + sh); g.closePath(); g.fill();
      g.globalCompositeOperation = "source-over";
    }
    g.globalCompositeOperation = "lighter";
    { const lx = clean ? lamp.home[0] : lamp.x, ly = (clean ? lamp.home[1] : lamp.y) - lamp.h + 8, rg = rgr(g, lx, ly, 1, 36, [[0, "rgba(255,210,130,.38)"], [0.5, "rgba(255,190,110,.1)"], [1, "rgba(255,210,130,0)"]]); g.fillStyle = rg; g.fillRect(lx - 36, ly - 36, 72, 72); }
    for (let k = 0; k < 12; k++) { const a = tt * 0.5 + k * 0.523, rr = 30 + (k % 4) * 24, x = 78 + Math.cos(a) * rr * 1.1, y = 100 + Math.sin(a) * rr * 0.75; if (x < 0 || x > PW - 2 || y < 8 || y > PH - 2) continue; el(g, PR_BULB[k % 5] + "55", x, y, 1.8); el(g, PR_BULB[k % 5] + "aa", x, y, 0.7); }
    g.globalCompositeOperation = "source-over";
    if (clean) return;
    // 스피커가 제자리면 음표
    if (at(spk)) { g.font = "700 6px sans-serif"; g.textAlign = "center"; for (let k = 0; k < 2; k++) { const ph = (tt * 0.7 + k * 0.5) % 1, x = spk.x - 3 + k * 6 + Math.sin(ph * 6), y = spk.y - spk.h - 2 - ph * 12; g.globalAlpha = 1 - ph; g.fillStyle = "#ffd166"; g.fillText(k ? "♫" : "♪", x, y); g.globalAlpha = 1; } }
    // 어질러진 만큼 방이 어둡다
    const rem = disp.filter((f) => !f.ok).length + left(), dark = peek ? 0 : 0.3 * clamp(rem / total0, 0, 1);
    if (dark > 0.01) { g.fillStyle = `rgba(12,6,30,${dark})`; g.fillRect(X0, Y0, XW, YH); }
    // 사진 겹쳐 보기: 원래 자리 잔상 + 사진 테두리
    if (showing) {
      g.fillStyle = "rgba(255,244,220,.1)"; g.fillRect(X0, Y0, XW, YH);
      for (const f of disp) if (!f.ok) drawSpr(S.gh[f.id], f.home[0], f.home[1], 0.75);
      g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = 2.4; g.strokeRect(1.2, 1.2, PW - 2.4, PH - 2.4);
    }
    // 효과
    for (const q of pts) { g.globalAlpha = clamp(q.l / q.m, 0, 1); el(g, q.c, q.x, q.y, q.s); }
    g.globalAlpha = 1;
    for (const b of brooms) { const p = (tt - b.t0) / 0.32; if (p >= 0 && p <= 1) drawSpr(S.broom, b.x - 9 + p * 18, b.y + 1 - Math.sin(p * Math.PI) * 2, 1 - p * p, 1, -0.3 + p * 0.6); }
    for (const s of fxs) { const p = (tt - s.t0) / s.l; if (p >= 0 && p <= 1) star(s.x, s.y, p); }
    // 다 치우면 빛줄기가 쓱
    if (shine >= 0) { const p = (tt - shine) / 1.0, x0 = -80 + p * 320; g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,255,235,.3)"; g.beginPath(); g.moveTo(x0, Y0); g.lineTo(x0 + 26, Y0); g.lineTo(x0 - 54, Y1); g.lineTo(x0 - 80, Y1); g.closePath(); g.fill(); g.globalCompositeOperation = "source-over"; }
    if (peek) { g.fillStyle = "rgba(8,4,20,.62)"; g.fillRect(X0, Y0, XW, YH); }
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
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.pr = { items, disp, tr, cv, photo: () => showing, toClient };
  // 시작: 체크인 때 사진(폴라로이드) 3초 → 손님이 놀고 간 방
  const snap = () => { try { render(true); const o = document.createElement("canvas"); o.width = Math.round(PW * R); o.height = Math.round(PH * R); o.getContext("2d").drawImage(cv, -X0 * R, -Y0 * R, o.width, o.height, 0, 0, o.width, o.height); pola.querySelector("img").src = o.toDataURL("image/jpeg", 0.9); } catch (e) {} };
  snap();
  // 창밖 그림이 늦게 오면 배경을 다시 그린다
  if (!prImgOk()) prImg().addEventListener("load", () => { if (!cv.isConnected) return; BG = null; SW = 0; fit(); if (peek) snap(); }, { once: true });
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
// 자소서 주인(취준생) 그림(11-22): 위 띠에서 첨삭을 보며 표정이 바뀐다
const CS_MENTEE = ["c022", "c024", "c031", "c039", "c053", "c055", "c056", "c057", "c060", "c072", "c098", "c016", "c030"];
let CS_PICK = null;
const csPick = () => { if (!CS_PICK) { const k = pick(CS_MENTEE), im = new Image(); im.src = "img/body/" + k + ".webp"; CS_PICK = { k, im }; } return CS_PICK; };
const CS_SAY = { "두괄식 아님": "아, 결론부터 써야 하는구나!", "AI 티 상투어": "헉… AI 티가 났군요", "숫자 없는 성과": "숫자로 바꿔 볼게요!", "다른 이야기": "이건 빼야겠네요" };
const CS_PEN = `<svg viewBox="0 0 32 32" width="30" height="30"><path d="M4 28l3.2-8.6L22.6 4a3 3 0 0 1 4.2 0l1.2 1.2a3 3 0 0 1 0 4.2L12.6 24.8z" fill="#d32f2f"/><path d="M22.6 4a3 3 0 0 1 4.2 0l1.2 1.2a3 3 0 0 1 0 4.2l-2 2-5.4-5.4z" fill="#37474f"/><path d="M7.2 19.4l5.4 5.4L4 28z" fill="#ffe0b2"/><path d="M4 28l1.6-4.3 2.7 2.7z" fill="#212121"/><path d="M9 17.6L21.6 5" stroke="#ff8a80" stroke-width="1.4" stroke-linecap="round"/></svg>`;
function gCS(host, ez, finish) {
  const T = 30 * ez;
  const set = pick(CS_SETS);
  // 나쁜 문장 3~4개: 서두(절반 확률, 맨 앞) + 이야기 전용 1~2 + 상투어 1~2
  const bads = [];
  const sens = set.good.map((t) => ({ t, bad: false }));
  shuffle(set.bad).slice(0, 1 + rint(2)).forEach(([k, t, fix]) => { const at = 1 + rint(sens.length - 1); const o = { t, bad: true, kind: k === "n" ? "숫자 없는 성과" : "다른 이야기", fix }; sens.splice(at, 0, o); bads.push(o); });
  shuffle(CS_AI).slice(0, 1 + rint(2)).forEach(([t, fix], i) => { const at = i === 0 && rnd() < 0.6 ? sens.length : 1 + rint(sens.length - 1); const o = { t, bad: true, kind: "AI 티 상투어", fix }; sens.splice(at, 0, o); bads.push(o); });
  if (rnd() < 0.55) { const [t, fix] = pick(CS_HEAD); const o = { t, bad: true, kind: "두괄식 아님", fix }; sens.unshift(o); bads.push(o); }
  const F = frame(host, "cs", "자소서 심폐소생술", "", "", `<button class="mg-btn" data-mg-done>다 찾았어요</button>`);
  const MT = csPick(); CS_PICK = null; // 다음 판은 다른 사람
  F.stage.insertAdjacentHTML("beforeend", `<div class="cs-top"><div class="cs-me"></div><div class="cs-say"></div></div><div class="mg-paper"><div class="mg-ttl">${set.ttl}</div>${sens.map((s, i) => `<button class="mg-sen" data-i="${i}">${s.t}</button> `).join("")}</div>`);
  const meEl = F.stage.querySelector(".cs-me"), sayEl = F.stage.querySelector(".cs-say");
  let meT = 0;
  const me = (ex, say, back = "") => { meEl.style.backgroundPosition = ucBgPos(ex); if (say) { sayEl.textContent = say; sayEl.classList.remove("pop"); void sayEl.offsetWidth; sayEl.classList.add("pop"); } clearTimeout(meT); if (back) meT = setTimeout(() => { if (!over) me(back); }, 1400); };
  { const show = () => { meEl.style.backgroundImage = `url("${MT.im.src}")`; meEl.classList.add("on"); }; if (MT.im.complete && MT.im.naturalWidth) show(); else MT.im.onload = show; }
  me("shy", "선생님, 제 자소서 어디가 문제예요?");
  let found = 0, wrong = 0, over = false;
  const upd = () => (F.sc.textContent = `${found}/${bads.length} · 틀림 ${wrong}`);
  const paper = F.stage.querySelector(".mg-paper");
  // 빨간 펜이 문장 위를 왼쪽→오른쪽으로 지나가며 줄마다 손글씨처럼 긋는다. 멀쩡한 문장이면 긋다 멈추고 ✕
  const strike = (b, ok) => new Promise((res) => {
    const P = paper.getBoundingClientRect(), ST0 = paper.scrollTop, SL0 = paper.scrollLeft;
    // 줄마다 따로 긋는다: 버튼은 한 덩어리 상자라 글자 범위(Range)로 줄 위치를 얻고, 같은 줄 조각은 합친다
    let lines = [];
    try { const rg = document.createRange(); rg.selectNodeContents(b); for (const r of rg.getClientRects()) { if (r.width < 2) continue; const L = lines.find((l) => Math.abs(l.top - r.top) < 4); if (L) { const x1 = Math.max(L.left + L.width, r.right); L.left = Math.min(L.left, r.left); L.width = x1 - L.left; } else lines.push({ left: r.left, top: r.top, width: r.width, height: r.height }); } } catch (e) {}
    if (!lines.length) lines = [...b.getClientRects()].filter((r) => r.width > 4);
    const pen = document.createElement("div"); pen.className = "mg-pen"; pen.innerHTML = CS_PEN;
    if (!lines.length || !pen.animate) return res();
    paper.appendChild(pen);
    const todo = ok ? lines : lines.slice(0, 1); let i = 0;
    const next = () => {
      if (i >= todo.length) { pen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = () => pen.remove(); return res(); }
      const r = todo[i++], x0 = r.left - P.left + SL0, y = r.top - P.top + ST0 + r.height * 0.56; // 줄 위치는 처음 잰 때의 스크롤 기준
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
      if (found >= bads.length) me("smile", "감사합니다! 바로 고칠게요 🙇"); else me("surprised", CS_SAY[s.kind] || "아하!", "neutral");
      if (found >= bads.length) doneT = tm.left();
      strike(b, true).then(() => { if (found >= bads.length && !over && !paper.dataset.st) { paper.dataset.st = 1; goodStamp(); setTimeout(end, 1000); } });
    }
    else { if (b.classList.contains("miss")) return; b.classList.add("miss"); wrong++; F.msg("괜찮은 문장이에요. 감점"); F.miss(b); upd(); strike(b, false); me("sad", "그 문장은 괜찮다고 하셨잖아요…", "neutral"); }
  });
  const end = () => {
    if (over) return; over = true; tm.stop();
    const tl = doneT ?? tm.left();
    const s = (found - wrong * 0.5) / bads.length * 0.85 + (found >= bads.length ? 0.15 * Math.min(1, tl / (T * 0.5)) : 0);
    const ex = bads.map((b) => `<div><small>${b.kind}${sens.find((x) => x === b) && F.stage.querySelector(`.mg-sen[data-i="${sens.indexOf(b)}"]`).classList.contains("hit") ? " · 찾음" : " · 놓침"}</small><s>${b.t}</s><br><em>→ ${b.fix}</em></div>`).join("");
    finish(s, `고칠 문장 ${found}/${bads.length}개 찾음${wrong ? ` · 잘못 짚은 문장 ${wrong}개` : ""}`, `<div><small>조로 원칙</small>두괄식 · 소제목 · 사실과 숫자 · 한 항목 한 이야기</div>${ex}`, [["찾은 문장", found / bads.length], ["정확도", found + wrong ? found / (found + wrong) : 0], ["속도", found >= bads.length ? Math.min(1, tl / (T * 0.5)) : 0]]);
  };
  F.foot.querySelector("[data-mg-done]").onclick = end;
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.cs = { sens, bads };
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
// 손님 그림(11-22): 국기마다 어울리는 캐릭터. 메시지 분위기에 따라 표정이 바뀐다
const AB_GUEST = {
  "🇺🇸": ["c050", "c068", "c069", "c023"], "🇬🇧": ["c068", "c050"], "🇦🇺": ["c065", "c050"], "🇫🇷": ["c032", "c068"], "🇸🇬": ["c023", "c049"],
  "🇯🇵": ["c001", "c008", "c011", "c055", "c056", "c063", "c074", "c104"], "🇨🇳": ["c012", "c026", "c044", "c059", "c067", "c091", "c103"],
};
const AB_MOOD = { "The hot water isn't working.": "sad", "楼上太吵了。": "angry", "鍵の暗証番号を忘れました。": "shy", "We'd like one more blanket.": "shy", "可以提前入住吗？": "shy" };
// 한 판에 나올 메시지 5개와 손님 그림을 미리 골라 받아 둔다(방법 화면에서 골라 두면 그 사이에 받아진다)
let AB_PICK = null;
function abPick() {
  if (AB_PICK) return AB_PICK;
  const qs = shuffle(AB_MSG).slice(0, 5), used = new Set();
  const keys = qs.map(([fl]) => { const ks = AB_GUEST[fl] || AB_GUEST["🇺🇸"], k = ks.find((x) => !used.has(x)) || pick(ks); used.add(k); return k; });
  const ims = keys.map((k) => { const im = new Image(); im.src = "img/body/" + k + ".webp"; return im; });
  return (AB_PICK = { qs, keys, ims });
}
function abSteps() {
  const P = abPick();
  const face = (k, ex, badge) => `<span style="position:relative;display:block;width:50px;height:62px;border-radius:10px;overflow:hidden;background:#24324a url(img/body/${k}.webp) ${ucBgPos(ex)}/300% 346.15% no-repeat;box-shadow:0 3px 8px #0006">${badge}</span>`;
  const bd = (t) => `<b style="position:absolute;right:2px;bottom:1px;font-size:16px;line-height:1;filter:drop-shadow(0 1px 2px #000)">${t}</b>`;
  return [[face(P.keys[0], "shy", bd("💬")), "손님 메시지"], [face(P.keys[1] || P.keys[0], "neutral", bd("👆")), "맞는 답장"], [face(P.keys[2] || P.keys[0], "smile", bd("⭐")), "빠를수록 별"]];
}
// 외국어 실력만큼 한국어 뜻이 보인다(낱말 단위로 가림). 실력 100이면 다 보인다
const seen = (skill) => clamp(0.35 + (+skill || 0) / 110, 0.35, 1);
function maskKo(ko, v, salt) { return [...String(ko)].map((ch, k) => { if (/[s?!.,~]/.test(ch)) return ch; const h = (Math.sin((salt + 1) * 97.13 + k * 12.989) * 43758.5453) % 1; return Math.abs(h) < v ? ch : "*"; }).join(""); }
function gAB(host, ez, finish, skill = 0) {
  const vis = seen(skill);
  const per = 11 * ez, N = 5;
  const PK = abPick(); AB_PICK = null; // 이번 판에 쓰고, 다음 판은 새로 고른다
  const qs = PK.qs;
  const F = frame(host, "airbnb", "인간 번역기", "", "img/bg/airbnb.webp");
  F.stage.insertAdjacentHTML("beforeend", `<div class="ab-gu"><i></i></div><div class="mg-chat"></div>`);
  const chat = F.stage.querySelector(".mg-chat"), gu = F.stage.querySelector(".ab-gu"), guFl = gu.querySelector("i");
  // 손님 그림 크기: 무대 위쪽 40% 안팎
  { const H = F.stage.clientHeight || 500, h = Math.round(clamp(H * 0.42, 150, 250)); gu.style.height = h + "px"; gu.style.width = Math.round(h * 240 / 312) + "px"; }
  let guEx = "";
  const face = (ex) => { if (ex === guEx) return; guEx = ex; gu.style.backgroundPosition = ucBgPos(ex); };
  const guestIn = (k) => {
    const im = PK.ims[k], go = () => { if (over || i !== k) return; gu.style.backgroundImage = `url("${im.src}")`; guEx = ""; face("neutral"); gu.classList.remove("out"); gu.classList.add("on"); };
    guFl.textContent = qs[k][0]; gu.classList.remove("on", "out");
    if (im.complete && im.naturalWidth) setTimeout(go, 60); else im.onload = go;
  };
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
    guestIn(i);
    setTimeout(arrive, 600 + rnd() * 500);
  };
  const arrive = () => {
    if (over) return;
    const [fl, m, ko, a, b, c] = qs[i];
    const opts = shuffle([[a, 1], [b, 0], [c, 0]]);
    SFX.pop(); face(AB_MOOD[m] || "neutral");
    chat.innerHTML = `${note}<div class="mg-bub in"><div class="mg-fl">${fl} 손님 메시지 ${i + 1}</div>${m}<small>${maskKo(ko, vis, i + 1)}</small></div><div class="mg-ans">${opts.map(([[t, k], r], j) => `<button data-r="${r}">${t}<small>${maskKo(k, vis, i * 7 + j + 3)}</small></button>`).join("")}</div><div class="mg-stars">${starsHtml(false)}</div>`;
    let done = false;
    const answer = (btn) => {
      if (done) return; done = true; const tl = tm.left(); tm.stop();
      const right = btn && btn.dataset.r === "1";
      chat.querySelectorAll(".mg-ans button").forEach((x) => { if (x.dataset.r === "1") x.classList.add("ok"); else if (x === btn) x.classList.add("ng"); x.disabled = true; });
      const v = right ? 0.62 + 0.38 * Math.min(1, tl / per * 1.25) : 0; sum += v; if (right) { ok++; spd += tl / per; }
      const st = right ? (v > 0.8 ? "★★★" : v > 0.65 ? "★★" : "★") : "✕"; stars.push(st);
      if (right) { F.hit(btn, st.length, "#ffd166"); btn.classList.add("send"); SFX.whoosh(); [...st].forEach((_, j) => setTimeout(SFX.pop, 300 + j * 150)); setTimeout(() => { face("smile"); if (v > 0.8) { const r = gu.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); F.float([r.left - s.left + r.width * 0.7, r.top - s.top + r.height * 0.3], "♥ Thank you!"); } }, 350); }
      else { F.miss(btn || null); face(btn ? "angry" : "sad"); }
      setTimeout(() => { if (!over) gu.classList.add("out"); }, right ? 750 : 1000);
      const se = chat.querySelector(".mg-stars"); if (se) se.innerHTML = starsHtml(true);
      F.msg(right ? (v > 0.8 ? "빛의 속도 답장!" : "답장 완료") : btn ? "엉뚱한 답장이에요" : "시간 초과! 답장을 못 했어요");
      i++; setTimeout(show, right ? 950 : 1200);
    };
    chat.querySelectorAll(".mg-ans button").forEach((x) => x.onclick = () => answer(x));
    tm = timer(per, F.bar, () => answer(null));
    // 답장이 늦으면 손님 얼굴이 굳는다
    const imp = setInterval(() => { if (done || over || !gu.isConnected) return clearInterval(imp); if (tm.left() < per * 0.35) face("angry"); }, 250);
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
// ── 무인카페 그림(11-22 도트 → 캐릭터 그림 + 벡터) ──
// 손님 = img/body 캐릭터 그림(표정 6칸 중 하나) + 벡터 다리. 그림이 아직 안 왔으면 예전 도트로 대신 그린다.
const UC_POOL = {
  teen: ["c002", "c009", "c010", "c021", "c025", "c047", "c051", "c052", "c054", "c079", "c084", "c105"],
  student: ["c022", "c024", "c028", "c030", "c031", "c053", "c057", "c060", "c069", "c072", "c098"],
  worker: ["c003", "c004", "c036", "c037", "c040", "c044", "c045", "c048", "c061", "c062", "c073", "c077", "c080", "c089", "c093", "c097"],
  elder: ["c043", "c087", "c088", "c092", "c096", "c100", "c101"],
  plain: ["c001", "c005", "c006", "c008", "c011", "c012", "c016", "c019", "c026", "c034", "c038", "c039", "c041", "c042", "c046", "c055", "c056", "c058", "c059", "c063", "c067", "c068", "c074", "c075", "c076", "c083", "c091", "c094", "c099", "c102", "c103", "c104"],
};
const UC_EX = { neutral: 0, smile: 1, sad: 2, angry: 3, shy: 4, surprised: 5 };
const UC_ART = {};
// 그림 하나 받기 + 다리·머리카락 색 뽑기(한 번만)
function ucArt(key) {
  if (UC_ART[key]) return UC_ART[key];
  const a = { key, ok: false, im: new Image(), legL: "#2c3550", legR: "#2c3550", hair: "#2a2018", shoe: "#26262c" };
  a.im.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = 240; c.height = 540; const q = c.getContext("2d"); q.drawImage(a.im, 0, 0, 240, 540, 0, 0, 240, 540);
      const px = (x, y) => { const d = q.getImageData(x, y, 1, 1).data; return d[3] > 180 ? `rgb(${d[0]},${d[1]},${d[2]})` : null; };
      a.legL = px(102, 534) || px(96, 528) || a.legL; a.legR = px(138, 534) || px(144, 528) || a.legL;
      let top = 0; for (let y = 0; y < 80; y++) { if (q.getImageData(120, y, 1, 1).data[3] > 160) { top = y; break; } }
      a.hair = px(120, top + 10) || a.hair;
      const sum = (s) => s.match(/\d+/g).slice(0, 3).reduce((m, v) => m + +v, 0);
      a.shoe = sum(a.legL) > 450 ? "#3a3a44" : "#f0f0f4";
    } catch (e) {}
    a.ok = true;
  };
  a.im.src = "img/body/" + key + ".webp";
  return (UC_ART[key] = a);
}
// 한 판에 쓸 사람(종류별로 몇 명만 골라 미리 받는다). 방법 화면에서 먼저 골라 두면 그 사이에 받아진다
let UC_PICK = null;
function ucPick(fresh) {
  if (UC_PICK && !fresh) return UC_PICK;
  const n = { teen: 3, student: 2, worker: 2, elder: 1, plain: 3 }, P = {};
  for (const [t, k] of Object.entries(n)) P[t] = shuffle(UC_POOL[t]).slice(0, k);
  Object.values(P).flat().forEach(ucArt);
  return (UC_PICK = P);
}
const ucBgPos = (ex) => { const i = UC_EX[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
// 방법 화면 그림 3칸: 캐릭터 얼굴 + 상황 그림
function ucSteps() {
  const P = ucPick(true);
  const face = (k, ex, badge) => `<span style="position:relative;display:block;width:50px;height:62px;border-radius:10px;overflow:hidden;background:#173a24 url(img/body/${k}.webp) ${ucBgPos(ex)}/300% 346.15% no-repeat;box-shadow:inset 0 0 0 1px #7CFC9A55,0 3px 8px #0006">${badge}</span>`;
  const bd = (s, st = "") => `<b style="position:absolute;right:2px;bottom:2px;font-size:17px;line-height:1;filter:drop-shadow(0 1px 2px #000);${st}">${s}</b>`;
  const tower = `<svg viewBox="0 0 12 24" style="position:absolute;right:3px;bottom:2px;width:12px;height:24px">${[...Array(7)].map((_, i) => `<path d="M1.5 ${2 + i * 3}h9l-.8 3h-7.4z" fill="${i % 2 ? "#e4e4ea" : "#ffffff"}" stroke="#9a9aa8" stroke-width=".4"/>`).join("")}</svg>`;
  return [[face(P.worker[0], "smile", bd("💳")), "결제하면 정상"], [face(P.student[0], "shy", tower), "컵 탑은 도둑"], [face(P.plain[0], "surprised", bd("❓", "font-size:15px")), "두리번은 먹튀"]];
}
// 고정 배경(논리 좌표). 위·아래로 더 긴 무대면 벽·바닥을 이어 그린다
let UC_IMG = null;
const ucImg = () => { if (!UC_IMG && typeof Image !== "undefined") { UC_IMG = new Image(); UC_IMG.src = "img/bg/ucafe.webp"; } return UC_IMG; };
const ucImgOk = () => { const m = ucImg(); return !!(m && m.complete && m.naturalWidth > 0); };
function ucBgDraw(g, X0, Y0, X1, Y1) {
  const XW = X1 - X0;
  // 벽
  fr(g, lgr(g, 0, Y0, 0, 48, [[0, "#8a7458"], [Math.min(0.6, Math.max(0, -Y0 / (48 - Y0))), "#d8c4a0"], [1, "#c4ad86"]]), X0, Y0, XW, 48 - Y0);
  for (let x = Math.floor(X0 / 6) * 6; x < X1; x += 6) fr(g, "rgba(120,90,50,.10)", x, 2, 0.5, 42);
  fr(g, lgr(g, 0, -2, 0, 4, [[0, "#5a4632"], [1, "#9a7f5c"]]), X0, -2, XW, 5.4);
  // 천장 등(무대가 길면)
  if (Y0 < -6) for (const x of [42, 76, 128]) { ln(g, "#3a3028", 0.3, [[x, Y0], [x, -1]]); g.fillStyle = rgr(g, x, 0, 0, 22, [[0, "rgba(255,226,170,.35)"], [1, "rgba(255,226,170,0)"]]); g.fillRect(x - 22, -4, 44, 30); poly(g, "#2e2620", [[x - 3, -1], [x + 3, -1], [x + 1.4, -3.6], [x - 1.4, -3.6]]); el(g, "#fff2cc", x, -0.8, 2.6, 0.6); }
  fr(g, lgr(g, 0, 43.4, 0, 48, [[0, "#8a6a4a"], [1, "#4a3624"]]), X0, 43.4, XW, 4.6);
  // 창 두 개: 밖은 실제 그림(밤 거리)
  const glass = (x, y, w, h, sx) => {
    fr(g, "#3a3a44", x - 1.2, y - 1.2, w + 2.4, h + 2.4, 0.6);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (ucImgOk()) g.drawImage(UC_IMG, sx, 70, w * 9, h * 5.2, x, y, w, h); else fr(g, lgr(g, 0, y, 0, y + h, [[0, "#1a2436"], [1, "#2a3a4a"]]), x, y, w, h);
    fr(g, "rgba(150,200,220,.18)", x, y, w, h); poly(g, "rgba(255,255,255,.14)", [[x, y + h * 0.55], [x + w * 0.5, y], [x + w * 0.75, y], [x, y + h * 0.9]]);
    g.restore();
  };
  glass(33, 9, 15, 30, 380); glass(67, 9, 15, 30, 560);
  // 문 위 간판·유리문 틀(유리는 움직이니 따로)·발판
  fr(g, lgr(g, 0, 5, 0, 11, [[0, "#2f4a36"], [1, "#1e3024"]]), 8.6, 5.2, 20.8, 5.6, 1);
  g.fillStyle = "#bff2c8"; g.font = "800 3.4px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("24H CAFE", 19, 8.1);
  fr(g, "#3a3a44", 8, 12, 22, 35.4, 0.6); fr(g, "#121820", 10, 14, 18, 32);
  g.save(); g.beginPath(); g.rect(10, 14, 18, 32); g.clip(); if (ucImgOk()) g.drawImage(UC_IMG, 440, 80, 150, 240, 10, 14, 18, 32); fr(g, "rgba(10,20,30,.35)", 10, 14, 18, 32); g.restore();
  fr(g, lgr(g, 0, 48, 0, 54, [[0, "#3c4a3c"], [1, "#2c382c"]]), 10, 48, 18, 6, 0.8);
  // 키오스크
  el(g, "rgba(0,0,0,.25)", 58, 48.6, 8, 1.4);
  fr(g, lgr(g, 0, 46, 0, 49, [[0, "#4a4e58"], [1, "#22252c"]]), 51, 46, 14, 3, 0.8);
  fr(g, lgr(g, 52, 0, 64, 0, [[0, "#d8dce4"], [0.45, "#f4f6fa"], [1, "#a8acb8"]]), 52, 19.5, 12, 27.5, 1.6);
  fr(g, "#0c0e14", 53.6, 22.4, 8.8, 11.2, 0.8);
  fr(g, "#2a2e38", 55, 35.6, 6, 2.2, 0.5); fr(g, "#7a8090", 55.6, 36.2, 4.8, 0.7, 0.3);
  fr(g, "#3a3f4a", 56, 39.6, 4, 3.2, 0.6); el(g, "#5fe08a", 58, 41.2, 0.5);
  // 메뉴판
  fr(g, lgr(g, 0, 3, 0, 11, [[0, "#2f3d30"], [1, "#1e2a20"]]), 84, 3.6, 46, 7.8, 1); g.strokeStyle = "#a88a5a"; g.lineWidth = 0.5; rrp(g, 84, 3.6, 46, 7.8, 1); g.stroke();
  g.font = "800 2.7px sans-serif"; g.textBaseline = "middle"; [["AMERICANO", "1,800", 86.5, 5.9], ["LATTE", "2,500", 86.5, 8.9], ["ICE TEA", "2,300", 108.5, 5.9], ["COOKIE", "1,500", 108.5, 8.9]].forEach(([a, b, x, y]) => { g.textAlign = "left"; g.fillStyle = "#e8f4e4"; g.fillText(a, x, y); g.textAlign = "right"; g.fillStyle = "#e9c46a"; g.fillText(b, x + 19.5, y); });
  // 카운터
  fr(g, lgr(g, 0, 30, 0, 33.4, [[0, "#e4c89a"], [1, "#a8875f"]]), 84, 30, 46, 3.4, 0.6);
  fr(g, lgr(g, 0, 33, 0, 48, [[0, "#9a7854"], [1, "#6a4e34"]]), 84, 33.2, 46, 14.8);
  for (let x = 86; x < 128; x += 4) fr(g, "rgba(40,24,10,.25)", x, 34, 0.5, 13.4);
  // 커피 머신
  fr(g, lgr(g, 96, 0, 111, 0, [[0, "#1a1a20"], [0.5, "#3a3a44"], [1, "#141418"]]), 96, 12, 15, 19.2, 1.4);
  fr(g, "rgba(255,255,255,.16)", 97, 12.6, 13, 0.5, 0.25);
  fr(g, "#0a1a24", 98, 14, 11, 4.6, 0.6); fr(g, "#3ad0ff", 99, 15, 4, 0.8, 0.3); fr(g, "#7aff9a", 99, 16.4, 6, 0.6, 0.3); el(g, "#ff9a4a", 107, 15.4, 0.5);
  fr(g, lgr(g, 103, 0, 105, 0, [[0, "#8a8a96"], [0.5, "#e8e8f0"], [1, "#6a6a76"]]), 103, 20.4, 2, 4.4, 0.4);
  fr(g, "#55555f", 99, 27, 9, 2.2, 0.5); g.strokeStyle = "rgba(200,200,210,.4)"; g.lineWidth = 0.2; for (let x = 100; x < 108; x += 1) { g.beginPath(); g.moveTo(x, 27.2); g.lineTo(x, 29); g.stroke(); }
  // 우유 냉장고
  fr(g, lgr(g, 116, 0, 124, 0, [[0, "#f4f4f8"], [1, "#b8b8c4"]]), 116, 21.6, 8.4, 8.6, 0.8); fr(g, "#9ad0ff", 117.2, 22.8, 6, 3.4, 0.4); ln(g, "#888", 0.4, [[123, 26.8], [123, 28.8]]);
  // 컵 진열대(컵은 따로 그림)
  fr(g, lgr(g, 131, 0, 157, 0, [[0, "#5a4030"], [0.5, "#7a5a40"], [1, "#4a3424"]]), 131, 12, 26, 36, 0.8);
  fr(g, "#2e2018", 132.4, 13.4, 23.2, 33.2, 0.4);
  for (const y of [21, 31, 41]) { fr(g, lgr(g, 0, y, 0, y + 2, [[0, "#a8805a"], [1, "#5a4030"]]), 131, y, 26, 2); }
  // 바닥 타일(광택)
  for (let y = 48; y < Y1; y += 10) for (let x = Math.floor(X0 / 10) * 10; x < X1; x += 10) {
    const odd = (Math.round(x + y) / 10) % 2;
    fr(g, lgr(g, x, y, x + 10, y + 10, odd ? [[0, "#e8dcc6"], [1, "#d4c6ac"]] : [[0, "#dccfb6"], [1, "#c8b99c"]]), x, y, 10, 10);
    fr(g, "rgba(150,130,100,.45)", x, y, 10, 0.35); fr(g, "rgba(150,130,100,.35)", x, y, 0.35, 10);
  }
  // 바닥 그늘·빛 반사
  fr(g, lgr(g, 0, 48, 0, 64, [[0, "rgba(60,40,20,.35)"], [1, "rgba(60,40,20,0)"]]), X0, 48, XW, 16);
  for (const [x, w] of [[40, 16], [75, 14], [128, 16]]) { g.fillStyle = lgr(g, 0, 52, 0, 120, [[0, "rgba(255,240,210,.32)"], [1, "rgba(255,240,210,0)"]]); poly(g, g.fillStyle, [[x - w / 3, 52], [x + w / 3, 52], [x + w / 2, 120], [x - w / 2, 120]]); }
  fr(g, lgr(g, 0, 48, 0, 50, [[0, "rgba(255,255,255,.25)"], [1, "rgba(255,255,255,0)"]]), X0, 48, XW, 2);
}
function gUC(host, ez, finish) {
  const T = 30;
  const F = frame(host, "ucafe", "사장님은 잠복 중", "mg-cctv2");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-cvw"><canvas></canvas><div class="mg-rec">● REC</div><div class="mg-clock"></div><div class="mg-bubs"></div><div class="uc-zoom"><i></i><b></b></div></div>`);
  const wrap = F.stage.querySelector(".mg-cvw"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), clock = wrap.querySelector(".mg-clock"), bubs = wrap.querySelector(".mg-bubs");
  const zoomEl = wrap.querySelector(".uc-zoom"), zoomF = zoomEl.querySelector("i"), zoomT = zoomEl.querySelector("b");
  // 크기: 무대를 덮는 캔버스, 논리 칸(160x200)이 꽉 차게 가운데. 기기 해상도로 그린다
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  let K = 2, R = 4, X0 = 0, Y0 = 0, X1 = UW, Y1 = UH, BG = null, OV = null;
  const fit = () => {
    const sw = F.stage.clientWidth || 320, sh = F.stage.clientHeight || 400;
    K = Math.min(sw / UW, sh / UH); R = K * DPR;
    const ex = sw / K - UW, ey = sh / K - UH; X0 = -ex / 2; X1 = UW + ex / 2; Y0 = -ey * 0.5; Y1 = UH + ey * 0.5;
    cv.width = Math.round(sw * DPR); cv.height = Math.round(sh * DPR);
    BG = document.createElement("canvas"); BG.width = cv.width; BG.height = cv.height; const b = BG.getContext("2d"); b.setTransform(R, 0, 0, R, -X0 * R, -Y0 * R); ucBgDraw(b, X0, Y0, X1, Y1);
    // 덧씌우기(주사선·가장자리 어둡게)는 한 번만
    OV = document.createElement("canvas"); OV.width = cv.width; OV.height = cv.height; const o = OV.getContext("2d");
    for (let y = 0; y < OV.height; y += 3 * DPR) { o.fillStyle = "rgba(0,0,0,.1)"; o.fillRect(0, y, OV.width, DPR); }
    const rg = o.createRadialGradient(OV.width / 2, OV.height / 2, OV.width * 0.3, OV.width / 2, OV.height / 2, Math.hypot(OV.width, OV.height) * 0.56); rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(0,10,4,.72)"); o.fillStyle = rg; o.fillRect(0, 0, OV.width, OV.height);
  };
  fit();
  if (!ucImgOk()) ucImg().addEventListener("load", () => { if (cv.isConnected) fit(); }, { once: true });
  const PICK = ucPick();
  const hh = 22 + rint(2), mm0 = rint(50);
  let caught = 0, missed = 0, wrong = 0, over = false, raf = 0, last = 0, t0 = 0, nextAt = 0.4, door = 0, noiseT = 2 + rnd() * 3, noiseOn = 0, secShown = -1;
  let cups = 15, teenOn = false;
  const ppl = [], chairs = U_CHAIRS.map(([x, y, d, t]) => ({ x, y, d, t, fall: 0, used: null }));
  const toCss = (x, y) => [(x - X0) * K, (y - Y0) * K];
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; const [cx, cy] = toCss(x, y - 33); b.style.left = cx + "px"; b.style.top = cy + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  // 확대 캡처: 잡거나 오해하면 그 손님 얼굴을 크게(컬러) 1초 남짓
  let zoomTm = 0;
  const zoom = (p, ex, text, cls) => {
    if (!p.art || !p.art.ok) return;
    zoomF.style.backgroundImage = `url("${p.art.im.src}")`; zoomF.style.backgroundPosition = ucBgPos(ex); zoomT.textContent = text;
    zoomEl.className = "uc-zoom on " + cls; clearTimeout(zoomTm); zoomTm = setTimeout(() => zoomEl.classList.remove("on"), 1250);
  };
  // 손님 만들기: 종류별로 골라 둔 그림 중 하나(지금 화면에 없는 사람 먼저)
  const artFor = (type) => { const ks = PICK[type] || PICK.plain, on = new Set(ppl.filter((q) => !q.gone && q.art).map((q) => q.art.key)), fr2 = ks.filter((k) => !on.has(k)); return ucArt(pick(fr2.length ? fr2 : ks)); };
  const mk = (type, route, o = {}) => ({ spec: uSpec(type), art: artFor(type), cache: {}, x: U_DOOR_IN[0] + (o.dx || 0), y: U_DOOR_IN[1], route, step: 0, wait: 0, walkT: rnd() * 4, v: "f", flip: false, carry: 0, pose: null, look: 0, alpha: 0, bad: !!o.bad, kind: o.kind || "ok", group: o.group || null, sp: o.sp || 16, fast: false, caught: false, angry: 0, seat: o.seat || null, gone: false });
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
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x - X0) / (X1 - X0) * r.width, r.top - s.top + (y - Y0) / (Y1 - Y0) * r.height]; };
  const toClient = (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + (x - X0) / (X1 - X0) * r.width, r.top + (y - Y0) / (Y1 - Y0) * r.height]; };
  const catchP = (p) => {
    const grp = p.group ? p.group.members : [p];
    if (p.group) p.group.done = true;
    grp.forEach((q) => { q.caught = true; q.capT = 0; q.pose = null; q.v = "f"; });
    caught++;
    bubble(p.x, p.y, "잡았다!", "red"); F.hit(stageXY(p.x, p.y - 14), p.kind === "teen" ? 3 : 2, "#ff5a5a");
    F.msg(p.kind === "dash" ? "결제 안 한 손님 잡았다!" : p.kind === "cups" ? "컵 도둑 잡았다!" : "의자 넘어뜨린 무리 잡았다!");
    zoom(p, "surprised", p.kind === "dash" ? "포착! 결제 안 함" : p.kind === "cups" ? "포착! 컵 도둑" : "포착! 의자 와장창", "bad");
    if (p.kind === "teen") teenOn = false;
    upd();
  };
  const tap = (lx, ly) => {
    if (over) return;
    let hit = null;
    for (const p of ppl) { if (p.gone || p.caught || p.alpha < 0.5) continue; if (lx >= p.x - 8 && lx <= p.x + 8 && ly >= p.y - 28 && ly <= p.y + 3 && (!hit || p.y > hit.y)) hit = p; }
    if (!hit) return;
    if (hit.bad) catchP(hit);
    else if (!hit.angry) { hit.angry = 1.6; wrong++; F.msg("단골이 화났어요. 감점"); bubble(hit.x, hit.y, "왜요?!", "angry"); F.miss(stageXY(hit.x, hit.y - 14)); zoom(hit, "angry", "단골 손님이에요…", "ok"); upd(); }
  };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); tap(X0 + (e.clientX - r.left) / r.width * (X1 - X0), Y0 + (e.clientY - r.top) / r.height * (Y1 - Y0)); });
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
  // 표정: 게임 상황이 얼굴에 나온다(두리번 = 놀람, 컵 쓸어 담기 = 웃음, 도망 = 수줍, 걷어차기 = 화남, 결제 뒤 = 웃음)
  const exOf = (p) => {
    if (p.caught) return p.capT < 0.5 ? "surprised" : "sad";
    if (p.angry > 0) return "angry";
    const pz = p.wait > 0 ? p.pose : null;
    if (pz === "look") return "surprised";
    if (pz === "grab") return "smile";
    if (pz === "kick") return "angry";
    if (pz === "noise") return "smile";
    if (pz === "sit") return "smile";
    if (p.bad && (p.fast || p.carry === 2 || (p.kind === "teen" && p.step > 0))) return "shy";
    if (p.carry === 1) return "smile";
    return "neutral";
  };
  // 사람 한 명 그리기(논리 좌표). 몸은 그림 칸(머리~허벅지), 다리·신발·컵은 벡터
  const cupV = (x, y) => { poly(g, "#fafafa", [[x - 1, y - 2.6], [x + 1, y - 2.6], [x + 0.75, y], [x - 0.75, y]]); fr(g, "#9b6a3a", x - 0.95, y - 1.8, 1.9, 0.9); fr(g, "#e8e8ee", x - 1.15, y - 3, 2.3, 0.5, 0.2); };
  const towerV = (x, y) => { for (let k = 0; k < 9; k++) { fr(g, k % 2 ? "#d4d4dc" : "#ffffff", x - 1.3, y - 9.6 + k, 2.6, 1); } fr(g, "rgba(0,0,0,.25)", x + 0.8, y - 9.6, 0.5, 9); };
  const drawP = (p, tm) => {
    const a = p.art;
    g.globalAlpha = clamp(p.alpha, 0, 1);
    if (!a || !a.ok) {
      // 그림이 아직이면 예전 도트로
      let key, o, flip = false;
      if (p.caught) { key = "cf" + p.carry; o = { v: "f", carry: p.carry }; }
      else if (p.wait > 0 && p.pose === "sit") { const ch = p.route[p.step].chair; flip = ch && ch.d < 0; key = "sit" + p.carry; o = { v: "s", sit: true, carry: p.carry }; }
      else { const f = Math.floor(p.walkT) % 4; key = p.v + f + p.carry; o = { v: p.v, f, carry: p.carry }; flip = p.v === "s" && p.flip; }
      g.imageSmoothingEnabled = false; g.drawImage(uSprite(p, key, o, flip), p.x - 8, p.y - 29, 16, 31); g.imageSmoothingEnabled = true;
      g.globalAlpha = 1; return;
    }
    const sc = p.spec.kid ? 0.88 : 1, BW = 11.4 * sc, BH = BW * 540 / 240, LEG = 6.4 * sc;
    const pz = p.wait > 0 ? p.pose : null, sit = pz === "sit", walking = !p.caught && !(p.wait > 0);
    const back = !p.caught && !sit && ((pz && pz !== "look" && pz !== "kick" && pz !== "noise") || (walking && p.v === "b"));
    let flip = false;
    if (sit) { const ch = p.route[p.step].chair; flip = !!(ch && ch.d < 0); }
    else if (pz === "look") flip = p.look < 0;
    else if (walking && p.v === "s") flip = p.flip;
    const ph = p.walkT * Math.PI / 2, sw = walking ? Math.sin(ph) : 0, bob = walking ? -Math.abs(sw) * 0.6 : pz === "press" ? Math.sin(tm * 12) * 0.25 : 0;
    const x = p.x, foot = p.y, top = foot - LEG - BH + 1.4 + bob + (sit ? 5.2 : 0);
    // 그림자
    el(g, "rgba(20,30,20,.35)", x, foot - 0.3, BW * 0.42, 1.2);
    // 다리(서 있을 때)
    if (!sit) {
      const lx = BW * 0.085, lw = 1.9 * sc, hip = foot - LEG - 0.6 + bob;
      const legs = p.v === "s" && walking ? [[-sw * 1.5, Math.max(0, sw) * 0.8, a.legL], [sw * 1.5, Math.max(0, -sw) * 0.8, a.legR]] : [[-lx, Math.max(0, sw) * 1.3, a.legL], [lx, Math.max(0, -sw) * 1.3, a.legR]];
      for (const [ox, lift, c] of legs) { fr(g, c, x + ox - lw / 2, hip, lw, foot - hip - lift - 0.7, 0.6); el(g, a.shoe, x + ox + (flip ? -0.3 : 0.3), foot - lift - 0.7, lw * 0.68, 0.75); }
    }
    // 몸(그림 칸)
    const i = UC_EX[exOf(p)] || 0, sx = (i % 3) * 240, sy = i >= 3 ? 540 : 0, cut = sit ? 0.72 : 1;
    g.save(); g.translate(x, 0); if (flip) g.scale(-1, 1);
    g.drawImage(a.im, sx, sy, 240, 540 * cut, -BW / 2, top, BW, BH * cut);
    // 뒷모습: 얼굴 자리를 머리카락 색으로 덮는다
    if (back) { el(g, a.hair, 0, top + BH * 0.115, BW * 0.2, BH * 0.1); }
    g.restore();
    // 손에 든 것
    const hand = top + BH * 0.66, hx = x + (flip ? -1 : 1) * BW * 0.4;
    if (p.carry === 1) cupV(hx, hand + 1);
    if (p.carry === 2) towerV(hx, hand + 2);
    if (pz === "press" && Math.floor(tm * 4) % 2) { fr(g, "#e9c46a", x + BW * 0.25, top + BH * 0.3, 2.4, 1.6, 0.3); fr(g, "#fff3b0", x + BW * 0.25, top + BH * 0.3, 2.4, 0.5); }
    g.globalAlpha = 1;
    // 10대 무리: 시끄러운 소리
    if (p.kind === "teen" && !p.caught && (pz === "kick" || pz === "noise" || p.fast || p.step > 0)) { g.fillStyle = "#ffe066"; g.font = "900 4.4px sans-serif"; g.textAlign = "center"; g.fillText(Math.floor(tm * 8) % 2 ? "!!" : "♪", x + BW * 0.62, top + 3); }
  };
  const drawChair = (c) => {
    if (c.fall) {
      g.save(); g.translate(c.x, c.y - 2.5); g.rotate(c.d > 0 ? 1.45 : -1.45);
      fr(g, lgr(g, -4, 0, 4, 0, [[0, "#a07a54"], [1, "#6a4630"]]), -4, -1.2, 8, 2.2, 0.6); fr(g, "#5a3a22", -4, -10, 1.6, 9, 0.5); ln(g, "#4a3020", 0.6, [[-3, 1], [-3, 4]]); ln(g, "#4a3020", 0.6, [[3, 1], [3, 4]]);
      g.restore(); return;
    }
    const bx = c.d > 0 ? c.x - 5 : c.x + 3;
    ln(g, "#4a3020", 0.7, [[c.x - 3, c.y - 4], [c.x - 3.2, c.y]]); ln(g, "#4a3020", 0.7, [[c.x + 2.6, c.y - 4], [c.x + 2.8, c.y]]);
    fr(g, lgr(g, bx, 0, bx + 2, 0, [[0, "#8a6648"], [1, "#5a3e28"]]), bx, c.y - 15, 2, 11, 0.6);
    fr(g, lgr(g, 0, c.y - 6.4, 0, c.y - 3.6, [[0, "#b8906a"], [1, "#7a5638"]]), c.x - 4.4, c.y - 6.4, 8.8, 2.6, 0.8);
  };
  const drawTable = ([x, y]) => {
    el(g, "rgba(30,20,10,.25)", x, y - 0.4, 5, 1.1);
    fr(g, "#3a2e24", x - 0.8, y - 9, 1.6, 8.6); el(g, "#2a2018", x, y - 0.6, 4, 1);
    el(g, "#8a6a48", x, y - 10.2, 9.4, 3.6); el(g, lgr(g, x - 9, y - 13, x + 9, y - 9, [[0, "#f0dcc0"], [1, "#c8a880"]]), x, y - 10.9, 9, 3.3);
    el(g, "rgba(255,255,255,.35)", x - 3, y - 11.8, 3.4, 0.7);
  };
  const drawPlant = (x, y) => {
    poly(g, lgr(g, x - 3, 0, x + 3, 0, [[0, "#c8703d"], [1, "#8a4a24"]]), [[x - 3.2, y - 5], [x + 3.2, y - 5], [x + 2.4, y], [x - 2.4, y]]); fr(g, "#d8885a", x - 3.6, y - 5.8, 7.2, 1.4, 0.5);
    [[-2.6, -9, -0.6], [2.6, -9.6, 0.6], [0, -12.4, 0], [-1.4, -11, -0.25], [1.6, -11.4, 0.3]].forEach(([dx, dy, r], k) => { g.save(); g.translate(x + dx, y + dy); g.rotate(r); el(g, k % 2 ? "#4fae5a" : "#3e8e4a", 0, 0, 1.7, 3.6); ln(g, "rgba(20,60,30,.6)", 0.25, [[0, -3], [0, 3]]); g.restore(); });
  };
  const render = (tm) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.drawImage(BG, 0, 0);
    g.setTransform(R, 0, 0, R, -X0 * R, -Y0 * R);
    // 유리문(미닫이): 사람이 가까우면 열린다
    const near = ppl.some((p) => !p.gone && Math.hypot(p.x - U_DOOR[0], p.y - U_DOOR[1]) < 16);
    door = clamp(door + (near ? 0.06 : -0.04), 0, 1);
    g.save(); g.beginPath(); g.rect(10, 14, 18, 32); g.clip();
    const o = door * 8;
    for (const [px0, dir] of [[10, -1], [19, 1]]) { const px = px0 + dir * o; g.fillStyle = "rgba(170,210,225,.38)"; g.fillRect(px, 14, 9, 32); g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(px + 1.4, 30); g.lineTo(px + 5, 15); g.lineTo(px + 6.2, 15); g.lineTo(px + 2.6, 30); g.fill(); fr(g, "#4b4b56", px + (dir < 0 ? 8.2 : 0), 14, 0.8, 32); fr(g, "#c8c8d4", px + (dir < 0 ? 6.6 : 1.4), 28, 0.6, 5, 0.3); }
    g.restore();
    // 키오스크 화면 깜빡, 누르는 사람이 있으면 결제 화면
    const paying = ppl.some((p) => p.pose === "press" && p.wait > 0);
    fr(g, paying ? (Math.floor(tm * 6) % 2 ? "#e9c46a" : "#7fd1ff") : lgr(g, 0, 23, 0, 33, [[0, "#4a8be5"], [1, Math.floor(tm * 1.5) % 2 ? "#2f68b8" : "#25569a"]]), 54.2, 23, 7.6, 10, 0.5);
    fr(g, "rgba(255,255,255,.85)", 55.4, 25, 5.2, 0.8, 0.3); fr(g, "rgba(255,255,255,.6)", 55.4, 27, 3.6, 0.7, 0.3); fr(g, "rgba(255,255,255,.5)", 55.4, 30.4, 5.2, 1.6, 0.4);
    // 커피 머신 김
    const brew = ppl.some((p) => p.pose === "cup" && p.wait > 0);
    for (let i = 0; i < (brew ? 4 : 1); i++) { const ph = (tm * 0.9 + i * 0.27) % 1; el(g, `rgba(245,245,245,${0.55 * (1 - ph)})`, 104 + Math.sin((tm + i) * 5) * 1.5, 24 - ph * 16, 0.8 + ph * 1.4, 0.6 + ph); }
    // 진열대 컵
    for (let i = 0; i < cups; i++) { const row = Math.floor(i / 5), col = i % 5, cx = 135.5 + col * 4, cy = 21 + row * 10; poly(g, "#f4f4f8", [[cx - 1.5, cy - 4], [cx + 1.5, cy - 4], [cx + 1.1, cy], [cx - 1.1, cy]]); fr(g, "#c8c8d0", cx - 1.6, cy - 4.4, 3.2, 0.6, 0.3); fr(g, "rgba(0,0,0,.12)", cx + 0.4, cy - 3.6, 0.8, 3.4); }
    // 깊이 순서대로: 탁자·의자·화분·사람
    const items = [];
    U_TABLES.forEach((t) => items.push([t[1], () => drawTable(t)]));
    chairs.forEach((c) => items.push([c.y - 1, () => drawChair(c)]));
    items.push([66, () => drawPlant(152, 66)], [190, () => drawPlant(8, 190)], [150, () => drawPlant(152, 150)]);
    ppl.forEach((p) => { if (!p.gone) items.push([p.y + (p.pose === "sit" && p.wait > 0 ? 0.5 : 0), () => drawP(p, tm)]); });
    items.sort((a, b) => a[0] - b[0]).forEach((it) => it[1]());
    // CCTV 톤: 흑백 → 녹색 → 어두운 곳 살짝 띄우기
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(128,128,128,.6)"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "multiply"; g.fillStyle = "#c4f3cb"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "screen"; g.fillStyle = "#0b2212"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over";
    g.drawImage(OV, 0, 0);
    g.setTransform(R, 0, 0, R, -X0 * R, -Y0 * R);
    // 잡힌 사람 빨간 테두리·화난 표시는 색을 살려 다시
    ppl.forEach((p) => {
      if (p.gone) return;
      if (p.caught && Math.floor(p.capT * 7) % 2 === 0) { g.strokeStyle = "#ff3030"; g.lineWidth = 0.7; rrp(g, p.x - 8, p.y - 30, 16, 31, 2); g.stroke(); fr(g, "rgba(255,48,48,.12)", p.x - 8, p.y - 30, 16, 31, 2); }
      if (p.angry > 0) { const ax = p.x + 5, ay = p.y - 29; g.strokeStyle = "#ff3b3b"; g.lineWidth = 0.7; g.lineCap = "round"; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const an = Math.atan2(-sy, -sx); g.beginPath(); g.arc(ax + sx * 2.3, ay + sy * 2.3, 1.6, an - 0.85, an + 0.85); g.stroke(); } }
    });
    // 가끔 노이즈 줄
    if (noiseOn > 0) { for (let k = 0; k < 3; k++) { const y = Y0 + rnd() * (Y1 - Y0); g.fillStyle = "rgba(200,255,210,.18)"; g.fillRect(X0, y, X1 - X0, 0.6 + rnd() * 1.2); } for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(220,255,230,${rnd() * 0.4})`; g.fillRect(X0 + rnd() * (X1 - X0), Y0 + rnd() * (Y1 - Y0), 0.6, 0.6); } }
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
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.uc = { ppl, cv, toClient };
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
  const F = frame(host, "insta", "이건 인생샷 각", "mg-cam", bg, `<div class="mg-shots">${subs.map(() => "<span>-</span>").join("")}</div><button class="mg-shut" data-shut aria-label="셔터"></button>`);
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

const GAMES = { pr: gPR, cs: gCS, airbnb: gAB, ucafe: gUC }; // insta 는 mg_in.js 를 받을 때 붙는다

// 다른 파일(mg_in.js 등)에서 쓰는 공통 도구
// 2탄 등록(처음 부를 때 한 번): 이름·설명만. 게임 본체는 mgLoad 로 받을 때 붙는다
let mg2Done = false;
function mg2Init() {
  if (mg2Done) return; mg2Done = true;
  for (const [k, g] of Object.entries(MG2_LIST)) { if (!MG[k]) MG[k] = { n: g.n, desc: g.desc, how: g.how, base: g.base }; JC[k] = JC[k] || g.jc || JC[g.base] || "#ffd166"; if (!JC[g.base]) JC[g.base] = JC[k]; }
}
// 투잡(base)의 미니게임 목록: 1탄 + 2탄
export function mgKeys(base) { mg2Init(); return Object.keys(MG).filter((k) => k === base || MG[k].base === base); }
export { mg2Init };
export { easeOf, gradeOf, uSpec, uSprite, uPaint, uOutline };
export { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, shutterSound };
