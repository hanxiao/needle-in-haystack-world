import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
const dom = await page.evaluate(()=>({canvases:[...document.querySelectorAll('canvas')].map(c=>({id:c.id,w:c.width,h:c.height,style:c.getAttribute('style'),cls:c.className,z:getComputedStyle(c).zIndex,opacity:getComputedStyle(c).opacity})), hudEls:[...document.querySelectorAll('.hud, #hud, .hud-root')].map(e=>({tag:e.tagName,id:e.id,cls:e.className,style:e.getAttribute('style')}))}));
console.log('DOM', JSON.stringify(dom,null,1));
await page.evaluate(()=>window.__APP__.qa.reset());
await new Promise(r=>setTimeout(r,1200));
await page.screenshot({path:'qa/visual/shots/diag-reset1.png'});
console.log('after reset cam', JSON.stringify(await page.evaluate(()=>window.__APP__.qa.cameraInfo())));
// hide hud canvas and screenshot
await page.evaluate(()=>{ const cs=[...document.querySelectorAll('canvas')]; cs.forEach(c=>{ if(c.id!=='scene') c.style.display='none'; }); });
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:'qa/visual/shots/diag-reset2-nohud.png'});
await browser.close();
