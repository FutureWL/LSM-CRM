import type { MiddlewareHandler } from 'hono'
import { APP_ENV } from '../config/env'

// 严格白名单：origin 必须在 APP_ENV.corsOrigins 内才设 CORS 头
// DEV 模式用 vite 33500/prod 用 web 容器（同源反代），由 env 决定
export function corsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    if (origin && APP_ENV.corsOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Credentials', 'true')
      c.header('Vary', 'Origin')
      c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
      c.header('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id')
    }
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }
    await next()
  }
}
