#!/usr/bin/env bash
# scripts/dev/verify-ci.sh
# 本地模拟 GitHub Actions CI 的所有 step
# 跑通 = CI 大概率能过; 失败 = 必须修才能 push
#
# 设计: 用本机已有的 Postgres (不是 docker service container)
#       跳过 actions/setup-* 这种只在 GitHub 跑的 step

set -e
cd "$(dirname "$0")/../.."
ROOT=$(pwd)

echo "================================================="
echo " LSM-CRM CI 模拟验证"
echo " ROOT: $ROOT"
echo "================================================="

# ------------------------------------------------------------------
# 1. 前端: pnpm install + type-check + test + build
# ------------------------------------------------------------------
echo ""
echo "[1/4] 前端 type-check + test + build ..."
pnpm install --frozen-lockfile
pnpm type-check
pnpm test
pnpm build
echo "✓ 前端 OK"

# ------------------------------------------------------------------
# 2. 后端: bun install + type-check
# ------------------------------------------------------------------
echo ""
echo "[2/4] 后端 bun install + type-check ..."
cd "$ROOT/apps/api"
bun install --frozen-lockfile
bun run type-check
echo "✓ 后端 install + type-check OK"

# ------------------------------------------------------------------
# 3. 后端: migrate + seed + test
#    假设本机 Postgres 5432 跑着 (与 dev 一致)
# ------------------------------------------------------------------
echo ""
echo "[3/4] 后端 migrate + seed --full + test ..."
cd "$ROOT/apps/api"
export DATABASE_URL="${DATABASE_URL:-postgres://lsm_crm:lsm_crm123@localhost:5432/lsm_crm}"
export SESSION_SECRET="${SESSION_SECRET:-ci-only-not-for-production-32bytes}"
export PORT="${PORT:-33501}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export COOKIE_INSECURE="${COOKIE_INSECURE:-1}"
export NODE_ENV=test

bun run db:migrate
bun run db:seed -- --full
bun run test
echo "✓ 后端 migrate + seed + test OK"

# ------------------------------------------------------------------
# 4. 总结
# ------------------------------------------------------------------
echo ""
echo "================================================="
echo " ✓ 全部通过 — CI 大概率能过"
echo ""
echo " 剩下 GitHub Actions 才能验证的:"
echo "  - service container (postgres:17-alpine) 启动"
echo "  - oven-sh/setup-bun@v2 安装"
echo "  - actions/setup-node@v4 + pnpm cache"
echo ""
echo " 第一次 push 后看 GitHub repo 的 Actions 标签"
echo "================================================="
