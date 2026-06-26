# 清理生产环境
# 用法:
#   pnpm prod:clean             # 停止并删除容器+镜像+挂载卷
#   pnpm prod:clean -KeepData   # 保留 app/dist 目录
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

$keepData = $args -contains '-KeepData'

Write-Warn "即将清理生产环境..."
Write-Info "  容器: $Script:ContainerName"
Write-Info "  镜像: $Script:ImageName"
if ($keepData) {
    Write-Info "  保留: app/dist/"
} else {
    Write-Info "  删除: app/dist/"
}

$confirm = Read-Host "  确认? [y/N]"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Info "已取消"
    exit 0
}

Push-Location $Script:ProdDir
try {
    Write-Step "停止并删除容器..."
    docker compose down --rmi all --volumes 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Warn "  容器/镜像可能已不存在" }

    Write-Step "删除残留容器..."
    $existing = docker ps -a --filter "name=$Script:ContainerName" --format "{{.ID}}" 2>$null
    if ($existing) {
        docker rm -f $existing 2>$null
    }

    if (-not $keepData) {
        Write-Step "清理 app/dist..."
        $dist = Join-Path $Script:ProdDir 'app\dist'
        if (Test-Path $dist) {
            Remove-Item -Path $dist -Recurse -Force
        }
    }

    Write-Ok "清理完成"
} finally {
    Pop-Location
}
