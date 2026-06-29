import { db } from '../db/client'
import { seedUsers } from './users'

const FULL_MODE = process.argv.includes('--full')

const main = async () => {
  console.log('[seed] running users ...')
  const u = await seedUsers()
  console.log(`[seed] users: created=${u.created} updated=${u.updated} memberships=${u.membershipsCreated}`)

  if (FULL_MODE) {
    const { seedCustomers } = await import('./customers')
    const { seedVisits } = await import('./visits')
    console.log('[seed] running customers ...')
    const c = await seedCustomers()
    console.log(`[seed] customers: created=${c}`)
    console.log('[seed] running visits ...')
    const v = await seedVisits()
    console.log(`[seed] visits: created=${v}`)
  }

  console.log(`[seed] done.`)
  await db.$client.end()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[seed] failed:', err)
  await db.$client.end().catch(() => {})
  process.exit(1)
})
