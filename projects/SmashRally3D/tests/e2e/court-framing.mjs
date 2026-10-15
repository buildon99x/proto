import { readFile } from 'node:fs/promises';
export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({ page, sleep, shot, log }) {
  const hook = await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js', 'utf8');
  await page.evaluateOnNewDocument(hook);
  const results = [];
  for (const viewport of [
    { name: 'pc', width: 1280, height: 720, deviceScaleFactor: 1 },
    { name: 'mobile-landscape', width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    { name: 'mobile-portrait', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ]) {
    await page.setViewport(viewport);
    await page.reload();
    await page.waitForFunction(() => typeof window.smashDiagnostics === 'function');
    await page.click('[data-action="settings"]');
    await page.select('#quality', process.env.SMASH_FRAMING_QUALITY || 'LOW');
    await page.click('[data-action="close"]');
    await page.select('#difficulty', 'EASY');
    await page.click('[data-action="start"]');
    await page.click('[data-shot="clear"]');
    await page.waitForFunction(() => window.smashDiagnostics().phase === 'SERVE_READY');
    await page.evaluate(() => {
      const app = [...window.__playcanvasApps.keys()][0];
      const camera = app.root.findByName('broadcast camera');
      const point = camera.getPosition().clone();
      const project = (p) => { const s = camera.camera.worldToScreen(point.set(p.x, p.y, p.z)); return { x: s.x, y: s.y, z: s.z }; };
      const court = [-2.59, 2.59].flatMap(x => [-6.7, 6.7].map(z => project({x,y:0.025,z})));
      window.framingState = { samples: 0, clippedCourt: 0, clippedPlayers: 0, clippedShuttle: 0, maxHeight: 0, peak: null, court, spectators: app.root.find(n => n.name === 'spectator' || n.name === 'seating').length, view: { width: innerWidth, height: innerHeight, fov: camera.camera.fov, position: {...camera.getPosition()} }, aim: [] };
      const inside = p => Number.isFinite(p.x) && p.x >= 2 && p.x <= innerWidth-2 && p.y >= 2 && p.y <= innerHeight-2 && p.z > 0;
      app.on('frameend', () => {
        const d = window.smashDiagnostics(), r = window.framingState;
        if (d.phase !== 'RALLY') return;
        r.samples++;
        r.clippedCourt += court.filter(p => !inside(p)).length;
        for (const m of d.motions) for (const p of Object.values(m.skinPose.joints)) r.clippedPlayers += inside(project(p)) ? 0 : 1;
        const shuttle = project(d.position);
        r.clippedShuttle += inside(shuttle) ? 0 : 1;
        if (d.position.y > r.maxHeight) { r.maxHeight = d.position.y; r.peak = { time:d.time, position:d.position, screen:shuttle, flight:d.shots.length }; }
      });
    });
    let d = await page.evaluate(() => window.smashDiagnostics());
    const target = d.projectedTargets.find(t => t.world.x === 0 && t.world.z === 5.8).screen;
    if (viewport.hasTouch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
    let previous = false, taps = 0, captured = false;
    const deadline = Date.now() + 150000;
    while (Date.now() < deadline) {
      d = await page.evaluate(() => window.smashDiagnostics());
      const cue = await page.$eval('#timing', e => e.textContent || '');
      if (!captured && d.position.y > 6 && Math.abs(d.velocity.y) < 2) {
        await shot('court-' + viewport.name + '-high-clear');
        captured = true;
      }
      if (d.returns >= 6 && d.shots.filter(h => h.actor === 0).length >= 4) break;
      if (cue.includes('HIT NOW') && !previous && d.receiver === 0) {
        const x = [0,-1.8,1.8][taps % 3];
        const p = d.projectedTargets.find(t => t.world.x === x && t.world.z === 5.8).screen;
        if (viewport.hasTouch) await page.touchscreen.tap(p.x,p.y); else await page.mouse.click(p.x,p.y);
        const after = await page.evaluate(() => window.smashDiagnostics());
        await page.evaluate(({x,p,input}) => window.framingState.aim.push({x,screen:p,input}), {x,p,input:after.lastInput});
        taps++;
      }
      previous = cue.includes('HIT NOW');
      if (d.phase === 'RESULTS') break;
      await sleep(25);
    }
    await shot('court-' + viewport.name + '-rally');
    const framing = await page.evaluate(() => { const r=window.framingState; const hud=document.querySelector('.hud'); const box=hud.getBoundingClientRect(); r.hud={top:box.top,left:box.left,width:box.width,height:box.height,display:getComputedStyle(hud).display,visibility:getComputedStyle(hud).visibility}; return r; });
    const area = (points) => Math.abs(points.reduce((sum,p,i) => {const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
    framing.courtArea = area([framing.court[0],framing.court[1],framing.court[3],framing.court[2]]);
    const result = {viewport, framing, taps, returns:d.returns, contacts:d.shots.length, playerContacts:d.shots.filter(h=>h.actor===0).length, capturedHighClear:captured};
    results.push(result);log('COURT FRAMING', JSON.stringify(result));
    if (!process.env.SMASH_FRAMING_BASELINE) {
      if (framing.spectators) throw Error('spectators/seating remain');
      if (framing.clippedCourt || framing.clippedPlayers || framing.clippedShuttle) throw Error('gameplay clipped in '+viewport.name);
      if (!captured || framing.maxHeight < 6 || d.returns < 6) throw Error('high-clear/beginner rally not observed');
      for (const a of framing.aim) if (!a.input?.accepted || Math.abs(a.input.target.x-a.x)>0.05 || Math.abs(a.input.target.z-5.8)>0.08) throw Error('camera aim mapping failed');
    }
  }
  log(process.env.SMASH_FRAMING_BASELINE ? 'BASELINE FRAMING OBSERVATION' : 'COURT FRAMING PASS', JSON.stringify({results,method:'Actual mouse/native touch actions at visible cue; read-only frameend bounds and real high-clear screenshots. No state injection, pause or scheduled contactAt inputs. Software emulation only.'}));
}
