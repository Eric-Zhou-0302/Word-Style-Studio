import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel: process.env.CHROME_CHANNEL || undefined});
  const context = await browser.newContext({viewport:{width:1440,height:960}});
  const page = await context.newPage();
  const url = 'http://127.0.0.1:5173';
  await page.goto(url + '/#workspace');
  const name = page.getByRole('textbox',{name:'样式名称',exact:true});
  await name.waitFor();
  if (process.env.UPDATE_SCREENSHOTS) {
    await page.screenshot({path:'public/images/workspace-preview.png'});
    const english = await browser.newContext({viewport:{width:1440,height:960}});
    await english.addInitScript(()=>localStorage.setItem('style-studio.locale.v1','en'));
    const translated = await english.newPage();
    await translated.goto(url+'/#workspace');
    await translated.locator('.editor-content input').first().waitFor();
    await translated.screenshot({path:'public/images/workspace-preview-en.png'});
    await english.close();
  }
  await name.fill('浏览器回归 A');
  await page.waitForFunction(()=>localStorage.getItem('style-studio.project.v1')?.includes('浏览器回归 A'));
  const other = await context.newPage();
  await other.goto(url+'/#workspace');
  await other.getByRole('textbox',{name:'样式名称',exact:true}).waitFor();
  // 两页都完成编辑后释放保存锁，稳定重现并发写入。
  await page.evaluate(()=>new Promise(ready=>navigator.locks.request('style-studio.project.v1',()=>new Promise(resolve=>{window.releaseSave=resolve;ready();}))));
  await name.fill('本页版本');
  await other.getByRole('textbox',{name:'样式名称',exact:true}).fill('另一页版本');
  await page.evaluate(()=>window.releaseSave());
  await other.getByRole('button',{name:'使用本页'}).click();
  await page.waitForFunction(()=>localStorage.getItem('style-studio.project.v1')?.includes('另一页版本'));
  await page.reload();
  assert.equal(await name.inputValue(),'另一页版本');
  await page.setViewportSize({width:390,height:844});
  for(const label of ['样式目录','预览','设置']) await page.locator('.mobile-navigation').getByRole('button',{name:label}).click();
  assert.ok(await name.isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(url+'/tests/native-import.html');
  await page.waitForFunction(()=>/ALL PASSED|FAILED/.test(document.querySelector('#result').textContent));
  assert.match(await page.locator('#result').innerText(),/ALL PASSED/);
  console.log('Workspace save, conflict recovery, mobile navigation and native import passed.');
} finally {
  await browser?.close();
  await server.close();
}
