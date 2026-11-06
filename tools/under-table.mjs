import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  const mug=A.qa.object('mug_white'); res.mug=mug;
  for (const [dx,dz] of [[0,0],[0.1,0.1],[-0.1,0.1],[0.15,0]]) {
    A.qa.reset(); await new Promise(r=>setTimeout(r,250));
    A.qa.teleport(mug.pos[0]+dx, mug.pos[2]+dz, 0); await new Promise(r=>setTimeout(r,600));
    const st=A.robot.getState(); const g=A.qa.grabByName('mug_white');
    res[`under_${dx}_${dz}`]={robotY:+st.pos[1].toFixed(3), reach:st.reach, grab:g};
    if (g.ok) A.qa.release();
    await new Promise(r=>setTimeout(r,300));
  }
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
