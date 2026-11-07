import type { Intent } from './game';
import type { Technique } from './tactics';

export type RallyLessons = { returned: boolean; cleared: boolean; dropped: boolean };
export const freshLessons = (): RallyLessons => ({
    returned: false,
    cleared: false,
    dropped: false,
});
export const lessonsComplete = (p: RallyLessons) => p.returned && p.cleared && p.dropped;

// Call only from a real successful hit, using the accepted command's intent.
// Time, a miss, a preview or an unrequested safe fallback cannot teach a shot.
export function creditLesson(
    p: RallyLessons,
    hit: { actor: number; isServe: boolean; intent: Intent | null; technique: Technique },
): RallyLessons {
    if (hit.actor !== 0 || hit.isServe) return p;
    const cleared =
        p.cleared || (hit.intent === 'clear' && ['clear', 'lift'].includes(hit.technique));
    const dropped =
        p.dropped || (hit.intent === 'drop' && ['drop', 'net', 'block'].includes(hit.technique));
    if (p.returned && cleared === p.cleared && dropped === p.dropped) return p;
    return { returned: true, cleared, dropped };
}

export function lessonCopy(p: RallyLessons): string {
    if (!p.returned) return '1/3 · Return one shot. Aim at the far court. Tap at HIT NOW.';
    if (!p.cleared) return '2/3 · Try a high clear. Shift + click / swipe up.';
    if (!p.dropped) return '3/3 · Try a soft drop. Right click / swipe down.';
    return '';
}
