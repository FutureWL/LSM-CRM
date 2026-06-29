import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users, tenants, tenantMemberships, type NewUser } from '../db/schema'
import { hashPassword } from '../auth/password'

// =============================================================================
// 真实 seed users（v0.4+）
// =============================================================================
// 之前 v0.3.0 时代的 7 个 demo 账号（周总/林总监/张伟/李娜/王强/刘洋/陈静）
// 已通过 scripts/dev/clean-demo-users.mjs 清理掉，他们持有的客户/拜访
// 全部 transfer 给魏来。
//
// 现在只 seed 2 个真实用户：余莉莎 (admin) + 魏来 (sales)。
// LoginView 里的"快捷登录"按钮硬编码的就是这 2 个。
// =============================================================================

export const SEED_USERS: Array<
  Omit<NewUser, 'passwordHash' | 'mustChangePassword' | 'passwordChangedAt'> & {
    password: string
    /** 租户内的角色：sales=普通销售，admin=租户管理员 */
    tenantRole: 'admin' | 'sales'
  }
> = [
  {
    name: '余莉莎',
    email: 'yulisha@lsm-crm.local',
    role: 'admin',
    tenantRole: 'admin',
    password: 'Lsm@2026',
    avatarUrl: null,
    teamId: null,
  },
  {
    name: '魏来',
    email: 'weilai@lsm-crm.local',
    role: 'sales',
    tenantRole: 'sales',
    password: 'WeiLai@2026',
    avatarUrl: null,
    teamId: null,
  },
]

/** 默认租户 slug — 整个项目用一个租户跑（v0.4 内部演示场景） */
const DEFAULT_TENANT_SLUG = 'default'

async function getOrCreateDefaultTenant() {
  const existing = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
    .limit(1)
  if (existing[0]) return existing[0]
  const [t] = await db
    .insert(tenants)
    .values({
      name: '默认租户（迁移期）',
      slug: DEFAULT_TENANT_SLUG,
      status: 'active',
    })
    .returning()
  return t
}

export async function seedUsers(): Promise<{
  created: number
  updated: number
  membershipsCreated: number
}> {
  const tenant = await getOrCreateDefaultTenant()
  // getOrCreateDefaultTenant 一定返回有效记录, 这里用 ! 消除 noUncheckedIndexedAccess 噪音

  let created = 0
  let updated = 0
  let membershipsCreated = 0

  for (const u of SEED_USERS) {
    const passwordHash = await hashPassword(u.password)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1)

    let userId: string
    if (existing[0]) {
      // 已存在：仅同步 name/role/avatar；**不重置 passwordHash**
      // （避免覆盖用户改过的密码）
      await db
        .update(users)
        .set({
          name: u.name,
          role: u.role,
          avatarUrl: u.avatarUrl,
          teamId: u.teamId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
      userId = existing[0].id
      updated++
    } else {
      // 新建
      const [row] = await db
        .insert(users)
        .values({
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash,
          avatarUrl: u.avatarUrl,
          teamId: u.teamId,
          // 真实用户不强制改密（不像 demo 账号）
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        })
        .returning({ id: users.id })
      userId = row!.id
      created++
    }

    // 同步 tenant_membership (user × tenant 关联)
    const existingMembership = await db
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(eq(tenantMemberships.userId, userId))
      .limit(1)
    if (!existingMembership[0]) {
      await db.insert(tenantMemberships).values({
        userId,
        tenantId: tenant!.id,
        role: u.tenantRole,
        status: 'active',
      })
      membershipsCreated++
    }
  }
  return { created, updated, membershipsCreated }
}
