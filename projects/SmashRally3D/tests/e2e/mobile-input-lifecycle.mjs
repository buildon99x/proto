export { meta } from './mobile.mjs';
export async function run({ page, sleep, log }) {
  const read = () => page.evaluate(() => window.smashDiagnostics());
  const client = await page.createCDPSession();
  const results = [];
  for (const name of ['held-tap', 'raw-up', 'fallback-down', 'owner-cancel', 'secondary-cancel', 'post-contact']) {
    await page.reload();
    await page.waitForFunction(() => typeof window.smashDiagnostics === 'function');
    await page.select('#difficulty', 'EASY');
    await page.click('[data-action="start"]');
    await page.click('[data-shot="clear"]');
    await page.waitForFunction(() => window.smashDiagnostics().phase === 'SERVE_READY');
    let d = await read();
    const p = d.projectedTargets.find(t => t.world.x === 0 && t.world.z === 5.8).screen;
    await page.touchscreen.tap(p.x, p.y);
    // Native pointerdown; synchronous DOM boundary fixtures avoid CDP transport latency.
    // Ball/actor/time are only read. This is NOT native swipe/human play evidence.
    await page.evaluate((name) => {
      window.inputCase = null;
      const canvas = document.querySelector('canvas');
      canvas.addEventListener('pointerdown', e => {
        if (!e.isPrimary) {
          const d = window.smashDiagnostics();
          window.secondaryBefore = { input: d.input, lastInput: d.lastInput };
        }
      }, { capture: true });
      canvas.addEventListener('pointerdown', e => {
        if (!e.isPrimary) {
          const d = window.smashDiagnostics();
          window.inputCase.secondary = { owner: window.secondaryBefore, current: { input: d.input, lastInput: d.lastInput } };
          return;
        }
        const before = window.smashDiagnostics();
        const events = [];
        const emit = (type, extra = {}) => {
          canvas.dispatchEvent(new PointerEvent(type, { pointerId: e.pointerId, pointerType: 'touch', isPrimary: true, clientX: e.clientX, clientY: e.clientY, ...extra }));
          const d = window.smashDiagnostics();
          events.push({ type, time: d.time, input: d.input, lastInput: d.lastInput, playerContacts: d.shots.filter(h => h.actor === 0).length });
        };
        if (name === 'raw-up') {
          emit('pointerrawupdate', { clientY: e.clientY - 30 });
          emit('pointermove', { clientY: e.clientY + 30 }); // same gesture must classify only once
        }
        if (name === 'fallback-down') emit('pointermove', { clientY: e.clientY + 30 });
        if (name === 'owner-cancel') emit('pointercancel');
        if (name === 'post-contact') {
          const poll = () => {
            const d = window.smashDiagnostics();
            if (d.shots.filter(h => h.actor === 0).length > before.shots.filter(h => h.actor === 0).length) {
              emit('pointerrawupdate', { clientY: e.clientY + 30 });
              emit('pointercancel');
              window.inputCase.complete = true;
            } else requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        }
        const after = window.smashDiagnostics();
        window.inputCase = { name, downTime: before.time, beforeContacts: before.shots.filter(h => h.actor === 0).length, downInput: before.input, afterInput: after.input, events, complete: name !== 'post-contact' };
      });
    }, name);
    await page.waitForFunction(() => window.smashDiagnostics().receiver === 0 && document.querySelector('#timing')?.textContent.includes('HIT NOW'), { timeout: 30000 });
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    if (name === 'secondary-cancel') {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }, { x: p.x + 40, y: p.y, id: 2 }] });
      // Actual secondary pointer is active. Its move/up/cancel must not own the first reservation.
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const before = window.smashDiagnostics().input;
        canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 9999, pointerType: 'touch', isPrimary: false }));
        window.inputCase.unrelatedCancel = { before, after: window.smashDiagnostics().input };
      });
    }
    if (name === 'owner-cancel') {
      await page.waitForFunction(() => window.smashDiagnostics().receiver !== 0 || window.smashDiagnostics().phase !== 'RALLY' || !Number.isFinite(window.smashDiagnostics().contactAt), { timeout: 20000 });
    } else {
      await page.waitForFunction(() => window.smashDiagnostics().shots.filter(h => h.actor === 0).length > window.inputCase.beforeContacts && window.inputCase.complete, { timeout: 20000 });
    }
    d = await read();
    const fixture = await page.evaluate(() => window.inputCase);
    const hits = d.shots.filter(h => h.actor === 0).slice(fixture.beforeContacts);
    const beforeUp = d.shots.length;
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(60);
    const afterUp = await read();
    const actual = hits.map(h => ({ shot: h.shot, technique: h.technique, time: h.time, quality: h.quality, target: h.target }));
    const result = { name, fixture, actual, beforeUp, afterUp: afterUp.shots.length, quality: d.settings.quality };
    results.push(result);
    log('INPUT LIFECYCLE CASE', JSON.stringify(result));
    if (process.env.SMASH_INPUT_OBSERVE) continue;
    if (!fixture.downInput) throw Error('touch-down did not reserve immediately');
    if (name === 'owner-cancel' ? hits.length !== 0 : hits.length !== 1) throw Error('unexpected physical contact count');
    if (afterUp.shots.length !== beforeUp) throw Error('release duplicated physical contact');
    if (name === 'raw-up' && hits[0].shot !== 'clear') throw Error('raw classification missing or reclassified twice');
    if (name === 'fallback-down' && hits[0].shot !== 'drop') throw Error('fallback classification missing');
    if (name === 'secondary-cancel' && JSON.stringify(fixture.secondary.owner) !== JSON.stringify(fixture.secondary.current)) throw Error('secondary pointer replaced/cancelled owner');
    if (name === 'secondary-cancel' && JSON.stringify(fixture.unrelatedCancel.before) !== JSON.stringify(fixture.unrelatedCancel.after)) throw Error('unrelated cancel changed owner');
    if (name === 'post-contact' && fixture.events[0].lastInput.accepted) throw Error('post-contact classification accepted');
  }
  log(process.env.SMASH_INPUT_OBSERVE ? 'INPUT LIFECYCLE OBSERVATION (assertions disabled)' : 'INPUT LIFECYCLE PASS', JSON.stringify({ method: 'MEDIUM; native touch-down plus synchronous DOM event fixtures; no state injection. Native vertical gestures separately verified by mobile.mjs.', results }));
}
