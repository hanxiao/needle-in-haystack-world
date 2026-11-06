import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
// drive a longer loop
for (const [key,ms] of [['KeyW',2200],['KeyD',900],['KeyS',1400],['KeyA',900],['KeyW',1200]]) {
  await page.keyboard.down(key); await new Promise(r=>setTimeout(r,ms)); await page.keyboard.up(key);
}
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:'qa/shots/hud3-trail.png'});
// hold W and inspect active keys/badges
await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
await new Promise(r=>setTimeout(r,300));
const active = await page.evaluate(()=>({
  keys:[...document.querySelectorAll('#hud-controls kbd')].filter(k=>k.classList.contains('is-on')).map(k=>k.textContent),
  badges:{view:document.getElementById('hud-view').textContent, surround:document.getElementById('hud-360').textContent, light:document.getElementById('hud-light').textContent, viewOn:document.getElementById('hud-view').classList.contains('is-on'), surroundOn:document.getElementById('hud-360').classList.contains('is-on')},
  trailPoints:window.__APP__.trail.points.length,
  trailLayers:window.__APP__.trail.mesh.layers.mask,
  topLayers:window.__APP__.robot.cameras.top.layers.mask,
  state:window.__APP__.state(),
}));
await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
// toggle V/C/L and inspect
await page.keyboard.press('KeyV'); await page.keyboard.press('KeyC'); await page.keyboard.press('KeyL');
await new Promise(r=>setTimeout(r,300));
const toggled = await page.evaluate(()=>({badges:{view:document.getElementById('hud-view').textContent, surround:document.getElementById('hud-360').textContent, light:document.getElementById('hud-light').textContent}, state:window.__APP__.state(), hudClasses:{view:document.getElementById('hud-view').className, surround:document.getElementById('hud-360').className}}));
console.log(JSON.stringify({active,toggled},null,2));
await browser.close();
