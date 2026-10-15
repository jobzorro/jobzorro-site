# 취업조로 사이트 (jobzorro-site)

취업·이직 컨설팅 브랜드 취업조로의 정적 사이트. 네 페이지를 `build.py` 하나로 만든다.

| 경로 | 내용 | 원본 |
|---|---|---|
| `index.html` | **직무사전** — 13개 직군 76개 직무. 현직자 인터뷰·공개 자료 기반 | `data/jobs.json` + `template.html` |
| `news/index.html` | **취업뉴스** — 커리어브리핑. `news-collector/`가 매일 아침 수집·생성 | `news-collector/site/index.html`에 공용 탭만 삽입 |
| `zorro/index.html` | **취업조로와 함께하기** — 상황별 상담 안내, 프로필, 채널 | `template_zorro.html` |
| `apply/index.html` | **무료 상담 신청** — 폼 → 구글 시트(Apps Script) | `template_apply.html` + `data/site.json` |

## 빌드

```
pip install -r news-collector/requirements.txt
(cd news-collector && python collect_news.py && python build_site.py)   # 뉴스 수집 → news-collector/site/index.html
python build.py                 # 네 페이지 모두 (뉴스 탭은 위 결과물을 씀)
python build.py --no-news       # 뉴스 탭 없이
```

결과는 `site/`. GitHub Actions(`.github/workflows/deploy.yml`) 하나가 전부 처리한다.
- 매일 아침 07:52·08:22·08:52 KST 예약: 뉴스 수집 + AI 브리핑(`ANTHROPIC_API_KEY` 시크릿) → `news-collector/archive/` 커밋 → 전체 빌드 → 배포. 오늘 지면이 이미 있으면 뒤 예약은 건너뛴다.
- push: 뉴스는 재수집하지 않고 캐시된 오늘 지면을 재사용해 빌드·배포.
- 수동(Run workflow): 예약과 동일.

뉴스 수집기 자체 설명은 `news-collector/README.md`. (2026-10-15 이전에는 별도 저장소 `career-briefing`이었고, 그 페이지는 더 이상 갱신되지 않는다.)

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
