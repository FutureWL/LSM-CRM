import type { MiddlewareHandler } from 'hono'
import { APP_ENV, IS_DEV } from '../config/env'

// CORS 策略：
// - DEV 模式：放行所有 origin（开发期前端可能跑在任意端口：33500、52709、preview 等）
// - PROD 模式：严格白名单（APP_ENV.corsOrigins），由环境变量 CORS_ORIGINS 控制
//
// 关键设计：
// 1. 用"next() 后再设头"模式，确保无论路由/其他中间件如何构造 Response，
//    最终返回给浏览器的响应一定带 CORS 头
// 2. dev 模式设 Access-Control-Max-Age: 0，强制浏览器每次重新预检，
//    避免浏览器缓存之前修复前的失败响应导致"明明已经修好了还是报错"
// 3. dev 模式设 Access-Control-Allow-Private-Network: true，
//    满足 Chrome/Edge 94+ 的 Private Network Access (PNA) 策略
export function corsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    const method = c.req.method

    const setCorsHeaders = (allowOrigin: string) => {
      c.header('Access-Control-Allow-Origin', allowOrigin)
      c.header('Access-Control-Allow-Credentials', 'true')
      c.header('Vary', 'Origin')
      c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
      c.header('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id,Authorization')
      c.header('Access-Control-Expose-Headers', 'X-Request-Id')
      c.header('Access-Control-Max-Age', IS_DEV ? '0' : '600')
      // Chrome 94+ / Edge 94+ 的 Private Network Access 策略
      c.header('Access-Control-Allow-Private-Network', 'true')
    }

    const allowed =
      IS_DEV
        ? !!origin // dev: 任意 origin 都允许
        : !!origin && APP_ENV.corsOrigins.includes(origin) // prod: 严格白名单

    // OPTIONS 预检直接返回 204，绕过业务路由
    if (method === 'OPTIONS') {
      if (allowed && origin) setCorsHeaders(origin)
      return c.body(null, 204)
    }

    // 业务请求：先放行让 next() 执行，最后再补 CORS 头
    // 这样无论下游路由怎么构造 Response，最终响应都会带上 CORS 头
    await next()

    if (allowed && origin) setCorsHeaders(origin)
  }
}
