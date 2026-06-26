# 查看生产容器日志
# 用法:
#   pnpm prod:logs                # 跟踪所有日志
#   pnpm prod:logs --tail 200     # 显示最后 200 行
#   pnpm prod:logs --since 1h     # 显示最近 1 小时
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

Push-Location $Script:ProdDir
try {
    docker compose logs @args
} finally {
    Pop-Location
}
