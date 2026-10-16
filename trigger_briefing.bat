@echo off
chcp 65001 >nul
:: 로컬 PC 백업 트리거 — GitHub 예약 실행이 안 돈 날을 대비한다.
:: 오늘 지면(news-collector/archive/오늘.json)이 아직 GitHub에 없으면 deploy-site 워크플로를 수동 실행한다.
:: Windows 작업 스케줄러가 매일 07:55에 부르고, 그 시각에 PC가 꺼져 있었으면 켜진 직후 실행된다.
:: 등록: setup_trigger_task.ps1 / 해제: schtasks /delete /tn "jobzorro-briefing-trigger" /f
setlocal
set REPO=jobzorro/jobzorro-site
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set TODAY=%%d
set LOG=%~dp0trigger_briefing.log

gh api repos/%REPO%/contents/news-collector/archive/%TODAY%.json >nul 2>&1
if %errorlevel%==0 (
    echo [%date% %time%] %TODAY% 지면 이미 있음 - 건너뜀>> "%LOG%"
    exit /b 0
)
gh workflow run deploy-site -R %REPO% >> "%LOG%" 2>&1
if %errorlevel%==0 (
    echo [%date% %time%] %TODAY% 지면 없음 - 워크플로 수동 실행 요청함>> "%LOG%"
) else (
    echo [%date% %time%] 워크플로 실행 요청 실패 (gh 로그인 상태 확인)>> "%LOG%"
)
endlocal
