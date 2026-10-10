# AURIUS 开发环境启动脚本（Windows PowerShell）
# 在项目根目录运行： powershell -ExecutionPolicy Bypass -File scripts/start.ps1
# 或在项目根目录：  .\scripts\start.ps1

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "== AURIUS 开发环境启动 ==" -ForegroundColor Cyan

# 1. 启动后端 (端口 4000)
Write-Host "[1/2] 启动后端 backend (http://localhost:4000) ..."
$backend = Join-Path $Root 'backend'
Push-Location $backend
& npx.cmd prisma migrate deploy --schema ../database/schema/schema.prisma
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "数据库迁移失败，后端未启动。"
}
Pop-Location
Start-Process -FilePath 'npx.cmd' -ArgumentList 'tsx','src/index.ts' `
  -WorkingDirectory $backend -WindowStyle Minimized

# 2. 启动前端 (端口 5173)
Write-Host "[2/2] 启动前端 frontend (http://localhost:5173) ..."
$frontend = Join-Path $Root 'frontend'
Start-Process -FilePath 'npx.cmd' -ArgumentList 'vite','--host' `
  -WorkingDirectory $frontend -WindowStyle Minimized

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "官网/会员中心： http://localhost:5173" -ForegroundColor Green
Write-Host "后台管理：     http://localhost:5173/admin-login" -ForegroundColor Green
Write-Host "后端 API：     http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "管理员： admin@aurius.com.au / Admin@1234（仅开发）" -ForegroundColor Yellow
Write-Host "测试会员： agent@ / plumber@ / subdealer@ / pending@aurius-demo.com.au 密码 Demo@1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "停止服务： .\scripts\stop.ps1" -ForegroundColor DarkGray
