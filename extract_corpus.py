"""
현직자 직무 인터뷰 문서(docx/pdf/hwp/hwpx) -> corpus/txt/*.txt + corpus/manifest.csv

파일명 규칙이 들쭉날쭉해서(날짜·회사·직무·멘토·멘티 순서가 제각각) 본문 텍스트를 전부 뽑아 두고,
직무 분류는 다음 단계에서 파일명 + 본문 키워드로 한다.

사용법:
  python extract_corpus.py "<원본 폴더>" [--out corpus]
"""

import argparse
import csv
import re
import sys
import zipfile
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def read_docx(p: Path) -> str:
    """python-docx로 본문 + 표를 문서 순서대로 읽는다 (인터뷰는 표 안에 Q/A가 많다)."""
    import docx  # python-docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    d = docx.Document(str(p))
    out = []
    body = d.element.body
    for child in body.iterchildren():
        tag = child.tag.split("}")[-1]
        if tag == "p":
            t = Paragraph(child, d).text.strip()
            if t:
                out.append(t)
        elif tag == "tbl":
            for row in Table(child, d).rows:
                cells = []
                seen = set()
                for c in row.cells:
                    t = c.text.strip()
                    if t and id(c._tc) not in seen:  # 병합 셀 중복 제거
                        seen.add(id(c._tc))
                        cells.append(t)
                if cells:
                    out.append(" | ".join(cells))
    return "\n".join(out)


def read_pdf(p: Path) -> str:
    import fitz  # pymupdf
    with fitz.open(str(p)) as doc:
        return "\n".join(page.get_text() for page in doc)


def read_hwpx(p: Path) -> str:
    """hwpx는 zip + XML. 문단 텍스트만 추출."""
    out = []
    with zipfile.ZipFile(p) as z:
        for name in sorted(n for n in z.namelist() if n.startswith("Contents/section")):
            xml = z.read(name).decode("utf-8", "ignore")
            for para in re.findall(r"<hp:p\b.*?</hp:p>", xml, flags=re.S):
                t = " ".join(re.findall(r"<hp:t[^>]*>(.*?)</hp:t>", para, flags=re.S))
                t = re.sub(r"<[^>]+>", "", t).strip()
                if t:
                    out.append(t)
    return "\n".join(out)


def read_hwp(p: Path) -> str:
    """hwp 5.0: BodyText 섹션을 zlib로 풀어 텍스트 레코드(HWPTAG_PARA_TEXT=67)만 읽는다."""
    import struct
    import zlib

    import olefile

    ole = olefile.OleFileIO(str(p))
    header = ole.openstream("FileHeader").read()
    compressed = bool(header[36] & 1)
    out = []
    sections = sorted((s for s in ole.listdir() if s[0] == "BodyText"), key=lambda s: int(s[1][7:]))
    for s in sections:
        data = ole.openstream(s).read()
        if compressed:
            data = zlib.decompress(data, -15)
        i = 0
        while i + 4 <= len(data):
            (hdr,) = struct.unpack_from("<I", data, i)
            tag, size = hdr & 0x3FF, (hdr >> 20) & 0xFFF
            i += 4
            if size == 0xFFF:
                (size,) = struct.unpack_from("<I", data, i)
                i += 4
            if tag == 67:  # HWPTAG_PARA_TEXT
                chunk = data[i:i + size]
                chars = []
                j = 0
                while j + 2 <= len(chunk):
                    (c,) = struct.unpack_from("<H", chunk, j)
                    j += 2
                    if c < 32:  # 제어 문자(인라인/확장 컨트롤은 8바이트 추가)
                        if c in (1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23):
                            j += 14
                        if c in (10, 13):
                            chars.append("\n")
                        continue
                    chars.append(chr(c))
                t = "".join(chars).strip()
                if t:
                    out.append(t)
            i += size
    ole.close()
    return "\n".join(out)


READERS = {".docx": read_docx, ".pdf": read_pdf, ".hwpx": read_hwpx, ".hwp": read_hwp}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).parent / "corpus")
    a = ap.parse_args()
    txt_dir = a.out / "txt"
    txt_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    files = sorted(p for p in a.src.rglob("*") if p.is_file() and p.suffix.lower() in READERS)
    for n, p in enumerate(files, 1):
        reader = READERS[p.suffix.lower()]
        try:
            text = reader(p)
            err = ""
        except Exception as e:  # noqa: BLE001 - 어떤 파일이 왜 실패했는지 매니페스트에 남긴다
            text, err = "", f"{type(e).__name__}: {e}"[:200]
        text = re.sub(r"[ \t　]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        out_name = f"{n:03d}.txt"
        (txt_dir / out_name).write_text(text, encoding="utf-8")
        rows.append({"idx": f"{n:03d}", "file": p.name, "ext": p.suffix.lower(), "chars": len(text), "error": err})
        print(f"{n:03d} {len(text):6,}  {p.name[:70]}{'  !! ' + err if err else ''}")

    with (a.out / "manifest.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["idx", "file", "ext", "chars", "error"])
        w.writeheader()
        w.writerows(rows)
    ok = [r for r in rows if r["chars"] > 200]
    print(f"\n총 {len(rows)}개 중 본문 추출 {len(ok)}개, 총 {sum(r['chars'] for r in rows):,}자 -> {a.out}")


if __name__ == "__main__":
    main()
