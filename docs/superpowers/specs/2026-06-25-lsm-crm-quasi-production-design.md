# LSM-CRM 准生产化 v0.3.0 — 后端核心 设计文档

| 项目 | LSM-CRM 销售管理系统 |
|------|---------------------|
| 版本 | v0.3.0（设计上对应分支 `release/v0.3.0`） |
| 作者 | 魏来（联合 Claude 协作） |
| 日期 | 2026-06-25 |
| 状态 | **已批准，待进入实施** |

---

## 1. 背景与目标

### 1.1 背景

LSM-CRM 当前版本 v0.2.0 是一个**演示级别的销售管理前端**：5 销售 + 2 管理员、80 客户、~300 拜访的种子数据全部存在浏览器 `localStorage`，登录是 7 个一键按钮、没有任何后端、零测试。

v0.2.0 的 `release/v0.2.0` 分支已经把"准生产"的前 30% 落地：

- `src/config/env.ts` + `storage-keys.ts` 实现了 dev/prod 双环境数据隔离
- `vite.config.ts` 注入 `VITE_APP_VERSION` / `VITE_GIT_SHA`
- `deploy/prod/` 目录下完整的 Docker + nginx + 多阶段构建 + 安全加固
- 13 个 PowerShell 运维脚本（init/deploy/up/down/logs/status/...）
- 独立生产工作空间 `D:/CodeProjects/lsm-crm-prod/`

但是**后端核心是缺失的**：数据全在浏览器、无法多用户共用、无服务端鉴权、无业务持久化。这是 v0.3.0 要解决的核心问题。

### 1.2 目标

不动前端代码、引入真后端，让 LSM-CRM 进入"**三容器准生产**"形态：
- `web`（nginx + 现有 Vue 静态构建）
- `api`（Hono + TypeScript + Drizzle）
- `db`（PostgreSQL 17）

新增的后端服务**可独立运行、独立部署、独立冒烟验证**；前端继续以 localStorage 模式独立工作，两者解耦。

### 1.3 范围

**本次（v0.3.0）做：**

1. 新建 `apps/api/` 目录（Hono + Drizzle + Postgres）
2. 把 `src/types/index.ts` 的业务模型翻译为 Drizzle schema
3. 7 演示账号 + 80 客户 + 300 拜访的种子脚本（CLI）
4. Session Cookie 鉴权 + Argon2id 密码哈希
5. 三容器 Docker Compose
6. 修改 `deploy/` 脚本支持多服务编排
7. `docs/api-contract.md` 端点契约

**本次**不**做（明确范围之外）：**

- 前端 `src/api/` 抽象层重构（v0.4.0）
- 前端 stores 切换到 HTTP 调用（v0.4.0）
- RBAC 权限矩阵（v0.5.0）
- 单元测试 / 集成测试（v0.5.0）
- CI/CD、Husky、Commitlint（v0.5.0）
- i18n、Sentry 埋点、CSP 加固（v0.6.0）

---

## 2. 仓库结构

```
LSM-CRM/                          # 单 repo，不引入 monorepo workspace
├── src/                          # 现有前端代码，**本轮不动**
├── apps/
│   └── api/                      # 新增：Hono 后端
│       ├── src/
│       │   ├── server.ts         # Hono 入口（export default app）
│       │   ├── config/
│       │   │   └── env.ts        # 服务端环境变量（DATABASE_URL 等）
│       │   ├── db/
│       │   │   ├── client.ts     # Drizzle + postgres-js 连接
│       │   │   ├── schema/
│       │   │   │   ├── users.ts
│       │   │   │   ├── customers.ts
│       │   │   │   ├── visits.ts
│       │   │   │   ├── transfers.ts
│       │   │   │   ├── sessions.ts
│       │   │   │   └── index.ts  # 统一导出
│       │   │   └── migrations/   # drizzle-kit generate 输出
│       │   ├── auth/
│       │   │   ├── password.ts   # Argon2id 封装
│       │   │   ├── session.ts    # cookie + session store
│       │   │   └── middleware.ts # requireAuth / requireRole
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── customers.ts
│       │   │   ├── visits.ts
│       │   │   ├── health.ts
│       │   │   └── index.ts
│       │   ├── middleware/
│       │   │   ├── error.ts      # 统一错误处理
│       │   │   └── cors.ts       # CORS 配置
│       │   ├── lib/
│       │   │   ├── response.ts   # { ok, data, error } 包络
│       │   │   ├── stage.ts      # 客户阶段常量（与前端一致）
│       │   │   └── validate.ts   # Zod schema 校验入口
│       │   └── seed/
│       │       ├── index.ts      # bun run seed 入口
│       │       ├── users.ts      # 7 个用户
│       │       ├── customers.ts  # 80 客户
│       │       └── visits.ts     # 300 拜访
│       ├── drizzle.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── .env.example
├── deploy/
│   ├── prod/
│   │   ├── docker-compose.yml    # 改：三服务 web + api + db
│   │   ├── nginx.conf            # 改：增加 /api/* 反向代理
│   │   ├── api.Dockerfile        # 新增
│   │   ├── web.Dockerfile        # 从原根目录迁入
│   │   └── .env.example          # 改：增加 DATABASE_URL / SESSION_SECRET
│   └── scripts/
│       ├── deploy-prod.ps1       # 改：db 健康 → migrate → api → web
│       ├── migrate-prod.ps1      # 新增：drizzle-kit migrate
│       ├── seed-prod.ps1         # 新增：bun run seed
│       ├── api-logs.ps1          # 新增
│       ├── api-shell.ps1         # 新增
│       └── _config.ps1           # 改：增加 $Script:ApiContainer 变量
├── docs/
│   ├── superpowers/specs/        # 设计文档
│   │   └── 2026-06-25-lsm-crm-quasi-production-design.md
│   └── api-contract.md           # 新增：REST 端点契约
├── src/types/index.ts            # 现有，**字段名必须与 Drizzle schema 保持一致**
└── package.json                  # 现有，仅追加 scripts: db:up/api:dev/api:build/api:migrate
```

---

## 3. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 运行时 | **Bun 1.1+** | TS 原生、启动快、原生 SQLite/Postgres 驱动；与现有 pnpm 兼容 |
| HTTP 框架 | **Hono 4** | 轻量、路由 API 干净、middleware 链式、与 Bun 一等公民 |
| ORM | **Drizzle ORM** | TS 原生、零运行时、Schema 即类型、迁移可控 |
| 驱动 | **postgres.js** | Bun 原生、连接池、轻量 |
| 密码 | **@node-rs/argon2** | Argon2id、Bun 兼容、CPU 常数可配 |
| 校验 | **Zod** | TS 友好、运行时校验 + 静态类型推导 |
| Session 存储 | **Postgres 表 sessions** | 首期量小，无需 Redis；后期可换 |
| 迁移（生成） | **drizzle-kit**（devDep，build 阶段使用） | 生成 SQL 迁移文件 |
| 迁移（执行） | **drizzle-orm/postgres-js/migrator**（prodDep，运行时使用） | 启动时 `await migrate(db, ...)` 幂等执行 |
| 容器 | `oven/bun:1.1-alpine` | 镜像 ~80MB |

---

## 4. 数据模型

### 4.1 users

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | `gen_random_uuid()` |
| name | text | NOT NULL | 显示名 |
| email | citext | UNIQUE, NOT NULL | 登录用 |
| password_hash | text | NOT NULL | Argon2id |
| role | enum('admin','sales') | NOT NULL | |
| avatar_url | text | NULL | |
| team_id | uuid | NULL, FK→teams(id) | 预留多团队，本期不实现 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### 4.2 customers

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| name | text | NOT NULL | 联系人名 |
| company | text | NOT NULL | |
| phone | text | NULL | |
| email | text | NULL | |
| address | text | NULL | |
| industry | text | NULL | |
| stage | text | NOT NULL | 阶段字符串，CHECK 约束限定取值（与 `src/lib/stage.ts` STAGES 对齐） |
| amount | numeric(12,2) | NOT NULL DEFAULT 0 | 预计成交金额 |
| owner_id | uuid | NOT NULL, FK→users(id) | |
| team_id | uuid | NULL | |
| last_visit_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

**索引：** `owner_id`, `stage`, `(owner_id, stage)`

### 4.3 visits

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| customer_id | uuid | NOT NULL, FK→customers(id) | |
| salesman_id | uuid | NOT NULL, FK→users(id) | |
| type | text | NOT NULL | 类型字符串，CHECK 约束 |
| result | text | NOT NULL | 结果字符串，CHECK 约束 |
| content | text | NOT NULL | 沟通要点 |
| duration_min | int | NULL | |
| next_step | text | NULL | |
| stage_before | text | NULL | 拜访前阶段 |
| stage_after | text | NULL | 拜访后阶段 |
| visited_at | timestamptz | NOT NULL | |
| created_at | timestamptz | NOT NULL | |
| deleted_at | timestamptz | NULL | 软删 |

**索引：** `customer_id`, `salesman_id`, `visited_at DESC`

### 4.4 customer_transfers

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | |
| customer_id | uuid | NOT NULL, FK→customers(id) | |
| from_user_id | uuid | NOT NULL, FK→users(id) | |
| to_user_id | uuid | NOT NULL, FK→users(id) | |
| reason | text | NULL | |
| transferred_at | timestamptz | NOT NULL | |

### 4.5 sessions

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | text | PK | 32 字节随机 base64url |
| user_id | uuid | NOT NULL, FK→users(id) | |
| expires_at | timestamptz | NOT NULL | 7 天 |
| created_at | timestamptz | NOT NULL | |
| user_agent | text | NULL | 简单审计 |

**索引：** `user_id`, `expires_at`

> **关键约束**：所有字段命名（snake_case ↔ camelCase）必须与 `src/types/index.ts` 在语义层 1:1 对应，便于 v0.4.0 切换。

---

## 5. API 端点（v0.3.0）

统一前缀 `/api/v1`。所有响应包络：

```ts
{ ok: true,  data: T,         error: null }
{ ok: false, data: null,      error: { code, message, details? } }
```

### 5.1 健康 & 元信息

| Method | Path | 角色 | 响应 |
|---|---|---|---|
| GET | `/health` | 公开 | `{ status: 'ok', uptimeSec, version, gitSha }` |
| GET | `/version` | 公开 | 同上精简版 |
| GET | `/openapi.json` | 公开 | OpenAPI 3.1 规范 |

### 5.2 鉴权

| Method | Path | 角色 | 请求体 | 响应 |
|---|---|---|---|---|
| POST | `/auth/login` | 公开 | `{ email, password }` | 200 + Set-Cookie；失败 401 |
| POST | `/auth/logout` | 登录 | — | 200 + 清 cookie |
| GET | `/auth/me` | 登录 | — | 当前用户对象 |

**Cookie 规范：**

```
Set-Cookie: lsm_session=<id>; HttpOnly; SameSite=Lax; Path=/api; Max-Age=604800
```

- 开发环境：`Secure` 关闭（localhost 无 HTTPS）
- 生产环境：`Secure` 开启（HTTPS 强制）

### 5.3 用户

| Method | Path | 角色 | 说明 |
|---|---|---|---|
| GET | `/users` | admin | 列出全部用户 |
| GET | `/users/sales` | 登录 | 列出 role=sales 的用户（用于客户 owner 筛选） |
| GET | `/users/:id` | 登录 | 单用户 |

### 5.4 客户

| Method | Path | 角色 | 说明 |
|---|---|---|---|
| GET | `/customers` | 登录 | 查询参数 `stage`/`ownerId`/`q`/`page`/`limit` |
| GET | `/customers/:id` | 登录 | 详情 + 最近 10 条拜访 |
| POST | `/customers` | admin/sales | sales 只能 ownerId=self |
| PATCH | `/customers/:id` | admin/owner | |
| POST | `/customers/:id/transfer` | admin/owner | body: `{ toUserId, reason }`，事务 |

**RBAC 规则：**
- sales：仅看 owner=self 的客户；可创建 owner=self 的客户
- admin：可看/改全部

### 5.5 拜访

| Method | Path | 角色 | 说明 |
|---|---|---|---|
| GET | `/visits` | 登录 | `customerId`/`salesmanId`/`from`/`to` |
| POST | `/visits` | sales | **事务**：写 visit + UPDATE customers.last_visit_at |
| DELETE | `/visits/:id` | 本人/admin | 软删（更新 deleted_at） |

**RBAC 规则：**
- sales：仅看 salesman=self 的拜访
- admin：可看全部

### 5.6 错误码

| HTTP | error.code | 含义 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod 校验失败 |
| 401 | `UNAUTHORIZED` | 未登录 / session 失效 |
| 403 | `FORBIDDEN` | 角色不足 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 唯一约束冲突（email 等） |
| 500 | `INTERNAL` | 兜底 |

---

## 6. 中间件链

请求处理顺序：

```
Request
  → CORS（dev 仅）
  → Request ID（注入 X-Request-Id）
  → Error Handler（捕获 throw，统一包络）
  → Logger（生产期打结构化日志到 stdout）
  → Route Handler
    → requireAuth（读取 cookie → 查 sessions → 注入 c.var.user）
    → requireRole('admin'|'sales')
    → Zod 校验
    → 业务逻辑
  → Response
```

---

## 7. 部署拓扑

### 7.1 docker-compose.yml（节选）

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
    depends_on:
      db: { condition: service_healthy }
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      SESSION_SECRET: ${SESSION_SECRET:?required}
      VITE_APP_VERSION: ${VITE_APP_VERSION}
      VITE_GIT_SHA: ${VITE_GIT_SHA}
      NODE_ENV: production
    restart: unless-stopped
    networks: [internal, external]

  web:
    build:
      context: ../../
      dockerfile: deploy/prod/web.Dockerfile
    depends_on:
      - api
    ports:
      - "127.0.0.1:30073:80"
    networks: [external]

volumes:
  pgdata:

networks:
  internal:    # db 和 api 之间
  external:    # api 和 web 之间（web 暴露给宿主）
```

### 7.2 nginx.conf 关键改动

```nginx
location /api/ {
    proxy_pass http://api:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass_header  Set-Cookie;
    proxy_cookie_path  /api /;
}

location /health {
    # 直接打 web 容器的 healthcheck，**不**走 api
    return 200 "ok\n";
    add_header Content-Type text/plain;
}
```

### 7.3 api.Dockerfile

```dockerfile
# ---- build stage ----
FROM oven/bun:1.1-alpine AS build
WORKDIR /app
COPY apps/api/package.json apps/api/bun.lock* ./
RUN bun install --frozen-lockfile --production=false
COPY apps/api/ ./
RUN bun run build  # tsc -> dist/

# ---- runtime stage ----
FROM oven/bun:1.1-alpine
WORKDIR /app
ENV NODE_ENV=production
# 编译产物
COPY --from=build /app/dist ./dist
# 迁移 SQL 文件（drizzle-kit generate 输出在 src/db/migrations/，整体复制）
COPY --from=build /app/src/db/migrations ./dist/db/migrations
COPY --from=build /app/package.json ./
RUN bun install --production
USER bun
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["bun", "run", "dist/server.js"]
```

### 7.4 迁移执行机制（关键）

- **生成**：build 阶段，`drizzle.config.ts` 配置 `out: './src/db/migrations/'`；开发者改 schema 后 `bun run db:generate` 生成新的 SQL 迁移文件
- **复制**：Dockerfile 把 `src/db/migrations/` 整目录复制到 runtime 的 `dist/db/migrations/`
- **执行**：runtime **不需要 drizzle-kit**（devDep）；改用 `drizzle-orm/postgres-js/migrator` 的 `migrate()` 函数
  - `apps/api/src/db/migrate.ts`：启动脚本，`await migrate(db, { migrationsFolder: './dist/db/migrations' })`
  - `apps/api/src/server.ts` 启动时先 `await runMigrations()` 再 `serve()`
  - 幂等：基于 `__drizzle_migrations` 表，只跑未应用的迁移

> **为什么这样设计**：runtime 容器只装 prod deps（drizzle-orm + postgres.js + zod + ...），**不装 drizzle-kit**（devDep，~30MB）。启动时自动 migrate 避免部署时手动执行。

---

## 8. 部署脚本改动

### 8.1 `deploy-prod.ps1` 新流程

```powershell
# 1. 同步配置
Copy-Item -Force .../nginx.conf .../docker-compose.yml $ProdDir/

# 2. 确保 db 先起
docker compose up -d db

# 3. 等待 db 健康
$dbReady = $false; $tries = 0
while (-not $dbReady -and $tries -lt 30) {
    $dbReady = (& docker compose exec -T db pg_isready -U $env:POSTGRES_USER) -match 'accepting'
    if (-not $dbReady) { Start-Sleep 2; $tries++ }
}

# 4. 构建并起 api（启动时 server.ts 会自动 await runMigrations()，幂等）
docker compose up -d --build api

# 5. 构建并起 web
docker compose up -d --build web
```

### 8.2 新增脚本

| 脚本 | 作用 |
|---|---|
| `migrate-prod.ps1` | `docker compose exec api bun run db:migrate` |
| `seed-prod.ps1` | `docker compose exec api bun run seed --full` |
| `api-logs.ps1` | `docker compose logs -f api` |
| `api-shell.ps1` | `docker compose exec api sh` |

### 8.3 package.json 新增

```jsonc
{
  "scripts": {
    // ... 现有
    "api:dev":      "cd apps/api && bun run dev",
    "api:build":    "cd apps/api && bun run build",
    "api:start":    "cd apps/api && bun run start",
    "db:up":        "cd apps/api && docker compose -f ../../deploy/prod/docker-compose.yml up -d db",
    "db:generate":  "cd apps/api && bun run db:generate",
    "db:migrate":   "cd apps/api && bun run db:migrate",
    "db:seed":      "cd apps/api && bun run seed"
  }
}
```

> **说明**：
> - 根 `package.json` 透传到 `apps/api/`，让用户从根目录也能跑
> - `apps/api/package.json` 自身也定义同名 scripts（直接 `cd apps/api` 时可用）
> - `db:generate` 仅本地开发用（devDep drizzle-kit）；`db:migrate` 用 prodDep 的 `migrate()` 函数

---

## 9. 种子数据

CLI 命令（容器内或本地）：

```bash
bun run seed            # 默认：7 个用户（密码 Password123!）
bun run seed --full     # 7 用户 + 80 客户 + 300 拜访
```

**数据来源**：完全迁移自前端 `src/seed/*.ts`，**保持固定 faker 种子（42/123/456）** 以保证演示数据一致。

**用户列表：**

| name | email | role |
|---|---|---|
| 周总 | admin.zhou@lsm-crm.local | admin |
| 林总监 | admin.lin@lsm-crm.local | admin |
| 张伟 | sales.zhang@lsm-crm.local | sales |
| 李娜 | sales.li@lsm-crm.local | sales |
| 王强 | sales.wang@lsm-crm.local | sales |
| 刘洋 | sales.liu@lsm-crm.local | sales |
| 陈静 | sales.chen@lsm-crm.local | sales |

**密码**：统一 `Password123!`，README + 登录页提示"生产环境请改"。

---

## 10. 配置 & 密钥

### 10.1 `apps/api/.env.example`

```bash
DATABASE_URL=postgres://lsm_crm:changeme@localhost:5432/lsm_crm
SESSION_SECRET=please-generate-with-openssl-rand-base64-32
PORT=3000
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173
```

### 10.2 `deploy/prod/.env.example` 追加

```bash
POSTGRES_USER=lsm_crm
POSTGRES_PASSWORD=change-me-in-prod
POSTGRES_DB=lsm_crm
SESSION_SECRET=change-me-in-prod-32-bytes-base64
```

### 10.3 必读警告

- `SESSION_SECRET` 丢失将导致所有 session 失效；生产环境必须强随机
- 首次部署后立即通过 `seed-prod.ps1` 修改 7 个种子用户密码（v0.3.0 暂不提供用户管理 UI）
- `POSTGRES_PASSWORD` 同样须改

---

## 11. 验证清单

### 11.1 本地开发

```bash
# 1. 启动 Postgres（仅 db 服务）
cd apps/api
docker compose -f ../../deploy/prod/docker-compose.yml up -d db

# 2. 跑迁移
bun run db:migrate

# 3. 种子
bun run seed --full

# 4. 起 API
bun run dev
# → Listening on http://localhost:3000

# 5. 冒烟
curl http://localhost:3000/api/v1/health
# → {"ok":true,"data":{"status":"ok",...}}

# 6. 登录
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.zhou@lsm-crm.local","password":"Password123!"}'
# → 200 + Set-Cookie: lsm_session=...

# 7. 验证 cookie
curl --cookie "lsm_session=<id>" http://localhost:3000/api/v1/customers | head
# → 80 条
```

### 11.2 三容器端到端

```bash
# 在 D:\CodeProjects\LSM-CRM 根目录
pnpm prod:init       # 一次性初始化
pnpm prod:deploy     # 三容器全起
pnpm prod:status     # 确认三个服务都 healthy

# 浏览器访问 http://localhost:30073
# 1. 登录页底部应显示 "v0.3.0+<sha>"
# 2. （v0.3.0 前端不变）点击 7 个一键登录仍可用（前端 localStorage）
# 3. 直接 curl 后端：
curl http://localhost:30073/api/v1/health
# → {"ok":true,...}

# 4. 验证迁移日志
pnpm prod:logs api | head -50
# → 应看到 "Applied N migrations"
```

### 11.3 数据校验

```bash
# 验证 Postgres 表行数
pnpm prod:shell db
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM customers;"
# → 80
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM visits;"
# → ~300
> psql -U lsm_crm -d lsm_crm -c "SELECT count(*) FROM users;"
# → 7
```

---

## 12. 风险与备选

| 风险 | 影响 | 备选 / 缓解 |
|---|---|---|
| Bun + postgres.js 兼容性 | 连接池、async 行为 | 已验证 Bun 1.1+ 原生支持；CI 中跑真实连接 |
| Session 存 DB 性能 | 高并发时查询压力 | 首期量小（< 100 用户）；后期加 Redis 适配层（不破坏接口） |
| 种子脚本慢 | 首次部署时间 | 单事务 + bulk insert；预期 < 5s |
| `drizzle-kit` 迁移回滚难 | 线上 schema 出错时 | 写入 `migrations/meta/_journal.json`；回滚用新迁移修正，不直接 `down` |
| Windows + docker compose v2 兼容 | 脚本失败 | 全部 PowerShell 用 `docker compose`（v2），不混 `docker-compose`（v1） |
| 端口冲突 | 30073 / 5432 被占 | env 文件可调，README 提示 |
| 前端字段漂移 | v0.4.0 切换时类型不对齐 | 文档中明确"snake_case↔camelCase 1:1"约束；PR 时 code-review 检查 |
| Session 共享问题 | api 容器重启会丢未持久化 session | session 入库，重启不影响 |

---

## 13. 交付物清单

完成后须交付：

1. ✅ `apps/api/` 完整代码（含 schema、routes、seed、tests 目录预留）
2. ✅ `apps/api/Dockerfile` + `apps/api/package.json` + `apps/api/.env.example`
3. ✅ 修改后的 `deploy/prod/docker-compose.yml`、`deploy/prod/nginx.conf`、`deploy/prod/.env.example`
4. ✅ 修改后的 `deploy/prod/web.Dockerfile`（从根目录迁入）
5. ✅ 新增 `deploy/scripts/migrate-prod.ps1`、`seed-prod.ps1`、`api-logs.ps1`、`api-shell.ps1`
6. ✅ 修改后的 `deploy/scripts/deploy-prod.ps1`、`_config.ps1`
7. ✅ 修改后的根 `package.json`（追加 6 个 api:* 脚本）
8. ✅ 修改后的 `README.md`（"部署"章节追加三容器流程）
9. ✅ 新增 `docs/api-contract.md`（端点契约）
10. ✅ 新增 `apps/api/README.md`（本地开发指南）
11. ✅ Git tag `v0.3.0`
12. ✅ 冒烟验证报告（`docs/verification-reports/v0.3.0-smoke.md`）

---

## 14. 后续路线（v0.4.0+）

- **v0.4.0**：前端 `src/api/` 抽象层 + stores 切 HTTP 调用
- **v0.5.0**：RBAC 权限矩阵 + 单元/集成测试 + CI/CD（GitHub Actions）
- **v0.6.0**：i18n、Sentry 埋点、CSP 加固、用户管理 UI、密码重置

---

**变更追踪**

- 2026-06-25 初版（设计批准）
