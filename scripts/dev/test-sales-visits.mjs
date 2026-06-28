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
console.log('URL:', page.url());

// 2. 访问拜访记录页面
console.log('\n=== 2. 拜访记录页面 ===');
await page.goto('http://localhost:33500/m/visits');
await page.waitForTimeout(3000);
const content = await page.locator('body').textContent();
console.log('页面内容:');
console.log(content?.slice(0, 1500));

// 3. 检查是否有拜访记录
if (content?.includes('江西中志精密机械') || content?.includes('沟通')) {
  console.log('\n✅ 拜访记录已显示');
} else {
  console.log('\n⚠️ 拜访记录未显示');
}

// 4. 检查 API 响应
console.log('\n=== 3. API 响应 ===');
const resp = await page.request.get('http://localhost:33500/api/v1/visits');
console.log('API 状态:', resp.status());
const data = await resp.json();
console.log('拜访数量:', data?.data?.items?.length);
if (data?.data?.items?.length > 0) {
  console.log('第一条:', data.data.items[0].content, '-', data.data.items[0].customerId);
}

await browser.close();
console.log('\n=== 完成 ===');
