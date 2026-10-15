import { it, expect } from 'vitest';
import { fitCourtCamera, courtAim, FRAMING_POINTS } from '../src/camera-framing';
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
    it(`fits court, athlete and high-clear envelope at ${w}×${h}`, () => {
        const top = h > w ? 146 : 12,
            bottom = h - (h > w ? 90 : 12),
            v = fitCourtCamera(w, h, top, bottom);
        for (const p of FRAMING_POINTS) {
            const s = projection(v, w, h, p);
            expect(s.depth).toBeGreaterThan(1);
            expect(s.x).toBeGreaterThanOrEqual(11);
            expect(s.x).toBeLessThanOrEqual(w - 11);
            expect(s.y).toBeGreaterThanOrEqual(top);
            expect(s.y).toBeLessThanOrEqual(bottom);
        }
    });
}
it('keeps actual high-clear solver paths inside desktop and portrait views', () => {
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
                            const s = projection(v, w, h, p);
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
