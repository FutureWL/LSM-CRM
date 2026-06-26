# 进入生产容器 shell(调试用)
# 由于容器 read_only,只能读不能写;用作诊断
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

$running = docker ps --filter "name=$Script:ContainerName" --format "{{.Names}}" 2>$null
if (-not $running) {
    Write-Err "容器未运行,请先执行: pnpm prod:up"
    exit 1
}

Write-Step "进入容器 shell(输入 exit 退出)..."
docker exec -it $Script:ContainerName sh
