import { pgEnum } from 'drizzle-orm/pg-core'
import { USER_ROLES } from '../../lib/stage'

export const userRoleEnum = pgEnum('user_role', USER_ROLES)
