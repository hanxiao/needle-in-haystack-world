import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
const page = await browser.newPage();
await page.bringToFront();
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2500));
const info = await page.evaluate(()=>{
  const A=window.__APP__, R=A.renderer, c=R.domElement, r=c.getBoundingClientRect();
  
  return {pr:R.getPixelRatio(),  buf:[c.width,c.height], rect:[r.width,r.height], css:[getComputedStyle(c).width,getComputedStyle(c).height], inner:[innerWidth,innerHeight], dpr:devicePixelRatio, fov:A.qa.cameraInfo().fov};
});
console.log('before', JSON.stringify(info));
await page.screenshot({path:'qa/visual/shots/dpr-a.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.renderer.setPixelRatio(1); A.renderer.setSize(innerWidth, innerHeight, false); });
await new Promise(r=>setTimeout(r,900));
const info2 = await page.evaluate(()=>{ const A=window.__APP__, R=A.renderer, c=R.domElement, r=c.getBoundingClientRect(); return {pr:R.getPixelRatio(), buf:[c.width,c.height], rect:[r.width,r.height]}; });
console.log('after pr=1', JSON.stringify(info2));
await page.screenshot({path:'qa/visual/shots/dpr-b.png'});
await browser.close();
