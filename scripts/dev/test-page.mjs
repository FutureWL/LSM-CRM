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

// 2. 访问账号管理页
console.log('\n=== 2. 账号管理页 ===');
await page.goto('http://localhost:33500/admin/users');
await page.waitForTimeout(3000);

// 获取页面内容
const content = await page.locator('body').textContent();
console.log('页面内容:');
console.log(content?.slice(0, 1500));

// 3. 检查 API 响应
console.log('\n=== 3. API 响应 ===');
const resp = await page.request.get('http://localhost:33500/api/v1/users');
console.log('API 状态:', resp.status());
console.log('API 响应:', await resp.text());

await browser.close();
console.log('\n=== 完成 ===');
