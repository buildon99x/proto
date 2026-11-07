import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const meta = { viewport: { width: 1065, height: 606 } };
export async function run({ page, shot, log }) {
  const hook = await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js', 'utf8');
  await page.evaluateOnNewDocument(hook);
  const results = [];
  for (const view of [{width:1065,height:606},{width:1280,height:720},{width:844,height:390},{width:390,height:844}]) {
    await page.setViewport(view); await page.reload();
    await page.waitForFunction(() => typeof window.smashDiagnostics === 'function');
    await page.click('[data-action="settings"]'); await page.select('#quality','LOW'); await page.click('[data-action="close"]');
    await page.select('#difficulty','EASY'); await page.click('[data-action="start"]');
    await page.waitForFunction(() => window.smashDiagnostics().phase === 'SERVE_READY');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const observed = await page.evaluate(() => {
      const app = [...window.__playcanvasApps.keys()][0], camera = app.root.findByName('broadcast camera');
      const d = window.smashDiagnostics(), v = camera.getPosition().clone();
      const project = p => {const s=camera.camera.worldToScreen(v.set(p.x,p.y,p.z));return {x:s.x,y:s.y,z:s.z}};
      const body=d.motions.map(m=>Object.fromEntries(['Head','Chest','WristR','AnkleR'].map(k=>[k,project(m.skinPose.joints[k])])));
      const p=camera.getPosition();
      return {phase:d.phase,quality:d.quality,body,camera:{x:p.x,y:p.y,z:p.z,fov:camera.camera.fov},ambient:[app.scene.ambientLight.r,app.scene.ambientLight.g,app.scene.ambientLight.b],lights:app.root.find(n=>n.light).map(n=>({name:n.name,intensity:n.light.intensity})),spectators:app.root.find(n=>['spectator','seating'].includes(n.name)).length,targets:d.projectedTargets,shuttle:d.shuttleScreen,tutorial:document.querySelector('#tutorial')?.textContent};
    });
    if (observed.phase !== 'SERVE_READY' || observed.spectators) throw Error('Unexpected ready scene');
    await shot('scene-'+view.width+'x'+view.height+'-ready'); results.push({view,...observed});
  }
  await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'scene.json'),JSON.stringify({method:'Fresh ordinary menu/settings/start. Held serve-ready screenshots, read-only engine projections; no state/time injection. LOW software renderer, no physical FPS or normal-speed feel claim.',results},null,2));
  log('BENCHMARK SCENE PASS',JSON.stringify({views:results.length}));
}
