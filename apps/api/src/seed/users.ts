import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users, type NewUser } from '../db/schema'
import { hashPassword } from '../auth/password'

export const SEED_PASSWORD = 'Password123!'

// Demo emails — 这些账号首次登录会被强制要求修改密码
// 生产环境应该全部走管理员邀请流程，绝不留演示账号
const DEMO_EMAILS = new Set([
  'admin.zhou@lsm-crm.local',
  'admin.lin@lsm-crm.local',
  'sales.zhang@lsm-crm.local',
  'sales.li@lsm-crm.local',
  'sales.wang@lsm-crm.local',
  'sales.liu@lsm-crm.local',
  'sales.chen@lsm-crm.local',
])

export const SEED_USERS: Array<Omit<NewUser, 'passwordHash' | 'mustChangePassword'> & { password: string }> = [
  { name: '周总', email: 'admin.zhou@lsm-crm.local', role: 'admin', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '林总监', email: 'admin.lin@lsm-crm.local', role: 'admin', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '张伟', email: 'sales.zhang@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '李娜', email: 'sales.li@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '王强', email: 'sales.wang@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '刘洋', email: 'sales.liu@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '陈静', email: 'sales.chen@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
]

export async function seedUsers(): Promise<{ created: number; updated: number; mustChange: number }> {
  let created = 0
  let updated = 0
  let mustChange = 0
  for (const u of SEED_USERS) {
    const passwordHash = await hashPassword(u.password)
    const isDemo = DEMO_EMAILS.has(u.email)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1)
    if (existing[0]) {
      // 已存在：仅同步 name/role/avatar；不重置 passwordHash（避免覆盖用户改过的密码）
      // 但如果用户从未改过密码（passwordChangedAt 为 null）且 isDemo，仍标记必须改密
      const existingUser = await db
        .select({ passwordChangedAt: users.passwordChangedAt })
        .from(users)
        .where(eq(users.id, existing[0].id))
        .limit(1)
      const mustChange = isDemo && existingUser[0]?.passwordChangedAt === null
      await db
        .update(users)
        .set({
          name: u.name,
          role: u.role,
          avatarUrl: u.avatarUrl,
          teamId: u.teamId,
          // demo 账号且从未改密 → 强制改密
          ...(mustChange ? { mustChangePassword: true } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.email, u.email))
      updated++
    } else {
      // 新建：demo 账号必须改密；非 demo 不强制
      await db.insert(users).values({
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        avatarUrl: u.avatarUrl,
        teamId: u.teamId,
        mustChangePassword: isDemo,
        passwordChangedAt: null,
      })
      created++
      if (isDemo) mustChange++
    }
  }
  return { created, updated, mustChange }
}
