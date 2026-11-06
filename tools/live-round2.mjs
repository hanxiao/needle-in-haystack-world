import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`)); page.on('requestfailed',r=>logs.push(`[fail] ${r.url()}`));
await page.goto('https://hanxiao.io/needle-in-haystack-world/?v=round2', {waitUntil:'networkidle0', timeout:90000});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,2000));
// drive a loop for trail
for (const [k,ms] of [['KeyW',1800],['KeyD',800],['KeyS',1000],['KeyA',800]]) { await page.keyboard.down(k); await new Promise(r=>setTimeout(r,ms)); await page.keyboard.up(k); }
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:'qa/shots/live-round2.png'});
const desk = await page.evaluate(()=>({build:document.querySelector('meta[name="build"]')?.content, state:window.__APP__.state(), trail:window.__APP__.trail.points.length, controls:!!document.getElementById('hud-controls'), keycaps:document.querySelectorAll('#hud-controls kbd').length, arm:document.getElementById('hud-arm')?.textContent, badges:{view:document.getElementById('hud-view')?.textContent, sur:document.getElementById('hud-360')?.textContent, light:document.getElementById('hud-light')?.textContent}, objects:window.__APP__.qa.objects().length, dynamic:window.__APP__.physics.dynamicObjects.length, masses:['sofa','fridge','bed','wardrobe','mug_white','laptop','needle'].map(n=>window.__APP__.qa.object(n)?.mass)}));
// mobile dpr2
await page.setViewport({width:390,height:844,deviceScaleFactor:2}); await new Promise(r=>setTimeout(r,1400));
const mob = await page.evaluate(()=>({vp:window.__APP__.qa.viewport(), hudCanvas:[window.__APP__.hudRenderer.domElement.width,window.__APP__.hudRenderer.domElement.height], samples:Object.fromEntries(window.__APP__.qa.hudRects().panels.map(p=>[p.key,window.__APP__.qa.sampleHud(p).litRatio])), map:window.__APP__.qa.sampleHud(window.__APP__.qa.hudRects().map).litRatio, state:window.__APP__.state()}));
await page.screenshot({path:'qa/shots/live-round2-mobile.png'});
console.log(JSON.stringify({desk,mob,logs},null,2));
await browser.close();
