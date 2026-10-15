import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:1065,height:606}};
export async function run({page,sleep,shot,log}) {
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 await page.select('#difficulty',process.env.SMASH_SEQUENCE_DIFFICULTY||'EASY');await page.click('[data-action="start"]');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0];window.swingFrames=[];window.swingErrors=[];
  let active=null,lastPhase='ready',lastImpact=-1,ready=null;
  const snap=(d,p)=>({time:d.time,phase:p.racket.strokePhase,pose:p,
    png:document.querySelector('canvas').toDataURL('image/png')});
  app.on('frameend',()=>{
   const d=window.smashDiagnostics(),p=d.motions[0].skinPose,phase=p.racket.strokePhase;
   if(phase==='ready') {
    if(active&&lastPhase!=='ready')active.frames.push({...snap(d,p),phase:'ready-returned'});
    if(lastPhase!=='ready'||!ready)ready=snap(d,p);active=null;
   }
   else {
    if(!active || (phase==='prepare' && lastPhase!=='prepare')) {
     active={start:d.time-p.racket.phase,motion:p.motion,frames:ready?[ready]:[],hit:null};
     if(window.swingFrames.length<36)window.swingFrames.push(active);
    }
    if(!active.frames.some(f=>f.phase===phase))active.frames.push(snap(d,p));
    if(active.hit&&phase==='follow') {
     for(const [name,delay] of [['follow-mid',.13],['follow-peak',.25]])
      if(d.time-active.hit.time>=delay&&!active.frames.some(f=>f.phase===name))active.frames.push({...snap(d,p),phase:name});
    }
    const c=d.renderedContact;
    if(c?.actor===0 && c.time!==lastImpact) {
     lastImpact=c.time;active.hit=d.shots.find(h=>h.actor===0&&Math.abs(h.time-c.time)<1e-6);
     const delta=Math.hypot(c.racket.x-c.contact.x,c.racket.y-c.contact.y,c.racket.z-c.contact.z);
     const m=d.motions[0],dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
     const normalDot=dot(m.racketNormal,p.racket.normal),shaftDot=dot(m.racketShaft,p.racket.shaft);
     if(delta>0.002 || normalDot<0.9999 || shaftDot<0.9999)window.swingErrors.push({time:c.time,delta,normalDot,shaftDot});
     active.frames.push({...snap(d,p),phase:'impact',renderedContact:c});
    }
   }
   lastPhase=phase;
  });
 });
 let was=false,issued=0,d;
 const wanted=process.env.SMASH_SEQUENCE_MOTION;
 const deadline=Date.now()+Number(process.env.SMASH_SEQUENCE_SECONDS||240)*1000;
 while(Date.now()<deadline) {
  d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.phase==='RESULTS')break;
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  const ringReady=!wanted || await page.evaluate(()=>{
    const app=[...window.__playcanvasApps.keys()][0];return app.root.findByName('timing ring').getLocalScale().x<1;
  });
  const cueActive=cue.includes('HIT NOW')&&ringReady;
  if(cueActive&&!was&&d.receiver===0) {
   const intent=wanted ? 'default' : ['clear','drop','default','default','clear','default'][issued%6];
   const p=d.projectedTargets.find(t=>t.world.x===(issued%2?-1.8:1.8)&&t.world.z===(intent==='drop'?1.2:5.8)).screen;
   if(intent==='clear')await page.keyboard.down('Shift');
   await page.mouse.click(p.x,p.y,{button:intent==='drop'?'right':'left'});await page.keyboard.up('Shift');issued++;
  }
  was=cueActive;
  const enough=await page.evaluate(wanted=>{const complete=window.swingFrames.filter(s=>s.hit&&s.frames.some(f=>f.phase==='ready-returned'));return wanted ? complete.some(s=>s.motion===wanted) : new Set(complete.map(s=>s.motion)).size>=3;},wanted);
  if(enough||(!wanted&&d.shots.length>=30))break;
  await sleep(20);
 }
 await sleep(500);await shot('mixed-rally');
 const {groups,errors}=await page.evaluate(()=>({groups:window.swingFrames,errors:window.swingErrors}));
 if(errors.length)throw Error('Rendered/physics racket mismatch: '+JSON.stringify(errors));
 const out=path.resolve(process.env.SMASH_EVIDENCE_DIR),selected=[];
 for(const group of groups){
  if(!group.hit || selected.some(s=>s.motion===group.motion)||!group.frames.some(f=>f.phase==='return'))continue;
  const name=group.motion.toLowerCase();await mkdir(path.join(out,name),{recursive:true});
  for(let i=0;i<group.frames.length;i++) {
   const f=group.frames[i],file=`${String(i).padStart(2,'0')}-${f.phase}.png`;
   await writeFile(path.join(out,name,file),Buffer.from(f.png.split(',')[1],'base64'));delete f.png;f.file=name+'/'+file;
  }
  selected.push(group);
 }
 await writeFile(path.join(out,'sequences.json'),JSON.stringify({method:'Actual UI commands at visible text cue (and the tightened visible timing ring for a requested attack), real frameend canvas captures. No injected state, pause, contactAt scheduling or pose reconstruction.',issued,returns:d.returns,shots:d.shots,errors,sequences:selected},null,2));
 log('SWING SEQUENCES',JSON.stringify({issued,returns:d.returns,shots:d.shots.length,motions:selected.map(s=>({motion:s.motion,technique:s.hit.technique,phases:s.frames.map(f=>f.phase)})),errors}));
 if(wanted ? !selected.some(s=>s.motion===wanted) : selected.length<3)throw Error(wanted ? 'Natural '+wanted+' sequence not reached' : 'Fewer than three natural shot sequences captured');
}
