import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 配置
 *
 * 设计:
 * - baseURL 用 vite dev 端口 (33500), 测试通过 Vite -> API proxy 走完整链路
 * - webServer 选项不启用: 假设 vite + api 已手动起好 (避免重复起)
 * - 浏览器: chromium (fast + 覆盖核心场景)
 * - 移动端: 用 iPhone 13 模拟销售移动端
 * - trace + video: 失败时保留, 方便调试
 */
export default defineConfig({
  testDir: './e2e',
  // 5 分钟总超时 (e2e 慢, 避免误杀)
  timeout: 30_000,
  expect: { timeout: 5_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? 'github' : 'list',

  // 自动起 vite + api 服务 (CI 必须, 本地 reuseExistingServer 复用已有服务)
  webServer: [
    {
      command: 'cd apps/api && DATABASE_URL=postgres://lsm_crm:lsm_crm_ci@localhost:5432/lsm_crm SESSION_SECRET=ci-only-32-bytes-not-for-prod COOKIE_INSECURE=1 NODE_ENV=test bun run dev',
      url: 'http://127.0.0.1:33501/api/v1/health',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // 显式传 VITE_API_PROXY_TARGET (避免 vite 默认 proxy target 走 'localhost' 在 CI runner 上出问题)
      // 加 DEBUG=vite:proxy 看 proxy 是否生效
      command: 'VITE_API_PROXY_TARGET=http://127.0.0.1:33501 DEBUG=vite:proxy pnpm dev',
      url: 'http://127.0.0.1:33500',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  use: {
    baseURL: 'http://127.0.0.1:33500',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    // 移动端 webkit (iPhone 13) 项目默认禁用, 跑前需先装 webkit 浏览器:
    //   pnpm exec playwright install webkit
    // 想启用时取消下面注释
    // {
    //   name: 'mobile-m',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],
})
