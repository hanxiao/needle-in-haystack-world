import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
await page.screenshot({path:'qa/shots/hud2-initial.png'});
// drive a loop to draw trail
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,1800)); await page.keyboard.up('KeyW');
await page.keyboard.down('KeyD'); await new Promise(r=>setTimeout(r,700)); await page.keyboard.up('KeyD');
await page.keyboard.down('KeyS'); await new Promise(r=>setTimeout(r,900)); await page.keyboard.up('KeyS');
await page.keyboard.down('KeyA'); await new Promise(r=>setTimeout(r,700)); await page.keyboard.up('KeyA');
await new Promise(r=>setTimeout(r,400));
const info = await page.evaluate(()=>({trailPoints:window.__APP__.trail.points.length, trailVisible:window.__APP__.trail.mesh.visible, layers:window.__APP__.trail.mesh.layers.mask, topLayers:window.__APP__.robot.cameras.top.layers.mask, state:window.__APP__.state(), controls:[...document.querySelectorAll('#hud-controls kbd')].map(k=>({k:k.textContent,on:k.classList.contains('is-on')})), armText:document.getElementById('hud-arm').textContent}));
await page.screenshot({path:'qa/shots/hud2-driven.png'});
console.log(JSON.stringify({info,logs},null,2));
await browser.close();
