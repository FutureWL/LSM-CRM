# =============================================================================
# 在生产 api 容器内运行种子 CLI
# 用法: pnpm seed:prod            (仅 7 用户)
#      pnpm seed:prod -- --full  (7 用户 + 80 客户 + ~300 拜访)
# =============================================================================
[CmdletBinding()]
param(
    [switch]$Full
)

. "$PSScriptRoot\_config.ps1"

Write-Step "运行生产环境种子"
Assert-ProdInitialized
Assert-Docker

$seedArgs = @()
if ($Full) { $seedArgs += '--full' }

Push-Location $Script:ProdDir
try {
    docker compose exec api bun run db:seed @seedArgs
    if ($LASTEXITCODE -ne 0) { throw 'seed failed' }
} finally {
    Pop-Location
}
Write-Ok "种子完成"
