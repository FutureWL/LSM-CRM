import { describe, test, expect } from 'bun:test'
import app from '../server'

/**
 * /api/v1/customers 端点测试 (read-only)
 *
 * 假设 dev PG 已经 seed 完毕 (>= 1 个 customer, owner=魏来)
 * 测试只用 GET, 不修改数据
 */

const WEILAI = { email: 'weilai@lsm-crm.local', password: 'WeiLai@2026' }

async function loginCookie(): Promise<string> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(WEILAI),
  })
  expect(res.status).toBe(200)
  return res.headers.get('set-cookie')!.split(';')[0]!
}

describe('GET /api/v1/customers', () => {
  test('未登录返回 401', async () => {
    // 注意: customers 路由需要 tenant context, 没 cookie 会被 requireAuth 拦截
    const res = await app.request('/api/v1/customers')
    expect(res.status).toBe(401)
  })

  test('登录后能拉到种子客户 (>= 1 个)', async () => {
    const cookie = await loginCookie()
    const res = await app.request('/api/v1/customers', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as {
      ok: boolean
      data: { items: unknown[]; total: number }
    }
    expect(body.ok).toBe(true)
    expect(body.data.total).toBeGreaterThan(0)
    expect(body.data.items.length).toBeGreaterThan(0)
  })

  test('支持分页参数', async () => {
    const cookie = await loginCookie()
    const res = await app.request('/api/v1/customers?page=1&limit=5', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { items: unknown[]; limit: number } }
    expect(body.data.items.length).toBeLessThanOrEqual(5)
  })

  test('limit=200 上限保护', async () => {
    const cookie = await loginCookie()
    const res = await app.request('/api/v1/customers?limit=99999', {
      headers: { Cookie: cookie },
    })
    // zod 校验失败会返回 400
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
