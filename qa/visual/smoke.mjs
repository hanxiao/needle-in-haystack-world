import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>{ if(m.type()!=='debug') logs.push(m.type()+': '+m.text()); });
page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{
  const A=window.__APP__; const c=document.getElementById('scene'); const gl=c.getContext('webgl2');
  const buf=new Uint8Array(4); gl.readPixels(700,450,1,1,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  // city_view bboxes
  A.scene.updateMatrixWorld(true);
  const boxes=[];
  A.scene.traverse(o=>{ if(o.isMesh && o.parent && o.parent.name==='city_view'){ const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox.clone().applyMatrix4(o.matrixWorld); boxes.push([b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].map(v=>+v.toFixed(1))); }});
  return {px:[...buf], state:{room:A.state().room, fps:A.fps, draw:A.state().drawCalls, errors:A.state().errors}, cityBoxes:boxes};
});
console.log(JSON.stringify({info,logs},null,1));
await page.screenshot({path:'qa/visual/shots/smoke-current.png'});
await browser.close();
