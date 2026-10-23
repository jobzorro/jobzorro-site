"""앱(PWA) 아이콘 만들기 — assets/teamzorro_ci.png 의 흰 마스크를 떼어 크게 다시 그린다.

원본 마스크가 64x30px 로 작아서 그냥 키우면 흐리다.
→ 8배 확대 + 흐림 + 문턱값으로 가장자리를 다시 세운 뒤, 줄여서 부드럽게 만든다.
결과는 assets/app/ (git 에 넣고 build.py 가 site/assets/app/ 로 복사).

    python make_app_icons.py
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw

BASE = Path(__file__).parent
OUT = BASE / "assets" / "app"
BG = (11, 11, 11, 255)   # 사이트 검정 #0b0b0b


def mask_shape() -> Image.Image:
    """CI 그림에서 흰 마스크 모양만 'L'(밝기) 그림으로 떼어 크게 다시 그린다."""
    im = Image.open(BASE / "assets" / "teamzorro_ci.png").convert("RGBA")
    w, h = im.size
    gray = Image.new("L", im.size, 0)
    src, dst = im.load(), gray.load()
    for y in range(h // 2 + 10):          # 아래쪽 'TEAM ZORRO' 글자는 빼고 위쪽 마스크만
        for x in range(w):
            r, g, b, a = src[x, y]
            dst[x, y] = min(r, g, b) * a // 255
    gray = gray.crop(gray.getbbox())
    big = gray.resize((gray.width * 16, gray.height * 16), Image.LANCZOS)
    big = big.filter(ImageFilter.GaussianBlur(10))
    return big.point(lambda v: 255 if v > 128 else 0)   # 가장자리를 칼같이


def icon(size: int, mask_ratio: float, rounded: bool) -> Image.Image:
    """size 정사각형, 마스크 가로 = size*mask_ratio. rounded 면 모서리 둥근 검정 판(일반 아이콘)."""
    S = size * 4                                         # 4배로 그린 뒤 줄여 안티앨리어싱
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    plate = Image.new("L", (S, S), 0)
    ImageDraw.Draw(plate).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22) if rounded else 0, fill=255)
    canvas.paste(Image.new("RGBA", (S, S), BG), (0, 0), plate)
    m = mask_shape()
    mw = int(S * mask_ratio)
    m = m.resize((mw, int(m.height * mw / m.width)), Image.LANCZOS)
    canvas.paste(Image.new("RGBA", m.size, (255, 255, 255, 255)), ((S - m.width) // 2, (S - m.height) // 2), m)
    return canvas.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, 0.62, True).save(OUT / "icon-192.png")
    icon(512, 0.62, True).save(OUT / "icon-512.png")
    # maskable: 안드로이드가 원·물방울 등으로 잘라내므로 꽉 찬 사각 판 + 마스크는 가운데 안전영역(지름 80%) 안에
    icon(512, 0.50, False).save(OUT / "maskable-512.png")
    # 아이폰 홈 화면: 투명 부분이 검게 나오므로 꽉 찬 판 (iOS 가 알아서 모서리를 둥글린다)
    icon(180, 0.58, False).save(OUT / "apple-180.png")
    print("앱 아이콘 4개 ->", OUT)
