import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

console.log('=== 登录页快捷登录 ===');
await page.goto('http://localhost:33500/login');
await page.waitForTimeout(2000);

const content = await page.locator('body').textContent();
console.log('页面包含快捷登录:', content?.includes('快捷登录'));
console.log('页面包含余莉莎:', content?.includes('余莉莎'));
console.log('页面包含魏来:', content?.includes('魏来'));

// 测试点击余莉莎按钮
console.log('\n=== 测试点击余莉莎按钮 ===');
await page.click('button:has-text("余莉莎")');
await page.waitForTimeout(500);
const emailValue = await page.inputValue('input[type="email"]');
const passwordValue = await page.inputValue('input[type="password"]');
console.log('邮箱:', emailValue);
console.log('密码:', passwordValue ? '已填充' : '未填充');

await browser.close();
console.log('\n✅ 快捷登录按钮已添加');
