# LSM-CRM 销售管理系统 · v0.3.0 (准生产三容器)

> 一个用 Vue 3 前端 + Hono/Drizzle/Postgres 后端构建的 CRM 演示系统,v0.3.0 引入三容器准生产部署。

## 🎯 当前版本 (v0.3.0)

- **后端**:Hono + Drizzle + Postgres 17 + Argon2id + Session Cookie (`__Host-` 前缀，DB 存 SHA-256 hash)
- **前端**:Vue 3 + TypeScript + Vite + Tailwind + Naive UI(双形态:管理后台 / 销售移动端)
- **部署**:三容器 (web/api/db) + Docker Compose + PowerShell 自动化脚本
- **数据**:Postgres(2 个真实用户 + 80 客户 + ~300 拜访,固定 faker 种子)
- **演示密码**:余莉莎 `Lsm@2026` / 魏来 `WeiLai@2026`(生产环境必须改)

## 🚀 快速启动 (开发)

```bash
# 需要 Node.js 20+ / pnpm 10+ / Bun 1.1+ / Docker
pnpm install
pnpm dev
```

浏览器自动打开 `http://localhost:30300`,即可看到登录页(2 个快捷登录按钮)。

### 仅起后端 (开发)

```bash
pnpm db:up              # 起 postgres 容器
pnpm db:migrate         # 跑迁移
pnpm db:seed -- --full  # 灌种子
pnpm api:dev            # 起 Hono API on :33501
curl http://localhost:3000/api/v1/health
```

详见 [`apps/api/README.md`](./apps/api/README.md) 和 [`docs/api-contract.md`](./docs/api-contract.md)。

## 🚀 快速启动

```bash
# 需要 Node.js 20+ 和 pnpm 10+
pnpm install
pnpm dev
```

浏览器自动打开 `http://localhost:30300`,即可看到登录页。

## 🏗 双环境部署

本项目采用**双环境、互相隔离**的部署模式,适合准生产/内部演示:

| 环境 | 启动 | 端口 | 数据 key 前缀 |
|---|---|---|---|
| **开发** | `pnpm dev` | 33500 | `lsm-crm-dev-*` |
| **生产** | `pnpm prod:deploy` | 33510 (默认) | `lsm-crm-prod-*` |

生产环境在**独立工作空间** `D:/CodeProjects/lsm-crm-prod/` 下运行,与开发环境完全隔离。

```bash
# 首次使用 - 初始化生产工作空间(只需一次)
pnpm prod:init

# 一键部署:构建 → 复制 → 启动容器
pnpm prod:deploy

# 运维命令
pnpm prod:status   # 状态
pnpm prod:logs     # 日志
pnpm prod:restart  # 重启
pnpm prod:down     # 停止
pnpm prod:open     # 浏览器打开
```

详细见 [`deploy/README.md`](./deploy/README.md)。

---

## 👥 真实用户

v0.4 起只保留 2 个真实用户(不再有 demo 账号池)。登录页提供 **2 个快捷登录** 按钮(无密码):

| 角色 | 账号 | 邮箱 | 用途 |
|------|------|------|------|
| 🔴 管理员 | **余莉莎** | `yulisha@lsm-crm.local` | 租户管理员,看全公司大盘数据 |
| 🟢 销售 | **魏来** | `weilai@lsm-crm.local` | 移动端录入拜访 |

> 旧版本 (v0.3.0 之前) 演示用的 7 个 demo 账号 (周总 / 林总监 / 张伟 / 李娜 / 王强 / 刘洋 / 陈静) 已通过 `scripts/dev/clean-demo-users.mjs` 清理掉,他们持有的客户/拜访全部 transfer 给了魏来。

---

## 🎬 推荐演示脚本(向客户讲 5 分钟)

### 准备

1. 浏览器开两个窗口(或两台设备),一个桌面全屏,一个手机宽度
2. 桌面端用管理员(余莉莎)登录
3. 移动端用销售(魏来)登录

### 步骤 1 · 销售录入拜访(1 分钟)

📱 移动端:
- 进入 **首页**,看到"今日待拜访"和"最近联系"
- 点击右下角 **＋** 浮动按钮 → 弹出"新建拜访"
- 选择客户 → 填写沟通要点 → 选择拜访结果
- 可选:点击"更新客户阶段"把客户推到"已成交"
- 点击 **提交拜访记录** → 跳转回拜访列表,新记录置顶

### 步骤 2 · 管理员实时看到数据(30 秒)

🖥️ 桌面端:
- 切到 **仪表盘** 页
- **核心数字已实时变化**:本月拜访 +1、销售排行柱状图更新
- **客户漏斗** 反映刚才推动的阶段流转

> ✨ 这是向客户展示时**最有冲击力**的瞬间 — 两端数据秒级联动,无须任何后端。

### 步骤 3 · 深入查看客户(1 分钟)

🖥️ 桌面端:
- 切到 **客户** 页,看到所有 80 位客户
- 按阶段筛选 / 搜索 / 按销售过滤
- 点击某客户 → 看到客户详情 + **完整跟进时间线**
- 点击某销售 → 看到该销售的业绩、客户列表

### 步骤 4 · 移动端完整流程(1 分钟)

📱 移动端:
- **客户 Tab** → 搜索/筛选我的客户
- 点击某客户 → 看到跟进历史
- 点击底部 **＋** → 给该客户追加一条拜访
- **我的 Tab** → 看到本月业绩、切换账号

### 步骤 5 · 关键价值总结(1 分钟)

可对照 **仪表盘** 讲:
- 销售外勤效率提升:拜访记录当场完成,数据自动归档
- 管理者实时决策:告别"周会才知道"的滞后
- 客户跟进可追溯:每个客户的历史沟通一目了然

---

## 🧱 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3.5 + Vite 5 + TypeScript 5.6 |
| 路由 | Vue Router 4 |
| 状态 | Pinia 2 + pinia-plugin-persistedstate(localStorage 持久化) |
| 样式 | Tailwind CSS 3 |
| 图表 | ECharts 5(vue-echarts 封装) |
| 工具 | dayjs, @faker-js/faker |

---

## 📁 目录结构

```
src/
├── api/              # 模拟 API 层 - 正式版时只换这一层
├── components/       # 跨视图共享组件
│   ├── Chart.vue     # ECharts 封装
│   ├── StageTag.vue  # 客户阶段彩色标签
│   ├── VisitTimeline.vue
│   └── EmptyState.vue
├── lib/              # 工具函数
│   ├── format.ts     # 日期/金额格式化
│   └── stage.ts      # 客户阶段定义(全应用唯一来源)
├── router/           # 路由配置
├── seed/             # 旧版 v0.2 localStorage 种子数据(已废弃,保留仅为兼容)
├── stores/           # Pinia stores(localStorage 持久化)
│   ├── auth.ts
│   ├── users.ts
│   ├── customers.ts  # 客户 + 阶段流转
│   └── visits.ts     # 拜访 + 自动联动客户 lastVisitAt
├── styles/           # 全局样式
├── types/            # 业务类型定义
├── views/
│   ├── login/        # 登录页(2 真实用户快捷登录)
│   ├── m/            # 移动端销售(类 App 体验)
│   └── admin/        # 桌面端管理后台
└── main.ts           # 应用入口
```

---

## 🎨 设计方向

- **视觉**:深色商务 + 翡翠绿(`#10B981`)强调色
- **管理后台**:深色侧边栏 + 浅色主区,KPI 卡片层次阴影
- **移动端**:类原生 App 体验,底部 4 Tab + 沉浸式顶栏
- **品牌色**:翡翠绿渐变(用于关键 CTA 和品牌识别)

---

## 📊 演示数据规模

- **1 销售(魏来)** + **1 管理员(余莉莎)** + **80 客户** + **~300 拜访**(过去 60 天)
- 数据由 `apps/api/src/seed/*` 里的 faker 用固定种子生成,**每次 seed 数据完全一致**
- 用户在演示中提交的新拜访会真实保存到 Postgres

---

## 🔄 切换到正式版

需要做的最小工作:
1. 替换 `src/api/` 目录为真实 HTTP 调用(axios / fetch)
2. 移除 `src/seed/`
3. 后端服务按 `src/types/index.ts` 中的接口实现
4. Pinia stores 中的 `add / update / remove` 改为调用 API
5. 加上真实的用户认证(JWT / Session)

UI 与交互**完全不需要改动**。

---

## 🛠 常见操作

### 重置演示数据

```bash
cd apps/api && bun run db:seed -- --full
```

会清空 customers/visits 并用固定 faker 种子重灌(80 + 338 条),users/memberships 保持不变。

### 自定义演示数据规模

编辑 `apps/api/src/seed/customers.ts` 里的 faker 参数(数量、行业分布等),然后跑 `bun run db:seed -- --full`。

### 调整视觉风格

颜色集中在 `tailwind.config.ts` 的 `brand` / `ink` 配色,改一处全局生效。

---

## 📦 部署到生产

```bash
pnpm build
# dist/ 目录可部署到任何静态托管
```

---

## 📝 许可

演示版代码仅供商业演示使用,正式版需另行约定。
