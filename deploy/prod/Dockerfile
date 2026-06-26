# =============================================================================
# LSM-CRM 生产镜像 - 多阶段构建
#
# 路径:
#   - 本文件 = deploy/prod/Dockerfile
#   - nginx.conf = 与本文件同目录(deploy/prod/nginx.conf)
#   - 构建上下文 = 主仓库根(SOURCE_DIR,绝对路径)
#
# 通常由 deploy-prod.ps1 自动调用,不需要手动 docker build
# =============================================================================

# ============ Stage 1: 构建静态资源 ============
FROM node:22-alpine AS builder

WORKDIR /app

# 启用 pnpm(版本与 .npmrc / pnpm-workspace.yaml 一致)
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# 先复制依赖清单,最大化缓存命中
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
RUN pnpm install --frozen-lockfile

# 再复制源码并构建
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY tailwind.config.ts postcss.config.js ./

# 接收版本注入(由 docker-compose.yml 的 args 传入)
ARG VITE_APP_VERSION=0.0.0
ARG VITE_GIT_SHA=local
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_GIT_SHA=${VITE_GIT_SHA}

# 构建(走 .env.production)
RUN pnpm build

# 校验构建产物
RUN test -f dist/index.html || (echo "BUILD FAILED: dist/index.html missing" && exit 1)

# ============ Stage 2: Nginx 服务 ============
FROM nginx:1.27-alpine

# 元信息
LABEL org.opencontainers.image.title="LSM-CRM Web"
LABEL org.opencontainers.image.description="LSM-CRM 销售管理系统 . 准生产前端"
LABEL org.opencontainers.image.source="https://github.com/FutureWL/LSM-CRM"
LABEL org.opencontainers.image.licenses="Proprietary"

# nginx.conf 与 Dockerfile 同目录(deploy/prod/nginx.conf)
# 因为 build context = 主仓库根,路径是 deploy/prod/nginx.conf
COPY deploy/prod/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段拷贝静态产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -qO- http://127.0.0.1/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
