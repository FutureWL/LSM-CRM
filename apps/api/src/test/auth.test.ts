import { describe, test, expect } from 'bun:test'
import app from '../server'
import { db } from '../db/client'
import { users, tenantMemberships, tenants } from '../db/schema'
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

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.status).toBe(200)
  const setCookie = res.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  // 取 cookie 名=值 部分
  return setCookie!.split(';')[0]!
}

describe('POST /api/v1/auth/login', () => {
  test('余莉莎 (admin) 登录成功, 返回 users + tenants', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(YULISHA),
    })
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
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(WEILAI),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { name: string; role: string } }
    expect(body.data.name).toBe('魏来')
    expect(body.data.role).toBe('sales')
  })

  test('错误密码返回 401 UNAUTHORIZED (不区分用户存在 vs 密码错)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: YULISHA.email, password: 'wrong-password-xxx' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json() as { ok: boolean; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  test('不存在的 email 也返回 401 (不暴露账号枚举)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody-xxx@lsm-crm.local', password: 'whatever' }),
    })
    expect(res.status).toBe(401)
  })

  test('email 格式非法返回 400 VALIDATION_ERROR', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'xxx' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
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
    const oldRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    })
    expect(oldRes.status).toBe(401)

    // 5) 新密码能登
    const newRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.newPassword }),
    })
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
