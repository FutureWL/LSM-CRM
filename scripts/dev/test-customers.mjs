import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// 1. 登录
console.log('=== 1. 登录 ===');
await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'yulisha@lsm-crm.local');
await page.fill('input[type="password"]', 'Lsm@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('当前 URL:', page.url());

// 2. 访问客户管理页
console.log('\n=== 2. 客户管理页 ===');
await page.goto('http://localhost:33500/admin/customers');
await page.waitForTimeout(3000);
const content = await page.locator('body').textContent();
console.log('页面内容:');
console.log(content?.slice(0, 1000));

// 3. 检查是否有新建按钮
const newBtn = await page.locator('button:has-text("新建客户")');
const btnCount = await newBtn.count();
console.log('\n=== 新建客户按钮 ===');
console.log('找到新建按钮:', btnCount > 0);

// 4. 点击新建按钮
if (btnCount > 0) {
  await newBtn.click();
  await page.waitForTimeout(1000);
  const modalContent = await page.locator('body').textContent();
  console.log('\n=== 弹窗内容 ===');
  console.log(modalContent?.includes('新建客户') ? '弹窗已打开' : '弹窗未打开');
}

await browser.close();
console.log('\n=== 完成 ===');
