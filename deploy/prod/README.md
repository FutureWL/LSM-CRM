# 生产环境配置

本目录包含生产环境的所有配置。**生产工作空间**位于 `D:/CodeProjects/lsm-crm-prod/`（由 `pnpm prod:init` 初始化）。

## 文件

| 文件 | 作用 |
|---|---|
| `Dockerfile` | 多阶段构建：Node 编译 + Nginx 服务 |
| `docker-compose.yml` | 单服务编排，绑定宿主机端口（默认 `127.0.0.1:33510`） |
| `nginx.conf` | 静态服务 + gzip + 安全头 + SPA fallback + 健康检查 |
| `.env.example` | 环境变量模板（生产工作空间里叫 `.env`） |
| `.gitignore` | 排除运行时文件 |

## 构建时注入的变量

`Dockerfile` 接收两个 `ARG`：
- `VITE_APP_VERSION`：版本号
- `VITE_GIT_SHA`：git 提交 SHA

由 `deploy/scripts/deploy-prod.ps1` 在 `docker compose build` 时通过 `args:` 传入，最终显示在登录页底部。

## 镜像安全

- `read_only: true` 根文件系统
- `cap_drop: [ALL]` + 仅添加必要 cap
- `no-new-privileges`
- 资源限制 `mem_limit: 256m, cpus: 0.5`
- 日志轮转 10m × 3 文件

## 自定义

**改端口**：编辑生产工作空间的 `.env` 文件：
```env
BIND_PORT=8080
```

**允许 LAN 访问**：把 `BIND_HOST` 改为 `0.0.0.0`（注意安全）

**启用 faker 种子数据**：编辑 `.env.production` 把 `VITE_SEED_ENABLED=true`，重新部署

**加自定义域名**：修改 `nginx.conf` 的 `server_name`，并自行处理 DNS 与 HTTPS
