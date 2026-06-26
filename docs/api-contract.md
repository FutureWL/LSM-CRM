# LSM-CRM REST API 契约 (v0.3.0)

基础 URL：`http://localhost:33501`（dev 直接打 API）/ `http://localhost:33510/api`（生产，通过 web 容器 nginx 反代）
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

- Cookie: `__Host-lsm_session` (HttpOnly, SameSite=Lax, Path=/, Secure in prod)
- 登录后所有需要鉴权的端点自动带 cookie
- 7 天后过期（DB `expires_at` + cookie `Max-Age`）
- 演示账号密码：`Password123!`（生产环境必须改）

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
  ownerId?: string        // sales 只能 ownerId=self; 若指定须是 sales 用户
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
