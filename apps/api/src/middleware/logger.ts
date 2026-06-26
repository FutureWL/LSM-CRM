import type { MiddlewareHandler } from 'hono'
import { APP_ENV } from '../config/env'

export function logger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    const requestId = c.get('requestId') ?? '-'
    if (APP_ENV.logLevel === 'debug' || c.res.status >= 400) {
      console.log(
        JSON.stringify({
          level: c.res.status >= 400 ? 'warn' : 'info',
          requestId,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          ms,
        }),
      )
    }
  }
}
