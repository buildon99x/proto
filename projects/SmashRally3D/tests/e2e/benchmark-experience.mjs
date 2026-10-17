import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { run as playMatch } from './experience-flow.mjs';
export const meta = { viewport: { width: 640, height: 360 } };
export async function run(ctx) {
  await playMatch(ctx);
  const recorded = JSON.parse(await readFile(path.resolve(process.env.SMASH_EVIDENCE_DIR, 'experience.json'), 'utf8'));
  const lesson = recorded.match.lessons;
  if (recorded.match.time < 32 || !lesson?.active || !lesson.returned || !lesson.cleared || lesson.dropped)
    throw Error('Elapsed time or a default safe fallback incorrectly completed the lessons: '+JSON.stringify({time:recorded.match.time,lesson}));
  if (JSON.stringify(recorded.countdown.lessons) !== JSON.stringify(lesson)) throw Error('Rematch lost lesson progress');
  await ctx.page.keyboard.press('Escape');
  await ctx.page.click('[data-tips]');
  let d = await ctx.page.evaluate(() => window.smashDiagnostics());
  if (d.lessons.active) throw Error('Rally tips cannot be hidden');
  await ctx.shot('09-tips-off');
  await ctx.page.click('[data-tips]');
  d = await ctx.page.evaluate(() => window.smashDiagnostics());
  if (!d.lessons.active || !d.lessons.returned || !d.lessons.cleared || d.lessons.dropped) throw Error('Partial progress lost when reopening tips');
  await ctx.shot('10-tips-on');
  ctx.log('BENCHMARK LESSONS PASS',JSON.stringify({atMatchEnd:lesson,time:recorded.match.time,rematch:recorded.countdown.lessons,reopened:d.lessons,method:'Real match inputs; no time/state injection. Safe attack fallback must not teach a chosen drop; incomplete tips survive32s, rematch and hide/reopen.'}));
}
