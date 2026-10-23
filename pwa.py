"""앱(PWA) 만들기 — 사이트를 폰 홈 화면에 '앱'으로 설치할 수 있게 한다.

빌드 끝에 build.py 가 add_pwa(site, base_url) 를 부른다.
  site/manifest.webmanifest   앱 이름·아이콘·색·바로가기
  site/sw.js                  서비스워커 (오프라인일 때 최근에 본 화면을 보여줌)
  site/offline.html           한 번도 안 본 화면을 오프라인에서 열었을 때
  site/assets/app/*.png       아이콘 (원본 assets/app/, make_app_icons.py 로 만든다)
  모든 페이지 <head>          manifest 연결 + 서비스워커 등록 (관리자 페이지는 제외)

이 사이트가 플레이스토어 앱(TWA)의 바탕이 된다.
"""
import json
import re
import shutil
import time
import urllib.parse
from pathlib import Path

BASE = Path(__file__).parent
THEME = "#0b0b0b"
SKIP = ("admin",)   # 앱에 넣지 않을 최상위 폴더


def manifest(root: str) -> dict:
    a = root + "assets/app/"
    return {
        "id": root,
        "name": "취업이직연구소 — 직무사전·회사 판단·연봉",
        "short_name": "취업이직연구소",
        "description": "직무사전, 이 회사 갈 만한가, 연봉 연구소, 취업뉴스까지. 취업·이직 컨설턴트 취업조로가 만든 커리어 도구.",
        "lang": "ko",
        "start_url": root + "?source=app",
        "scope": root,
        "display": "standalone",
        "orientation": "portrait",
        "background_color": THEME,
        "theme_color": THEME,
        "categories": ["education", "business", "productivity"],
        "icons": [
            {"src": a + "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": a + "icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": a + "maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        # 앱 아이콘을 길게 누르면 나오는 메뉴
        "shortcuts": [
            {"name": "이 회사 갈 만한가", "short_name": "회사 판단", "url": root + "company/?source=app"},
            {"name": "연봉 연구소", "short_name": "연봉", "url": root + "salary/?source=app"},
            {"name": "취업뉴스", "short_name": "뉴스", "url": root + "news/?source=app"},
            {"name": "면접 질문", "short_name": "면접", "url": root + "interview/?source=app"},
        ],
    }


# 서비스워커: 같은 사이트 요청만 다룬다 (회사 판단 API·구글 폼 등 다른 주소는 손대지 않음)
#  - 페이지(HTML)·JSON: 인터넷 먼저 → 안 되면 저장해 둔 것 → 그것도 없으면 offline.html
#  - 그림·글꼴 등: 저장해 둔 것 먼저 보여주고 뒤에서 새로 받아 둠
SW_JS = """// 빌드 때 pwa.py 가 만든다 — 직접 고치지 말 것
const V = '__VERSION__';
const ROOT = '__ROOT__';
const OFFLINE = ROOT + 'offline.html';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll([OFFLINE, ROOT + 'assets/app/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (__SKIP__.some(p => u.pathname.startsWith(ROOT + p + '/'))) return;
  const fresh = r.mode === 'navigate' || /\\.(json|html|txt|xml)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (fresh) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match(OFFLINE) : Response.error()))));
  } else {
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => m);
      return m || net;
    }));
  }
});
"""

OFFLINE_HTML = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="{theme}"><title>오프라인 — 취업이직연구소</title>
<style>
body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:{theme};color:#f4f5f1;
font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;text-align:center;padding:24px;box-sizing:border-box}}
img{{width:88px;height:88px;border-radius:20px}} h1{{font-size:20px;margin:20px 0 8px}} p{{color:#a9aaa5;line-height:1.6;margin:0 0 24px}}
button{{background:#c6ff3d;color:#0b0b0b;border:0;border-radius:999px;padding:12px 24px;font-size:15px;font-weight:700}}
</style></head><body><div>
<img src="{root}assets/app/icon-192.png" alt="">
<h1>인터넷 연결이 끊겼어요</h1>
<p>한 번 열어 본 화면은 연결 없이도 다시 볼 수 있어요.<br>연결되면 다시 시도해 주세요.</p>
<button onclick="location.reload()">다시 시도</button>
</div></body></html>
"""


def head_tags(root: str) -> str:
    return (
        f'<link rel="manifest" href="{root}manifest.webmanifest">'
        f'<meta name="theme-color" content="{THEME}">'
        '<meta name="mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black">'
        '<meta name="apple-mobile-web-app-title" content="취업이직연구소">'
        f'<script data-pwa>if("serviceWorker"in navigator)addEventListener("load",function(){{navigator.serviceWorker.register("{root}sw.js")}});</script>'
    )


def add_pwa(out_dir: Path, base_url: str) -> int:
    """사이트 루트 경로(job.jobzorro.kr 이면 '/')를 기준으로 앱 파일을 쓰고, 페이지마다 연결 태그를 넣는다. 넣은 페이지 수를 돌려준다."""
    root = urllib.parse.urlparse(base_url).path or "/"
    if not root.endswith("/"):
        root += "/"

    src = BASE / "assets" / "app"
    if not (src / "icon-512.png").exists():
        print("  (assets/app/ 아이콘이 없어 앱 설정을 건너뜁니다 — python make_app_icons.py 먼저)")
        return 0
    shutil.copytree(src, out_dir / "assets" / "app", dirs_exist_ok=True)

    (out_dir / "manifest.webmanifest").write_text(json.dumps(manifest(root), ensure_ascii=False, indent=1), encoding="utf-8")
    # 빌드마다 버전이 바뀌어 옛 저장본은 다음 실행 때 지워진다
    sw = SW_JS.replace("__VERSION__", "jz-" + time.strftime("%Y%m%d%H%M%S")).replace("__ROOT__", root).replace("__SKIP__", json.dumps(list(SKIP)))
    (out_dir / "sw.js").write_text(sw, encoding="utf-8")
    (out_dir / "offline.html").write_text(OFFLINE_HTML.format(theme=THEME, root=root), encoding="utf-8")

    tags, n = head_tags(root), 0
    apple = f'<link rel="apple-touch-icon" sizes="180x180" href="{root}assets/app/apple-180.png">'
    for f in out_dir.rglob("*.html"):
        rel = f.relative_to(out_dir).parts
        if rel[0] in SKIP or f.name == "offline.html":
            continue
        h = f.read_text(encoding="utf-8")
        if "data-pwa" in h or "</head>" not in h:
            continue
        # 아이폰 홈 화면 아이콘: 기존 파비콘(투명 여백이 많아 검은 테두리로 보임) 대신 꽉 찬 앱 아이콘
        h = re.sub(r'<link rel="apple-touch-icon"[^>]*>', "", h)
        f.write_text(h.replace("</head>", tags + apple + "\n</head>", 1), encoding="utf-8")
        n += 1
    return n
