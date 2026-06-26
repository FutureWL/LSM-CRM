import type { Context } from 'hono'
import { createHash, randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq, lt } from 'drizzle-orm'
import { db } from '../db/client'
import { sessions } from '../db/schema'
import { APP_ENV, IS_PROD_ENV } from '../config/env'

// __Host- prefix requires: Secure flag, Path=/, no Domain attribute.
// Together this guarantees the cookie is bound to the exact origin (no subdomain leakage).
// - 生产期 (HTTPS)：必须 __Host- 前缀（最高安全）
// - 开发期 (HTTP localhost)：退化为普通 cookie 名 + 不设 Secure
export const SESSION_COOKIE = APP_ENV.cookieSecure ? '__Host-lsm_session' : 'lsm_session'
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

// 生产期一旦发现 dev 模式却启用了 Secure + __Host-，会启动失败；这里仅打印告警
if (IS_PROD_ENV && !APP_ENV.cookieSecure) {
  console.warn('[session] ⚠️  生产环境 cookieSecure=false，session cookie 可能在 HTTPS 下不发送')
}

/** Raw bearer token (sent to client as cookie). 32 bytes base64url. */
function newRawToken(): string {
  return randomBytes(32).toString('base64url')
}

/** DB key = SHA-256 hex of raw token. Cookie stores the raw token; DB never sees it. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function createSession(userId: string, userAgent?: string) {
  const raw = newRawToken()
  const id = hashToken(raw)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000)
  await db.insert(sessions).values({ id, userId, expiresAt, userAgent })
  return { rawToken: raw, expiresAt }
}

export async function getSession(rawToken: string) {
  if (!rawToken) return null
  const id = hashToken(rawToken)
  const rows = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) {
    await deleteSessionById(id)
    return null
  }
  return row
}

export async function deleteSessionById(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function deleteSessionByRawToken(rawToken: string) {
  if (!rawToken) return
  const id = hashToken(rawToken)
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export function setSessionCookie(c: Context, rawToken: string) {
  setCookie(c, SESSION_COOKIE, rawToken, {
    httpOnly: true,
    // 生产用 Strict（最强防 CSRF）；dev 用 Lax（保证本地调试跳转能带 cookie）
    sameSite: IS_PROD_ENV ? 'Strict' : 'Lax',
    secure: APP_ENV.cookieSecure,
    path: '/',
    maxAge: SESSION_TTL_SEC,
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}
