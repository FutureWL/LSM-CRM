import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// 1. 登录
await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'yulisha@lsm-crm.local');
await page.fill('input[type="password"]', 'Lsm@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// 2. 访问客户管理页并创建客户
await page.goto('http://localhost:33500/admin/customers');
await page.waitForTimeout(2000);

// 点击新建客户按钮
await page.click('button:has-text("新建客户")');
await page.waitForTimeout(500);

// 填写表单
await page.fill('input[placeholder="请输入公司名称"]', '杭州科技有限公司');
await page.fill('input[placeholder="请输入联系人姓名"]', '李明');
await page.fill('input[placeholder="手机号码"]', '13912345678');
await page.fill('input[placeholder="email@example.com"]', 'liming@hztc.com');
await page.fill('input[placeholder="如：互联网、金融"]', '互联网');
await page.fill('input[type="number"]', '500000');

// 点击创建
await page.click('button:has-text("创建"):not(:has-text("创建中"))');
await page.waitForTimeout(2000);

// 检查结果
const content = await page.locator('body').textContent();
console.log('=== 创建后页面 ===');
console.log(content?.slice(0, 1500));

// 检查客户是否出现在列表中
if (content?.includes('杭州科技有限公司')) {
  console.log('\n✅ 客户创建成功！');
} else {
  console.log('\n⚠️ 客户可能未创建成功');
}

await browser.close();
