// =============================================================================
// 内存版 rate limit 中间件
// =============================================================================
// 设计目标：
// 1. 零依赖 — 不用 Redis, 不用外部存储
// 2. 单进程够用 — 小项目 bun 单进程, 内存计数够
// 3. 滑动窗口 — 不精确但实现简单, 足够防暴力破解
//
// 适用场景: login / 改密 / 注册等敏感端点
// **不适用**: 多进程部署 (需要 Redis 共享计数)
//
// 用法:
//   import { rateLimit } from './middleware/rate-limit'
//   app.post('/auth/login', rateLimit({ max: 5, windowMs: 60_000 }), async (c) => {...})
// =============================================================================

import type { MiddlewareHandler } from 'hono'

interface Bucket {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  /** 窗口内最大请求数 */
  max: number
  /** 窗口长度 (毫秒) */
  windowMs: number
  /** 自定义 key 函数 (默认按 IP) */
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string
  /** 超限时的错误码 (默认 RATE_LIMITED) */
  errorCode?: string
}

const buckets = new Map<string, Bucket>()

/** 定时清理过期 entries, 避免 Map 无限增长 (每 5 分钟跑一次) */
setInterval(
  () => {
    const now = Date.now()
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k)
    }
  },
  5 * 60 * 1000,
).unref?.()

/** 默认 IP key: 优先 X-Forwarded-For (代理场景), 否则 'unknown' */
function defaultKey(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return 'unknown'
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  const { max, windowMs, keyFn = defaultKey, errorCode = 'RATE_LIMITED' } = opts
  return async (c, next) => {
    const key = keyFn(c)
    const now = Date.now()
    let bucket = buckets.get(key)

    // 新建或过期重建
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count++

    // 设置 RateLimit-* 标准响应头 (RFC draft)
    c.header('RateLimit-Limit', String(max))
    c.header('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    c.header('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json(
        {
          ok: false,
          data: null,
          error: {
            code: errorCode,
            message: `请求过于频繁, 请 ${retryAfter} 秒后重试`,
            details: { limit: max, windowMs, retryAfterSec: retryAfter },
          },
        },
        429,
      )
    }

    await next()
  }
}
