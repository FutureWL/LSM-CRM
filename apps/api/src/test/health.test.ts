import { describe, test, expect } from 'bun:test'
import app from '../server'

/**
 * /api/v1/health 端点测试
 * 验证: Hono 路由挂载 / response envelope / 公共访问
 */
describe('GET /api/v1/health', () => {
  test('返回 ok=true', async () => {
    const res = await app.request('/api/v1/health')
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; data: { status: string; version: string } }
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('ok')
    expect(typeof body.data.version).toBe('string')
  })

  test('GET /api/v1/version 也通', async () => {
    const res = await app.request('/api/v1/version')
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  test('未知路径返回 404 + NOT_FOUND', async () => {
    const res = await app.request('/api/v1/this-path-does-not-exist')
    expect(res.status).toBe(404)
    const body = await res.json() as { ok: boolean; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
