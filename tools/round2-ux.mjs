import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'qa/shots/r2-ux-spawn.png'});
// key highlight
await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft'); await new Promise(r=>setTimeout(r,400));
const keyState = await page.evaluate(()=>({on:[...document.querySelectorAll('#hud-controls kbd.is-on')].map(k=>k.textContent), badges:{view:document.getElementById('hud-view').textContent, sur:document.getElementById('hud-360').textContent, light:document.getElementById('hud-light').textContent}}));
await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
// mouse drag highlight
await page.mouse.move(700,450); await page.mouse.down(); await page.mouse.move(760,470,{steps:5}); await new Promise(r=>setTimeout(r,300));
const mouseState = await page.evaluate(()=>({on:[...document.querySelectorAll('#hud-controls kbd.is-on')].map(k=>k.textContent)}));
await page.mouse.up();
// drive loop for trail
for (const [k,ms] of [['KeyW',1500],['KeyD',800],['KeyS',1000],['KeyA',800]]) { await page.keyboard.down(k); await new Promise(r=>setTimeout(r,ms)); await page.keyboard.up(k); }
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:'qa/shots/r2-ux-trail.png'});
// toggle modes
await page.keyboard.press('KeyV'); await page.keyboard.press('KeyC'); await page.keyboard.press('KeyL'); await new Promise(r=>setTimeout(r,500));
const toggles = await page.evaluate(()=>({badges:{view:document.getElementById('hud-view').textContent, sur:document.getElementById('hud-360').textContent, light:document.getElementById('hud-light').textContent}, night:window.__APP__.state().night, surround:window.__APP__.state().surround, mode:window.__APP__.state().robot.mode}));
await page.screenshot({path:'qa/shots/r2-ux-night.png'});
// mobile
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setNight(false); A.qa.setView('third'); A.qa.setSurround(true); A.qa.reset(); });
await page.setViewport({width:390,height:844,deviceScaleFactor:2}); await new Promise(r=>setTimeout(r,1400));
await page.screenshot({path:'qa/shots/r2-ux-mobile.png'});
const mobile = await page.evaluate(()=>({state:window.__APP__.state(), vp:window.__APP__.qa.viewport(), controlsDisplay:getComputedStyle(document.getElementById('hud-controls')).display}));
// object/mass spot checks
const data = await page.evaluate(()=>({objects:window.__APP__.qa.objects().length, dynamic:window.__APP__.physics.dynamicObjects.length, masses:['sofa','fridge','bed','wardrobe','dining_table','chair_1','coffee_table','mug_white','laptop','needle'].map(n=>window.__APP__.qa.object(n)), trail:window.__APP__.trail.points.length, controls:!!document.getElementById('hud-controls')}));
console.log(JSON.stringify({keyState,mouseState,toggles,mobile,data,logs},null,2));
await browser.close();
