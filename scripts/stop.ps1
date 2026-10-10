# AURIUS 开发环境停止脚本（Windows PowerShell）
# 运行： .\scripts\stop.ps1

Write-Host "Stopping AURIUS services..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "All node processes stopped." -ForegroundColor Green
