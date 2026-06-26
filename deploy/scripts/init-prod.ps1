# =============================================================================
# 初始化生产工作空间
# 用法:pnpm prod:init  或  powershell -File deploy/scripts/init-prod.ps1
# =============================================================================

# 强制控制台 UTF-8,正确显示中文
$null = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_config.ps1')

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  LSM-CRM . 初始化生产工作空间" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 创建工作空间目录
if (Test-Path $Script:ProdDir) {
    Write-Warn "目录已存在: $Script:ProdDir"
    $confirm = Read-Host "  是否复用现有目录? [y/N]"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Err "已取消"
        exit 1
    }
} else {
    Write-Step "创建工作空间目录: $Script:ProdDir"
    New-Item -ItemType Directory -Path $Script:ProdDir -Force | Out-Null
    Write-Ok "已创建"
}

# 2. 复制部署配置
Write-Step "同步部署配置..."
$filesToCopy = @(
    'docker-compose.yml',
    'Dockerfile',
    'nginx.conf',
    '.env.example'
)
foreach ($f in $filesToCopy) {
    $src = Join-Path $Script:DeployProdDir $f
    $dst = Join-Path $Script:ProdDir $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Info "  复制 $f"
    } else {
        Write-Warn "  源文件不存在: $src"
    }
}

# 3. .gitignore(独立工作空间用)
$gitignoreLines = @(
    '# 运行时',
    '.env',
    '.env.local',
    '*.log',
    'logs/',
    '',
    '# 构建产物',
    'app/',
    '',
    '# IDE',
    '.vscode/',
    '.idea/'
)
$gitignoreContent = ($gitignoreLines -join "`n") + "`n"
$gitignorePath = Join-Path $Script:ProdDir '.gitignore'
[System.IO.File]::WriteAllText($gitignorePath, $gitignoreContent, [System.Text.UTF8Encoding]::new($true))
Write-Info "  写入 .gitignore"

# 4. .env(若不存在)
$envFile = Join-Path $Script:ProdDir '.env'
if (Test-Path $envFile) {
    Write-Warn "  .env 已存在,保留"
} else {
    $exampleFile = Join-Path $Script:ProdDir '.env.example'
    # 显式用 UTF-8 读,避免 Windows PowerShell 5.1 按 ANSI 错读
    $exampleContent = [System.IO.File]::ReadAllText($exampleFile, [System.Text.UTF8Encoding]::new($true))

    # 自动写入 git short sha(若可用)
    $gitSha = 'local'
    try {
        Push-Location $Script:RepoRoot
        $gitSha = (git rev-parse --short HEAD 2>$null)
        Pop-Location
    } catch { }

    # 自动从 package.json 读 version
    $pkgJsonPath = Join-Path $Script:RepoRoot 'package.json'
    $pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
    $pkgVersion = $pkgJson.version

    $newContent = $exampleContent -replace '(?m)^IMAGE_TAG=.*',         "IMAGE_TAG=v$pkgVersion"
    $newContent = $newContent    -replace '(?m)^VITE_APP_VERSION=.*',   "VITE_APP_VERSION=$pkgVersion"
    $newContent = $newContent    -replace '(?m)^VITE_GIT_SHA=.*',       "VITE_GIT_SHA=$gitSha"
    $newContent = $newContent    -replace '(?m)^SOURCE_DIR=.*',         "SOURCE_DIR=$Script:RepoRoot"
    $newContent = $newContent    -replace '(?m)^DOCKERFILE=.*',         "DOCKERFILE=$Script:DeployProdDir\Dockerfile"

    [System.IO.File]::WriteAllText($envFile, $newContent, [System.Text.UTF8Encoding]::new($true))
    Write-Info "  生成 .env(IMAGE_TAG=v$pkgVersion, VITE_GIT_SHA=$gitSha)"
}

# 5. 创建 app / logs 子目录
@('app', 'app/dist', 'logs') | ForEach-Object {
    $p = Join-Path $Script:ProdDir $_
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}
Write-Info "  创建 app/ 与 logs/ 目录"

# 6. 写 README(用字符串数组,避免 here-string 中管道符的解析问题)
$readmeLines = @(
    '# LSM-CRM 生产工作空间',
    '',
    '> 本目录由 pnpm prod:init 自动生成,请勿手动修改 deploy 相关配置。',
    '> 真正的配置在主仓库的 deploy/prod/ 下,改动后重新执行 pnpm prod:init 或 pnpm prod:deploy 即可同步。',
    '',
    '## 文件说明',
    '',
    '  docker-compose.yml    容器编排',
    '  Dockerfile            镜像构建',
    '  nginx.conf            Nginx 配置',
    '  .env                  当前环境变量(可手动改端口、镜像 tag 等)',
    '  app/                  构建产物(由 deploy 脚本填充)',
    '  logs/                 可选,挂载 nginx 日志',
    '',
    '## 常用命令',
    '',
    '在主仓库 LSM-CRM/ 目录下执行:',
    '',
    '  pnpm prod:up          启动',
    '  pnpm prod:down        停止',
    '  pnpm prod:logs        查看日志',
    '  pnpm prod:status      查看状态',
    '  pnpm prod:rebuild     强制重建镜像',
    '  pnpm prod:deploy      重新构建并部署',
    '',
    '也可手动(在本目录下):',
    '',
    '  docker compose up -d',
    '  docker compose down',
    '  docker compose logs -f',
    ''
)
$readmeContent = ($readmeLines -join "`n")
$readmePath = Join-Path $Script:ProdDir 'README.md'
[System.IO.File]::WriteAllText($readmePath, $readmeContent, [System.Text.UTF8Encoding]::new($true))
Write-Info "  生成 README.md"

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  OK 初始化完成" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "  pnpm prod:deploy    一键部署并启动" -ForegroundColor White
Write-Host "  pnpm prod:status    查看状态" -ForegroundColor White
Write-Host ""
Write-Host "工作空间路径: " -NoNewline -ForegroundColor Gray
Write-Host $Script:ProdDir -ForegroundColor White
Write-Host ""
