import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(()=>{
  const A=window.__APP__; const res={};
  for (const name of ['coffee_table','armchair','dining_table','desk','sofa','bed','wardrobe','fridge','bookshelf']) {
    const o=A.physics.get(name); if(!o) continue;
    const b=o.body; const cols=[];
    for(let i=0;i<b.numColliders();i++){ const c=b.collider(i); const sh=c.shape; const t=c.translation(); const r=c.rotation(); cols.push({shape:sh.type, half:sh.halfExtents?[sh.halfExtents.x,sh.halfExtents.y,sh.halfExtents.z]:null, radius:sh.radius, hh:sh.halfHeight, t:[+t.x.toFixed(2),+t.y.toFixed(2),+t.z.toFixed(2)], friction:c.friction(), restitution:c.restitution()}); }
    res[name]={mass:o.mass, lin:b.linearDamping(), ang:b.angularDamping(), pos:[b.translation().x,b.translation().y,b.translation().z], colliders:cols};
  }
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
