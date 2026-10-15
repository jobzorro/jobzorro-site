# 취업조로 사이트 (jobzorro-site)

취업·이직 컨설팅 브랜드 취업조로의 정적 사이트. 네 페이지를 `build.py` 하나로 만든다.

| 경로 | 내용 | 원본 |
|---|---|---|
| `index.html` | **직무사전** — 13개 직군 76개 직무. 현직자 인터뷰·공개 자료 기반 | `data/jobs.json` + `template.html` |
| `news/index.html` | **취업뉴스** — 커리어브리핑(별도 저장소 `career-briefing`이 매일 생성) | 배포 페이지를 내려받아 공용 탭만 삽입 |
| `zorro/index.html` | **취업조로와 함께하기** — 상황별 상담 안내, 프로필, 채널 | `template_zorro.html` |
| `apply/index.html` | **무료 상담 신청** — 폼 → 구글 시트(Apps Script) | `template_apply.html` + `data/site.json` |

## 빌드

```
pip install pillow
python build.py                 # ../news-collector/site/index.html 이 있으면 그걸 씀
NEWS_URL=https://jobzorro.github.io/career-briefing/ python build.py   # 배포된 뉴스 페이지를 내려받아 씀
python build.py --no-news       # 뉴스 탭 없이
```

결과는 `site/`. GitHub Actions(`.github/workflows/deploy.yml`)가 push·매일 09:20 KST·수동 실행 때 빌드해 GitHub Pages에 올린다.

## 데이터

- `data/taxonomy.json` — 직군·직무 체계 (문과·사무직 / 이공계·기술직 트랙)
- `data/jobs.json` — 직무 본문. **회사명·사람 이름은 넣지 않는다** (업종·연차로만 표기)
- `data/site.json` — 상담 폼 전송 주소(`formEndpoint`), 카카오톡 오픈프로필(`kakaoOpen`)
- `assets/` — 로고, 일러스트, 프로필(`profile_web.jpg`)

## 상담 신청 폼 → 구글 시트

`google/README.md` 참고. Apps Script 웹앱 URL을 `data/site.json`에 넣고 빌드하면 된다.

## 직무 내용 고치기

`data/jobs.json`에서 해당 직무를 찾아 고친 뒤 커밋하면 자동 배포된다. 직무 추가는 `data/taxonomy.json`에 id를 먼저 등록한다.
(인터뷰 원문에서 직무 설명을 다시 만드는 파이프라인 `extract_corpus.py → classify_corpus.py → merge_synth.py`는 원문 폴더가 있는 로컬에서만 쓴다.)
