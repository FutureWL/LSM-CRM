// =============================================================================
// 密码强度策略
// =============================================================================
// OWASP 推荐（2024）：
// - 至少 12 字符（demo 阶段放宽到 8）
// - 同时包含字母 + 数字
// - 不在常见弱密码字典
// - 不能与邮箱 / 姓名 / 旧密码相同
// =============================================================================

// 常见弱密码 Top 100（精简版）
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'abc123', '111111', '000000', 'iloveyou', 'admin',
  'admin123', 'administrator', 'letmein', 'welcome', 'monkey', 'dragon',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'sunshine', 'princess', 'football',
  'baseball', 'master', 'shadow', 'superman', 'batman', 'trustno1',
  // 演示密码（迁移期拦截）
  'password123!', 'password123', 'demo1234', 'demo12345', 'test1234',
  'lsm12345', 'lsm123456', 'lsm-crm', 'lsmcrm123', 'lsmcrm1234',
])

export type PasswordStrength = 'strong' | 'medium' | 'weak'

export interface PasswordCheckResult {
  ok: boolean
  strength: PasswordStrength
  errors: string[]
}

/**
 * 检查密码强度
 * @param plain - 待检查的明文密码
 * @param context - 用于"不能与个人信息相同"的检查（email, name）
 */
export function checkPasswordStrength(
  plain: string,
  context?: { email?: string; name?: string; oldPassword?: string },
): PasswordCheckResult {
  const errors: string[] = []
  let score = 0

  // 长度
  if (plain.length < 8) {
    errors.push('至少 8 个字符（生产建议 12+）')
  } else if (plain.length >= 12) {
    score += 2
  } else {
    score += 1
  }

  // 字符种类
  const hasLower = /[a-z]/.test(plain)
  const hasUpper = /[A-Z]/.test(plain)
  const hasDigit = /\d/.test(plain)
  const hasSymbol = /[^A-Za-z0-9]/.test(plain)
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length
  if (variety < 2) {
    errors.push('必须包含至少两类字符（大小写字母 / 数字 / 符号）')
  }
  score += variety

  // 常见弱密码
  if (COMMON_PASSWORDS.has(plain.toLowerCase())) {
    errors.push('太常见，请换一个')
  }

  // 不能包含邮箱 / 姓名片段
  if (context?.email) {
    const local = context.email.split('@')[0]?.toLowerCase() ?? ''
    if (local.length >= 3 && plain.toLowerCase().includes(local)) {
      errors.push('不能包含邮箱用户名')
    }
  }
  if (context?.name && context.name.length >= 2) {
    if (plain.toLowerCase().includes(context.name.toLowerCase())) {
      errors.push('不能包含姓名')
    }
  }

  // 不能与旧密码相同（由调用方 verifyPassword 后比较）
  if (context?.oldPassword && plain === context.oldPassword) {
    errors.push('不能与旧密码相同')
  }

  const strength: PasswordStrength =
    errors.length > 0 ? 'weak' : score >= 5 ? 'strong' : 'medium'

  return {
    ok: errors.length === 0,
    strength,
    errors,
  }
}
