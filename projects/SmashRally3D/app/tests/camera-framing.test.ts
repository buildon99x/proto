import { it, expect } from 'vitest';
import { fitCourtCamera, flightFov, courtAim, FRAMING_POINTS } from '../src/camera-framing';
import { solve } from '../src/physics';
import type { V3 } from '../src/physics';
function projection(v: ReturnType<typeof fitCourtCamera>, w: number, h: number, p: V3) {
    const dy = v.target.y - v.position.y,
        dz = v.target.z - v.position.z,
        length = Math.hypot(dy, dz);
    const fy = dy / length,
        fz = dz / length,
        y = p.y - v.position.y,
        z = p.z - v.position.z;
    const depth = y * fy + z * fz,
        tan = Math.tan((v.fov * Math.PI) / 360);
    return {
        x: w / 2 - ((p.x / depth / tan) * h) / 2,
        y: h / 2 - (((y * fz - z * fy) / depth / tan) * h) / 2,
        depth,
    };
}
for (const [w, h] of [
    [1280, 720],
    [1920, 1080],
    [844, 390],
    [390, 844],
    [360, 640],
    [768, 1024],
]) {
    it(`places the measured near athlete in the cropped reference frame at ${w}×${h}`, () => {
        const top = h > w ? 146 : 12,
            bottom = h - (h > w ? 90 : 12),
            v = fitCourtCamera(w, h, top, bottom);
        const feet = projection(v, w, h, { x: 0, y: 0.04, z: -3.4 });
        const head = projection(v, w, h, { x: 0, y: 1.85, z: -3.4 });
        expect(feet.y / h).toBeCloseTo(0.815, 6);
        expect(head.y / h).toBeCloseTo(0.54, 6);
        expect(v.position.y).toBeLessThan(4);
        const tape = projection(v, w, h, { x: 0, y: 1.524, z: 0 });
        expect(tape.y / h).toBeGreaterThan(0.45);
        expect(tape.y / h).toBeLessThan(0.59);
    });
}
it('widens the fixed low view to retain actual high-clear solver paths', () => {
    const views = [
        [1280, 720],
        [844, 390],
        [390, 844],
    ].map(([w, h]) => ({ w, h, v: fitCourtCamera(w, h, h > w ? 146 : 12, h - (h > w ? 90 : 12)) }));
    for (const side of [-1, 1])
        for (const z of [0.8, 3.5, 6.7])
            for (const y of [0.8, 2.9])
                for (const targetZ of [1.2, 6.2]) {
                    const shot = solve(
                        { x: 2.59, y, z: side * z },
                        { x: -2.25, y: 0.025, z: -side * targetZ },
                        'clear',
                    );
                    for (const { p } of shot.prediction.path)
                        for (const { w, h, v } of views) {
                            const live = { ...v, fov: flightFov(v, w, h, [p]) };
                            const s = projection(live, w, h, p);
                            expect(s.x).toBeGreaterThan(2);
                            expect(s.x).toBeLessThan(w - 2);
                            expect(s.y).toBeGreaterThan(v.top);
                            expect(s.y).toBeLessThan(v.bottom);
                        }
                }
});
it('intersects the rendered court plane and retains aim clamps for off-court input', () => {
    expect(courtAim({ x: 1, y: 10, z: -5 }, { x: 1, y: -10, z: 15 })).toEqual({
        x: 1,
        y: 0.025,
        z: 4.975,
    });
    expect(courtAim({ x: 100, y: 10, z: -5 }, { x: 100, y: -10, z: 100 })).toEqual({
        x: 2.25,
        y: 0.025,
        z: 6.2,
    });
});

it('matches widened stage net and foreground without shrinking the near athlete', () => {
    const w = 1065,
        h = 606,
        v = fitCourtCamera(w, h, 12, h - 12);
    const a = projection(v, w, h, { x: -5.208, y: 1.524, z: 0 }),
        b = projection(v, w, h, { x: 5.208, y: 1.524, z: 0 });
    expect(Math.abs(a.x - b.x) / w).toBeGreaterThan(0.65);
    expect(Math.abs(a.x - b.x) / w).toBeLessThan(0.75);
    const left = projection(v, w, h, { x: -4.3, y: 0, z: -6.7 }),
        right = projection(v, w, h, { x: 4.3, y: 0, z: -6.7 });
    expect(Math.abs(left.x - right.x) / w).toBeGreaterThan(1);
});
