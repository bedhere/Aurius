# AURIUS 开发环境停止脚本（Windows PowerShell）
# 运行： .\scripts\stop.ps1

Write-Host "正在停止 AURIUS 服务..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "已停止所有 node 进程。" -ForegroundColor Green
