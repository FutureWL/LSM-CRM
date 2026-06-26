import { Hono } from 'hono'
import { health } from './health'
import { auth } from './auth'
import { usersRoute } from './users'
import { customersRoute } from './customers'
import { visitsRoute } from './visits'

export const routes = new Hono()
routes.route('/', health)
routes.route('/', auth)
routes.route('/', usersRoute)
routes.route('/', customersRoute)
routes.route('/', visitsRoute)
