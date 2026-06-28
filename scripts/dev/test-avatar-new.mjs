import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

await page.goto('http://localhost:33500/m/profile');
await page.waitForTimeout(2000);

// 截图
await page.screenshot({ path: '/tmp/profile-new.png', fullPage: true });
console.log('新头像截图已保存');

// 获取头像 URL
const avatarSrc = await page.locator('img[alt*="魏来"]').first().getAttribute('src');
console.log('头像 URL:', avatarSrc?.slice(0, 100));

await browser.close();
