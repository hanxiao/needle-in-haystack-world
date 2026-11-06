import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
const page = await browser.newPage();
await page.bringToFront();
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
for (let i=0;i<4;i++){
  await new Promise(r=>setTimeout(r,1200));
  const info = await page.evaluate(()=>({fps:window.__APP__.fps, cam:window.__APP__.qa.cameraInfo().pos}));
  await page.screenshot({path:`qa/visual/shots/diag-m4-${i}.png`});
  console.log(i, JSON.stringify(info));
}
await browser.close();
