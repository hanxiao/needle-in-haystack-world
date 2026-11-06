import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
for (let i=0;i<3;i++){
  await page.screenshot({path:`qa/visual/shots/diag-shot-${i}.png`});
  await new Promise(r=>setTimeout(r,900));
}
// interaction then screenshot
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-3.6,-1.2,0.4); A.qa.setCamera(0.4,0.16,1.25); });
await new Promise(r=>setTimeout(r,900));
for (let i=0;i<3;i++){
  await page.screenshot({path:`qa/visual/shots/diag-shot-${i+3}.png`});
  await new Promise(r=>setTimeout(r,900));
}
// inspect canvas pixels via 2d copy
const info = await page.evaluate(()=>{
  const c=document.getElementById('scene');
  const gl=c.getContext('webgl2');
  const px=new Uint8Array(4);
  gl.readPixels(700, 500, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const hud=document.getElementById('hud-scene');
  return {main:[...px], mainSize:[c.width,c.height], hudSize:[hud.width,hud.height], mainStyle:c.getAttribute('style'), hudStyle:hud.getAttribute('style'), mainOpacity:getComputedStyle(c).opacity, hudOpacity:getComputedStyle(hud).opacity, hudBg:getComputedStyle(hud).backgroundColor, mainBg:getComputedStyle(c).backgroundColor};
});
console.log(JSON.stringify(info));
await browser.close();
