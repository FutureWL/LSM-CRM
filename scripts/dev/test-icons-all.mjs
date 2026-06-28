import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// 捕获错误
page.on('pageerror', err => console.log('页面错误:', err.message));
page.on('console', msg => {
  if (msg.type() === 'error') console.log('控制台错误:', msg.text());
});

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

await page.goto('http://localhost:33500/m/home');
await page.waitForTimeout(2000);

const content = await page.locator('body').textContent();
console.log('首页内容片段:', content?.slice(0, 500));

await page.screenshot({ path: '/tmp/home-new.png', fullPage: true });
console.log('截图已保存');

await browser.close();
