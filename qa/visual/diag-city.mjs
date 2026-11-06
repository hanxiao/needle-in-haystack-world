import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
const boxes = await page.evaluate(()=>{
  const scene=window.__APP__.scene; scene.updateMatrixWorld(true);
  const out=[];
  scene.traverse(o=>{
    if(!o.isMesh) return;
    const g=o.geometry; if(!g) return;
    if(!g.boundingBox) g.computeBoundingBox();
    const b=g.boundingBox.clone().applyMatrix4(o.matrixWorld);
    const root=(function(n){ let p=n; while(p.parent && p.parent!==scene) p=p.parent; return p;})(o);
    out.push({root:root.name||root.type, name:o.name, min:[b.min.x,b.min.y,b.min.z].map(v=>+v.toFixed(2)), max:[b.max.x,b.max.y,b.max.z].map(v=>+v.toFixed(2))});
  });
  return out;
});
const cam=[-3.38,0.88,0.45];
const contains=boxes.filter(b=>b.min[0]<cam[0]&&cam[0]<b.max[0]&&b.min[1]<cam[1]&&cam[1]<b.max[1]&&b.min[2]<cam[2]&&cam[2]<b.max[2]);
console.log('meshes whose bbox contains camera:', contains.length);
contains.forEach(b=>console.log(JSON.stringify(b)));
console.log('city_view boxes:');
boxes.filter(b=>b.root==='city_view').forEach(b=>console.log(JSON.stringify(b)));
// hide city_view and screenshot
await page.evaluate(()=>{ const o=window.__APP__.scene.getObjectByName('city_view'); if(o) o.visible=false; });
await new Promise(r=>setTimeout(r,500));
await page.screenshot({path:'qa/visual/shots/diag-city-hidden.png'});
await browser.close();
