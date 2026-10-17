import { readFile } from 'node:fs/promises';
export const meta = { viewport: {width:1280,height:720} };
export async function run({page,shot,log,sleep}) {
  await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
  for (const v of [
    {name:'pc',width:1280,height:720},
    {name:'reference',width:1065,height:606},
    {name:'landscape',width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true},
    {name:'portrait',width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},
  ]) {
    await page.setViewport(v); await page.reload();
    await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
    await page.click('[data-action="settings"]'); await page.select('#quality',process.env.SMASH_FRAMING_QUALITY||'LOW');
    await page.click('[data-action="close"]'); await page.select('#difficulty','EASY');
    await page.click('[data-action="start"]');
    await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
    await sleep(300); await shot('ready-'+v.name);
    const d=await page.evaluate(()=>{
      const app=[...window.__playcanvasApps.keys()][0], cam=app.root.findByName('broadcast camera');
      const vec=cam.getPosition().clone(),project=(x,y,z)=>{const p=cam.camera.worldToScreen(vec.set(x,y,z));return {x:p.x,y:p.y,z:p.z}};
      const state=window.smashDiagnostics(),j=state.motions[0].skinPose.joints;
      const tape=project(0,1.524,0),head=project(j.Head.x,j.Head.y+.33,j.Head.z),feet=project(j.AnkleL.x,j.AnkleL.y-.06,j.AnkleL.z);
      const tapeNode=app.root.findByName('net tape'),half=tapeNode.render.meshInstances[0].aabb.halfExtents.x;
      const netLeft=project(-half,1.524,0),netRight=project(half,1.524,0);
      const netWidth=Math.abs(netRight.x-netLeft.x)/innerWidth;
      return {tape,head,feet,netLeft,netRight,netWidth,playerHeight:(feet.y-head.y)/innerHeight,fov:cam.camera.fov,camera:{...cam.getPosition()},
        score:{x:document.querySelector('.scoreboard').getBoundingClientRect().left,y:document.querySelector('.scoreboard').getBoundingClientRect().top},
        courtNodes:app.root.find(n=>['spectator','seating'].includes(n.name)).length,
        courtMaterials:app.root.find(n=>n.name==='court').flatMap(n=>(n.render?.meshInstances??[]).map(m=>({name:m.material.name,diffuse:m.material.diffuse?.toString()})))};
    });
    if(d.courtNodes)throw Error('spectators remain');
    if(!process.env.SMASH_FRAMING_BASELINE && v.name==='reference') {
      if(d.netWidth<.65||d.netWidth>.75)throw Error('reference net width '+d.netWidth);
      if(d.head.y/v.height<.50||d.head.y/v.height>.55)throw Error('reference head position');
      if(d.feet.y/v.height<.80||d.feet.y/v.height>.85)throw Error('reference foot position');
      if(d.playerHeight<.27||d.playerHeight>.35)throw Error('reference athlete height');
    }
    if(!process.env.SMASH_FRAMING_BASELINE && v.width>v.height && (d.tape.y/v.height<.45 || d.tape.y/v.height>.59))throw Error('reference tape height');
    if(!process.env.SMASH_FRAMING_BASELINE && (d.score.x>25 || d.score.y>25))throw Error('score not upper-left');
    log('COMPOSITION',JSON.stringify({viewport:v,...d}));
  }
}
