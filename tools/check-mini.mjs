import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(()=>{
  const A=window.__APP__; const L=A.qa.hudRects();
  const samples = {};
  for (const p of L.panels) samples[p.key]=A.qa.sampleHud(p);
  samples.map=A.qa.sampleHud(L.map);
  return {samples, state:A.state(), cam:A.qa.cameraInfo()};
});
await page.screenshot({path:'qa/shots/app-v3.png'});
console.log(JSON.stringify({out,logs},null,2));
await browser.close();
