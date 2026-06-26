import { Hono } from 'hono'
import { requestId } from './middleware/request-id'
import { logger } from './middleware/logger'
import { corsMiddleware } from './middleware/cors'
import { onError } from './middleware/error'
import { ErrorMessages } from './lib/error-messages'
import { routes } from './routes'

const app = new Hono()

app.use('*', requestId())
app.use('*', logger())
app.use('/api/*', corsMiddleware())

app.route('/api/v1', routes)

// 全局错误处理（Hono + Bun 组合下，错误不会进入中间件 try-catch，必须用 onError）
app.onError(onError)

app.notFound((c) =>
  c.json(
    { ok: false, data: null, error: { code: 'NOT_FOUND', message: ErrorMessages.NOT_FOUND(c.req.method, c.req.path) } },
    404,
  ),
)

export default app
