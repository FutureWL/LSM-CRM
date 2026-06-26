# =============================================================================
# 在生产 api 容器内运行迁移
# 用法: pnpm migrate:prod
# 注: 通常 deploy-prod 启动 api 时已自动 migrate，本脚本用于单独补迁移
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Write-Step "运行生产环境迁移"
Assert-ProdInitialized
Assert-Docker

Push-Location $Script:ProdDir
try {
    docker compose exec api bun run db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'migrate failed' }
} finally {
    Pop-Location
}
Write-Ok "迁移完成"
