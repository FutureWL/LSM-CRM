# 强制重建生产镜像(无缓存)
# 用法:pnpm prod:rebuild
# 注意:会触发 deploy-prod 的完整流程
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Write-Step "强制重建(无缓存)..."
Push-Location $Script:ProdDir
try {
    Write-Info "  删除旧镜像..."
    docker rmi $Script:ImageName`:$(Get-ProdEnv 'IMAGE_TAG' 'local') 2>$null
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) { exit 1 }
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Ok "重建完成"
} finally {
    Pop-Location
}
