# LSM-CRM 安全审计报告 (v0.4)

> 时间: 2026-06-29
> 范围: 后端 API + 前端 + 部署配置
> 严重级别: 🔴 严重 | 🟡 中等 | 🟢 良好

---

## 🟢 设计良好（无需改）

| 项目 | 实现 | 备注 |
|------|------|------|
| **Session 存储** | raw token (32B base64url) → cookie；DB 存 SHA-256 hash | 泄露 DB 也无法伪造 session |
| **Cookie 安全标志** | `HttpOnly + SameSite=Strict(prod)/Lax(dev) + Secure + Path=/` | 标准配置 |
| **`__Host-` 前缀** | 生产期用，dev 期降级（dev 用 HTTP） | 防 subdomain 泄漏 |
| **Session TTL** | 7 天 hard expiry | 合理 |
| **密码哈希** | Argon2id (m=19456, t=2, p=1) | 跟 OWASP 2024 推荐一致 |
| **密码策略** | ≥8 字符 + 弱密码字典 + 不与个人信息相同 | `apps/api/src/auth/password-policy.ts` |
| **不区分"用户不存在"和"密码错"** | login 端点统一返回 401 | 防账号枚举 |
| **错误信息** | 用 `ErrorMessages` 常量 | 不泄露内部细节 |
| **CORS** | dev 放行，prod 白名单 | 按 `IS_DEV` 切换 |
| **PNA (Private Network Access)** | `Allow-Private-Network: true` | Chrome 94+ 兼容 |
| **SQL 注入** | Drizzle ORM 参数化查询 | 无手拼 SQL |
| **Response 不返 passwordHash** | `publicUser()` 排除 | ✓ |

---

## 🔴 严重问题（必修）

### S-1: LoginView 硬编码密码，prod 环境任何人都能登录

**位置**: `src/views/login/LoginView.vue:131, 139`

```vue
@click="quickLogin('yulisha@lsm-crm.local', 'Lsm@2026')"
@click="quickLogin('weilai@lsm-crm.local', 'WeiLai@2026')"
```

**问题**：
- 任何能打开 https://lsm-crm.huntercat.cn 的人点一下按钮就是余莉莎/魏来身份
- 不仅是反模式，**是 prod 环境的安全洞**
- 注意 LoginView 已**不检查 `IS_DEV`**（v0.4 改动把 `v-if="IS_DEV"` 删掉了），所以 prod 也显示

**修复方向**:
- ✅ **B 方案 (推荐)**: 加 `v-if="IS_DEV"` guard，dev 显示快捷登录，prod 隐藏
- A 方案: 直接删快捷登录按钮（彻底但失去开发便利）
- C 方案: 按钮只填 email，密码仍要用户输入（半自动）

**本次修复**: 选 B 方案（最少改动 + 兼顾开发体验）

---

## 🟡 中等问题（建议修）

### M-1: 没有 rate limiting，login 端点可被暴力破解

**位置**: `apps/api/src/routes/auth.ts` `/auth/login`

**问题**：
- 没看到任何 rate limit 中间件
- 攻击者可以无限尝试密码
- 配合 argon2id 的 ~50ms 验证时间，每秒 20 次尝试
- 7 天有效期 session 也无法保护

**修复方向**:
- 加 `hono-rate-limiter` 中间件
- login: 5 次 / 分钟 / IP（超过返回 429）
- 简单实现：内存计数器（单进程够用），或 Redis 计数器（多进程）

**本次修复**: 加内存版限流（`apps/api/src/middleware/rate-limit.ts`），login 5 次/分钟/IP

### M-2: session 没有 idle timeout（sliding session）

**位置**: `apps/api/src/auth/session.ts`

**问题**:
- 现在是 7 天 hard expiry，签发后 7 天一直有效
- 如果用户忘记登出，token 泄露风险窗口 7 天
- 最佳实践: 30 分钟无活动就过期

**修复方向**:
- DB `sessions.last_active_at` 字段
- 每次访问更新 last_active_at
- 验证时检查 `now - last_active_at < 30min`

**本次修复**: 留作 follow-up（涉及 schema 改动 + migration）

---

## 🟢 小问题（可选）

| ID | 项目 | 备注 |
|----|------|------|
| L-1 | session 不存 IP | 防 token 盗用更难 |
| L-2 | 没有 audit log | 谁在什么时候登入/操作无记录 |
| L-3 | `req.header('user-agent')` 直接存 | 没 sanitize（XSS 风险在 DB 显示时） |
| L-4 | 没看到 CSRF token | 靠 SameSite=Strict 防护（足够） |
| L-5 | 没看到 CSP / HSTS / X-Frame-Options | nginx 是否加了？需要确认 |
| L-6 | cookie 名称 `lsm_session` 暴露品牌 | 改成通用名（不重要） |

---

## 修复清单

| 状态 | ID | 描述 |
|------|----|------|
| ✅ | S-1 | LoginView 加 `v-if="IS_DEV"`，prod 隐藏快捷登录 |
| ✅ | M-1 | login 端点加 rate limit (5/min/IP) |
| ⏳ | M-2 | session idle timeout（schema 改动） |
| ⏳ | L-1..6 | 各项加固，留作 follow-up |
