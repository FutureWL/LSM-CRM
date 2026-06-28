import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// 捕获网络请求
const requests = [];
page.on('request', req => {
  if (req.url().includes('/api/')) {
    requests.push({url: req.url(), method: req.method()});
  }
});

page.on('response', async resp => {
  if (resp.url().includes('/api/')) {
    try {
      const body = await resp.text();
      console.log('API 响应:', resp.status(), resp.url().slice(-30), body.slice(0, 200));
    } catch(e) {}
  }
});

// 1. 登录
console.log('=== 登录 ===');
await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

console.log('\n当前 URL:', page.url());

// 2. 访问拜访页面
console.log('\n=== 访问拜访记录 ===');
await page.goto('http://localhost:33500/m/visits');
await page.waitForTimeout(3000);

const content = await page.locator('body').textContent();
console.log('\n页面内容:');
console.log(content?.slice(0, 1000));

// 3. 检查 cookies
const cookies = await context.cookies('http://localhost:33500');
console.log('\n=== Cookies ===');
console.log(cookies.map(c => ({name: c.name, value: c.value.slice(0, 20) + '...'})));

await browser.close();
