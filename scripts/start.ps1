# AURIUS 开发环境启动脚本（Windows PowerShell）
# 在项目根目录运行： powershell -ExecutionPolicy Bypass -File scripts/start.ps1
# 或在项目根目录：  .\scripts\start.ps1

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "== AURIUS development startup ==" -ForegroundColor Cyan

# 1. 启动后端 (端口 4000)
Write-Host "[1/2] Starting backend (http://localhost:4000) ..."
$backend = Join-Path $Root 'backend'
Push-Location $backend
& npx.cmd prisma migrate deploy --schema ../database/schema/schema.prisma
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "Database migration failed. Backend was not started."
}
Pop-Location
Start-Process -FilePath 'npx.cmd' -ArgumentList 'tsx','src/index.ts' `
  -WorkingDirectory $backend -WindowStyle Minimized

# 2. 启动前端 (端口 5173)
Write-Host "[2/2] Starting frontend (http://localhost:5173) ..."
$frontend = Join-Path $Root 'frontend'
Start-Process -FilePath 'npx.cmd' -ArgumentList 'vite','--host' `
  -WorkingDirectory $frontend -WindowStyle Minimized

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "Website/member portal: http://localhost:5173" -ForegroundColor Green
Write-Host "Admin portal:          http://localhost:5173/admin-login" -ForegroundColor Green
Write-Host "Backend API:           http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "Admin: admin@aurius.com.au / Admin@1234 (development only)" -ForegroundColor Yellow
Write-Host "Test members: agent@ / plumber@ / subdealer@ / pending@aurius-demo.com.au password Demo@1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "Stop services: .\scripts\stop.ps1" -ForegroundColor DarkGray
