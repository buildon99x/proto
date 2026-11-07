export { meta } from './mobile.mjs';
import { run as standard } from './mobile.mjs';
export async function run(ctx) {
  await ctx.page.evaluateOnNewDocument(() => {
    window.nativePointerTrace = [];
    for (const type of ['pointerdown', 'pointerrawupdate', 'pointermove', 'pointerup', 'pointercancel']) {
      window.addEventListener(type, e => {
        if (e.pointerType !== 'touch' || e.target.tagName !== 'CANVAS') return;
        const d = window.smashDiagnostics?.();
        if (d) window.nativePointerTrace.push({ type, trusted: e.isTrusted, pointerId: e.pointerId, primary: e.isPrimary, eventAt: e.timeStamp, deliveredAt: performance.now(), time: d.time, contactAt: d.contactAt, lastInput: d.lastInput, playerContacts: d.shots.filter(h => h.actor === 0).length });
      });
    }
  });
  await ctx.page.reload();
  try {
    await standard(ctx);
  } finally {
    ctx.log('NATIVE POINTER TRACE', JSON.stringify(await ctx.page.evaluate(() => window.nativePointerTrace)));
  }
}
