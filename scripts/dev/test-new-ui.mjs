import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

await page.goto('http://localhost:33500/m/customers');
await page.waitForTimeout(2000);

// 列出所有按钮
const buttons = await page.locator('button').all();
console.log('页面按钮:');
for (const btn of buttons) {
  const text = await btn.textContent();
  console.log(`- "${text?.trim()}"`);
}

await browser.close();
