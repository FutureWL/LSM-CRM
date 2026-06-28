# scripts/dev — 临时调试脚本

本目录存放**临时 / 一次性**的 Playwright 调试脚本，主要用于：

- 验证某个 UI 改动后的渲染结果（图标、头像、新页面等）
- 复现某条业务流程（登录、创建客户、销售拜访等）
- 抓取某次问题现场以辅助排查

## 使用方法

```bash
# 依赖已通过根目录的 devDependencies 安装（playwright）
pnpm dev          # 先把前端起在 :30300
node scripts/dev/<script>.mjs
```

## 注意事项

- 这些脚本**不纳入版本控制**（见根目录 `.gitignore` 中的 `scripts/dev/`）
- 命名约定：`test-<主题>-<可选后缀>.mjs`（如 `test-icons-check.mjs`）
- 一次性脚本验证完后可以直接删除，不需要归档
- **正式自动化测试**请使用 `<app>/tests/` 或后续规划的 e2e 套件，不要把这里当测试目录
