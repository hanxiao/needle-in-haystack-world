import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
async function one(name, vp){
  const page = await browser.newPage();
  await page.bringToFront();
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
  await new Promise(r=>setTimeout(r,2500));
  const info = await page.evaluate(()=>{
    const A=window.__APP__; const r=A.robot;
    const g=r.group;
    const wp=g.position.clone(); g.getWorldPosition(wp);
    const ws=g.getWorldScale(g.scale.clone());
    // bbox of robot group
    let bb=null; g.updateMatrixWorld(true);
    g.traverse(o=>{ if(!o.isMesh) return; const geo=o.geometry; if(!geo.boundingBox) geo.computeBoundingBox(); const b=geo.boundingBox.clone().applyMatrix4(o.matrixWorld); if(!bb) bb=b; else bb.union(b); });
    return {pos:[wp.x,wp.y,wp.z], scale:[ws.x,ws.y,ws.z], bbox: bb?{min:[bb.min.x,bb.min.y,bb.min.z].map(v=>+v.toFixed(3)), max:[bb.max.x,bb.max.y,bb.max.z].map(v=>+v.toFixed(3))}:null, cam:A.qa.cameraInfo(), fps:A.fps, dpr:devicePixelRatio};
  });
  console.log(name, JSON.stringify(info));
  await page.close();
}
await one('desk',{width:1440,height:900,deviceScaleFactor:1});
await one('mob',{width:390,height:844,deviceScaleFactor:2});
await browser.close();
