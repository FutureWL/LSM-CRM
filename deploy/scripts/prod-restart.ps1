# 重启生产容器
# 用法:pnpm prod:restart
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

Write-Step "重启生产容器..."
docker restart $Script:ContainerName
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Ok "已重启"
