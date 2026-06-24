# 多阶段构建：第一阶段编译静态资源，第二阶段用 Nginx 服务
# 用法：docker compose up -d --build

# ============ Stage 1: 构建 ============
FROM node:22-alpine AS builder

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# 先复制依赖清单，最大化缓存命中
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

# 再复制源码并构建
COPY . .
RUN pnpm build

# ============ Stage 2: 服务 ============
FROM nginx:1.27-alpine

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段拷贝静态产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]