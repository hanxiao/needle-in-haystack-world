import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`)); page.on('requestfailed',r=>logs.push(`[fail] ${r.url()}`));
await page.goto('https://hanxiao.io/needle-in-haystack-world/?v=final', {waitUntil:'networkidle0', timeout:90000});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,2000));
const out = await page.evaluate(()=>({build:document.querySelector('meta[name="build"]')?.content, state:window.__APP__.state(), hud:window.__APP__.qa.hudText(), hudRects:window.__APP__.qa.hudRects(), gpu:window.__APP__.qa.gpu(), objects:window.__APP__.qa.objects().length, required:['sofa','fridge','bed','wardrobe','mug_white','needle'].map(n=>window.__APP__.qa.object(n))}));
await page.screenshot({path:'qa/shots/live-final.png'});
// mobile live
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await new Promise(r=>setTimeout(r,1200));
const mob = await page.evaluate(()=>({state:window.__APP__.state(), vp:window.__APP__.qa.viewport()}));
await page.screenshot({path:'qa/shots/live-mobile.png'});
console.log(JSON.stringify({out,mob,logs},null,2));
await browser.close();
