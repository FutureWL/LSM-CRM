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
  return async (c, next) => {
    try {
      await next()
    } catch (err) {
      const requestId = c.get('requestId') ?? '-'
      if (err instanceof AppError) {
        const safeDetails = redact(err.details)
        console.warn(
          JSON.stringify({
            level: 'warn',
            requestId,
            code: err.code,
            msg: err.message,
            details: safeDetails,
          }),
        )
        return fail(c, err.code, err.message, err.status as any, safeDetails)
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
      return fail(c, 'INTERNAL', message, 500)
    }
  }
}
