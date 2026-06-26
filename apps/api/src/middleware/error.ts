import type { Context, MiddlewareHandler } from 'hono'
import { AppError } from '../lib/errors'
import { fail } from '../lib/response'
import { IS_DEV } from '../config/env'

const SENSITIVE_KEYS = /(token|password|secret|authorization|cookie|session)/i
const STACK_MAX = 2000

function redact(input: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]'
  if (input == null) return input
  if (typeof input === 'string') {
    if (SENSITIVE_KEYS.test(input)) return '[REDACTED]'
    return input.length > 500 ? input.slice(0, 500) + '...[truncated]' : input
  }
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1))
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEYS.test(k)) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = redact(v, depth + 1)
      }
    }
    return out
  }
  return input
}

function safeStack(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined
  const s = err.stack ?? ''
  return s.length > STACK_MAX ? s.slice(0, STACK_MAX) + '...[truncated]' : s
}

export function errorHandler(): MiddlewareHandler {
  // 注意：Hono + Bun 组合下，middleware 内的 try-catch 不能 catch 错误，
  // 必须用 app.onError() 注册全局错误处理器（由 Hono 的 compose 在错误时调用）。
  // 本函数保留仅为接口兼容，但实际不提供中间件逻辑——错误处理在 onError() 中。
  return async (c, next) => {
    await next()
  }
}

/**
 * 全局错误处理函数。注册到 app.onError()，由 Hono 在错误未被任何中间件
 * catch 时调用。这是 Hono 推荐的错误处理方式。
 */
export function onError(err: Error, c: any) {
  const requestId = c.get('requestId') ?? '-'

  // 鲁棒检测：跨模块实例化时 instanceof 可能失败，按结构判断
  const isAppError =
    err instanceof AppError ||
    (typeof err === 'object' &&
      err !== null &&
      typeof (err as any).code === 'string' &&
      typeof (err as any).status === 'number' &&
      typeof (err as any).message === 'string')

  if (isAppError) {
    const code = (err as any).code as string
    const status = (err as any).status as number
    const message = (err as any).message as string
    const safeDetails = redact((err as any).details)
    console.warn(
      JSON.stringify({
        level: 'warn',
        requestId,
        code,
        msg: message,
        details: safeDetails,
      }),
    )
    return c.json(
      { ok: false, data: null, error: { code, message, details: safeDetails ?? undefined } },
      status as any,
    )
  }

  const message = IS_DEV ? String(err) : 'Internal server error'
  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      err: redact(String(err)),
      stack: safeStack(err),
    }),
  )
  return c.json(
    { ok: false, data: null, error: { code: 'INTERNAL', message, details: undefined } },
    500,
  )
}
