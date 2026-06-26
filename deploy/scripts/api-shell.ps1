# =============================================================================
# 进入 api 容器 shell
# 用法: pnpm prod:shell api  (被 package.json 间接调用)
#      .\api-shell.ps1
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Assert-ProdInitialized
Assert-Docker

Push-Location $Script:ProdDir
try {
    docker compose exec api sh
} finally {
    Pop-Location
}
