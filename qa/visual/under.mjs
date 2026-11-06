import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2200));
const boxes = await page.evaluate(()=>{
  const A=window.__APP__, scene=A.scene; scene.updateMatrixWorld(true);
  const bboxOf=(root)=>{ let bb=null; root.traverse(o=>{ if(!o.isMesh) return; const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox.clone().applyMatrix4(o.matrixWorld); if(!bb) bb=b; else bb.union(b); }); return bb?{min:[bb.min.x,bb.min.y,bb.min.z].map(v=>+v.toFixed(3)),max:[bb.max.x,bb.max.y,bb.max.z].map(v=>+v.toFixed(3))}:null; };
  const robot=bboxOf(A.robot.group);
  const table=A.scene.getObjectByName('coffee_table');
  const tableBB=table?bboxOf(table):null;
  return {robot, tableBB, robotH: robot? +(robot.max[1]-robot.min[1]).toFixed(3):null};
});
console.log('boxes', JSON.stringify(boxes));
// under-table grab of a mug on the tabletop
const res = await page.evaluate(async ()=>{
  const A=window.__APP__;
  A.qa.teleport(-2.5,-1.55,0);
  await new Promise(r=>setTimeout(r,900));
  const st0=A.state();
  const g=A.qa.grabByName('mug_white');
  await new Promise(r=>setTimeout(r,500));
  return {robot:st0.robot, grab:g, held:A.state().robot.held, hud:A.qa.hudText()};
});
console.log('under-table grab', JSON.stringify(res));
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setView('third'); A.qa.setCamera(2.2,0.10,1.0); });
await new Promise(r=>setTimeout(r,800));
await page.screenshot({path:'qa/visual/shots/r2-under-reach.png'});
await browser.close();
