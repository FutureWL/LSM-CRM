# e2e 测试

正式端到端测试套件，用 [@playwright/test](https://playwright.dev/) 跑。

## 跟 scripts/dev/ 的区别

| | e2e/ (正式) | scripts/dev/ (临时) |
|---|---|---|
| 目的 | 防止回归，进 CI | 单次调试，验证某个改动 |
| 形式 | spec 文件 + assertion | mjs 脚本 + console.log |
| 选择器 | 语义化 (getByRole/getByText) | DOM/CSS 选择器 |
| 跑法 | `pnpm e2e` | `node scripts/dev/test-xxx.mjs` |
| 失败处理 | trace/video/screenshot 自动留档 | 看控制台 |
| 跟 git | 入库 | 不入库 (scripts/dev 在 gitignore 范围) |

## 跑法

```bash
# 前置: vite + api 服务都跑着 (dev 环境已经在跑就 OK)
curl http://127.0.0.1:33500/        # vite
curl http://127.0.0.1:33501/api/v1/health  # api

# 跑 e2e
pnpm e2e
# 或者只跑一个 spec
pnpm e2e e2e/auth.spec.ts
# 或者只跑一个 project (chromium-desktop / mobile-m)
pnpm e2e --project=chromium-desktop
# 或者带 UI 调试
pnpm e2e --ui
```

## 文件清单

| 文件 | 场景 |
|------|------|
| `auth.spec.ts` | 登录、admin/sales 入口、未登录重定向 |
| `customers.spec.ts` | 销售移动端客户列表 + 详情、admin 桌面端阶段筛选 |

## CI 集成

- 当前 CI 跑 type-check + 单测 + build (10 分钟内)
- e2e **不进 CI**（启动浏览器慢、容易 flake、需要完整 dev 环境）
- 想在 CI 跑可以加一个 job，需要起 vite + api + 用 `webServer` 自动管理服务
