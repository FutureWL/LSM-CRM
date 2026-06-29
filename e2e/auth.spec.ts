import { test, expect } from '@playwright/test'

/**
 * 登录流程 e2e
 *
 * 注意: 快捷登录按钮 (LoginView.quickLogin) 只填 email + password,
 * 不会自动提交. e2e 模拟真实用户: 点快捷按钮后再点 "登录" 提交.
 */
test.describe('登录流程', () => {
  test('dev 环境快捷登录 admin', async ({ page }) => {
    // 1. 打开根路径, 期望跳到登录页
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)

    // 2. 看到 2 个快捷登录按钮 (dev 模式显示)
    const yulishaBtn = page.getByRole('button', { name: /余莉莎/ })
    await expect(yulishaBtn).toBeVisible()
    await expect(page.getByRole('button', { name: /魏来/ })).toBeVisible()

    // 3. 点 admin 按钮 (只填值), 再点登录按钮 (提交)
    await yulishaBtn.click()
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // 4. 等跳到 admin 仪表盘
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })

    // 5. 看到 KPI 标签 (用 exact 避免 strict mode 冲突)
    await expect(page.locator('h1', { hasText: '仪表盘' })).toBeVisible()
    await expect(page.getByText('客户总数', { exact: true })).toBeVisible()
    await expect(page.getByText('本月拜访', { exact: true })).toBeVisible()
  })

  test('dev 环境快捷登录 sales → 移动端 home', async ({ page, isMobile }) => {
    test.skip(!isMobile, '本测试只跑 mobile-m project')

    await page.goto('/login')
    await page.getByRole('button', { name: /魏来/ }).click()
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // 销售跳到 /m/home
    await expect(page).toHaveURL(/\/m/, { timeout: 10_000 })
    // 移动端有"首页" tab
    await expect(page.getByText('首页').first()).toBeVisible()
  })

  test('未登录访问 /admin 重定向到 /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
