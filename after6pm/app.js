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
  if (swAllowed()) navigator.serviceWorker.register("sw.js").catch(() => {});
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
