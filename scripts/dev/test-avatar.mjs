import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// 访问个人中心
await page.goto('http://localhost:33500/m/profile');
await page.waitForTimeout(2000);

// 截图
await page.screenshot({ path: '/tmp/profile-page.png', fullPage: true });
console.log('截图已保存');

// 获取头像区域的 HTML
const avatarArea = await page.locator('img[alt*="魏来"]').first().innerHTML().catch(() => '无');
console.log('头像 HTML:', avatarArea);

// 获取页面上的所有图片
const images = await page.locator('img').all();
console.log('\n页面图片:');
for (const img of images) {
  const src = await img.getAttribute('src');
  const alt = await img.getAttribute('alt');
  console.log(`- alt: "${alt}", src: ${src?.slice(0, 80)}...`);
}

await browser.close();
