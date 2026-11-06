import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
const page = await browser.newPage(); await page.bringToFront();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await page.goto(URL, {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2600);
const info = await page.evaluate(()=>{
  const rect=(id)=>{const e=document.getElementById(id); if(!e) return null; const b=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1),display:cs.display,text:(e.innerText||'').slice(0,200)};};
  return {touchPoints:navigator.maxTouchPoints, ontouch:'ontouchstart' in window, controls:rect('hud-controls'), map:rect('hud-map'), trail:rect('hud-map-trail'), hint:rect('hud-hint'), touch:rect('hud-touch'), stick:rect('hud-stick'), knob:rect('hud-stick-knob'), scrollW:document.documentElement.scrollWidth, inner:[innerWidth,innerHeight]};
});
console.log('INFO', JSON.stringify(info));
await page.screenshot({path:'qa/visual/shots/r3-mobile-touch.png'});
// simulate left-stick drive: touch inside stick, drag up, hold, release
const st=info.stick;
if (st && st.w>0) {
  const cx=st.x+st.w/2, cy=st.y+st.h/2;
  await page.touchscreen.touchStart(cx, cy);
  await page.touchscreen.touchMove(cx, cy-28);
  await wait(1200);
  const moved = await page.evaluate(()=>window.__APP__.state().robot);
  await page.screenshot({path:'qa/visual/shots/r3-mobile-drive.png'});
  await page.touchscreen.touchEnd();
  await wait(400);
  console.log('STICK DRIVE robot', JSON.stringify(moved));
} else { console.log('no stick visible'); }
// tap grab: tap center of screen on a liftable object? just tap center
await page.touchscreen.tap(195, 500);
await wait(600);
console.log('after tap', JSON.stringify(await page.evaluate(()=>({hud:window.__APP__.qa.hudText(), robot:window.__APP__.state().robot}))));
await page.screenshot({path:'qa/visual/shots/r3-mobile-tap.png'});
await browser.close();
