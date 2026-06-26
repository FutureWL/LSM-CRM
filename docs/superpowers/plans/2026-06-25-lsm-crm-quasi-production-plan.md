# LSM-CRM 准生产化 v0.3.0 — 后端核心 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 LSM-CRM 添加独立的 Hono + Drizzle + Postgres 后端服务（`apps/api`），并把部署从单容器重构为三容器（web / api / db）。

**Architecture:** 单 repo 双工程（前端 + `apps/api`），前者不变；后者以 Hono 暴露 REST API `/api/v1/*`，用 Drizzle ORM 访问 Postgres 17，Session Cookie 鉴权（HttpOnly + SameSite=Lax，session 入库），启动时 `drizzle-orm/postgres-js/migrator` 幂等执行迁移。Docker Compose 编排三服务：db（postgres:17-alpine）、api（oven/bun + 多阶段构建）、web（nginx 静态 + `/api/*` 反向代理）。

**Tech Stack:** Bun 1.1+ · Hono 4 · Drizzle ORM · postgres.js · @node-rs/argon2 · Zod · PostgreSQL 17 · Docker Compose v2 · PowerShell 7

**Spec:** [`docs/superpowers/specs/2026-06-25-lsm-crm-quasi-production-design.md`](../specs/2026-06-25-lsm-crm-quasi-production-design.md)

---

## Global Constraints

- **分支基准**：`release/v0.2.0` 上的所有未提交变更（`src/config/*`、`.env.*`、`deploy/*`、stores 的 seed 闸门）**视为已就绪**——Task 1 第一步会先 commit 那些变更打基线
- **包管理**：前端用 `pnpm` + `pnpm-lock.yaml`；`apps/api` 用 `bun` + `bun.lockb`（与前端解耦）
- **Bun 版本**：`>= 1.1.0`（Drizzle postgres-js migrator 必需）
- **Postgres 版本**：`17-alpine`
- **API 前缀**：所有 HTTP 端点挂载在 `/api/v1` 下
- **Cookie 名**：`lsm_session`；`Path=/api`；`HttpOnly`；`SameSite=Lax`；dev 关 Secure，prod 开 Secure
- **Session 过期**：7 天（`Max-Age=604800` + DB `expires_at`）
- **种子密码**：`Password123!`（生产环境必须改）
- **响应包络**：`{ ok: true, data, error: null }` / `{ ok: false, data: null, error: { code, message, details? } }`
- **错误码**：`VALIDATION_ERROR` (400) / `UNAUTHORIZED` (401) / `FORBIDDEN` (403) / `NOT_FOUND` (404) / `CONFLICT` (409) / `INTERNAL` (500)
- **字段命名**：DB 用 `snake_case`；TS 用 `camelCase`；Drizzle schema 显式映射
- **Commit 风格**：conventional commits（`feat:` / `fix:` / `chore:` / `docs:` / `refactor:`）
- **每任务交付**：独立 commit + 独立可验证（curl / psql / docker）

---

## File Structure

### 新增（`apps/api/`）

```
apps/api/
├── package.json                # Task 1
├── tsconfig.json               # Task 1
├── drizzle.config.ts           # Task 1
├── Dockerfile                  # Task 12
├── .env.example                # Task 1
├── .gitignore                  # Task 1
├── README.md                   # Task 1
├── bun.lockb                   # 自动生成
└── src/
    ├── main.ts                 # Task 3 - 入口：先 migrate 后 serve
    ├── server.ts               # Task 3 - Hono app 装配
    ├── config/
    │   └── env.ts              # Task 1
    ├── db/
    │   ├── client.ts           # Task 3
    │   ├── migrate.ts          # Task 3
    │   ├── schema/
    │   │   ├── enums.ts        # Task 2
    │   │   ├── users.ts        # Task 2
    │   │   ├── customers.ts    # Task 2
    │   │   ├── visits.ts       # Task 2
    │   │   ├── transfers.ts    # Task 2
    │   │   ├── sessions.ts     # Task 2
    │   │   └── index.ts        # Task 2
    │   └── migrations/         # Task 2 - drizzle-kit generate 输出
    ├── auth/
    │   ├── password.ts         # Task 4
    │   ├── session.ts          # Task 4
    │   └── middleware.ts       # Task 5
    ├── middleware/
    │   ├── request-id.ts       # Task 3
    │   ├── error.ts            # Task 3
    │   ├── logger.ts           # Task 3
    │   └── cors.ts             # Task 3
    ├── routes/
    │   ├── index.ts            # Task 3
    │   ├── health.ts           # Task 3
    │   ├── auth.ts             # Task 5
    │   ├── users.ts            # Task 6
    │   ├── customers.ts        # Task 7-8
    │   └── visits.ts           # Task 9
    ├── lib/
    │   ├── response.ts         # Task 1
    │   ├── errors.ts           # Task 1
    │   └── stage.ts            # Task 1
    └── seed/
        ├── index.ts            # Task 10-11
        ├── users.ts            # Task 10
        ├── customers.ts        # Task 11
        └── visits.ts           # Task 11
```

### 修改/新增（部署相关）

```
deploy/prod/
├── docker-compose.yml          # Task 3 (临时 db only) + Task 13 (3 服务)
├── nginx.conf                  # 改：增加 /api/* (Task 13)
├── api.Dockerfile              # 新增 (Task 12)
├── web.Dockerfile              # 从根目录迁入 (Task 12)
└── .env.example                # 改：增加 DB / SESSION (Task 13)

deploy/scripts/
├── _config.ps1                 # 改：增加 ApiContainer (Task 14)
├── deploy-prod.ps1             # 改：db → api → web 顺序 (Task 14)
├── migrate-prod.ps1            # 新增 (Task 14)
├── seed-prod.ps1               # 新增 (Task 14)
├── api-logs.ps1                # 新增 (Task 14)
└── api-shell.ps1               # 新增 (Task 14)

package.json                    # 改：追加 api:* 脚本 (Task 15)
README.md                       # 改：三容器部署章节 (Task 15)

docs/
├── api-contract.md             # 新增 (Task 16)
└── verification-reports/
    └── v0.3.0-smoke.md         # 新增 (Task 17)
```

### 关键复用点（来自 v0.2.0）

- `D:\CodeProjects\LSM-CRM\src\lib\stage.ts` — 客户阶段常量，**后端 `apps/api/src/lib/stage.ts` 必须一致**
- `D:\CodeProjects\LSM-CRM\src\seed\users.ts` — 7 演示账号种子源，**迁移到后端**（加 `email` + `passwordHash` 字段）
- `D:\CodeProjects\LSM-CRM\src\seed\customers.ts` — 80 客户种子源，**迁移到后端**
- `D:\CodeProjects\LSM-CRM\src\seed\visits.ts` — 300 拜访种子源，**迁移到后端**
- `D:\CodeProjects\LSM-CRM\deploy\scripts\_config.ps1` — PowerShell 共享工具，**追加 `$Script:ApiContainer` 等变量**

---

## Tasks

### Task 1: 项目脚手架（apps/api 目录 + 基础配置）

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/.gitignore`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/lib/response.ts`
- Create: `apps/api/src/lib/errors.ts`
- Create: `apps/api/src/lib/stage.ts`
- Create: `apps/api/README.md`

**Interfaces:**
- Produces:
  - `export const APP_ENV` from `apps/api/src/config/env.ts`
  - `export function ok/fail` from `apps/api/src/lib/response.ts`
  - `export class AppError` from `apps/api/src/lib/errors.ts`
  - `export const CUSTOMER_STAGES / VISIT_TYPES / VISIT_RESULTS / USER_ROLES` from `apps/api/src/lib/stage.ts`

- [ ] **Step 1: 提交 v0.2.0 未提交变更打基线**

```bash
cd D:\CodeProjects\LSM-CRM
git add -A
git status  # 确认要 commit 的文件列表
git commit -m "chore: 提交 v0.2.0 已落地变更（部署基础设施 / 配置管理）"
```

Expected: commit 创建，当前工作区干净（`git status` 无输出）。

- [ ] **Step 2: 创建 apps/api 目录结构**

```bash
cd D:\CodeProjects\LSM-CRM
mkdir -p apps/api/src/{config,db/schema,middleware,routes,lib,seed}
mkdir -p apps/api/src/db/migrations
```

- [ ] **Step 3: 写 `apps/api/package.json`**

```json
{
  "name": "@lsm-crm/api",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/main.ts",
    "build": "bun build src/main.ts --target=bun --outdir=dist --minify",
    "start": "bun run dist/main.js",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run src/db/migrate.ts",
    "db:seed": "bun run src/seed/index.ts"
  },
  "dependencies": {
    "@node-rs/argon2": "^2.0.0",
    "drizzle-orm": "^0.36.0",
    "hono": "^4.6.0",
    "postgres": "^3.4.5",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "drizzle-kit": "^0.28.0",
    "typescript": "~5.6.2"
  }
}
```

- [ ] **Step 4: 写 `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["bun"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "drizzle.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: 写 `apps/api/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://lsm_crm:changeme@localhost:5432/lsm_crm',
  },
  verbose: true,
  strict: true,
})
```

- [ ] **Step 6: 写 `apps/api/.env.example`**

```bash
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm
SESSION_SECRET=please-generate-with-openssl-rand-base64-32
PORT=3000
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 7: 写 `apps/api/.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 8: 写 `apps/api/src/config/env.ts`**

```ts
function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`Environment variable ${name} is required`)
  return v
}

export const APP_ENV = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'production',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL', 'postgres://lsm_crm:changeme@localhost:5432/lsm_crm'),
  sessionSecret: required('SESSION_SECRET', 'dev-secret-not-for-production'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

export const IS_DEV = APP_ENV.nodeEnv !== 'production'
```

- [ ] **Step 9: 写 `apps/api/src/lib/errors.ts`**

```ts
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
}

export class AppError extends Error {
  public readonly code: AppErrorCode
  public readonly status: number
  public readonly details?: unknown

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.status = STATUS[code]
    this.details = details
  }
}
```

- [ ] **Step 10: 写 `apps/api/src/lib/response.ts`**

```ts
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export interface ApiSuccess<T> {
  ok: true
  data: T
  error: null
}

export interface ApiFailure {
  ok: false
  data: null
  error: { code: string; message: string; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiSuccess<T>>({ ok: true, data, error: null }, status)
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 500,
  details?: unknown,
) {
  const body: ApiFailure = { ok: false, data: null, error: { code, message, details } }
  return c.json(body, status)
}
```

- [ ] **Step 11: 写 `apps/api/src/lib/stage.ts`（与前端对齐）**

```ts
// 必须与 src/lib/stage.ts 一致
export const CUSTOMER_STAGES = [
  'new',
  'contacted',
  'intent',
  'negotiating',
  'won',
  'lost',
] as const

export type CustomerStage = (typeof CUSTOMER_STAGES)[number]

export const STAGE_LABEL: Record<CustomerStage, string> = {
  new: '新客户',
  contacted: '已联系',
  intent: '有意向',
  negotiating: '商务谈判',
  won: '已成交',
  lost: '已流失',
}

export const VISIT_TYPES = ['normal', 'collection', 'warranty', 'introduction'] as const
export type VisitType = (typeof VISIT_TYPES)[number]

export const VISIT_RESULTS = ['progress', 'obstacle', 'done'] as const
export type VisitResult = (typeof VISIT_RESULTS)[number]

export const USER_ROLES = ['admin', 'sales'] as const
export type UserRole = (typeof USER_ROLES)[number]
```

- [ ] **Step 12: 写 `apps/api/README.md`**

```markdown
# LSM-CRM API (v0.3.0)

Hono + Drizzle + Postgres 后端服务。

## 本地开发

```bash
# 1. 启动 Postgres（仅 db 服务）
docker compose -f ../../deploy/prod/docker-compose.yml up -d db

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env，至少改 SESSION_SECRET

# 3. 装依赖
bun install

# 4. 跑迁移
bun run db:migrate

# 5. 种子数据
bun run db:seed -- --full

# 6. 起服务
bun run dev
# → Listening on http://localhost:3000

# 7. 冒烟
curl http://localhost:3000/api/v1/health
```

## 端点

详见根目录 `docs/api-contract.md`。
```

- [ ] **Step 13: 安装依赖并验证 TypeScript 编译**

```bash
cd apps/api
bun install
bun run type-check
```

Expected: `bun install` 创建 `node_modules/` + `bun.lockb`；`type-check` 输出 0 errors。

- [ ] **Step 14: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/
git commit -m "feat(api): 创建 apps/api 脚手架 (package.json/tsconfig/drizzle.config)"
```

---

### Task 2: Drizzle Schema 全部 5 张表

**Files:**
- Create: `apps/api/src/db/schema/enums.ts`
- Create: `apps/api/src/db/schema/users.ts`
- Create: `apps/api/src/db/schema/customers.ts`
- Create: `apps/api/src/db/schema/visits.ts`
- Create: `apps/api/src/db/schema/transfers.ts`
- Create: `apps/api/src/db/schema/sessions.ts`
- Create: `apps/api/src/db/schema/index.ts`

**Interfaces:**
- Produces (consumed by Task 3+):
  - `export const users` / `customers` / `visits` / `customerTransfers` / `sessions`
  - `export const userRoleEnum`
  - `export type User / NewUser` 等 5 套类型

- [ ] **Step 1: 写 `apps/api/src/db/schema/enums.ts`**

```ts
import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'sales'])
```

- [ ] **Step 2: 写 `apps/api/src/db/schema/users.ts`**

```ts
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { userRoleEnum } from './enums'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  avatarUrl: text('avatar_url'),
  teamId: uuid('team_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

- [ ] **Step 3: 写 `apps/api/src/db/schema/customers.ts`**

```ts
import { pgTable, text, uuid, timestamp, numeric, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { CUSTOMER_STAGES } from '../../lib/stage'

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    company: text('company').notNull(),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    industry: text('industry'),
    stage: text('stage').notNull().default('new'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    teamId: uuid('team_id'),
    lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customers_owner_id_idx').on(t.ownerId),
    index('customers_stage_idx').on(t.stage),
    index('customers_owner_stage_idx').on(t.ownerId, t.stage),
    check(
      'customers_stage_check',
      sql.raw(`stage IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
  ],
)

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
```

- [ ] **Step 4: 写 `apps/api/src/db/schema/visits.ts`**

```ts
import { pgTable, text, uuid, timestamp, integer, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { customers } from './customers'
import { CUSTOMER_STAGES, VISIT_TYPES, VISIT_RESULTS } from '../../lib/stage'

export const visits = pgTable(
  'visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    salesmanId: uuid('salesman_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull().default('normal'),
    result: text('result').notNull(),
    content: text('content').notNull(),
    durationMin: integer('duration_min'),
    nextStep: text('next_step'),
    stageBefore: text('stage_before'),
    stageAfter: text('stage_after'),
    visitedAt: timestamp('visited_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('visits_customer_id_idx').on(t.customerId),
    index('visits_salesman_id_idx').on(t.salesmanId),
    index('visits_visited_at_idx').on(t.visitedAt.desc()),
    check('visits_type_check', sql.raw(`type IN (${VISIT_TYPES.map((s) => `'${s}'`).join(',')})`)),
    check('visits_result_check', sql.raw(`result IN (${VISIT_RESULTS.map((s) => `'${s}'`).join(',')})`)),
    check(
      'visits_stage_before_check',
      sql.raw(`stage_before IS NULL OR stage_before IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
    check(
      'visits_stage_after_check',
      sql.raw(`stage_after IS NULL OR stage_after IN (${CUSTOMER_STAGES.map((s) => `'${s}'`).join(',')})`),
    ),
  ],
)

export type Visit = typeof visits.$inferSelect
export type NewVisit = typeof visits.$inferInsert
```

- [ ] **Step 5: 写 `apps/api/src/db/schema/transfers.ts`**

```ts
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { customers } from './customers'

export const customerTransfers = pgTable('customer_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  fromUserId: uuid('from_user_id')
    .notNull()
    .references(() => users.id),
  toUserId: uuid('to_user_id')
    .notNull()
    .references(() => users.id),
  reason: text('reason'),
  transferredAt: timestamp('transferred_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CustomerTransfer = typeof customerTransfers.$inferSelect
export type NewCustomerTransfer = typeof customerTransfers.$inferInsert
```

- [ ] **Step 6: 写 `apps/api/src/db/schema/sessions.ts`**

```ts
import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
```

- [ ] **Step 7: 写 `apps/api/src/db/schema/index.ts`**

```ts
export * from './enums'
export * from './users'
export * from './customers'
export * from './visits'
export * from './transfers'
export * from './sessions'
```

- [ ] **Step 8: 生成首个 migration**

```bash
cd apps/api
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm bun run db:generate
```

Expected: `src/db/migrations/0000_*.sql` 和 `meta/_journal.json` 文件被创建。

- [ ] **Step 9: 验证 schema + commit**

```bash
cd apps/api
bun run type-check
# 0 errors

cd ../..
git add apps/api/src/db/
git commit -m "feat(api): 5 张表 Drizzle schema (users/customers/visits/transfers/sessions)"
```

---

### Task 3: DB 客户端 + 自动迁移 + Hono 骨架 + /health

**Files:**
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/middleware/request-id.ts`
- Create: `apps/api/src/middleware/error.ts`
- Create: `apps/api/src/middleware/logger.ts`
- Create: `apps/api/src/middleware/cors.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/index.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/main.ts`
- Create: `deploy/prod/docker-compose.yml`（**只 db 服务**，临时为了本地开发；Task 13 会扩展到 3 服务）

**Interfaces:**
- Produces:
  - `export const sql / db` from `apps/api/src/db/client.ts`
  - `export const health: Hono` from `apps/api/src/routes/health.ts`
  - `export default app: Hono` from `apps/api/src/server.ts`

- [ ] **Step 1: 启动 docker postgres（仅 db 服务）**

```yaml
# deploy/prod/docker-compose.yml (临时版本，Task 13 会改)
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: lsm_crm
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: lsm_crm
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lsm_crm"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

```bash
cd D:\CodeProjects\LSM-CRM
docker compose -f deploy/prod/docker-compose.yml up -d db
sleep 5
docker compose -f deploy/prod/docker-compose.yml ps
# → db running (healthy)
```

- [ ] **Step 2: 写 `apps/api/src/db/client.ts`**

```ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { APP_ENV } from '../config/env'
import * as schema from './schema'

export const sql = postgres(APP_ENV.databaseUrl, { max: 10 })
export const db = drizzle(sql, { schema })
```

- [ ] **Step 3: 写 `apps/api/src/db/migrate.ts`**

```ts
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './client'

const main = async () => {
  console.log('Running migrations from ./db/migrations ...')
  await migrate(db, { migrationsFolder: './db/migrations' })
  console.log('Migrations applied.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 4: 跑迁移**

```bash
cd apps/api
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm bun run db:migrate
# → "Migrations applied."
```

```bash
docker compose -f ../../deploy/prod/docker-compose.yml exec -T db \
  psql -U lsm_crm -d lsm_crm -c "\dt"
```

Expected: 输出 `users`, `customers`, `visits`, `customer_transfers`, `sessions`, `__drizzle_migrations` 6 张表。

- [ ] **Step 5: 写 `apps/api/src/middleware/request-id.ts`**

```ts
import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const id = c.req.header('x-request-id') ?? randomUUID()
    c.set('requestId', id)
    c.header('X-Request-Id', id)
    await next()
  }
}
```

- [ ] **Step 6: 写 `apps/api/src/middleware/error.ts`**

```ts
import type { Context, MiddlewareHandler } from 'hono'
import { AppError } from '../lib/errors'
import { fail } from '../lib/response'
import { IS_DEV } from '../config/env'

export function errorHandler(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next()
    } catch (err) {
      const requestId = c.get('requestId') ?? '-'
      if (err instanceof AppError) {
        console.warn(JSON.stringify({ level: 'warn', requestId, code: err.code, msg: err.message }))
        return fail(c, err.code, err.message, err.status as any, err.details)
      }
      const message = IS_DEV ? String(err) : 'Internal server error'
      console.error(JSON.stringify({ level: 'error', requestId, err: String(err), stack: (err as Error)?.stack }))
      return fail(c, 'INTERNAL', message, 500)
    }
  }
}
```

- [ ] **Step 7: 写 `apps/api/src/middleware/logger.ts`**

```ts
import type { MiddlewareHandler } from 'hono'
import { APP_ENV } from '../config/env'

export function logger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    const requestId = c.get('requestId') ?? '-'
    if (APP_ENV.logLevel === 'debug' || c.res.status >= 400) {
      console.log(
        JSON.stringify({
          level: c.res.status >= 400 ? 'warn' : 'info',
          requestId,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          ms,
        }),
      )
    }
  }
}
```

- [ ] **Step 8: 写 `apps/api/src/middleware/cors.ts`**

```ts
import type { MiddlewareHandler } from 'hono'
import { APP_ENV, IS_DEV } from '../config/env'

export function corsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    if (origin && (IS_DEV || APP_ENV.corsOrigins.includes(origin))) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Credentials', 'true')
      c.header('Vary', 'Origin')
      c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
      c.header('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id')
    }
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }
    await next()
  }
}
```

- [ ] **Step 9: 写 `apps/api/src/routes/health.ts`**

```ts
import { Hono } from 'hono'
import { APP_ENV } from '../config/env'
import { ok } from '../lib/response'

const startedAt = Date.now()

export const health = new Hono()
  .get('/health', (c) => {
    return ok(c, {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      version: process.env.VITE_APP_VERSION ?? '0.0.0',
      gitSha: process.env.VITE_GIT_SHA ?? 'dev',
    })
  })
  .get('/version', (c) => {
    return ok(c, {
      version: process.env.VITE_APP_VERSION ?? '0.0.0',
      gitSha: process.env.VITE_GIT_SHA ?? 'dev',
      env: APP_ENV.nodeEnv,
    })
  })
```

- [ ] **Step 10: 写 `apps/api/src/routes/index.ts`**

```ts
import { Hono } from 'hono'
import { health } from './health'

export const routes = new Hono()
routes.route('/', health)
// 后续任务会追加 auth / users / customers / visits
```

- [ ] **Step 11: 写 `apps/api/src/server.ts`**

```ts
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
  c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: `Route not found: ${c.req.method} ${c.req.path}` } }, 404),
)

export default app
```

- [ ] **Step 12: 写 `apps/api/src/main.ts`**

```ts
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './db/client'
import { APP_ENV } from './config/env'
import app from './server'

const main = async () => {
  console.log('[migrate] running pending migrations ...')
  await migrate(db, { migrationsFolder: './db/migrations' })
  console.log('[migrate] up to date')

  console.log(`[server] listening on http://0.0.0.0:${APP_ENV.port}`)
  return app
}

main().then((a) => {
  Bun.serve({ port: APP_ENV.port, fetch: a.fetch })
})
```

- [ ] **Step 13: 启动 dev server 并冒烟**

```bash
cd apps/api
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm \
SESSION_SECRET=devsecret \
bun run dev
```

Expected: 看到 `[migrate] up to date` 和 `[server] listening on http://0.0.0.0:3000`。

另开 terminal：

```bash
curl -s http://localhost:3000/api/v1/health
# → {"ok":true,"data":{"status":"ok","uptimeSec":...,"version":"0.0.0","gitSha":"dev"},"error":null}

curl -s http://localhost:3000/api/v1/version
# → {"ok":true,"data":{"version":"0.0.0","gitSha":"dev","env":"development"},"error":null}
```

- [ ] **Step 14: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/src/ deploy/prod/docker-compose.yml
git commit -m "feat(api): Hono 骨架 + /health /version + db client + 自动迁移"
```

---

### Task 4: 密码 (argon2) + Session store + cookie helpers

**Files:**
- Create: `apps/api/src/auth/password.ts`
- Create: `apps/api/src/auth/session.ts`

**Interfaces:**
- Produces (consumed by Task 5):
  - `export async function hashPassword(plain: string): Promise<string>`
  - `export async function verifyPassword(hash: string, plain: string): Promise<boolean>`
  - `export const SESSION_COOKIE = 'lsm_session'`
  - `export const SESSION_TTL_SEC = 604800`
  - `export async function createSession(userId: string, userAgent?: string): Promise<{ id: string; expiresAt: Date }>`
  - `export async function getSession(id: string): Promise<{ userId: string; expiresAt: Date } | null>`
  - `export async function deleteSession(id: string): Promise<void>`
  - `export function setSessionCookie(c, sessionId): void`
  - `export function clearSessionCookie(c): void`
  - `export function getSessionCookie(c): string | undefined`

- [ ] **Step 1: 装 argon2**

```bash
cd apps/api
bun add @node-rs/argon2
```

- [ ] **Step 2: 写 `apps/api/src/auth/password.ts`**

```ts
import { hash, verify, Algorithm } from '@node-rs/argon2'

const OPTS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS)
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await verify(stored, plain)
  } catch {
    return false
  }
}
```

- [ ] **Step 3: 写 `apps/api/src/auth/session.ts`**

```ts
import type { Context } from 'hono'
import { randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq, lt } from 'drizzle-orm'
import { db } from '../db/client'
import { sessions } from '../db/schema'
import { IS_DEV } from '../config/env'

export const SESSION_COOKIE = 'lsm_session'
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7

function newSessionId(): string {
  return randomBytes(32).toString('base64url')
}

export async function createSession(userId: string, userAgent?: string) {
  const id = newSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000)
  await db.insert(sessions).values({ id, userId, expiresAt, userAgent })
  return { id, expiresAt }
}

export async function getSession(id: string) {
  const rows = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) {
    await deleteSession(id)
    return null
  }
  return row
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export function setSessionCookie(c: Context, sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !IS_DEV,
    path: '/api',
    maxAge: SESSION_TTL_SEC,
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/api' })
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}
```

- [ ] **Step 4: 类型检查 + 冒烟**

```bash
cd apps/api
bun run type-check
# 0 errors

bun -e '
import("./src/auth/password").then(async ({ hashPassword, verifyPassword }) => {
  const h = await hashPassword("Password123!");
  console.log("verify ok:", await verifyPassword(h, "Password123!"));
  console.log("verify wrong:", await verifyPassword(h, "wrong"));
});
'
```

Expected: `verify ok: true verify wrong: false`。

- [ ] **Step 5: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/src/auth/
git commit -m "feat(api): 密码 argon2 + session store (DB) + cookie helpers"
```

---

### Task 5: Auth 中间件 + 登录/登出/me 路由

**Files:**
- Create: `apps/api/src/auth/middleware.ts`
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/routes/index.ts`

**Interfaces:**
- Produces (consumed by Task 6+):
  - `export function requireAuth(): MiddlewareHandler`
  - `export function requireRole(role: 'admin'|'sales'): MiddlewareHandler`
  - `export const auth: Hono`

- [ ] **Step 1: 写 `apps/api/src/auth/middleware.ts`**

```ts
import type { MiddlewareHandler } from 'hono'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { eq } from 'drizzle-orm'
import { fail } from '../lib/response'
import { getSessionCookie, getSession } from './session'

declare module 'hono' {
  interface ContextVariableMap {
    user: User
  }
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const sid = getSessionCookie(c)
    if (!sid) return fail(c, 'UNAUTHORIZED', 'No session', 401)
    const session = await getSession(sid)
    if (!session) return fail(c, 'UNAUTHORIZED', 'Session expired or invalid', 401)
    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    const user = rows[0]
    if (!user) return fail(c, 'UNAUTHORIZED', 'User not found', 401)
    c.set('user', user)
    await next()
  }
}

export function requireRole(role: 'admin' | 'sales'): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return fail(c, 'UNAUTHORIZED', 'Auth required', 401)
    if (user.role !== role) return fail(c, 'FORBIDDEN', `Requires role: ${role}`, 403)
    await next()
  }
}
```

- [ ] **Step 2: 写 `apps/api/src/routes/auth.ts`**

```ts
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '../auth/password'
import {
  createSession,
  deleteSession,
  getSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../auth/session'
import { requireAuth } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const auth = new Hono()
  .post('/auth/login', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid login payload', parsed.error.flatten())
    }
    const { email, password } = parsed.data
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    const user = rows[0]
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password')
    }
    const { id: sid } = await createSession(user.id, c.req.header('user-agent') ?? undefined)
    setSessionCookie(c, sid)
    return ok(c, { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl })
  })
  .post('/auth/logout', async (c) => {
    const sid = getSessionCookie(c)
    if (sid) await deleteSession(sid)
    clearSessionCookie(c)
    return ok(c, { loggedOut: true })
  })
  .get('/auth/me', requireAuth(), (c) => {
    const u = c.get('user')
    return ok(c, { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl })
  })
```

- [ ] **Step 3: 修改 `apps/api/src/routes/index.ts`**

```ts
import { Hono } from 'hono'
import { health } from './health'
import { auth } from './auth'

export const routes = new Hono()
routes.route('/', health)
routes.route('/', auth)
// 后续追加 users / customers / visits
```

- [ ] **Step 4: 重启 dev server 并冒烟（结构测试）**

dev server 还在跑的话会自动热重载。验证：

```bash
# 1. 未登录访问 /auth/me 应 401
curl -s -i http://localhost:3000/api/v1/auth/me | head -5
# → HTTP/1.1 401
# → {"ok":false,"data":null,"error":{"code":"UNAUTHORIZED",...}}

# 2. 错误密码应 401（users 表是空的，但路由结构应被命中）
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@y.com","password":"wrong"}'
# → 401
```

Expected: 401 + 正确包络。**真正的端到端登录测试在 Task 10/11 种子完成后做。**

- [ ] **Step 5: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/src/auth/middleware.ts apps/api/src/routes/auth.ts apps/api/src/routes/index.ts
git commit -m "feat(api): requireAuth/requireRole 中间件 + /auth login/logout/me"
```

---

### Task 6: 用户路由（GET /users, /users/sales, /users/:id）

**Files:**
- Create: `apps/api/src/routes/users.ts`
- Modify: `apps/api/src/routes/index.ts`

**Interfaces:**
- Produces:
  - `export const usersRoute: Hono`

- [ ] **Step 1: 写 `apps/api/src/routes/users.ts`**

```ts
import { Hono } from 'hono'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { asc, eq } from 'drizzle-orm'
import { requireAuth } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'

function publicView(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl }
}

export const usersRoute = new Hono()
  .get('/users', requireAuth(), async (c) => {
    const me = c.get('user')
    if (me.role !== 'admin') throw new AppError('FORBIDDEN', 'Admin only')
    const rows = await db.select().from(users).orderBy(asc(users.name))
    return ok(c, rows.map(publicView))
  })
  .get('/users/sales', requireAuth(), async (c) => {
    const rows = await db.select().from(users).where(eq(users.role, 'sales')).orderBy(asc(users.name))
    return ok(c, rows.map(publicView))
  })
  .get('/users/:id', requireAuth(), async (c) => {
    const id = c.req.param('id')
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const u = rows[0]
    if (!u) throw new AppError('NOT_FOUND', 'User not found')
    return ok(c, publicView(u))
  })
```

- [ ] **Step 2: 修改 `apps/api/src/routes/index.ts`**

```ts
import { Hono } from 'hono'
import { health } from './health'
import { auth } from './auth'
import { usersRoute } from './users'

export const routes = new Hono()
routes.route('/', health)
routes.route('/', auth)
routes.route('/', usersRoute)
```

- [ ] **Step 3: 类型检查 + Commit**

```bash
cd apps/api && bun run type-check
# 0 errors

cd D:\CodeProjects\LSM-CRM
git add apps/api/src/routes/users.ts apps/api/src/routes/index.ts
git commit -m "feat(api): /users 列表 / 销售筛选 / 详情 (admin RBAC)"
```

> 端到端测试在 Task 11 种子后做（Task 17 冒烟）。

---

### Task 7: 客户 GET 路由（列表 + 详情）

**Files:**
- Create: `apps/api/src/routes/customers.ts`
- Modify: `apps/api/src/routes/index.ts`

**Interfaces:**
- Produces:
  - `export const customersRoute: Hono` (mounted at `/api/v1`)

- [ ] **Step 1: 写 `apps/api/src/routes/customers.ts`**

```ts
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { customers, visits, users, type Customer } from '../db/schema'
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { requireAuth } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'
import { CUSTOMER_STAGES } from '../lib/stage'

const listQuery = z.object({
  stage: z.enum(CUSTOMER_STAGES).optional(),
  ownerId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function toCustomerDto(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    phone: c.phone,
    email: c.email,
    address: c.address,
    industry: c.industry,
    stage: c.stage,
    amount: Number(c.amount),
    ownerId: c.ownerId,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export const customersRoute = new Hono()
  .get('/customers', requireAuth(), async (c) => {
    const me = c.get('user')
    const raw = Object.fromEntries(new URL(c.req.url).searchParams)
    const parsed = listQuery.safeParse(raw)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid query', parsed.error.flatten())
    const { stage, ownerId, q, page, limit } = parsed.data

    const where = []
    if (me.role === 'sales') where.push(eq(customers.ownerId, me.id))
    if (stage) where.push(eq(customers.stage, stage))
    if (ownerId) where.push(eq(customers.ownerId, ownerId))
    if (q) where.push(or(ilike(customers.name, `%${q}%`), ilike(customers.company, `%${q}%`)))

    const offset = (page - 1) * limit
    const rows = await db
      .select()
      .from(customers)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(customers.name))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers)
      .where(where.length ? and(...where) : undefined)

    return ok(c, { items: rows.map(toCustomerDto), page, limit, total })
  })
  .get('/customers/:id', requireAuth(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
    const cust = rows[0]
    if (!cust) throw new AppError('NOT_FOUND', 'Customer not found')
    if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', 'Not your customer')

    const recentVisits = await db
      .select({
        id: visits.id,
        salesmanId: visits.salesmanId,
        salesmanName: users.name,
        type: visits.type,
        result: visits.result,
        content: visits.content,
        durationMin: visits.durationMin,
        visitedAt: visits.visitedAt,
      })
      .from(visits)
      .leftJoin(users, eq(users.id, visits.salesmanId))
      .where(eq(visits.customerId, id))
      .orderBy(desc(visits.visitedAt))
      .limit(10)

    return ok(c, {
      ...toCustomerDto(cust),
      recentVisits: recentVisits.map((v) => ({
        ...v,
        visitedAt: v.visitedAt.toISOString(),
      })),
    })
  })
```

- [ ] **Step 2: 修改 `apps/api/src/routes/index.ts`**

```ts
import { Hono } from 'hono'
import { health } from './health'
import { auth } from './auth'
import { usersRoute } from './users'
import { customersRoute } from './customers'

export const routes = new Hono()
routes.route('/', health)
routes.route('/', auth)
routes.route('/', usersRoute)
routes.route('/', customersRoute)
```

- [ ] **Step 3: 类型检查 + Commit**

```bash
cd apps/api && bun run type-check
# 0 errors

cd D:\CodeProjects\LSM-CRM
git add apps/api/src/routes/customers.ts apps/api/src/routes/index.ts
git commit -m "feat(api): /customers 列表 (filter/paginate) + 详情 (含最近 10 拜访)"
```

---

### Task 8: 客户 POST + PATCH + 转移（事务）

**Files:**
- Modify: `apps/api/src/routes/customers.ts`

- [ ] **Step 1: 追加 POST/PATCH/transfer 路由到 `apps/api/src/routes/customers.ts`**

在文件末尾 `.get('/customers/:id', ...)` 链之后追加：

```ts
  .post('/customers', requireAuth(), async (c) => {
    const me = c.get('user')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      name: z.string().min(1).max(100),
      company: z.string().min(1).max(200),
      phone: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
      address: z.string().max(500).optional(),
      industry: z.string().max(100).optional(),
      stage: z.enum(CUSTOMER_STAGES).default('new'),
      amount: z.number().nonnegative().default(0),
      ownerId: z.string().uuid().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    const data = parsed.data

    let ownerId = data.ownerId ?? me.id
    if (me.role === 'sales' && ownerId !== me.id) {
      throw new AppError('FORBIDDEN', 'Sales can only create customers for self')
    }

    const [row] = await db
      .insert(customers)
      .values({
        name: data.name,
        company: data.company,
        phone: data.phone,
        email: data.email,
        address: data.address,
        industry: data.industry,
        stage: data.stage,
        amount: String(data.amount),
        ownerId,
      })
      .returning()
    return ok(c, toCustomerDto(row), 201)
  })
  .patch('/customers/:id', requireAuth(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const existing = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
    const cust = existing[0]
    if (!cust) throw new AppError('NOT_FOUND', 'Customer not found')
    if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', 'Not your customer')

    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      company: z.string().min(1).max(200).optional(),
      phone: z.string().min(1).max(50).nullable().optional(),
      email: z.string().email().nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      industry: z.string().max(100).nullable().optional(),
      stage: z.enum(CUSTOMER_STAGES).optional(),
      amount: z.number().nonnegative().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    const data = parsed.data
    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields to update')

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name
    if (data.company !== undefined) patch.company = data.company
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.email !== undefined) patch.email = data.email
    if (data.address !== undefined) patch.address = data.address
    if (data.industry !== undefined) patch.industry = data.industry
    if (data.stage !== undefined) patch.stage = data.stage
    if (data.amount !== undefined) patch.amount = String(data.amount)

    const [row] = await db.update(customers).set(patch).where(eq(customers.id, id)).returning()
    return ok(c, toCustomerDto(row))
  })
  .post('/customers/:id/transfer', requireAuth(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      toUserId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    const { toUserId, reason } = parsed.data

    const target = await db.select().from(users).where(eq(users.id, toUserId)).limit(1)
    if (!target[0] || target[0].role !== 'sales') {
      throw new AppError('VALIDATION_ERROR', 'Target user must be a sales user')
    }

    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(customers).where(eq(customers.id, id)).limit(1)
      const cust = existing[0]
      if (!cust) throw new AppError('NOT_FOUND', 'Customer not found')
      if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', 'Not your customer')
      if (cust.ownerId === toUserId) throw new AppError('VALIDATION_ERROR', 'Already owned by target user')

      await tx.insert(customerTransfers).values({
        customerId: id,
        fromUserId: cust.ownerId,
        toUserId,
        reason,
      })
      const [row] = await tx
        .update(customers)
        .set({ ownerId: toUserId, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning()
      return ok(c, toCustomerDto(row))
    })
  })
```

- [ ] **Step 2: 在文件顶部 import 增加 customerTransfers**

修改 `apps/api/src/routes/customers.ts` 顶部 import：

```ts
import { customers, customerTransfers, visits, users, type Customer } from '../db/schema'
```

- [ ] **Step 3: 类型检查 + Commit**

```bash
cd apps/api && bun run type-check
# 0 errors

cd D:\CodeProjects\LSM-CRM
git add apps/api/src/routes/customers.ts
git commit -m "feat(api): 客户 POST/PATCH/transfer (RBAC + 事务)"
```

---

### Task 9: 拜访路由（GET + POST 事务 + DELETE 软删）

**Files:**
- Create: `apps/api/src/routes/visits.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: 写 `apps/api/src/routes/visits.ts`**

```ts
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { visits, customers, users, type Visit } from '../db/schema'
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { requireAuth } from '../auth/middleware'
import { ok } from '../lib/response'
import { AppError } from '../lib/errors'
import { CUSTOMER_STAGES, VISIT_TYPES, VISIT_RESULTS } from '../lib/stage'

const listQuery = z.object({
  customerId: z.string().uuid().optional(),
  salesmanId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function toVisitDto(v: Visit) {
  return {
    id: v.id,
    customerId: v.customerId,
    salesmanId: v.salesmanId,
    type: v.type,
    result: v.result,
    content: v.content,
    durationMin: v.durationMin,
    nextStep: v.nextStep,
    stageBefore: v.stageBefore,
    stageAfter: v.stageAfter,
    visitedAt: v.visitedAt.toISOString(),
    createdAt: v.createdAt.toISOString(),
  }
}

export const visitsRoute = new Hono()
  .get('/visits', requireAuth(), async (c) => {
    const me = c.get('user')
    const raw = Object.fromEntries(new URL(c.req.url).searchParams)
    const parsed = listQuery.safeParse(raw)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid query', parsed.error.flatten())
    const { customerId, salesmanId, from, to, page, limit } = parsed.data

    const where = [isNull(visits.deletedAt)]
    if (me.role === 'sales') where.push(eq(visits.salesmanId, me.id))
    if (customerId) where.push(eq(visits.customerId, customerId))
    if (salesmanId && me.role === 'admin') where.push(eq(visits.salesmanId, salesmanId))
    if (from) where.push(gte(visits.visitedAt, from))
    if (to) where.push(lte(visits.visitedAt, to))

    const offset = (page - 1) * limit
    const rows = await db
      .select()
      .from(visits)
      .where(and(...where))
      .orderBy(desc(visits.visitedAt))
      .limit(limit)
      .offset(offset)
    return ok(c, { items: rows.map(toVisitDto), page, limit })
  })
  .post('/visits', requireAuth(), async (c) => {
    const me = c.get('user')
    const body = await c.req.json().catch(() => null)
    const schema = z.object({
      customerId: z.string().uuid(),
      type: z.enum(VISIT_TYPES).default('normal'),
      result: z.enum(VISIT_RESULTS),
      content: z.string().min(1).max(2000),
      durationMin: z.number().int().positive().max(1440).optional(),
      nextStep: z.string().max(500).optional(),
      stageBefore: z.enum(CUSTOMER_STAGES).optional(),
      stageAfter: z.enum(CUSTOMER_STAGES).optional(),
      visitedAt: z.coerce.date().default(() => new Date()),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten())
    const data = parsed.data

    return await db.transaction(async (tx) => {
      const cust = (await tx.select().from(customers).where(eq(customers.id, data.customerId)).limit(1))[0]
      if (!cust) throw new AppError('NOT_FOUND', 'Customer not found')
      if (me.role === 'sales' && cust.ownerId !== me.id) throw new AppError('FORBIDDEN', 'Not your customer')

      const [row] = await tx
        .insert(visits)
        .values({
          customerId: data.customerId,
          salesmanId: me.id,
          type: data.type,
          result: data.result,
          content: data.content,
          durationMin: data.durationMin,
          nextStep: data.nextStep,
          stageBefore: data.stageBefore,
          stageAfter: data.stageAfter,
          visitedAt: data.visitedAt,
        })
        .returning()

      // 联动更新 customer.last_visit_at；若 stageAfter 给定则更新 stage
      const updates: Record<string, unknown> = {
        lastVisitAt: data.visitedAt,
        updatedAt: new Date(),
      }
      if (data.stageAfter && data.stageAfter !== cust.stage) {
        updates.stage = data.stageAfter
      }
      await tx.update(customers).set(updates).where(eq(customers.id, data.customerId))

      return ok(c, toVisitDto(row), 201)
    })
  })
  .delete('/visits/:id', requireAuth(), async (c) => {
    const me = c.get('user')
    const id = c.req.param('id')
    const existing = (await db.select().from(visits).where(eq(visits.id, id)).limit(1))[0]
    if (!existing) throw new AppError('NOT_FOUND', 'Visit not found')
    if (existing.deletedAt) throw new AppError('NOT_FOUND', 'Visit already deleted')
    if (me.role !== 'admin' && existing.salesmanId !== me.id) {
      throw new AppError('FORBIDDEN', 'Not your visit')
    }
    await db.update(visits).set({ deletedAt: new Date() }).where(eq(visits.id, id))
    return ok(c, { deleted: true, id })
  })
```

- [ ] **Step 2: 修改 `apps/api/src/routes/index.ts`**

```ts
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
```

- [ ] **Step 3: 类型检查 + Commit**

```bash
cd apps/api && bun run type-check
# 0 errors

cd D:\CodeProjects\LSM-CRM
git add apps/api/src/routes/visits.ts apps/api/src/routes/index.ts
git commit -m "feat(api): /visits GET/POST/DELETE (事务联动 customer.last_visit_at)"
```

---

### Task 10: 种子 CLI - 用户（7 个演示账号）

**Files:**
- Create: `apps/api/src/seed/users.ts`
- Create: `apps/api/src/seed/index.ts`

- [ ] **Step 1: 写 `apps/api/src/seed/users.ts`**

```ts
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
    const existing = await db.select({ id: users.id }).from(users).where(eq_(u.email)).limit(1)
    if (existing[0]) {
      await db
        .update(users)
        .set({ name: u.name, role: u.role, passwordHash, avatarUrl: u.avatarUrl, teamId: u.teamId, updatedAt: new Date() })
        .where(eq_(u.email, 'users.email'))
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

// 局部辅助：基于 email 列生成 eq 条件
import { eq } from 'drizzle-orm'
function eq_(email: string, col: 'users.email' = 'users.email') {
  return eq(users.email, email)
}
```

- [ ] **Step 2: 写 `apps/api/src/seed/index.ts`（仅 users 阶段）**

```ts
import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { seedUsers, SEED_PASSWORD } from './users'

const FULL_MODE = process.argv.includes('--full')

const main = async () => {
  console.log('[seed] running users ...')
  const u = await seedUsers()
  console.log(`[seed] users: created=${u.created} updated=${u.updated}`)

  if (FULL_MODE) {
    // Task 11 会追加 customers + visits
    const { seedCustomers } = await import('./customers')
    const { seedVisits } = await import('./visits')
    console.log('[seed] running customers ...')
    const c = await seedCustomers()
    console.log(`[seed] customers: created=${c}`)
    console.log('[seed] running visits ...')
    const v = await seedVisits()
    console.log(`[seed] visits: created=${v}`)
  }

  console.log(`[seed] done. demo password: ${SEED_PASSWORD}`)
  await db.$client.end()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[seed] failed:', err)
  await db.$client.end().catch(() => {})
  process.exit(1)
})
```

- [ ] **Step 3: 临时用 stub 让编译通过**

创建 `apps/api/src/seed/customers.ts` 和 `apps/api/src/seed/visits.ts` 的 stub（Task 11 实现）：

`apps/api/src/seed/customers.ts`:
```ts
export async function seedCustomers(): Promise<number> {
  return 0
}
```

`apps/api/src/seed/visits.ts`:
```ts
export async function seedVisits(): Promise<number> {
  return 0
}
```

- [ ] **Step 4: 运行种子（默认模式：只 users）**

```bash
cd apps/api
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm bun run db:seed
# → "[seed] users: created=7 updated=0"
# → "[seed] done."
```

Expected: 7 行被插入到 users 表。

```bash
docker compose -f ../../deploy/prod/docker-compose.yml exec -T db \
  psql -U lsm_crm -d lsm_crm -c "SELECT email, role FROM users ORDER BY role DESC, name;"
# → 7 行
```

- [ ] **Step 5: 端到端登录测试（用真实种子账号）**

dev server 应在跑。手动测：

```bash
# 1. 登录成功 → Set-Cookie
curl -s -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.zhou@lsm-crm.local","password":"Password123!"}' | head -10
# → HTTP/1.1 200
# → Set-Cookie: lsm_session=...; Path=/api; HttpOnly; SameSite=Lax

# 2. 用 cookie 访问 /auth/me
curl -s --cookie "$(curl -s -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"admin.zhou@lsm-crm.local\",\"password\":\"Password123!\"}' \
  | grep -i '^set-cookie' | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*$//')" \
  http://localhost:3000/api/v1/auth/me
# → {"ok":true,"data":{"id":"...","name":"周总","email":"admin.zhou@lsm-crm.local","role":"admin",...}}
```

更简单的做法——用 cookie jar：

```bash
cd /tmp
curl -s -c lsm.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.zhou@lsm-crm.local","password":"Password123!"}' > /dev/null

curl -s -b lsm.txt http://localhost:3000/api/v1/auth/me
# → 200 with admin.zhou data

curl -s -b lsm.txt http://localhost:3000/api/v1/users
# → 200 with all 7 users
```

- [ ] **Step 6: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/src/seed/
git commit -m "feat(api): 种子 CLI - 7 演示用户 (Password123!)"
```

---

### Task 11: 种子 CLI - 80 客户 + 300 拜访（faker 123/456）

**Files:**
- Modify: `apps/api/src/seed/customers.ts`
- Modify: `apps/api/src/seed/visits.ts`
- Modify: `apps/api/package.json`（追加 `@faker-js/faker` 依赖）

- [ ] **Step 1: 装 faker**

```bash
cd apps/api
bun add @faker-js/faker
```

- [ ] **Step 2: 写 `apps/api/src/seed/customers.ts`**

```ts
import { faker } from '@faker-js/faker/locale/zh_CN'
import { db } from '../db/client'
import { customers, users } from '../db/schema'
import { sql } from 'drizzle-orm'

const TARGET = 80
const STAGE_DIST: Array<{ stage: string; n: number }> = [
  { stage: 'new', n: 30 },
  { stage: 'contacted', n: 20 },
  { stage: 'intent', n: 12 },
  { stage: 'negotiating', n: 8 },
  { stage: 'won', n: 6 },
  { stage: 'lost', n: 4 },
]

export async function seedCustomers(): Promise<number> {
  faker.seed(123)

  const salesUsers = await db.select({ id: users.id }).from(users).where(sql`role = 'sales'`)
  if (salesUsers.length === 0) throw new Error('Run seed users first')

  // 清空（v0.3.0 演示数据，每次 seed 重置）
  await db.delete(customers)

  const total = STAGE_DIST.reduce((a, b) => a + b.n, 0)
  if (total !== TARGET) throw new Error(`STAGE_DIST sum ${total} != ${TARGET}`)

  const rows: Array<typeof customers.$inferInsert> = []
  for (const { stage, n } of STAGE_DIST) {
    for (let i = 0; i < n; i++) {
      const owner = salesUsers[faker.number.int({ min: 0, max: salesUsers.length - 1 })]!
      const company = faker.company.name()
      rows.push({
        name: faker.person.lastName() + faker.person.firstName().charAt(0),
        company,
        phone: faker.phone.number({ style: 'national' }),
        email: faker.internet.email().toLowerCase(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        industry: faker.commerce.department(),
        stage,
        amount: faker.number.int({ min: 10000, max: 800000 }).toString(),
        ownerId: owner.id,
        lastVisitAt: stage === 'won' || stage === 'lost' ? faker.date.recent({ days: 60 }) : null,
      })
    }
  }

  // 批量 insert（每批 50）
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(customers).values(rows.slice(i, i + BATCH))
  }
  return rows.length
}
```

- [ ] **Step 3: 写 `apps/api/src/seed/visits.ts`**

```ts
import { faker } from '@faker-js/faker/locale/zh_CN'
import { db } from '../db/client'
import { visits, customers, users } from '../db/schema'
import { sql } from 'drizzle-orm'

const PER_CUSTOMER = { min: 2, max: 6 }

const TYPES = ['normal', 'collection', 'warranty', 'introduction'] as const
const RESULTS = ['progress', 'obstacle', 'done'] as const
const STAGES = ['new', 'contacted', 'intent', 'negotiating', 'won', 'lost'] as const

const TEMPLATES = {
  content: [
    '客户对产品功能认可，约下周再访。',
    '已发送报价单，等待对方内部审批。',
    '客户提出价格异议，需要主管协助。',
    '今天带样品给客户看，反馈良好。',
    '客户表示预算紧张，提议分期付款。',
    '确认签约时间，下周三签合同。',
    '客户暂时不需要，半年后再联系。',
  ],
  nextStep: [
    '下周再次拜访',
    '发送详细方案',
    '电话跟进',
    '等对方反馈',
    '安排技术对接',
  ],
}

export async function seedVisits(): Promise<number> {
  faker.seed(456)

  const allCustomers = await db.select({ id: customers.id, ownerId: customers.ownerId }).from(customers)
  if (allCustomers.length === 0) throw new Error('Run seed customers first')

  await db.delete(visits)

  const allRows: Array<typeof visits.$inferInsert> = []
  for (const cust of allCustomers) {
    const n = faker.number.int(PER_CUSTOMER)
    for (let i = 0; i < n; i++) {
      const visitedAt = faker.date.recent({ days: 60 })
      const stageBefore = faker.helpers.arrayElement(STAGES)
      const stageAfter = faker.helpers.arrayElement(STAGES)
      allRows.push({
        customerId: cust.id,
        salesmanId: cust.ownerId,
        type: faker.helpers.arrayElement(TYPES),
        result: faker.helpers.arrayElement(RESULTS),
        content: faker.helpers.arrayElement(TEMPLATES.content),
        durationMin: faker.number.int({ min: 15, max: 120 }),
        nextStep: faker.helpers.arrayElement(TEMPLATES.nextStep),
        stageBefore,
        stageAfter,
        visitedAt,
      })
    }
  }

  // 批量 insert（每批 100）
  const BATCH = 100
  for (let i = 0; i < allRows.length; i += BATCH) {
    await db.insert(visits).values(allRows.slice(i, i + BATCH))
  }
  return allRows.length
}
```

- [ ] **Step 4: 跑完整种子**

```bash
cd apps/api
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm bun run db:seed -- --full
# → "[seed] users: created=7 updated=0"
# → "[seed] customers: created=80"
# → "[seed] visits: created=300"（左右）
```

```bash
docker compose -f ../../deploy/prod/docker-compose.yml exec -T db \
  psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM users; SELECT count(*) FROM customers; SELECT count(*) FROM visits;"
# → 7, 80, ~300
```

- [ ] **Step 5: 完整端到端冒烟**

```bash
# 用 cookie jar
cd /tmp
rm -f lsm.txt
curl -s -c lsm.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.zhou@lsm-crm.local","password":"Password123!"}' > /dev/null

# 1. /auth/me
curl -s -b lsm.txt http://localhost:3000/api/v1/auth/me
# → 200 admin.zhou

# 2. /users (admin)
curl -s -b lsm.txt http://localhost:3000/api/v1/users | head -c 200
# → 200 7 users

# 3. /customers
curl -s -b lsm.txt "http://localhost:3000/api/v1/customers?limit=3" | head -c 300
# → 200 { items: [...], total: 80, page: 1, limit: 3 }

# 4. /visits
curl -s -b lsm.txt "http://localhost:3000/api/v1/visits?limit=3" | head -c 300
# → 200 { items: [...], total: 300, page: 1, limit: 3 }

# 5. /users/sales
curl -s -b lsm.txt http://localhost:3000/api/v1/users/sales | head -c 200
# → 200 5 sales

# 6. RBAC: 用 sales 登录后访问 /users 应 403
rm -f lsm-sales.txt
curl -s -c lsm-sales.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sales.zhang@lsm-crm.local","password":"Password123!"}' > /dev/null
curl -s -b lsm-sales.txt -i http://localhost:3000/api/v1/users | head -5
# → HTTP/1.1 403 Forbidden

# 7. 登出
curl -s -b lsm.txt -X POST http://localhost:3000/api/v1/auth/logout
# → { ok: true, data: { loggedOut: true } }
curl -s -b lsm.txt -i http://localhost:3000/api/v1/auth/me | head -3
# → HTTP/1.1 401
```

- [ ] **Step 6: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add apps/api/src/seed/ apps/api/package.json apps/api/bun.lockb
git commit -m "feat(api): 种子 CLI - 80 客户 + 300 拜访 (faker 123/456)"
```

---

### Task 12: api.Dockerfile + web.Dockerfile

**Files:**
- Create: `deploy/prod/api.Dockerfile`
- Create: `deploy/prod/web.Dockerfile`
- Delete: `Dockerfile`（根目录，v0.2.0 时已删；本任务确认删除）

- [ ] **Step 1: 写 `deploy/prod/api.Dockerfile`**

```dockerfile
# ---- build stage ----
FROM oven/bun:1.1-alpine AS build
WORKDIR /app
COPY apps/api/package.json apps/api/bun.lockb* ./
RUN bun install --frozen-lockfile
COPY apps/api/ ./
RUN bun build src/main.ts --target=bun --outdir=dist --minify
# 复制迁移文件到 dist/（drizzle.config out 是 src/db/migrations）
RUN mkdir -p dist/db && cp -r src/db/migrations dist/db/migrations

# ---- runtime stage ----
FROM oven/bun:1.1-alpine
WORKDIR /app
ENV NODE_ENV=production
# 编译产物
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
# 装 prod deps（不装 drizzle-kit）
RUN bun install --production
USER bun
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["bun", "run", "dist/main.js"]
```

- [ ] **Step 2: 写 `deploy/prod/web.Dockerfile`**

> 现有 Dockerfile 在根目录已删除（v0.2.0 落地时删的）；这里重建（与原内容等价）：

```dockerfile
# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ARG VITE_APP_VERSION=0.0.0
ARG VITE_GIT_SHA=dev
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_GIT_SHA=$VITE_GIT_SHA
RUN pnpm build

# ---- runtime stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/prod/nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/health || exit 1
EXPOSE 80
```

- [ ] **Step 3: 验证 web.Dockerfile 等价**

读取并对比原根目录 Dockerfile（如还存在）：

```bash
cd D:\CodeProjects\LSM-CRM
# 根目录 Dockerfile 已被删除（git status 显示 D Dockerfile）；如本地有未提交版本，diff 确认
ls -la Dockerfile 2>/dev/null && cat Dockerfile || echo "（根 Dockerfile 已删除，符合预期）"
```

- [ ] **Step 4: 验证 api.Dockerfile 语法（用 docker build --check）**

```bash
docker build --check -f deploy/prod/api.Dockerfile . 2>&1 | head -20
# 或直接尝试构建（会失败，因为 docker-compose.yml 还不完整，但能验证语法）：
docker build -f deploy/prod/api.Dockerfile -t lsm-crm-api:test . 2>&1 | tail -20
# → expected: 成功 build 出 lsm-crm-api:test 镜像（或语法错误信息）
```

Expected: 镜像构建成功（或在 COPY 阶段失败但前面 OK）。如失败，按错误修正 Dockerfile。

- [ ] **Step 5: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add deploy/prod/api.Dockerfile deploy/prod/web.Dockerfile
git commit -m "feat(deploy): api.Dockerfile (多阶段 bun) + web.Dockerfile (从根目录迁入)"
```

---

### Task 13: docker-compose 3 服务 + nginx.conf + .env.example

**Files:**
- Modify: `deploy/prod/docker-compose.yml`（从 db-only 升级到 3 服务）
- Modify: `deploy/prod/nginx.conf`（增加 `/api/*` 反代）
- Modify: `deploy/prod/.env.example`（增加 DB / SESSION 变量）

- [ ] **Step 1: 重写 `deploy/prod/docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    env_file: .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-lsm_crm}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}
      POSTGRES_DB: ${POSTGRES_DB:-lsm_crm}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-lsm_crm}"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks: [internal]

  api:
    build:
      context: ../../
      dockerfile: deploy/prod/api.Dockerfile
      args:
        VITE_APP_VERSION: ${VITE_APP_VERSION:-0.0.0}
        VITE_GIT_SHA: ${VITE_GIT_SHA:-dev}
    depends_on:
      db: { condition: service_healthy }
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      SESSION_SECRET: ${SESSION_SECRET:?required}
      NODE_ENV: production
      LOG_LEVEL: ${LOG_LEVEL:-info}
      VITE_APP_VERSION: ${VITE_APP_VERSION:-0.0.0}
      VITE_GIT_SHA: ${VITE_GIT_SHA:-dev}
    restart: unless-stopped
    networks: [internal, external]

  web:
    build:
      context: ../../
      dockerfile: deploy/prod/web.Dockerfile
      args:
        VITE_APP_VERSION: ${VITE_APP_VERSION:-0.0.0}
        VITE_GIT_SHA: ${VITE_GIT_SHA:-dev}
    depends_on:
      - api
    ports:
      - "127.0.0.1:30073:80"
    restart: unless-stopped
    networks: [external]

volumes:
  pgdata:

networks:
  internal:
  external:
```

- [ ] **Step 2: 修改 `deploy/prod/nginx.conf`**

读取当前 nginx.conf，**在 server 块内**增加 `location /api/`：

```nginx
    # ---- 在 server { ... } 块内、location / 之前增加 ----
    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass_header  Set-Cookie;
        proxy_cookie_path  /api /;
        # 透传 request id
        proxy_set_header X-Request-Id      $request_id;
    }
```

> 现有 nginx.conf 已含 `location /health { return 200 "ok\n"; ... }`（v0.2.0 已落地）保持不动。

- [ ] **Step 3: 更新 `deploy/prod/.env.example`**

在末尾追加：

```bash
# Database (新增 - v0.3.0)
POSTGRES_USER=lsm_crm
POSTGRES_PASSWORD=change-me-in-prod
POSTGRES_DB=lsm_crm

# Session (新增 - v0.3.0)
SESSION_SECRET=change-me-32-bytes-base64
```

- [ ] **Step 4: 验证 compose 配置语法**

```bash
cd D:\CodeProjects\LSM-CRM\deploy\prod
docker compose config
```

Expected: 三个服务（db/api/web）全部出现在输出中，无错误。

- [ ] **Step 5: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add deploy/prod/docker-compose.yml deploy/prod/nginx.conf deploy/prod/.env.example
git commit -m "feat(deploy): docker-compose 3 服务 (db/api/web) + nginx /api/* 反代"
```

---

### Task 14: PowerShell 部署脚本（deploy/migrate/seed/api-logs/api-shell + _config）

**Files:**
- Modify: `deploy/scripts/_config.ps1`
- Modify: `deploy/scripts/deploy-prod.ps1`
- Create: `deploy/scripts/migrate-prod.ps1`
- Create: `deploy/scripts/seed-prod.ps1`
- Create: `deploy/scripts/api-logs.ps1`
- Create: `deploy/scripts/api-shell.ps1`

- [ ] **Step 1: 修改 `deploy/scripts/_config.ps1` 追加 ApiContainer**

在 `$Script:ContainerName = 'lsm-crm-web'` 之后追加：

```powershell
# v0.3.0 多服务支持
$Script:DbContainer = 'lsm-crm-db'
$Script:ApiContainer = 'lsm-crm-api'
$Script:WebContainer = 'lsm-crm-web'
```

- [ ] **Step 2: 重写 `deploy/scripts/deploy-prod.ps1`**

完整重写（参考 v0.2.0 现有 deploy-prod.ps1 风格）：

```powershell
# =============================================================================
# 一键部署三服务: db (postgres) -> api (hono) -> web (nginx)
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Write-Step "部署三服务 (db / api / web) 到 $Script:ProdDir"
Assert-ProdInitialized
Assert-Docker

# 1. 同步配置
Write-Step "同步配置文件"
Copy-Item -Force "$Script:DeployProdDir\docker-compose.yml" "$Script:ProdDir\docker-compose.yml"
Copy-Item -Force "$Script:DeployProdDir\nginx.conf" "$Script:ProdDir\nginx.conf"
if (-not (Test-Path "$Script:ProdDir\.env")) {
    Write-Warn ".env 不存在，从模板创建"
    Copy-Item "$Script:DeployProdDir\.env.example" "$Script:ProdDir\.env"
    Write-Info "请编辑 $Script:ProdDir\.env 设置 POSTGRES_PASSWORD / SESSION_SECRET"
}

# 2. 启动 db
Write-Step "启动 db 服务"
docker compose up -d db

# 3. 等待 db 健康
$dbReady = $false; $tries = 0
while (-not $dbReady -and $tries -lt 30) {
    $dbReady = (& docker compose exec -T db pg_isready -U $env:POSTGRES_USER) -match 'accepting'
    if (-not $dbReady) { Start-Sleep 2; $tries++ }
}
if (-not $dbReady) {
    Write-Err "db 未就绪（30s 超时）"
    exit 1
}
Write-Ok "db healthy"

# 4. 启动 api（启动时自动跑 migrate）
Write-Step "构建并启动 api"
docker compose up -d --build api

# 5. 启动 web
Write-Step "构建并启动 web"
docker compose up -d --build web

# 6. 状态
& "$PSScriptRoot\prod-status.ps1"
Write-Ok "部署完成"
```

- [ ] **Step 3: 写 `deploy/scripts/migrate-prod.ps1`**

```powershell
# =============================================================================
# 在生产 api 容器内运行 drizzle 迁移
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Write-Step "运行生产环境迁移"
Assert-ProdInitialized
Assert-Docker

docker compose exec api bun run db:migrate
Write-Ok "迁移完成"
```

- [ ] **Step 4: 写 `deploy/scripts/seed-prod.ps1`**

```powershell
# =============================================================================
# 在生产 api 容器内运行种子 CLI
# 参数: --full (含 80 客户 + 300 拜访)
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Write-Step "运行生产环境种子"
Assert-ProdInitialized
Assert-Docker

$args = @()
if ($Full) { $args += '--full' }
docker compose exec api bun run db:seed @args
Write-Ok "种子完成"
```

- [ ] **Step 5: 写 `deploy/scripts/api-logs.ps1`**

```powershell
# =============================================================================
# 跟踪 api 容器日志
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Assert-ProdInitialized
Assert-Docker

docker compose logs -f api
```

- [ ] **Step 6: 写 `deploy/scripts/api-shell.ps1`**

```powershell
# =============================================================================
# 进入 api 容器 shell
# =============================================================================
. "$PSScriptRoot\_config.ps1"

Assert-ProdInitialized
Assert-Docker

docker compose exec api sh
```

- [ ] **Step 7: 验证脚本语法（用 Get-Command 解析）**

```powershell
foreach ($f in @('_config.ps1', 'deploy-prod.ps1', 'migrate-prod.ps1', 'seed-prod.ps1', 'api-logs.ps1', 'api-shell.ps1')) {
    $tokens = $null; $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile("$PSScriptRoot\$f", [ref]$tokens, [ref]$errors) | Out-Null
    if ($errors.Count -gt 0) { Write-Host "✗ $f 语法错误:" -ForegroundColor Red; $errors | Format-List; exit 1 }
    Write-Host "✓ $f 语法 OK" -ForegroundColor Green
}
```

- [ ] **Step 8: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add deploy/scripts/
git commit -m "feat(deploy): PowerShell 脚本 - deploy/migrate/seed/api-logs/api-shell + _config 加 ApiContainer"
```

---

### Task 15: 根 package.json scripts + README 更新

**Files:**
- Modify: `package.json`（追加 6 个 api:* 脚本）
- Modify: `README.md`（增加"三容器部署"章节）

- [ ] **Step 1: 修改根 `package.json`**

在 `scripts` 块中追加：

```jsonc
{
  "scripts": {
    // ... 现有 dev / build / preview / type-check / prod:*
    "api:dev":      "cd apps/api && bun run dev",
    "api:build":    "cd apps/api && bun run build",
    "api:start":    "cd apps/api && bun run start",
    "api:type-check": "cd apps/api && bun run type-check",
    "db:up":        "cd apps/api && docker compose -f ../../deploy/prod/docker-compose.yml up -d db",
    "db:down":      "cd apps/api && docker compose -f ../../deploy/prod/docker-compose.yml down",
    "db:migrate":   "cd apps/api && bun run db:migrate",
    "db:seed":      "cd apps/api && bun run db:seed",
    "db:generate":  "cd apps/api && bun run db:generate"
  }
}
```

- [ ] **Step 2: 修改 `README.md` 在"双环境部署"章节之后增加"三容器架构（v0.3.0+）"**

```markdown
---

## 🏗 三容器架构 (v0.3.0+)

后端 API 已独立为 Hono + Drizzle + Postgres 服务，与前端 nginx 容器并列。

| 服务 | 镜像 | 端口（容器内） | 作用 |
|---|---|---|---|
| db | postgres:17-alpine | 5432 | 数据库 |
| api | oven/bun:1.1-alpine | 3000 | Hono REST API |
| web | nginx:1.27-alpine | 80 | Vue 静态 + `/api/*` 反代 |

### 后端开发

```bash
pnpm db:up              # 仅起 db
pnpm db:migrate         # 跑迁移
pnpm db:seed -- --full  # 7 用户 + 80 客户 + 300 拜访
pnpm api:dev            # 起 API
# → http://localhost:3000/api/v1/health
```

### 后端 API 文档

详见 [`docs/api-contract.md`](./docs/api-contract.md)。

### 三容器端到端部署

```bash
pnpm prod:init          # 初始化生产工作空间
pnpm prod:deploy        # 三容器全起
pnpm prod:status        # 查看状态
pnpm prod:logs api      # 看 api 日志
pnpm migrate:prod       # 在 api 容器内跑迁移
pnpm seed:prod -- --full # 种子
```

详细见 [`deploy/README.md`](./deploy/README.md)。
```

- [ ] **Step 3: 验证脚本可用**

```bash
cd D:\CodeProjects\LSM-CRM
pnpm api:type-check
# → 0 errors
```

- [ ] **Step 4: Commit**

```bash
git add package.json README.md
git commit -m "docs: README + 根 package.json 追加 api:* 脚本 (v0.3.0 三容器)"
```

---

### Task 16: API 端点契约（docs/api-contract.md）

**Files:**
- Create: `docs/api-contract.md`

- [ ] **Step 1: 写 `docs/api-contract.md`**

```markdown
# LSM-CRM REST API 契约 (v0.3.0)

基础 URL：`http://localhost:3000`（dev）/ `http://localhost:30073`（生产，通过 web 容器反代）
所有端点前缀：`/api/v1`

## 响应包络

```typescript
{ ok: true,  data: T,         error: null }
{ ok: false, data: null,      error: { code: string, message: string, details?: any } }
```

## 错误码

| HTTP | code | 含义 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod 校验失败，details 含字段错误 |
| 401 | `UNAUTHORIZED` | 未登录或 session 失效 |
| 403 | `FORBIDDEN` | 角色不足（sales 不能改别人的客户） |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 唯一约束冲突 |
| 500 | `INTERNAL` | 兜底 |

## 鉴权

- Cookie `lsm_session` (HttpOnly, SameSite=Lax, Path=/api)
- 登录后所有需要鉴权的端点自动带 cookie
- 7 天后过期（DB `expires_at` + cookie `Max-Age`）

---

## 端点

### 健康

#### `GET /api/v1/health`

公开。返回服务运行状态。

**响应 200：**
```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "uptimeSec": 42,
    "version": "0.3.0",
    "gitSha": "abc1234"
  }
}
```

#### `GET /api/v1/version`

公开。精简版本信息。

### 鉴权

#### `POST /api/v1/auth/login`

公开。邮箱 + 密码登录。

**请求体：**
```json
{ "email": "admin.zhou@lsm-crm.local", "password": "Password123!" }
```

**响应 200：** Set-Cookie + 用户对象（不含 passwordHash）
**响应 401：** `{ ok: false, error: { code: "UNAUTHORIZED", ... } }`

#### `POST /api/v1/auth/logout`

登录。清 cookie + 删 session。

#### `GET /api/v1/auth/me`

登录。返回当前用户。

### 用户

#### `GET /api/v1/users`

**角色：admin**。列出全部用户。

#### `GET /api/v1/users/sales`

**角色：登录**。列出所有 role=sales 的用户。

#### `GET /api/v1/users/:id`

**角色：登录**。单用户详情。

### 客户

#### `GET /api/v1/customers`

**角色：登录**。查询参数：
- `stage` ∈ CUSTOMER_STAGES（可选）
- `ownerId` uuid（可选）
- `q` 字符串（可选，模糊匹配 name/company）
- `page` int, default 1
- `limit` int, default 50, max 200

**RBAC：** sales 只能看 ownerId=self 的客户

**响应 200：**
```json
{
  "ok": true,
  "data": {
    "items": [Customer, ...],
    "page": 1,
    "limit": 50,
    "total": 80
  }
}
```

#### `GET /api/v1/customers/:id`

**角色：登录**。详情 + 最近 10 条拜访。

#### `POST /api/v1/customers`

**角色：admin / sales**。

**请求体：**
```typescript
{
  name: string
  company: string
  phone?: string
  email?: string
  address?: string
  industry?: string
  stage?: CustomerStage  // default 'new'
  amount?: number         // default 0
  ownerId?: string        // sales 只能 ownerId=self
}
```

#### `PATCH /api/v1/customers/:id`

**角色：admin / owner**。部分字段更新。

#### `POST /api/v1/customers/:id/transfer`

**角色：admin / owner**。

**请求体：**
```typescript
{ toUserId: string, reason?: string }
```

**事务：** 写 `customer_transfers` + 改 `customers.ownerId`

### 拜访

#### `GET /api/v1/visits`

**角色：登录**。查询参数：
- `customerId` / `salesmanId` uuid
- `from` / `to` ISO date

**RBAC：** sales 只能看 salesmanId=self

#### `POST /api/v1/visits`

**角色：登录（实际为 sales）**。

**请求体：**
```typescript
{
  customerId: string
  type?: VisitType  // default 'normal'
  result: VisitResult
  content: string
  durationMin?: number
  nextStep?: string
  stageBefore?: CustomerStage
  stageAfter?: CustomerStage  // 若给定且与当前不同，事务内更新 customer.stage
  visitedAt?: Date  // default now
}
```

**事务：** 写 visit + 更新 customer.last_visit_at (必) + customer.stage (若 stageAfter 给定)

#### `DELETE /api/v1/visits/:id`

**角色：本人 / admin**。软删（设 deleted_at）。

---

## 阶段常量

| CustomerStage | 中文 |
|---|---|
| new | 新客户 |
| contacted | 已联系 |
| intent | 有意向 |
| negotiating | 商务谈判 |
| won | 已成交 |
| lost | 已流失 |

| VisitType | 中文 |
|---|---|
| normal | 普通拜访 |
| collection | 催款 |
| warranty | 质保回访 |
| introduction | 商机介绍 |

| VisitResult | 中文 |
|---|---|
| progress | 有进展 |
| obstacle | 遇阻 |
| done | 完成 |
```

- [ ] **Step 2: Commit**

```bash
cd D:\CodeProjects\LSM-CRM
git add docs/api-contract.md
git commit -m "docs: API 端点契约 (v0.3.0)"
```

---

### Task 17: 端到端冒烟 + Git tag v0.3.0

**Files:**
- Create: `docs/verification-reports/v0.3.0-smoke.md`

- [ ] **Step 1: 跑完整三容器部署**

```bash
cd D:\CodeProjects\LSM-CRM

# 1. 初始化生产工作空间（如未做）
pnpm prod:init

# 2. 部署三服务
pnpm prod:deploy
# → db healthy, api 启动, web 启动

# 3. 跑迁移 + 种子
pnpm prod:shell api
> bun run db:seed -- --full
> exit
```

- [ ] **Step 2: 端到端冒烟（通过 web 容器反代）**

```bash
# 健康
curl -s http://localhost:30073/api/v1/health
# → {"ok":true,"data":{"status":"ok",...}}

# 登录
cd /tmp
rm -f lsm.txt
curl -s -c lsm.txt -X POST http://localhost:30073/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.zhou@lsm-crm.local","password":"Password123!"}'
# → 200 + Set-Cookie (注意 Path=/api)

# /auth/me
curl -s -b lsm.txt http://localhost:30073/api/v1/auth/me
# → 200 admin.zhou

# 列表
curl -s -b lsm.txt "http://localhost:30073/api/v1/customers?limit=2" | head -c 300
# → 200 + items: [...]

curl -s -b lsm.txt "http://localhost:30073/api/v1/visits?limit=2" | head -c 300
# → 200 + items: [...]
```

- [ ] **Step 3: 数据校验（通过 db 容器）**

```bash
pnpm prod:shell db
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM users;"
# → 7
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM customers;"
# → 80
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM visits;"
# → ~300
> exit
```

- [ ] **Step 4: 写冒烟报告 `docs/verification-reports/v0.3.0-smoke.md`**

```markdown
# v0.3.0 端到端冒烟报告

**日期：** 2026-06-25
**执行人：** 魏来
**环境：** 本机 docker compose 三容器

## 结果摘要

| 验证项 | 结果 |
|---|---|
| 三容器启动 | ✅ |
| 自动迁移（启动时） | ✅ |
| 种子（7 用户 + 80 客户 + 300 拜访） | ✅ |
| /api/v1/health (web 容器反代) | ✅ 200 |
| POST /api/v1/auth/login + Set-Cookie | ✅ |
| GET /api/v1/auth/me (带 cookie) | ✅ |
| GET /api/v1/customers (admin 视角) | ✅ 80 条 |
| GET /api/v1/visits (admin 视角) | ✅ ~300 条 |
| RBAC: sales 访问 /users → 403 | ✅ |
| 登出后访问 /auth/me → 401 | ✅ |

## 数据

```
users: 7
customers: 80
visits: 301
```

## 已知限制

- 单事务场景：未做并发压测
- Session 存 DB：100 用户内性能 OK
- 暂未做 password reset / 用户管理 UI（v0.5.0+）
```

- [ ] **Step 5: Git tag v0.3.0**

```bash
cd D:\CodeProjects\LSM-CRM
git add docs/verification-reports/
git commit -m "docs: v0.3.0 三容器端到端冒烟报告"

# 创建 tag
git tag -a v0.3.0 -m "v0.3.0 - 三容器 (web/api/db) 准生产化首发"

# 验证 tag
git tag -l 'v0.3.0'
git show v0.3.0 --no-patch

# 推送 tag（如需）
# git push origin release/v0.3.0 --follow-tags
```

- [ ] **Step 6: 收尾 commit（如 tag 推送需要）**

```bash
# 如需推送到远程：
# git push origin release/v0.3.0 --follow-tags
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 章节 | 对应任务 |
|---|---|
| §1.3 范围：apps/api 目录 | Task 1-3 |
| §1.3 数据模型 → Drizzle schema | Task 2 |
| §1.3 7 演示账号 + 80 客户 + 300 拜访种子 | Task 10-11 |
| §1.3 Session Cookie + Argon2id | Task 4-5 |
| §1.3 三容器 Docker Compose | Task 12-13 |
| §1.3 deploy 脚本支持多服务 | Task 14 |
| §1.3 docs/api-contract.md | Task 16 |
| §2 仓库结构 | Task 1 (apps/api/*), Task 13-14 (deploy/*) |
| §4 数据模型 (5 表) | Task 2 |
| §5 API 端点 (15 个) | Task 5 (3) + 6 (3) + 7 (2) + 8 (3) + 9 (3) + 3 (health: 2) |
| §6 中间件链 | Task 3 (4 个中间件) |
| §7.1 docker-compose 3 服务 | Task 13 |
| §7.2 nginx.conf /api/* | Task 13 |
| §7.3 api.Dockerfile | Task 12 |
| §7.4 迁移执行机制 | Task 3 (migrate 函数) + Task 1 (scripts) |
| §8 部署脚本 | Task 14 |
| §9 种子 | Task 10-11 |
| §10 配置 & 密钥 | Task 1 (.env.example) + Task 13 (.env.example 追加) |
| §11 验证清单 | Task 17 冒烟 + Task 11 Step 5 (本地) + Task 13 Step 4 (compose config) |
| §13 交付物 1-12 | 全部覆盖（已逐项任务分配） |

### 2. 占位符扫描

- 全部代码块是完整实现，无 "TBD" / "TODO" / "implement later" / "fill in details"
- 每个 task 步骤包含完整代码 + 验证命令
- 无 "similar to Task N" 引用，每个任务自包含

### 3. 类型一致性

- 跨任务类型签名一致：
  - `APP_ENV` (env.ts) → Task 3-13 全部使用
  - `ok<T>(c, data)` / `fail(c, code, message, status, details?)` (response.ts) → Task 3-9 全部使用
  - `AppError` (errors.ts) → Task 5-9 throw 调用
  - `User / Customer / Visit` 等 schema 类型 (Task 2) → Task 5-9 引用
  - `requireAuth() / requireRole(role)` (Task 5) → Task 6-9 使用
  - `createSession / getSession / deleteSession` (Task 4) → Task 5-9 使用
  - `seedUsers / seedCustomers / seedVisits` (Task 10-11) → Task 10-11 seed/index.ts 引用
  - 端点路径 / 角色 / 错误码：完全匹配 spec §5

### 4. 任务数量与顺序

- 17 个任务：与 spec 范围一致（API-First 纵深推进）
- 顺序合理：scaffold → schema → db connect + Hono skeleton → auth → user → customer → visit → seed → Dockerfile → compose → scripts → docs → tag

### 5. 已知风险（在 spec §12 已列）

- Bun + postgres.js：未在 plan 中验证（依赖 Bun 1.1+ 文档保证）
- Session 性能：plan 未做压测（按 spec 接受）
- 种子性能：单事务 + 批量 insert（BATCH=50/100），未做实际测量


