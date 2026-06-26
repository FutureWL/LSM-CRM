import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users, type NewUser } from '../db/schema'
import { hashPassword } from '../auth/password'

export const SEED_PASSWORD = 'Password123!'

export const SEED_USERS: Array<Omit<NewUser, 'passwordHash'> & { password: string }> = [
  { name: '周总', email: 'admin.zhou@lsm-crm.local', role: 'admin', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '林总监', email: 'admin.lin@lsm-crm.local', role: 'admin', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '张伟', email: 'sales.zhang@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '李娜', email: 'sales.li@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '王强', email: 'sales.wang@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '刘洋', email: 'sales.liu@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
  { name: '陈静', email: 'sales.chen@lsm-crm.local', role: 'sales', password: SEED_PASSWORD, avatarUrl: null, teamId: null },
]

export async function seedUsers(): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  for (const u of SEED_USERS) {
    const passwordHash = await hashPassword(u.password)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1)
    if (existing[0]) {
      await db
        .update(users)
        .set({
          name: u.name,
          role: u.role,
          passwordHash,
          avatarUrl: u.avatarUrl,
          teamId: u.teamId,
          updatedAt: new Date(),
        })
        .where(eq(users.email, u.email))
      updated++
    } else {
      await db.insert(users).values({
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        avatarUrl: u.avatarUrl,
        teamId: u.teamId,
      })
      created++
    }
  }
  return { created, updated }
}
