# 开发环境

## 启动

```bash
# 在仓库根目录
pnpm dev
```

打开 http://localhost:33500

## 特点

- **Vite HMR**：源码改动秒级热更新
- **localStorage key 前缀** `lsm-crm-dev-*`：与生产数据隔离
- **faker 种子数据**：默认开启 80 客户 + 5 销售 + 2 管理员
- **SourceMap**：inline 模式，DevTools 直接定位源码

## 配置

- `.env.development`：开发环境变量
- `vite.config.ts`：dev 模式下 `allowedHosts: true`（允许任意域名访问，便于 LAN 联调）

## 重置数据

浏览器 DevTools → Application → Local Storage → 删除所有 `lsm-crm-dev-*` 键 → 刷新页面。
