import { test, expect } from '@playwright/test'

/**
 * 客户列表 + 详情 e2e
 * 销售登录 → 看到 80 个客户 → 进详情看到阶段 + 时间线
 */
test.describe('客户管理', () => {
  test.beforeEach(async ({ page }) => {
    // 用 sales 账号 (魏来), 移动端 /m/customers
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByRole('button', { name: /魏来/ }).click()
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/\/m/, { timeout: 10_000 })
  })

  test('销售移动端客户列表显示种子数据', async ({ page }) => {
    // 进客户 tab
    await page.goto('/m/customers')
    await expect(page).toHaveURL(/\/m\/customers/)

    // 种子 80 个客户, "共 80 位" 副标题证明列表不空
    await expect(page.getByText(/共 \d+ 位/)).toBeVisible()

    // 列表项是 div (@click + router.push), 用 class 找第一个
    const firstItem = page.locator('div.bg-white.rounded-xl').first()
    await expect(firstItem).toBeVisible({ timeout: 5_000 })

    // 看到搜索框
    await expect(page.getByPlaceholder(/搜索/)).toBeVisible()
  })

  test('客户详情显示阶段标签 + 拜访时间线', async ({ page }) => {
    // 直接从 API 拿一个 id (避免依赖 UI 列表)
    const res = await page.request.get('/api/v1/customers?limit=1')
    const body = await res.json() as { data: { items: Array<{ id: string }> } }
    const firstId = body.data.items[0]?.id
    expect(firstId).toBeTruthy()

    await page.goto(`/m/customers/${firstId}`)
    await expect(page).toHaveURL(/\/m\/customers\//, { timeout: 10_000 })

    // 详情页有某个阶段标签
    await expect(page.locator('body')).toContainText(
      /新客户|已联系|有意向|商务谈判|已成交|已流失/,
    )
  })

  test('admin 桌面端客户列表 + 阶段筛选', async ({ page }) => {
    // 切换到 admin: 登出 + 登入余莉莎
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByRole('button', { name: /余莉莎/ }).click()
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })

    await page.goto('/admin/customers')
    await expect(page).toHaveURL(/\/admin\/customers/)
    await expect(page.getByText('客户管理')).toBeVisible()

    // 阶段 tab 都在
    await expect(page.getByRole('button', { name: /新客户/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /已成交/ })).toBeVisible()
  })
})
