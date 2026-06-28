import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', err => console.log('错误:', err.message));

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'yulisha@lsm-crm.local');
await page.fill('input[type="password"]', 'Lsm@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

console.log('当前 URL:', page.url());

// 检查侧边栏
const sidebarContent = await page.locator('aside').textContent();
console.log('侧边栏内容:', sidebarContent?.slice(0, 200));

// 检查页面是否正常显示
const mainContent = await page.locator('main').textContent();
console.log('主内容片段:', mainContent?.slice(0, 300));

await browser.close();
