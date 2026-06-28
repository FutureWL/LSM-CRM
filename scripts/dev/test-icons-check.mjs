import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', err => console.log('错误:', err.message));

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// 测试访问各个页面
const pages = ['/m/home', '/m/customers', '/m/visits', '/m/profile'];
for (const p of pages) {
  console.log(`\n=== ${p} ===`);
  await page.goto(`http://localhost:33500${p}`);
  await page.waitForTimeout(1500);
  const content = await page.locator('body').textContent();
  const hasError = content?.includes('NaN') || content?.includes('undefined') || content?.includes('[object');
  console.log(hasError ? '❌ 有问题' : '✅ 正常');
}

await browser.close();
