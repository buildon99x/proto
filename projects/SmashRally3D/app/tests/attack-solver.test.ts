import { it, expect } from 'vitest';
import { solve, chooseShot } from '../src/physics';
it('reproduces and repairs audited super-smash strength regression', () => {
    const start = { x: 0, y: 2.6, z: -4 },
        target = { x: 1.8, y: 0.025, z: 5.8 },
        a = solve(start, target, 'smash'),
        b = solve(start, target, 'superSmash');
    expect(a.resolvedShot).toBe('smash');
    expect(b.resolvedShot).toBe('superSmash');
    expect(Math.hypot(b.velocity.x, b.velocity.y, b.velocity.z)).toBeGreaterThan(
        Math.hypot(a.velocity.x, a.velocity.y, a.velocity.z) * 1.15,
    );
    expect(b.velocity.y).toBeLessThan(a.velocity.y);
    expect(b.prediction.time).toBeLessThan(a.prediction.time * 0.9);
    expect(b.prediction.netHeight).toBeGreaterThan(1.549);
    expect(b.error).toBeLessThan(0.01);
});
it('downgrades an impossible descending attack to a labelled legal shot', () => {
    for (const shot of ['smash', 'superSmash'] as const) {
        const s = solve({ x: 0, y: 2.6, z: -4 }, { x: 1.8, y: 0.025, z: 1 }, shot);
        expect(s.resolvedShot).toBe('drop');
        expect(s.fallbackReason).toBe('NO_LEGAL_DESCENDING_ATTACK');
        expect(s.prediction.reason).toBe('GROUND');
    }
});
it('compares only legal common attack geometry across both sides', () => {
    let strong = 0,
        fallbacks = 0;
    for (const side of [-1, 1])
        for (const height of [2.5, 2.6, 2.7])
            for (const depth of [2.8, 4, 5.2])
                for (const x of [-1.8, 0, 1.8])
                    for (const z of [1, 3, 5.8]) {
                        const a = solve(
                                { x: 0, y: height, z: side * depth },
                                { x, y: 0.025, z: -side * z },
                                'smash',
                            ),
                            b = solve(
                                { x: 0, y: height, z: side * depth },
                                { x, y: 0.025, z: -side * z },
                                'superSmash',
                            );
                        if (b.resolvedShot === 'superSmash') {
                            strong++;
                            expect(a.resolvedShot).toBe('smash');
                            expect(b.velocity.y).toBeLessThan(a.velocity.y);
                            expect(
                                Math.hypot(b.velocity.x, b.velocity.y, b.velocity.z),
                            ).toBeGreaterThanOrEqual(
                                Math.hypot(a.velocity.x, a.velocity.y, a.velocity.z) * 1.15,
                            );
                            expect(b.prediction.time).toBeLessThanOrEqual(a.prediction.time * 0.9);
                            expect(b.prediction.netHeight).toBeGreaterThan(1.549);
                        } else {
                            fallbacks++;
                            expect(b.fallbackReason).not.toBeNull();
                        }
                    }
    expect(strong).toBeGreaterThan(30);
    expect(fallbacks).toBeGreaterThan(30);
});
it('requires all super-smash eligibility predicates before geometry resolution', () => {
    for (const weak of [false, true])
        for (const reachable of [false, true])
            for (const q of ['perfect', 'good', 'weak', 'miss'] as const)
                for (const y of [1.5, 2.3, 2.6])
                    for (const speed of [9, 15]) {
                        const shot = chooseShot('default', y, weak, speed, q, reachable);
                        expect(shot === 'superSmash').toBe(
                            weak && reachable && q === 'perfect' && y >= 2.5 && speed < 13,
                        );
                    }
});
