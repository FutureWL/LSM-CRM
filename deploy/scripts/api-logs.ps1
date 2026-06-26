# =============================================================================
# 跟踪 api 容器日志
# 用法: pnpm prod:logs api   (被 package.json 间接调用)
#      .\api-logs.ps1
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Assert-ProdInitialized
Assert-Docker

Push-Location $Script:ProdDir
try {
    docker compose logs -f api
} finally {
    Pop-Location
}
