import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
for (const [name, vp] of [['desk',{width:1440,height:900,deviceScaleFactor:1}],['mob2',{width:390,height:844,deviceScaleFactor:2}],['mob1',{width:390,height:844,deviceScaleFactor:1}]]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
  await new Promise(r=>setTimeout(r,2500));
  await page.evaluate(()=>{ window.__APP__.qa.setSurround(false); document.getElementById('hud').style.opacity='0'; });
  await new Promise(r=>setTimeout(r,700));
  await page.screenshot({path:`qa/visual/shots/diag-mob-${name}.png`});
  const info = await page.evaluate(()=>{
    const A=window.__APP__; const c=document.getElementById('scene');
    return {cam:A.qa.cameraInfo(), canvas:[c.width,c.height], css:[c.clientWidth,c.clientHeight], inner:[innerWidth,innerHeight], dpr:devicePixelRatio, robot:A.state().robot.pos};
  });
  console.log(name, JSON.stringify(info));
  await page.close();
}
await browser.close();
