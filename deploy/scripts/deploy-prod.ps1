# =============================================================================
# 一键部署到生产环境
# 流程:同步配置 → 构建 dist → 复制产物 → docker compose up -d --build
# 用法:pnpm prod:deploy
# =============================================================================

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Assert-Docker
Assert-ProdInitialized

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LSM-CRM · 部署到生产" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. 同步配置
Write-Step "[1/5] 同步部署配置..."
$filesToCopy = @('docker-compose.yml', 'Dockerfile', 'nginx.conf')
foreach ($f in $filesToCopy) {
    $src = Join-Path $Script:DeployProdDir $f
    $dst = Join-Path $Script:ProdDir $f
    Copy-Item -Path $src -Destination $dst -Force
    Write-Info "  同步 $f"
}
Write-Ok "  完成"

# 2. 检查 node_modules
Write-Step "[2/5] 检查开发依赖..."
if (-not (Test-Path (Join-Path $Script:RepoRoot 'node_modules'))) {
    Write-Info "  安装 pnpm 依赖..."
    Push-Location $Script:RepoRoot
    pnpm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
    Pop-Location
} else {
    Write-Info "  node_modules 已存在,跳过"
}
Write-Ok "  完成"

# 3. 构建
Write-Step "[3/5] 构建生产 bundle..."
Push-Location $Script:RepoRoot
try {
    # 把 VITE_GIT_SHA 注入到构建环境
    $gitSha = 'local'
    try { $gitSha = (git rev-parse --short HEAD 2>$null) } catch { }
    $env:VITE_GIT_SHA = $gitSha

    pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'build failed' }
} finally {
    Pop-Location
}
Write-Ok "  完成"

# 4. 复制 dist 到生产工作空间
Write-Step "[4/5] 复制构建产物..."
$srcDist = Join-Path $Script:RepoRoot 'dist'
$dstDist = Join-Path $Script:ProdDir 'app\dist'

# 清空旧产物
if (Test-Path $dstDist) {
    Remove-Item -Path $dstDist -Recurse -Force
}
New-Item -ItemType Directory -Path $dstDist -Force | Out-Null

Copy-Item -Path (Join-Path $srcDist '*') -Destination $dstDist -Recurse -Force
$fileCount = (Get-ChildItem -Path $dstDist -Recurse -File | Measure-Object).Count
Write-Info "  复制了 $fileCount 个文件到 $dstDist"
Write-Ok "  完成"

# 5. 启动容器
Write-Step "[5/5] 构建并启动 Docker 容器..."
Push-Location $Script:ProdDir
try {
    $env:COMPOSE_DOCKER_CLI_BUILD = '1'
    $env:DOCKER_BUILDKIT = '1'
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }
} finally {
    Pop-Location
}
Write-Ok "  完成"

# 显示状态
Write-Host ""
$bindHost = Get-ProdEnv 'BIND_HOST' '127.0.0.1'
$bindPort = Get-ProdEnv 'BIND_PORT' '33510'
$url = "http://$bindHost`:$bindPort"
if ($bindHost -eq '127.0.0.1' -or $bindHost -eq 'localhost') {
    $url = "http://localhost:$bindPort"
}

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ 部署完成" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  访问地址: " -NoNewline -ForegroundColor Gray
Write-Host $url -ForegroundColor White
Write-Host "  容器名称: " -NoNewline -ForegroundColor Gray
Write-Host $Script:ContainerName -ForegroundColor White
Write-Host ""
Write-Host "后续命令:" -ForegroundColor Cyan
Write-Host "  pnpm prod:status   查看状态" -ForegroundColor White
Write-Host "  pnpm prod:logs     跟踪日志" -ForegroundColor White
Write-Host "  pnpm prod:open     打开浏览器" -ForegroundColor White
Write-Host ""
