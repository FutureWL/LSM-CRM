# 停止生产容器
# 用法:pnpm prod:down  [参数会传给 docker compose down]
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

Push-Location $Script:ProdDir
try {
    Write-Step "停止生产容器..."
    docker compose down @args
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Ok "已停止"
} finally {
    Pop-Location
}
