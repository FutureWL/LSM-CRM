import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// 1. 魏来登录
console.log('=== 1. 魏来登录 ===');
await page.goto('http://localhost:33500/login');
await page.fill('input[type="email"]', 'weilai@lsm-crm.local');
await page.fill('input[type="password"]', 'WeiLai@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('URL:', page.url());

// 2. 访问客户页面
console.log('\n=== 2. 客户页面 ===');
await page.goto('http://localhost:33500/m/customers');
await page.waitForTimeout(2000);

// 3. 点击新建按钮
const addBtn = await page.locator('button:has-text("+")');
const btnCount = await addBtn.count();
console.log('找到新建按钮:', btnCount > 0);

if (btnCount > 0) {
  await addBtn.click();
  await page.waitForTimeout(500);
  
  // 填写表单
  await page.fill('input[placeholder="请输入公司名称"]', '北京创新科技有限公司');
  await page.fill('input[placeholder="请输入联系人姓名"]', '王芳');
  await page.fill('input[placeholder="手机号码"]', '13800138001');
  await page.fill('input[placeholder="如：互联网、金融、制造"]', '科技');
  await page.fill('input[type="number"]', '100000');
  
  // 点击创建
  await page.click('button:has-text("创建")');
  await page.waitForTimeout(2000);
  
  const content = await page.locator('body').textContent();
  console.log('\n=== 创建后页面 ===');
  console.log(content?.slice(0, 800));
  
  if (content?.includes('北京创新科技')) {
    console.log('\n✅ 客户创建成功！');
  } else {
    console.log('\n⚠️ 检查创建结果');
  }
}

await browser.close();
