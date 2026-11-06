import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  for (const dist of [0.35,0.45,0.55,0.65]) {
    A.qa.reset(); await new Promise(r=>setTimeout(r,250));
    const near=A.qa.teleportNear('mug_white',dist); await new Promise(r=>setTimeout(r,800));
    const st=A.robot.getState(); const g=A.qa.grabByName('mug_white');
    res[dist]={near, robotY:+st.pos[1].toFixed(3), robot:st.pos.map(v=>+v.toFixed(2)), grab:g};
    if (g.ok) A.qa.release();
    await new Promise(r=>setTimeout(r,400));
  }
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
