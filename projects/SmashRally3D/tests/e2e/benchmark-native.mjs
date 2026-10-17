import { run as native } from './mobile-native.mjs';
export { meta } from './mobile-native.mjs';
export async function run(ctx) {
  await native(ctx);
  const d = await ctx.page.evaluate(() => window.smashDiagnostics());
  if (d.lessons.active || !d.lessons.returned || !d.lessons.cleared || !d.lessons.dropped)
    throw Error('Actual native tap/clear/drop did not teach all three actions: '+JSON.stringify(d.lessons));
  await ctx.page.keyboard.press('Escape'); await ctx.page.click('[data-tips]');
  const replay = await ctx.page.evaluate(() => window.smashDiagnostics().lessons);
  if (!replay.active || replay.returned || replay.cleared || replay.dropped) throw Error('Completed tips cannot be restarted');
  await ctx.shot('11-tips-restarted');
  ctx.log('BENCHMARK NATIVE LESSONS PASS',JSON.stringify({completed:d.lessons,restarted:replay,method:'Original trusted tap/up/down gesture gates unchanged; actual contacts credit the lessons. No state/time injection.'}));
}
