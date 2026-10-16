# Windows 작업 스케줄러에 "매일 07:55 trigger_briefing.ps1 실행" 작업을 등록한다 (현재 사용자 권한, 관리자 불필요).
# PC가 꺼져 있어 놓친 경우 다음 부팅/로그인 직후 실행된다(StartWhenAvailable).
# 실행:  powershell -ExecutionPolicy Bypass -File setup_trigger_task.ps1
# 해제:  Unregister-ScheduledTask -TaskName jobzorro-briefing-trigger -Confirm:$false
$name = "jobzorro-briefing-trigger"
$ps1  = Join-Path $PSScriptRoot "trigger_briefing.ps1"
$action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ps1`"" -WorkingDirectory $PSScriptRoot
$trigger  = New-ScheduledTaskTrigger -Daily -At 07:55
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description "GitHub 예약 실행이 안 돈 날 취업조로 커리어브리핑 워크플로를 수동 실행" -Force | Out-Null
Get-ScheduledTask -TaskName $name | Select-Object TaskName, State | Format-Table -AutoSize
