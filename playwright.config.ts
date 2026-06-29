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

  // 服务由调用方负责启动 (CI step 用 nohup 起, 本地手动起)
  // Playwright 不自己起 (避免 webServer 模式在 CI runner 上的 env 传递坑)
  webServer: [
    {
      // 健康检查, 等 vite 起好
      command: 'node -e "require(\'http\').get(\'http://127.0.0.1:33500\', r => process.exit(r.statusCode === 200 ? 0 : 1))"',
      url: 'http://127.0.0.1:33500',
      timeout: 60_000,
      reuseExistingServer: true,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // 健康检查, 等 api 起好
      command: 'node -e "require(\'http\').get(\'http://127.0.0.1:33501/api/v1/health\', r => process.exit(r.statusCode === 200 ? 0 : 1))"',
      url: 'http://127.0.0.1:33501/api/v1/health',
      timeout: 60_000,
      reuseExistingServer: true,
      stdout: 'ignore',
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
