import { buildSeedUsers } from './users'
import { buildSeedCustomers } from './customers'
import { buildSeedVisits } from './visits'

// 一次性生成全部种子,所有 store 共享同一份
export function buildSeed() {
  const users = buildSeedUsers()
  const customers = buildSeedCustomers(users)
  const visits = buildSeedVisits(customers)
  return { users, customers, visits }
}
