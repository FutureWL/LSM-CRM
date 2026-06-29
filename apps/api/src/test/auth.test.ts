import { describe, test, expect } from 'bun:test'
import app from '../server'
import { db } from '../db/client'
import { users, tenantMemberships, tenants, sessions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../auth/password'

/**
 * /api/v1/auth/* 端点测试
 * 用 dev PG 的真实数据, 不做 mock
 *
 * 测试策略:
 * - login: 用 seed 创建的 2 个真实用户 (余莉莎 / 魏来) 验证 happy path
 * - me: 拿 cookie 验证 requireAuth 中间件
 * - change-password: 临时创建一个测试 user 跑完整流程, 测试结束清理
 */

const YULISHA = { email: 'yulisha@lsm-crm.local', password: 'Lsm@2026' }
const WEILAI = { email: 'weilai@lsm-crm.local', password: 'WeiLai@2026' }

// 每次测试用 unique X-Forwarded-For 隔离, 避免 login rate limit 跨测试污染
// (rate limit 只在生产环境生效, 这里加 XFF 是双保险)
let ipCounter = 1
function freshIp(): string {
  ipCounter++
  return `203.0.113.${ipCounter}` // TEST-NET-3 文档保留段
}

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await postLogin({ email, password })
  expect(res.status).toBe(200)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  return setCookie!.split(';')[0]!
}

/** POST /auth/login 包装, 默认带 unique X-Forwarded-For 避免限流跨测试污染 */
async function postLogin(body: unknown, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!headers.has('X-Forwarded-For')) headers.set('X-Forwarded-For', freshIp())
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return app.request('/api/v1/auth/login', { ...init, method: 'POST', headers, body: JSON.stringify(body) })
}

describe('POST /api/v1/auth/login', () => {
  test('余莉莎 (admin) 登录成功, 返回 users + tenants', async () => {
    const res = await postLogin(YULISHA)
    expect(res.status).toBe(200)
    const body = await res.json() as {
      ok: boolean
      data: { name: string; role: string; tenants: Array<{ slug: string; role: string }> }
    }
    expect(body.ok).toBe(true)
    expect(body.data.name).toBe('余莉莎')
    expect(body.data.role).toBe('admin')
    expect(body.data.tenants.length).toBeGreaterThan(0)
    expect(body.data.tenants[0]!.slug).toBe('default')
  })

  test('魏来 (sales) 登录成功', async () => {
    const res = await postLogin(WEILAI)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { name: string; role: string } }
    expect(body.data.name).toBe('魏来')
    expect(body.data.role).toBe('sales')
  })

  test('错误密码返回 401 UNAUTHORIZED (不区分用户存在 vs 密码错)', async () => {
    const res = await postLogin({ email: YULISHA.email, password: 'wrong-password-xxx' })
    expect(res.status).toBe(401)
    const body = await res.json() as { ok: boolean; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  test('不存在的 email 也返回 401 (不暴露账号枚举)', async () => {
    const res = await postLogin({ email: 'nobody-xxx@lsm-crm.local', password: 'whatever' })
    expect(res.status).toBe(401)
  })

  test('email 格式非法返回 400 VALIDATION_ERROR', async () => {
    const res = await postLogin({ email: 'not-an-email', password: 'xxx' })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  test('5 次错误后第 6 次返回 429 RATE_LIMITED (5/min/IP)', async () => {
    // 用 unique X-Forwarded-For 隔离, 不影响其它测试
    const ip = '203.0.113.99'
    // 临时强制启用 rate limit (auto 模式 dev/test 跳过)
    const { rateLimit } = await import('../middleware/rate-limit')
    const strictRateLimit = rateLimit({ max: 5, windowMs: 60_000, enabled: true })
    // 直接拿登录 handler 套上严格限流, 避免污染其它测试
    const { Hono } = await import('hono')
    const testApp = new Hono()
    testApp.use('*', strictRateLimit)
    testApp.post('/api/v1/auth/login', async (c) => {
      // 模拟 401 响应 (跟真路由一致)
      return c.json({ ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'invalid' } }, 401)
    })

    for (let i = 0; i < 5; i++) {
      const r = await testApp.request('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
        },
        body: JSON.stringify({ email: 'nobody-xxx@lsm-crm.local', password: 'wrong' }),
      })
      expect(r.status).toBe(401) // 前 5 次都返回 401
    }
    // 第 6 次应被限流
    const r6 = await testApp.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ email: 'nobody-xxx@lsm-crm.local', password: 'wrong' }),
    })
    expect(r6.status).toBe(429)
    const body = await r6.json() as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
    // 标准响应头
    expect(r6.headers.get('retry-after')).toBeTruthy()
    expect(r6.headers.get('ratelimit-limit')).toBe('5')
  })
})

describe('GET /api/v1/auth/me', () => {
  test('带 cookie 返回当前用户信息', async () => {
    const cookie = await loginAndGetCookie(YULISHA.email, YULISHA.password)
    const res = await app.request('/api/v1/auth/me', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { email: string; tenants: unknown[] } }
    expect(body.data.email).toBe(YULISHA.email)
    expect(Array.isArray(body.data.tenants)).toBe(true)
  })

  test('不带 cookie 返回 401 UNAUTHORIZED', async () => {
    const res = await app.request('/api/v1/auth/me')
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  test('伪造 cookie 返回 401', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: { Cookie: 'lsm_session=forged-token-xxx' },
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/change-password', () => {
  // 用一个临时测试 user, 跑完整流程, 测试结束清理
  const TEST_USER = {
    email: 'test-changepw@lsm-crm.local',
    name: '测试-改密',
    password: 'TestOldPw1!',
    newPassword: 'TestNewPw2!',
  }
  let testUserId: string
  let testTenantId: string

  test('完整流程: 创建测试 user → 登录 → 改密 → 用新密码再登录', async () => {
    // 1) 创建测试 user (用真 PG, 测试结束清理)
    const passwordHash = await hashPassword(TEST_USER.password)
    const [created] = await db
      .insert(users)
      .values({
        name: TEST_USER.name,
        email: TEST_USER.email,
        passwordHash,
        role: 'sales',
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      })
      .returning({ id: users.id })
    testUserId = created!.id

    // 拿默认租户
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, 'default')).limit(1)
    testTenantId = t!.id
    await db.insert(tenantMemberships).values({
      userId: testUserId,
      tenantId: testTenantId,
      role: 'sales',
      status: 'active',
    })

    // 2) 登录拿 cookie
    const cookie = await loginAndGetCookie(TEST_USER.email, TEST_USER.password)

    // 3) 改密
    const changeRes = await app.request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        currentPassword: TEST_USER.password,
        newPassword: TEST_USER.newPassword,
      }),
    })
    expect(changeRes.status).toBe(200)
    const changeBody = await changeRes.json() as { data: { changed: boolean } }
    expect(changeBody.data.changed).toBe(true)

    // 4) 旧密码登不上
    const oldRes = await postLogin({ email: TEST_USER.email, password: TEST_USER.password })
    expect(oldRes.status).toBe(401)

    // 5) 新密码能登
    const newRes = await postLogin({ email: TEST_USER.email, password: TEST_USER.newPassword })
    expect(newRes.status).toBe(200)
  })

  // 用 afterAll 清理测试 user (避免污染 dev DB)
  // bun:test 用 afterAll 不是顶级 export, 用 test.afterAll 也行
  // 这里用 cleanup pattern: 在最后一个 test 末尾清理
  test('cleanup: 删除测试 user', async () => {
    // 等上面 test 跑完, testUserId 已经被赋值
    if (testUserId) {
      // 先删 membership (CASCADE 应该自动, 但显式删更稳)
      await db.delete(tenantMemberships).where(eq(tenantMemberships.userId, testUserId))
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })
})

// =============================================================================
// session idle timeout (sliding session) 测试
// =============================================================================
describe('session idle timeout', () => {
  const TIMEOUT_MS = 30 * 60 * 1000 // 30 min
  const TEST_USER = {
    email: 'test-idle@lsm-crm.local',
    name: '测试-idle',
    password: 'TestIdlePw1!',
  }
  let testUserId: string

  /** 直接往 sessions 表插一条 lastActiveAt = 31 分钟前的 session */
  async function insertIdleSession(): Promise<string> {
    const raw = 'idle-test-raw-token-' + Math.random().toString(36).slice(2)
    const id = require('node:crypto').createHash('sha256').update(raw).digest('hex')
    const pastDate = new Date(Date.now() - TIMEOUT_MS - 60_000) // 31 分钟前
    await db.insert(sessions).values({
      id,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天后
      lastActiveAt: pastDate,
    })
    return raw
  }

  /** 插一条 lastActiveAt = 5 分钟前的 session (活跃) */
  async function insertActiveSession(): Promise<string> {
    const raw = 'active-test-raw-token-' + Math.random().toString(36).slice(2)
    const id = require('node:crypto').createHash('sha256').update(raw).digest('hex')
    await db.insert(sessions).values({
      id,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(Date.now() - 5 * 60 * 1000), // 5 分钟前
    })
    return raw
  }

  test('idle 超时 (31 分钟无活动) 的 session 401', async () => {
    // 创建测试 user
    const [created] = await db
      .insert(users)
      .values({
        name: TEST_USER.name,
        email: TEST_USER.email,
        passwordHash: await hashPassword(TEST_USER.password),
        role: 'sales',
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      })
      .returning({ id: users.id })
    testUserId = created!.id
    const [t] = await db.select().from(tenants).where(eq(tenants.slug, 'default')).limit(1)
    await db.insert(tenantMemberships).values({
      userId: testUserId,
      tenantId: t!.id,
      role: 'sales',
      status: 'active',
    })

    const idleRaw = await insertIdleSession()
    const res = await app.request('/api/v1/auth/me', {
      headers: { Cookie: `lsm_session=${idleRaw}` },
    })
    expect(res.status).toBe(401)
    // 同时 DB 里这条 session 已被清掉
    const id = require('node:crypto').createHash('sha256').update(idleRaw).digest('hex')
    const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    expect(rows.length).toBe(0)
  })

  test('活跃 session (< 30 分钟) 正常 200', async () => {
    const activeRaw = await insertActiveSession()
    const res = await app.request('/api/v1/auth/me', {
      headers: { Cookie: `lsm_session=${activeRaw}` },
    })
    expect(res.status).toBe(200)
  })

  test('鉴权成功后 lastActiveAt 被更新 (sliding)', async () => {
    const raw = await insertActiveSession()
    const id = require('node:crypto').createHash('sha256').update(raw).digest('hex')
    // 记下访问前的时间
    const before = await db.select({ lastActiveAt: sessions.lastActiveAt }).from(sessions).where(eq(sessions.id, id)).limit(1)
    const beforeTime = before[0]!.lastActiveAt.getTime()

    // 等待 50ms 让时间差可检测
    await new Promise((r) => setTimeout(r, 50))

    const res = await app.request('/api/v1/auth/me', {
      headers: { Cookie: `lsm_session=${raw}` },
    })
    expect(res.status).toBe(200)

    // 等异步 touch 写库 (touchSession 用 void fire-and-forget, 加点等待)
    await new Promise((r) => setTimeout(r, 100))
    const after = await db.select({ lastActiveAt: sessions.lastActiveAt }).from(sessions).where(eq(sessions.id, id)).limit(1)
    const afterTime = after[0]!.lastActiveAt.getTime()
    expect(afterTime).toBeGreaterThan(beforeTime)
  })

  test('cleanup: 删除 idle 测试残留', async () => {
    if (testUserId) {
      // sessions CASCADE 自动清
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })
})
