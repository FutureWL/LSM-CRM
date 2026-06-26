# 查看生产环境状态
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LSM-CRM · 生产环境状态" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 工作空间
Write-Step "工作空间"
if (Test-Path $Script:ProdDir) {
    Write-Info "  路径: $($Script:ProdDir)"
    $envFile = Join-Path $Script:ProdDir '.env'
    if (Test-Path $envFile) {
        $bindHost = Get-ProdEnv 'BIND_HOST' '127.0.0.1'
        $bindPort = Get-ProdEnv 'BIND_PORT' '33510'
        $imageTag = Get-ProdEnv 'IMAGE_TAG' 'local'
        Write-Info "  镜像 tag: $imageTag"
        Write-Info "  监听: $bindHost`:$bindPort"
    } else {
        Write-Warn "  .env 不存在"
    }
} else {
    Write-Warn "  未初始化"
}

# 容器
Write-Host ""
Write-Step "容器状态"
$container = docker ps -a --filter "name=$Script:ContainerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>$null
if ($container) {
    Write-Host $container
} else {
    Write-Info "  容器未运行"
}

# 健康检查
Write-Host ""
Write-Step "健康检查"
$bindPort = Get-ProdEnv 'BIND_PORT' '33510'
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$bindPort/health" -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
        Write-Ok "  HTTP 200 - 服务正常"
    } else {
        Write-Warn "  HTTP $($resp.StatusCode)"
    }
} catch {
    Write-Err "  无法访问 http://localhost:$bindPort/health"
    Write-Info "  $($_.Exception.Message)"
}

# 镜像
Write-Host ""
Write-Step "镜像"
$images = docker images --filter "reference=$($Script:ImageName)" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" 2>$null
if ($images) {
    Write-Host $images
} else {
    Write-Info "  无相关镜像"
}

# 磁盘
Write-Host ""
Write-Step "磁盘占用(构建产物)"
$distPath = Join-Path $Script:ProdDir 'app\dist'
if (Test-Path $distPath) {
    $size = (Get-ChildItem -Path $distPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
    if (-not $size) { $size = 0 }
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Info "  app/dist: $sizeMB MB"
}
Write-Host ""
