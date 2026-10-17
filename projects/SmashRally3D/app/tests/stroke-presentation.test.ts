import { expect, it } from 'vitest';
import { skeletonPose, makeFeet, d3, dot, unit, sub } from '../src/motion';
import { presentStroke } from '../src/stroke-presentation';
const actor = () => ({
    p: { x: 0, y: 0, z: -3 },
    v: { x: 0, y: 0, z: 0 },
    side: -1,
    motion: 'Smash',
    swingMotion: 'Smash',
    swingAt: 0,
    hitFrame: 0.16,
    contact: { x: 0.35, y: 2.65, z: -2.7 },
    feet: makeFeet({ x: 0, y: 0, z: -3 }),
    recoverUntil: 0,
    shot: 'smash',
});
const view = { incoming: false, contactAt: 1, motion: 'Smash' as const };
const angle = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    c: { x: number; y: number; z: number },
) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(a, b)), unit(sub(c, b)))))) * 180) / Math.PI;
it('uses perceived anticipation without mutating domain state or issuing a stroke', () => {
    const a = { ...actor(), motion: 'Ready', swingAt: -99 },
        p = skeletonPose(a, 1),
        snapshot = JSON.stringify({ a, p });
    const displayed = presentStroke(a, p, 1, { ...view, incoming: true, contactAt: 1.25 });
    expect(displayed).not.toBe(p);
    expect(JSON.stringify({ a, p })).toBe(snapshot);
    expect(displayed.racket.active).toBe(false);
    expect(
        angle(displayed.joints.ShoulderR, displayed.joints.ElbowR, displayed.joints.WristR),
    ).toBeLessThan(120);
    expect(d3(displayed.racket.center, p.racket.center)).toBeGreaterThan(0.2);
    expect(
        presentStroke({ ...a, contact: null }, p, 1, { ...view, incoming: true, contactAt: 1.25 }),
    ).toBe(p);
});
it('coils each handed rig in the same local preparation direction', () => {
    for (const side of [-1, 1]) {
        const a = { ...actor(), side, motion: 'Ready', swingAt: -99 };
        const p = presentStroke(a, skeletonPose(a, 1), 1, {
            ...view,
            incoming: true,
            contactAt: 1.25,
        });
        const r = sub(p.joints.ShoulderR, p.joints.ShoulderL);
        expect(Math.atan2(r.z, r.x * -side)).toBeCloseTo(-0.8, 7);
    }
});
it('does not double-apply the physical wrist cock when handing over preparation', () => {
    const a = actor();
    for (let t = 0; t < a.hitFrame - 0.06; t += 1 / 1000) {
        const p = presentStroke(a, skeletonPose(a, t), t, view);
        expect(p.racket.shaft.y).toBeGreaterThan(0);
    }
});
it('leaves the full physical collision window and its swept predecessor unchanged', () => {
    for (const side of [-1, 1])
        for (const motion of ['Smash', 'Clear', 'BasicHit', 'Drop', 'Serve'])
            for (let n = -7; n <= 7; n++) {
                const a = { ...actor(), side, motion, swingMotion: motion },
                    t = a.hitFrame + n / 120,
                    p = skeletonPose(a, t);
                const displayed = presentStroke(a, p, t, view);
                expect(displayed.racket).toEqual(p.racket);
                expect(displayed.joints).toEqual(p.joints);
            }
});
it('keeps connected arms and legs at their original lengths through loading and landing', () => {
    const a = actor();
    for (let n = 0; n <= 84; n++) {
        const p = presentStroke(a, skeletonPose(a, n / 120), n / 120, view),
            j = p.joints;
        for (const s of ['R', 'L']) {
            expect(d3(j['Shoulder' + s], j['Elbow' + s])).toBeCloseTo(0.36, 7);
            expect(d3(j['Elbow' + s], j['Wrist' + s])).toBeCloseTo(0.36, 7);
            expect(d3(j['Hip' + s], j['Knee' + s])).toBeCloseTo(0.43, 7);
            expect(d3(j['Knee' + s], j['Ankle' + s])).toBeCloseTo(0.43, 7);
        }
        expect(Math.abs(dot(p.racket.normal, p.racket.shaft))).toBeLessThan(1e-8);
        expect(d3(p.racket.hand, j.WristR)).toBeLessThan(1e-8);
    }
});
it('absorbs landing with knees while preserving planted feet and the real racket trajectory', () => {
    const a = actor(),
        p = skeletonPose(a, 0.43),
        shown = presentStroke(a, p, 0.43, view),
        j = shown.joints;
    expect(shown.hipHeight).toBeLessThan(p.hipHeight - 0.03);
    expect(angle(j.HipR, j.KneeR, j.AnkleR)).toBeLessThan(
        angle(p.joints.HipR, p.joints.KneeR, p.joints.AnkleR) - 8,
    );
    expect(j.AnkleR).toEqual(p.joints.AnkleR);
    expect(j.AnkleL).toEqual(p.joints.AnkleL);
    expect(shown.racket).toEqual(p.racket);
});
