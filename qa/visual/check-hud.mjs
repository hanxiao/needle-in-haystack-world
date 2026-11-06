import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
const t0=Date.now();
await page.goto('http://127.0.0.1:4182/', {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
const readyMs=Date.now()-t0;
await new Promise(r=>setTimeout(r,5000));
const out = await page.evaluate(async ()=>{
  const A=window.__APP__; const rects=A.qa.hudRects(); const s={};
  for (const p of rects.panels) s[p.key]=A.qa.sampleHud(p);
  s.map=A.qa.sampleHud(rects.map);
  return {fps:A.fps, draw:A.state().drawCalls, tri:A.state().triangles, errors:A.state().errors, samples:s, hud:A.qa.hudText()};
});
console.log(JSON.stringify({readyMs, ...out}, null, 1));
await browser.close();
