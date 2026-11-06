import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
await page.goto(URL, {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2400);
// close-up front
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setView('third'); A.qa.setCamera(Math.PI, 0.22, 0.8); });
await wait(800);
await page.screenshot({path:'qa/visual/shots/r3-robot-closeup.png'});
// spin diff: 3 frames 250ms apart
for (let i=0;i<3;i++){ await page.screenshot({path:`qa/visual/shots/r3-spin-${i}.png`}); await wait(250); }
// moving state close-up
await page.evaluate(()=>{ const A=window.__APP__; A.qa.hold('KeyW'); });
await wait(500);
await page.screenshot({path:'qa/visual/shots/r3-robot-moving.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.qa.releaseKey('KeyW'); });
// night LED
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setNight(true); });
await wait(900);
await page.screenshot({path:'qa/visual/shots/r3-robot-night.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setNight(false); });
await browser.close();
