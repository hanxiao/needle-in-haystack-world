import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-2.4,-0.9,0.0); A.qa.setCamera(0.0,0.15,1.4); A.qa.setNight(true); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:'qa/shots/nightinspect.png'});
const out = await page.evaluate(()=>{
  const A=window.__APP__; const list=[];
  A.scene.traverse(o=>{ if(!o.isMesh) return; const name=o.name||o.parent?.name||''; if(!/city_view|exterior|windows/.test(name)) return; const mats=Array.isArray(o.material)?o.material:[o.material]; list.push({name, mats:mats.map(m=>({type:m.type,color:m.color?.getHexString?.(),emissive:m.emissive?.getHexString?.(),ei:m.emissiveIntensity,op:m.opacity,trans:m.transparent,env:m.envMapIntensity}))}); });
  return list.slice(0,30);
});
console.log(JSON.stringify(out,null,2));
await browser.close();
