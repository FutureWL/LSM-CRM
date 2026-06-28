import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// 访问客户页面
await page.goto('http://localhost:33500/m/customers');
await page.waitForTimeout(2000);

// 获取页面截图
await page.screenshot({ path: '/tmp/customers-page.png', fullPage: true });
console.log('截图已保存到 /tmp/customers-page.png');

// 列出所有按钮
const buttons = await page.locator('button').all();
console.log('\n页面上的所有按钮:');
for (const btn of buttons) {
  const text = await btn.textContent();
  const html = await btn.innerHTML();
  console.log(`- "${text?.trim()}" | HTML: ${html.slice(0, 80)}`);
}

await browser.close();
