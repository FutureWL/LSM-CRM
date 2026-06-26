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
# → Listening on http://localhost:33501

# 7. 冒烟
curl http://localhost:33501/api/v1/health
```

## 端点

详见根目录 `docs/api-contract.md`。
