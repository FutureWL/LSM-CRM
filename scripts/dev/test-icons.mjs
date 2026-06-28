import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// 访问客户页面（激活"客户"tab）
await page.goto('http://localhost:33500/m/customers');
await page.waitForTimeout(2000);

// 获取底部导航的 HTML
const navHtml = await page.locator('nav').innerHTML();
console.log('底部导航 HTML:');
console.log(navHtml);

// 检查是否有 SVG 图标
const svgCount = await page.locator('nav svg').count();
console.log('\n导航中 SVG 图标数量:', svgCount);

await browser.close();
