# =============================================================================
# 启动开发环境
# 用法:pnpm dev  或  pwsh deploy/scripts/dev.ps1
# =============================================================================

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..') | Select-Object -ExpandProperty Path

Set-Location $RepoRoot

Write-Host "▶ 启动开发环境..." -ForegroundColor Cyan
Write-Host "  工作目录: $RepoRoot" -ForegroundColor Gray
Write-Host "  端口: 33500" -ForegroundColor Gray
Write-Host "  存储前缀: lsm-crm-dev-*" -ForegroundColor Gray
Write-Host ""

# 检查 node_modules
if (-not (Test-Path (Join-Path $RepoRoot 'node_modules'))) {
    Write-Host "  ⚠ 首次启动,先安装依赖..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# 启动 vite
pnpm dev
