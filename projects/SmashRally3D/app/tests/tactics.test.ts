import { it, expect } from 'vitest';
import {
    assessStroke,
    strokeTarget,
    solveStroke,
    recoveryBase,
    chooseTactic,
} from '../src/tactics';
import type { StrokeContext } from '../src/tactics';
import { distance, advance, sweep, clone } from '../src/physics';
const context = (patch: Partial<StrokeContext> = {}): StrokeContext => ({
    side: -1,
    body: { x: 0, y: 0, z: -4.3 },
    movement: { x: 0, y: 0, z: 0 },
    contact: { x: 0.35, y: 2.7, z: -4 },
    incoming: { x: 0, y: -3, z: -9 },
    incomingShot: 'clear',
    incomingWeak: false,
    quality: 'good',
    preparation: 1,
    intent: 'default',
    target: { x: 1.8, y: 0.025, z: 5.8 },
    timingError: 0,
    ...patch,
});
it('same simple return input attacks early front contact, assists a late low ball into a lift', () => {
    expect(assessStroke(context()).technique).toBe('smash');
    expect(assessStroke(context({ contact: { x: 0.35, y: 1.2, z: -1.4 } })).technique).toBe('lift');
    expect(assessStroke(context({ contact: { x: 0.35, y: 2.7, z: -4.6 } })).reason).toBe(
        'RECOVER_BALANCE',
    );
    for (const y of [0.8, 1.2, 1.5])
        expect(['smash', 'superSmash', 'netKill']).not.toContain(
            assessStroke(context({ contact: { x: 0, y, z: -1.4 } })).technique,
        );
});
it('net finish needs a loose above-tape shuttle; default-to-front blocks an attack and right input nets', () => {
    const low = {
        body: { x: 0, y: 0, z: -3.3 },
        contact: { x: 0.35, y: 1.8, z: -3 },
        incoming: { x: 0, y: -8, z: -18 },
        incomingShot: 'smash' as const,
        target: { x: 0, y: 0.025, z: 1.2 },
    };
    expect(assessStroke(context(low)).technique).toBe('block');
    expect(
        assessStroke(context({ ...low, intent: 'drop', contact: { x: 0.35, y: 1.65, z: -1.4 } }))
            .technique,
    ).toBe('net');
    expect(
        assessStroke(
            context({
                ...low,
                body: { x: 0, y: 0, z: -1.7 },
                contact: { x: 0.35, y: 1.95, z: -1.4 },
            }),
        ).technique,
    ).toBe('netKill');
});
it('lift actually buys more flight time than a net return and all profiles obey the live integrator', () => {
    const base = context({
            body: { x: 0, y: 0, z: -1.7 },
            contact: { x: 0.35, y: 1.7, z: -1.4 },
            target: { x: 1, y: 0.025, z: 1.1 },
        }),
        lift = { ...base, intent: 'clear' as const },
        net = { ...base, intent: 'drop' as const },
        a = solveStroke(lift, assessStroke(lift)),
        b = solveStroke(net, assessStroke(net));
    expect(a.prediction.time).toBeGreaterThan(b.prediction.time + 0.8);
    expect(a.prediction.apex).toBeGreaterThan(b.prediction.apex + 3);
    for (const c of [base, lift, net, context()]) {
        const s = assessStroke(c),
            f = solveStroke(c, s),
            p = clone(c.contact),
            v = clone(f.velocity);
        let hit = null;
        for (let i = 0; i < 720 && !hit; i++) {
            const old = clone(p);
            advance(p, v);
            hit = sweep(old, p);
        }
        expect(hit?.reason).toBe('GROUND');
        expect(distance(hit!.p, f.prediction.end)).toBeLessThan(1e-7);
    }
});
it('cross course has a physical travel and recovery cost even with perfect timing', () => {
    const body = { x: 1.45, y: 0, z: -4.3 },
        contact = { x: 1.8, y: 2.7, z: -4 },
        straight = context({
            body,
            contact,
            intent: 'clear',
            target: { x: 1.8, y: 0.025, z: 5.8 },
        }),
        cross = { ...straight, target: { ...straight.target, x: -1.8 } },
        a = assessStroke(straight),
        b = assessStroke(cross),
        fa = solveStroke(straight, a),
        fb = solveStroke(cross, b),
        ba = recoveryBase(-1, a.technique, strokeTarget(straight, a), contact, fa.prediction.time),
        bb = recoveryBase(-1, b.technique, strokeTarget(cross, b), contact, fb.prediction.time);
    expect(distance(contact, fb.prediction.end)).toBeGreaterThan(
        distance(contact, fa.prediction.end),
    );
    expect(distance(body, bb)).toBeGreaterThan(distance(body, ba) + 0.5);
    expect(b.crossCourt).toBe(true);
});
it('reply-covering base follows placement and technique instead of fixed centre', () => {
    const c = context(),
        r = recoveryBase(-1, 'clear', { x: 1.8, y: 0.025, z: 5.8 }, c.contact, 2),
        l = recoveryBase(-1, 'clear', { x: -1.8, y: 0.025, z: 5.8 }, c.contact, 2),
        net = recoveryBase(-1, 'net', { x: 1.8, y: 0.025, z: 1.1 }, c.contact, 0.6);
    expect(r.x).toBeGreaterThan(0);
    expect(l.x).toBeLessThan(0);
    expect(Math.abs(net.z)).toBeLessThan(Math.abs(r.z));
});
it('observed rear-court opponent can be drawn forward without any outcome roll', () => {
    const c = context(),
        rear = chooseTactic(c, { x: -1.8, y: 0, z: 6 }),
        front = chooseTactic(c, { x: 0, y: 0, z: 1 });
    expect(rear.intent).toBe('drop');
    expect(front.intent).not.toBe('drop');
    expect(chooseTactic(c, { x: -1.8, y: 0, z: 6 })).toEqual(rear);
});
