# 部署总览

本项目采用**双环境、互相隔离**的部署模式：

| 环境 | 启动方式 | 端口 | 数据存储 | 用途 |
|---|---|---|---|---|
| **开发环境** | `pnpm dev`（直接跑 Node） | `33500` | 后端 `33501` / DB `33502` | 日常开发、自测 |
| **生产环境** | `docker compose`（独立工作空间） | `33510`（默认） | API `33511` / DB `33512` | 准生产、给客户/同事演示 |

> 开发与生产使用**不同的 localStorage key 前缀**，同一浏览器同时打开也不会串数据。

---

## 目录结构

```
LSM-CRM/                              # 仓库根 = 开发工作空间
├── src/                              # 源码
├── deploy/                           # 部署相关
│   ├── README.md                     # 本文件
│   ├── dev/README.md                 # 开发环境说明
│   ├── prod/                         # 生产配置（被 init 脚本复制到独立工作空间）
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── nginx.conf
│   │   ├── .env.example
│   │   └── README.md
│   └── scripts/                      # 运维脚本（PowerShell）
│       ├── dev.ps1                   # 启动开发
│       ├── init-prod.ps1             # 初始化生产工作空间（首次使用）
│       ├── deploy-prod.ps1           # 一键部署（重新构建+启动）
│       ├── prod-up.ps1
│       ├── prod-down.ps1
│       ├── prod-restart.ps1
│       ├── prod-logs.ps1
│       ├── prod-status.ps1
│       ├── prod-shell.ps1
│       ├── prod-rebuild.ps1
│       ├── prod-clean.ps1
│       └── prod-open.ps1
└── README.md

D:/CodeProjects/lsm-crm-prod/         # 独立生产工作空间（运行 docker compose）
├── docker-compose.yml                # 由 init 复制
├── Dockerfile                        # 由 deploy 复制
├── nginx.conf                        # 由 init 复制
├── .env                              # 实际环境配置（不入库）
├── app/                              # 构建产物（不入库）
│   └── dist/
└── logs/                             # 可选，挂载 nginx 日志
```

---

## 快速开始

### 第一次：初始化生产工作空间

```bash
# 在仓库根目录
pnpm prod:init
```

脚本会：
1. 在 `D:/CodeProjects/lsm-crm-prod/` 创建工作空间
2. 复制 `deploy/prod/*` 到该目录
3. 生成 `.env`（如不存在）
4. 不启动容器

### 部署：构建并启动

```bash
pnpm prod:deploy
```

脚本会：
1. 检查工作空间是否初始化
2. 同步配置（docker-compose / nginx / .env）
3. 拉取最新代码（如用 git worktree 模式）
4. 执行 `pnpm build`（开发工作空间里）
5. 把 `dist/` 复制到生产工作空间
6. 在生产工作空间执行 `docker compose up -d --build`

> **架构说明**：`docker build` 会在**生产工作空间**执行，build context 用相对路径 `../..` 指回主仓库。
> 好处：每次重新构建都基于当前主仓库的源码，源码改动会自动反映到新镜像。

### 常用运维命令

```bash
pnpm prod:status   # 查看容器/镜像/端口状态
pnpm prod:logs     # 跟踪 nginx 日志
pnpm prod:restart  # 重启容器
pnpm prod:rebuild  # 强制重建镜像(无缓存)
pnpm prod:down     # 停止容器
pnpm prod:clean    # 停止 + 删除容器和镜像
pnpm prod:open     # 打开浏览器
```

### 跨平台

脚本均为 **PowerShell**（Windows 原生 + PowerShell Core 跨平台）。
- Windows：直接用 `pnpm prod:up`
- macOS / Linux：先安装 PowerShell 7（`brew install powershell`），脚本路径不变

---

## 数据说明

- 生产环境数据**仍存浏览器 localStorage**，清浏览器缓存即丢
- 这是"准生产"设计的核心权衡：**没有后端，没有持久化服务器侧数据**
- 演示场景下可接受；如要真持久化，后续在 `src/api/` 接入真后端

---

## 升级到正式版时

- 保留 `deploy/prod/`（部署流程不变）
- 替换 `src/api/` 目录为真实 HTTP 调用
- 在 `deploy/prod/docker-compose.yml` 增加后端服务（如 `api:` 节点）
- nginx.conf 增加 `location /api/ { proxy_pass http://api:3000; }`
