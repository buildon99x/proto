import { it, expect } from 'vitest';
import { Game, profiles } from '../src/game';
import { makeFeet, skeletonPose, contactCheck, d3, stepFeet } from '../src/motion';
const actor = () => ({
    p: { x: 0, y: 0, z: -3 },
    v: { x: 0, y: 0, z: 0 },
    side: -1,
    motion: 'Clear',
    swingAt: 0,
    hitFrame: 0.18,
    contact: { x: 0.35, y: 2.65, z: -2.7 },
    feet: makeFeet({ x: 0, y: 0, z: -3 }),
    recoverUntil: 0,
    shot: 'clear',
});
it('checks the actual independent 3D string plane, phase and approach', () => {
    const a = actor(),
        p = skeletonPose(a, 0.18);
    expect(contactCheck(p.racket, p.racket.center, { x: 0, y: -4, z: -5 }).valid).toBe(true);
    for (const ball of [
        { x: 0.35, y: 5, z: -2.7 },
        { x: 0.35, y: 0.1, z: -2.7 },
        { x: 10, y: 2.65, z: -2.7 },
        { ...p.racket.center, z: p.racket.center.z + 0.2 },
    ])
        expect(contactCheck(p.racket, ball, { x: 0, y: -4, z: -5 }).valid).toBe(false);
    expect(
        contactCheck(skeletonPose(a, 0).racket, p.racket.center, { x: 0, y: -4, z: -5 }).valid,
    ).toBe(false);
    expect(contactCheck(p.racket, p.racket.center, { x: 0, y: 4, z: 5 }).valid).toBe(false);
});
it('never extends arm bones or makes a high target reachable by copying shuttle height', () => {
    for (const y of [0.1, 1.8, 2.65, 5]) {
        const a = actor();
        a.contact.y = y;
        const p = skeletonPose(a, 0.18),
            j = p.joints;
        expect(d3(j.ShoulderR, j.ElbowR)).toBeCloseTo(0.36, 8);
        expect(d3(j.ElbowR, j.WristR)).toBeCloseTo(0.36, 8);
        if (y === 5) expect(p.racket.center.y).toBeLessThan(3);
    }
});
it('keeps planted stance feet fixed through bounded body travel', () => {
    const a = actor();
    a.motion = 'Run';
    a.contact = null;
    for (let n = 0; n < 120; n++) {
        const before = { left: { ...a.feet.left.p }, right: { ...a.feet.right.p } },
            stance = { left: !a.feet.left.swing, right: !a.feet.right.swing };
        a.p.z += 0.035;
        a.v.z = 4.2;
        stepFeet(a.feet, a.p, a.v, n / 120, a.side);
        for (const key of ['left', 'right'] as const)
            if (stance[key] && !a.feet[key].swing) expect(d3(before[key], a.feet[key].p)).toBe(0);
        const pose = skeletonPose(a, n / 120);
        if (!a.feet.left.swing) expect(d3(pose.joints.AnkleL, a.feet.left.p)).toBeLessThan(0.0025);
        if (!a.feet.right.swing)
            expect(d3(pose.joints.AnkleR, a.feet.right.p)).toBeLessThan(0.0025);
        for (const name of ['KneeR', 'KneeL'])
            expect(Number.isFinite(pose.joints[name].y)).toBe(true);
    }
});
it('AI has no forecast before perception delay and then samples noisy current measurements', () => {
    for (const level of ['EASY', 'NORMAL', 'HARD'] as const) {
        const g = new Game();
        g.difficulty = level;
        g.start();
        while (g.phase !== 'SERVE_READY') g.step();
        g.command({
            shotIntent: 'clear',
            target: { x: 0, y: 0, z: 5.8 },
            issuedAt: g.time,
            pointerType: 'unit',
        });
        while (g.phase !== 'RALLY') g.step();
        const flightAt = g.time;
        while (g.time - flightAt < profiles[level].delay - 0.02) {
            expect(g.aiPerception.samples).toBe(0);
            expect(g.actors[1].contact).toBeNull();
            g.step();
        }
        while (g.aiPerception.samples === 0) g.step();
        expect(g.aiPerception.observedAt - flightAt).toBeGreaterThanOrEqual(
            profiles[level].delay - 0.01,
        );
        expect(d3(g.aiPerception.position!, g.p)).toBeGreaterThan(0);
        expect(g.aiPerception.position).not.toBe(g.p);
    }
});
it('scores line IN, net/out/own-side faults once and serves the winner', () => {
    for (const [reason, p, winner] of [
        ['GROUND', { x: 2.59, y: 0.025, z: 6.7 }, 0],
        ['GROUND', { x: 3, y: 0.025, z: 6.7 }, 1],
        ['NET', { x: 0, y: 1, z: 0 }, 1],
        ['GROUND', { x: 0, y: 0.025, z: -3 }, 1],
    ] as const) {
        const g = new Game();
        g.start();
        g.phase = 'RALLY';
        g.hitter = 0;
        g.point(reason, p);
        g.point(reason, p);
        expect(g.scores[winner]).toBe(1);
        expect(g.scores[1 - winner]).toBe(0);
        expect(g.server).toBe(winner);
    }
});
it('accepts either string face for a descending incoming attack and rejects outgoing travel', () => {
    const a = actor();
    a.motion = 'Smash';
    a.hitFrame = 0.16;
    a.contact.y = 2.7;
    const r = skeletonPose(a, 0.16).racket;
    expect(contactCheck(r, r.center, { x: 0, y: -6, z: -1 }).valid).toBe(true);
    expect(contactCheck(r, r.center, { x: 0, y: -6, z: 1 }).valid).toBe(false);
});
it('reaches a real eligible super attack through ordinary start, commands and fixed steps', () => {
    const g = new Game();
    g.difficulty = 'EASY';
    g.start();
    let issued = -1;
    for (let n = 0; n < 18000 && !g.shots.some((h) => h.shot === 'superSmash'); n++) {
        if (g.phase === 'SERVE_READY' && g.server === 0)
            g.command({
                shotIntent: 'clear',
                target: { x: 0, y: 0.025, z: 5.8 },
                issuedAt: g.time,
                pointerType: 'unit',
            });
        if (
            g.phase === 'RALLY' &&
            g.receiver === 0 &&
            issued !== g.contactAt &&
            g.contactAt - g.time <= 0.18 &&
            g.contactAt - g.time > 0.1
        ) {
            const attack = g.incomingWeak && (g.actors[0].contact?.y ?? 0) >= 2.5;
            g.command({
                shotIntent: attack ? 'default' : 'clear',
                target: { x: 1.8, y: 0.025, z: 5.8 },
                issuedAt: g.time,
                pointerType: 'unit',
            });
            issued = g.contactAt;
        }
        g.step();
    }
    const h = g.shots.find((h) => h.shot === 'superSmash');
    expect(h).toBeDefined();
    expect(h!.velocity.y).toBeLessThan(0);
    expect(h!.contact.source).toBe('domain:hit_frame');
    expect(h!.contact.radialDistance).toBeLessThanOrEqual(0.225);
});
it('plants rendered ankles through full-speed reversals without leg stretching', () => {
    const a = actor();
    a.contact = null;
    a.motion = 'Run';
    for (let n = 0; n < 500; n++) {
        const previous = { left: { ...a.feet.left.p }, right: { ...a.feet.right.p } };
        const cycles = { left: a.feet.left.cycle, right: a.feet.right.cycle };
        const stance = { left: !a.feet.left.swing, right: !a.feet.right.swing };
        a.v = { x: Math.floor(n / 55) % 2 ? 5.8 : -5.8, y: 0, z: Math.floor(n / 80) % 2 ? 0 : 1 };
        a.p.x += a.v.x / 120;
        a.p.z += a.v.z / 120;
        stepFeet(a.feet, a.p, a.v, n / 120, a.side);
        const pose = skeletonPose(a, n / 120);
        for (const key of ['left', 'right'] as const) {
            const foot = a.feet[key];
            if (!foot.swing) {
                expect(
                    d3(pose.joints[key === 'left' ? 'AnkleL' : 'AnkleR'], foot.p),
                    JSON.stringify({
                        n,
                        key,
                        p: a.p,
                        foot: foot.p,
                        hip: pose.joints.Hip,
                        other: a.feet[key === 'left' ? 'right' : 'left'],
                    }),
                ).toBeLessThan(0.0025);
                if (stance[key] && cycles[key] === foot.cycle)
                    expect(d3(previous[key], foot.p)).toBe(0);
            }
        }
        expect(d3(pose.joints.HipR, pose.joints.KneeR)).toBeCloseTo(0.43, 7);
        expect(d3(pose.joints.KneeR, pose.joints.AnkleR)).toBeCloseTo(0.43, 7);
    }
});
