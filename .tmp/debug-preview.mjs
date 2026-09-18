import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});
await page.goto('http://localhost:3000');
await page.locator('[data-preview="access"]').scrollIntoViewIfNeeded();
for(let i=0;i<10;i++){
 console.log(await page.evaluate(()=>{const scene=document.querySelector('[data-preview="access"]');const code=document.querySelector('[data-access-code]');return {y:scrollY,scene:scene.getBoundingClientRect().toJSON(),opacity:getComputedStyle(scene).opacity,code:getComputedStyle(code).visibility,char:getComputedStyle(document.querySelector('[data-email-char]')).opacity,visible:document.visibilityState};}));
 await page.waitForTimeout(1000);
}
await page.screenshot({path:'artifacts/preview-debug.png'});
await browser.close();
