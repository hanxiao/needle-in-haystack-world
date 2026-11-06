import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const res={obj:A.qa.object('laundry_basket'), trash:A.qa.object('trash_bin')};
  A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  const near=A.qa.teleportNear('laundry_basket',0.45); await new Promise(r=>setTimeout(r,700));
  for(let i=0;i<6;i++){ const s=A.qa.screenOf('laundry_basket'); if(s) A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,180)); }
  res.near=near; res.target=A.state().target; res.hud=A.qa.hudText();
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
