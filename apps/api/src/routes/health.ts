import { Hono } from 'hono'
import { APP_ENV } from '../config/env'
import { ok } from '../lib/response'

const startedAt = Date.now()

export const health = new Hono()
  .get('/health', (c) => {
    return ok(c, {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      version: process.env.VITE_APP_VERSION ?? '0.0.0',
      gitSha: process.env.VITE_GIT_SHA ?? 'dev',
    })
  })
  .get('/version', (c) => {
    return ok(c, {
      version: process.env.VITE_APP_VERSION ?? '0.0.0',
      gitSha: process.env.VITE_GIT_SHA ?? 'dev',
      env: APP_ENV.nodeEnv,
    })
  })
