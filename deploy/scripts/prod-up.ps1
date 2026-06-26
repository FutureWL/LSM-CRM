# 启动生产容器
# 用法:pnpm prod:up  [参数会传给 docker compose up]
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

Push-Location $Script:ProdDir
try {
    Write-Step "启动生产容器..."
    docker compose up -d @args
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Ok "启动完成"
} finally {
    Pop-Location
}
