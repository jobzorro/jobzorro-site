// 앱(설치형) 지원: 오프라인 캐시, 안드로이드 뒤로 가기, 설치 버튼
// 사이트 안에 넣을 때도, 플레이스토어 앱(TWA)으로 낼 때도 같은 파일을 쓴다.

export const isApp = () => {
  try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true || /source=(twa|pwa|app)/.test(location.search); } catch (e) { return false; }
};

// claude.ai 미리보기처럼 남의 집(iframe·샌드박스)에서는 서비스 워커를 켜지 않는다
function swAllowed() {
  try {
    if (!("serviceWorker" in navigator)) return false;
    if (window.top !== window.self) return false;
    if (!/^https:$/.test(location.protocol) && location.hostname !== "localhost") return false;
    if (/claude\.ai|claudeusercontent|anthropic/.test(location.hostname)) return false;
    return true;
  } catch (e) { return false; }
}

export function initApp({ onBack } = {}) {
  if (swAllowed()) {
    // 11-24 새 버전 알림: 저장해 둔 옛 파일로 먼저 열리기 때문에, 새 버전이 받아지면 위에 띠를 띄워 한 번 새로 고치게 한다
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then((reg) => { try { reg.update(); } catch (e) {} }).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!had || document.getElementById("a6upd")) return;
      const b = document.createElement("button"); b.id = "a6upd"; b.textContent = "새 버전이 나왔어요 · 눌러서 새로 고침";
      b.style.cssText = "position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:99999;font:700 13px/1.2 inherit;padding:9px 16px;border-radius:99px;border:0;background:#ffce5a;color:#14152b;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:pointer";
      b.onclick = () => location.reload(); document.body.appendChild(b);
    });
  }
  try { if (isApp()) document.documentElement.classList.add("app"); } catch (e) {}
  // 뒤로 가기: 창이 열려 있으면 창을 닫고, 아니면 홈으로, 홈이면 앱 종료(기본 동작)
  if (isApp() && onBack) {
    try {
      history.replaceState({ a6: 0 }, "");
      history.pushState({ a6: 1 }, "");
      addEventListener("popstate", () => {
        const stay = onBack();
        if (stay) history.pushState({ a6: 1 }, "");
      });
    } catch (e) {}
  }
}

// 설치 버튼(안드로이드 크롬·데스크톱 크롬). 아이폰은 '공유 → 홈 화면에 추가' 안내.
let deferred = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event("a6-installable")); });
export const canInstall = () => !!deferred && !isApp();
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || "") && !isApp();
export async function install() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null;
  return r?.outcome === "accepted";
}
