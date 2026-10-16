# 로컬 PC 백업 트리거 — GitHub 예약 실행이 안 돈 날을 대비한다.
# 오늘 지면(news-collector/archive/오늘.json)이 아직 GitHub에 없으면 deploy-site 워크플로를 수동 실행한다.
# Windows 작업 스케줄러가 매일 07:55에 부르고(setup_trigger_task.ps1 로 등록), PC가 꺼져 있었으면 켜진 직후 실행된다.
$repo  = "jobzorro/jobzorro-site"
$today = Get-Date -Format "yyyy-MM-dd"
$log   = Join-Path $PSScriptRoot "trigger_briefing.log"
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

gh api "repos/$repo/contents/news-collector/archive/$today.json" *> $null
if ($LASTEXITCODE -eq 0) {
    Add-Content $log "[$stamp] $today 지면 이미 있음 - 건너뜀"
    exit 0
}
$out = gh workflow run deploy-site -R $repo 2>&1
if ($LASTEXITCODE -eq 0) {
    Add-Content $log "[$stamp] $today 지면 없음 - 워크플로 수동 실행 요청함"
} else {
    Add-Content $log "[$stamp] 워크플로 실행 요청 실패 (gh 로그인 상태 확인): $out"
}
