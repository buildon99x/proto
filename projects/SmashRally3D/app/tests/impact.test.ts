import { it, expect } from 'vitest';
import { impactStyle, impactEnvelope } from '../src/impact';
import { solveStroke, assessStroke } from '../src/tactics';
import type { StrokeContext } from '../src/tactics';
it('bounds global attack hold/recoil, respects reduced motion, and ends cleanly', () => {
    for (const shot of ['clear', 'drop', 'smash', 'superSmash'] as const) {
        const style = impactStyle(shot, 'perfect');
        expect(style.holdMs).toBeLessThanOrEqual(32);
        expect(impactStyle(shot, 'perfect', true).holdMs).toBe(0);
        expect(impactStyle(shot, 'perfect', true).recoil).toBe(0);
        for (let t = 0; t < 130; t++) {
            const e = impactEnvelope(style, t, { x: 10, y: -8, z: 25 });
            expect(Math.hypot(e.recoil.x, e.recoil.y, e.recoil.z)).toBeLessThan(0.019);
            expect(e.opacity).toBeGreaterThanOrEqual(0);
        }
        const end = impactEnvelope(style, 130, { x: 0, y: 0, z: 1 });
        expect(end.visible).toBe(false);
        expect(end.recoil).toEqual({ x: -0, y: 0, z: -0 });
    }
    expect(impactStyle('drop', 'perfect').holdMs).toBe(0);
});
it('rewards precise high contact through a faster legal descending solution while preserving safe fallback', () => {
    const c: StrokeContext = {
        side: -1,
        body: { x: 0, y: 0, z: -4.3 },
        movement: { x: 0, y: 0, z: 0 },
        contact: { x: 0.35, y: 2.7, z: -4 },
        incoming: { x: 0, y: -4, z: -9 },
        incomingShot: 'clear',
        incomingWeak: false,
        quality: 'good',
        preparation: 1,
        intent: 'default',
        target: { x: 1.8, y: 0.025, z: 5.8 },
        timingError: 0,
    };
    const good = solveStroke(c, assessStroke(c)),
        p = { ...c, quality: 'perfect' as const },
        perfect = solveStroke(p, assessStroke(p));
    expect(perfect.resolvedShot).toBe('smash');
    expect(perfect.velocity.y).toBeLessThan(0);
    expect(Math.hypot(perfect.velocity.x, perfect.velocity.y, perfect.velocity.z)).toBeGreaterThan(
        Math.hypot(good.velocity.x, good.velocity.y, good.velocity.z),
    );
    expect(perfect.prediction.time).toBeLessThan(good.prediction.time);
    expect(perfect.prediction.netHeight).toBeGreaterThan(1.549);
    const low = { ...p, contact: { x: 0.35, y: 1, z: -4 } };
    expect(assessStroke(low).technique).toBe('lift');
});
