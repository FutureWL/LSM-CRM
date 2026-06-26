# ---- build stage ----
FROM oven/bun:1.1-alpine AS build
WORKDIR /app
COPY apps/api/package.json apps/api/bun.lock* ./
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
