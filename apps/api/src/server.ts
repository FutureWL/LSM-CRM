import { Hono } from 'hono'
import { requestId } from './middleware/request-id'
import { errorHandler } from './middleware/error'
import { logger } from './middleware/logger'
import { corsMiddleware } from './middleware/cors'
import { routes } from './routes'

const app = new Hono()

app.use('*', requestId())
app.use('*', errorHandler())
app.use('*', logger())
app.use('/api/*', corsMiddleware())

app.route('/api/v1', routes)

app.notFound((c) =>
  c.json(
    { ok: false, data: null, error: { code: 'NOT_FOUND', message: `Route not found: ${c.req.method} ${c.req.path}` } },
    404,
  ),
)

export default app
