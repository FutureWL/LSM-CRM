import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// 1. 用魏来账号登录
console.log('=== 1. 魏来登录 ===');
await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('登录后 URL:', page.url());

// 2. 检查当前用户
console.log('\n=== 2. 当前账号信息 ===');
const userInfo = await page.locator('body').textContent();
if (userInfo?.includes('魏来')) {
  console.log('✅ 登录成功，当前账号是魏来');
} else {
  console.log('当前页面包含:', userInfo?.slice(0, 500));
}

// 3. 直接访问拜访记录
console.log('\n=== 3. 拜访记录 ===');
await page.goto('http://localhost:33500/m/visits');
await page.waitForTimeout(2000);
const visitsContent = await page.locator('body').textContent();
console.log(visitsContent?.slice(0, 800));

await browser.close();
