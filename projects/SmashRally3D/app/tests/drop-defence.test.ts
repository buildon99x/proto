import { it, expect } from 'vitest';
import { Game, profiles } from '../src/game';
import { CFG, distance } from '../src/physics';
import { makeFeet, skeletonPose, contactCheck, d3 } from '../src/motion';

it('continues only the already chosen recovery base before delayed observation, independent of the unseen shuttle', () => {
    const recover = (x: number) => {
        const g = new Game();
        g.phase = 'RALLY';
        g.receiver = 1;
        g.reactionAt = 0.5;
        g.aiPerception.nextAt = 0.5;
        g.p = { x, y: 4, z: -5 };
        g.v = { x: 0, y: 0, z: 0 };
        const a = g.actors[1];
        a.p = { x: 0, y: 0, z: 4.8 };
        a.base = { x: 0, y: 0, z: 3 };
        a.target = { x: -x, y: 0, z: 6 };
        a.feet = makeFeet(a.p, a.side);
        a.movementReadyAt = 0.2;
        a.recoverUntil = 0.48;
        for (let i = 0; i < 48; i++) g.step();
        expect(g.aiPerception.samples).toBe(0);
        expect(a.p.z).toBeLessThan(4.7);
        expect(a.locked).toBe(false);
        expect(Math.hypot(a.v.x, a.v.z)).toBeLessThanOrEqual(CFG.speed + 0.001);
        return a.p;
    };
    expect(recover(-2)).toEqual(recover(2));
    expect([profiles.EASY.delay, profiles.NORMAL.delay, profiles.HARD.delay]).toEqual([
        0.5, 0.3, 0.18,
    ]);
});
it('a low forecourt return bends the same physical skeleton without extending either arm segment', () => {
    for (const index of [0, 1]) {
        const g = new Game(),
            a = g.actors[index];
        a.p = { x: 0, y: 0, z: a.side * 1.4 };
        a.feet = makeFeet(a.p, a.side);
        a.contact = { x: -a.side * 0.35, y: 0.95, z: a.side * 1.1 };
        a.swingContact = { ...a.contact };
        a.swingTarget = { x: 0, y: 0.025, z: -a.side * 5.8 };
        a.motion = 'BasicHit';
        a.swingAt = 0;
        a.hitFrame = 0.12;
        const pose = skeletonPose(a, 0.12),
            j = pose.joints;
        expect(contactCheck(pose.racket, a.contact, { x: 0, y: -4, z: a.side * 3 }).valid).toBe(
            true,
        );
        expect(d3(j.ShoulderR, j.ElbowR)).toBeCloseTo(0.36, 8);
        expect(d3(j.ElbowR, j.WristR)).toBeCloseTo(0.36, 8);
        expect(pose.hipHeight).toBeGreaterThan(0.4);
        expect(pose.hipHeight).toBeLessThan(0.7);
    }
});
it('ordinary repeated soft inputs have actual AI returns at every level while some wide drops still win', () => {
    const levels = [];
    for (const level of ['EASY', 'NORMAL', 'HARD'] as const) {
        const g = new Game();
        g.difficulty = level;
        g.start();
        let last = -1,
            issued = 0,
            count = 0,
            pending = false,
            attempts = 0,
            returned = 0,
            maxStep = 0;
        for (let i = 0; i < 24000 && g.phase !== 'RESULTS' && attempts < 18; i++) {
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
                g.contactAt !== last &&
                g.contactAt - g.time < g.inputLead('default') + 0.08 &&
                g.contactAt - g.time > 0.06
            ) {
                last = g.contactAt;
                g.command({
                    shotIntent: 'drop',
                    target: { x: issued % 2 ? -1.8 : 1.8, y: 0.025, z: 1.2 },
                    issuedAt: g.time,
                    pointerType: 'unit',
                });
                issued++;
            }
            const before = { ...g.actors[1].p };
            g.step();
            // Point resets are deliberately excluded from continuous motor displacement.
            if (g.phase === 'RALLY') maxStep = Math.max(maxStep, distance(before, g.actors[1].p));
            for (const h of g.shots.slice(count)) {
                if (h.actor === 1 && pending) {
                    returned++;
                    pending = false;
                }
                if (h.actor === 0 && h.shot === 'drop') {
                    attempts++;
                    pending = true;
                }
            }
            count = g.shots.length;
        }
        expect(returned).toBeGreaterThanOrEqual(3);
        expect(maxStep).toBeLessThanOrEqual(CFG.speed * CFG.dt + 0.001);
        expect(
            g.shots.every(
                (h) => h.contact.radialDistance <= 0.225001 && h.contact.planeDistance <= 0.045001,
            ),
        ).toBe(true);
        levels.push({
            level,
            attempts,
            returned,
            winners: g.points.filter((p) => p.winner === 0).length,
        });
    }
    expect(levels.find((x) => x.level === 'NORMAL')!.winners).toBeGreaterThan(0);
});
