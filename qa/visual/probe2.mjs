import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
const logs=[]; page.on('console',m=>{if(m.type()!=='debug')logs.push(m.type()+': '+m.text())}); page.on('pageerror',e=>logs.push('err: '+e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2200));
const out = await page.evaluate(()=>{
  const A=window.__APP__;
  const rect=(id)=>{const e=document.getElementById(id); if(!e) return null; const b=e.getBoundingClientRect(); return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1)};};
  const objs=A.qa.objects().filter(o=>/mug|needle|laptop|sofa|coffee|table|book|plate/.test(o.name));
  return {
    state:{room:A.state().room, robot:A.state().robot, draw:A.state().drawCalls, fps:A.fps, errors:A.state().errors, hud:A.qa.hudText()},
    cam:A.qa.cameraInfo(),
    rects:{controls:rect('hud-controls'), map:rect('hud-map'), hint:rect('hud-hint'), room:rect('hud-room-name'), arm:rect('hud-arm'), view:rect('hud-view'), tag360:rect('hud-360'), light:rect('hud-light')},
    controlsHTML:document.getElementById('hud-controls')?document.getElementById('hud-controls').innerText:null,
    mapHTML:document.getElementById('hud-map')?document.getElementById('hud-map').innerHTML.slice(0,500):null,
    objs,
    robotGroup: A.robot ? {pos:A.robot.group.position.toArray(), children:A.robot.group.children.length} : null,
  };
});
console.log(JSON.stringify({out, logs}, null, 1));
await page.screenshot({path:'qa/visual/shots/r2-probe.png'});
await browser.close();
