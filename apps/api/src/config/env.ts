// =============================================================================
// 环境配置 + 启动期安全检查
// =============================================================================
// 设计原则：
// 1. 开发期友好 — 缺失环境变量用安全的默认值
// 2. 生产期严格 — 任何不安全的配置都会让进程在启动时直接崩溃（fail-fast）
// 3. 集中校验 — 所有生产安全检查在这里完成，业务代码只读 APP_ENV
// =============================================================================

const NODE_ENV = (process.env.NODE_ENV ?? 'development') as 'development' | 'production'
const IS_PROD = NODE_ENV === 'production'

// ---- 工具函数 ----
function read(name: string, fallback?: string): string | undefined {
  const v = process.env[name]
  if (v !== undefined && v !== '') return v
  return fallback
}

function readRequired(name: string, fallback?: string): string {
  const v = read(name, fallback)
  if (v === undefined) {
    throw new Error(`[env] 缺失必需环境变量: ${name}`)
  }
  return v
}

function readBool(name: string, fallback: boolean): boolean {
  const v = process.env[name]
  if (v === undefined) return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

// =============================================================================
// 各变量原始读取（不抛错）
// =============================================================================
const _sessionSecret = read('SESSION_SECRET')
const _cookieInsecure = readBool('COOKIE_INSECURE', false)
const _corsOriginsRaw = read('CORS_ORIGINS', '')
const _databaseUrl = read('DATABASE_URL', 'postgres://lsm_crm:changeme@localhost:5432/lsm_crm')
const _logLevel = read('LOG_LEVEL', 'info')!
const _port = Number(read('PORT', '33501'))

// =============================================================================
// 启动期安全检查（fail-fast）
// =============================================================================
function validateProductionSafety(): void {
  if (!IS_PROD) return // dev 不检查，给本地开发留余地

  const errors: string[] = []

  // 1) SESSION_SECRET 必须设置且足够强
  if (!_sessionSecret) {
    errors.push('SESSION_SECRET 缺失（生产必需；用 `openssl rand -base64 48` 生成）')
  } else if (_sessionSecret.length < 32) {
    errors.push(`SESSION_SECRET 长度不足（当前 ${_sessionSecret.length}，最少 32 字符）`)
  } else if (_sessionSecret === 'dev-secret-not-for-production') {
    errors.push('SESSION_SECRET 仍是默认值（dev-secret-not-for-production）')
  }

  // 2) COOKIE_INSECURE 在生产必须关闭
  if (_cookieInsecure) {
    errors.push('COOKIE_INSECURE=1 在生产环境不允许（cookie 会无 Secure 标志，可被中间人窃取）')
  }

  // 3) CORS_ORIGINS 在生产必须显式指定（不接受空 / 通配）
  const origins = (_corsOriginsRaw ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (origins.length === 0) {
    errors.push('CORS_ORIGINS 缺失（生产必需；多个用逗号分隔，如 https://app.example.com,https://admin.example.com）')
  } else if (origins.some((o) => o === '*' || !o.startsWith('http'))) {
    errors.push('CORS_ORIGINS 包含非法值（禁止 "*"，必须以 http:// 或 https:// 开头）')
  }

  // 4) DATABASE_URL 必须是生产数据库（不能是 changeme 默认）
  if (_databaseUrl?.includes('changeme')) {
    errors.push('DATABASE_URL 仍是默认 changeme 密码（生产必须改）')
  }

  // 5) LOG_LEVEL 在生产建议 info
  if (_logLevel === 'debug') {
    console.warn('[env] ⚠️  LOG_LEVEL=debug 在生产环境可能泄露敏感信息')
  }

  if (errors.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════════════╗')
    console.error('║  生产环境启动失败 — 配置不安全                                ║')
    console.error('╚══════════════════════════════════════════════════════════════╝')
    for (const e of errors) {
      console.error(`  ✗ ${e}`)
    }
    console.error('')
    process.exit(1)
  }
}

// dev 期警告（不退出）
function warnDevInsecure(): void {
  if (IS_PROD) return
  const warnings: string[] = []
  if (_cookieInsecure) {
    warnings.push('COOKIE_INSECURE=1 — dev 模式允许，**生产必须设为 0**')
  }
  if (_sessionSecret && _sessionSecret.length < 32) {
    warnings.push(`SESSION_SECRET 长度 ${_sessionSecret.length} < 32 — dev 模式允许，**生产必须 >= 32**`)
  }
  if (_databaseUrl?.includes('changeme')) {
    warnings.push('DATABASE_URL 含 changeme — dev 默认，**生产必须修改**')
  }
  for (const w of warnings) {
    console.warn(`[env] ⚠️  ${w}`)
  }
}

// 启动期执行
validateProductionSafety()
warnDevInsecure()

// =============================================================================
// 派生配置
// =============================================================================

// CORS 解析
const corsOrigins = (_corsOriginsRaw ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Session 密钥（dev 期给个够长的随机值，避免意外用错）
const SESSION_SECRET_FALLBACK = 'dev-only-secret-' + 'x'.repeat(40) + '-do-not-use-in-prod'
const sessionSecret = _sessionSecret ?? SESSION_SECRET_FALLBACK

// Cookie Secure 标志：dev 模式可由 COOKIE_INSECURE=1 关闭，prod 强制 true
const cookieSecure = !_cookieInsecure

// =============================================================================
// 导出
// =============================================================================
export const APP_ENV = {
  nodeEnv: NODE_ENV,
  isProd: IS_PROD,
  isDev: !IS_PROD,
  port: _port,
  databaseUrl: _databaseUrl!,
  sessionSecret,
  cookieSecure,
  logLevel: _logLevel,
  corsOrigins,
}

export const IS_DEV = !IS_PROD
export const IS_PROD_ENV = IS_PROD
