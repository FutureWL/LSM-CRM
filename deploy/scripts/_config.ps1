# =============================================================================
# 部署脚本共享配置 - 被所有 prod-*.ps1 引用
# =============================================================================

# 脚本所在目录
$Script:ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 仓库根(开发工作空间)
$Script:RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..') | Select-Object -ExpandProperty Path

# 生产工作空间 - 独立于仓库
# 默认值,可通过环境变量 LSM_CRM_PROD_DIR 覆盖
$Script:ProdDir = if ($env:LSM_CRM_PROD_DIR) { $env:LSM_CRM_PROD_DIR } else { 'D:\CodeProjects\lsm-crm-prod' }

# 容器名
$Script:ContainerName = 'lsm-crm-web'
$Script:ImageName = 'lsm-crm-web'
$Script:ComposeFile = Join-Path $Script:ProdDir 'docker-compose.yml'
$Script:ProdEnvFile = Join-Path $Script:ProdDir '.env'

# v0.3.0 多服务支持
$Script:DbContainer = 'lsm-crm-db'
$Script:ApiContainer = 'lsm-crm-api'
$Script:WebContainer = 'lsm-crm-web'

# 部署配置模板目录
$Script:DeployProdDir = Join-Path $Script:RepoRoot 'deploy\prod'

# 颜色
function Write-Step($msg)   { Write-Host "▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info($msg)   { Write-Host "  $msg" -ForegroundColor Gray }

# 校验工作空间已初始化
function Assert-ProdInitialized {
    if (-not (Test-Path $Script:ComposeFile)) {
        Write-Err "生产工作空间未初始化: $Script:ProdDir"
        Write-Info "请先执行: pnpm prod:init"
        exit 1
    }
}

# 读取 .env 中的某变量
function Get-ProdEnv($key, $default = '') {
    if (-not (Test-Path $Script:ProdEnvFile)) { return $default }
    $line = Get-Content $Script:ProdEnvFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) {
        $val = ($line -split '=', 2)[1].Trim()
        return $val
    }
    return $default
}

# 校验 docker 可用
function Assert-Docker {
    try {
        $null = docker --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'docker not found' }
    } catch {
        Write-Err "Docker 未安装或不在 PATH 中"
        Write-Info "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
        exit 1
    }
}
