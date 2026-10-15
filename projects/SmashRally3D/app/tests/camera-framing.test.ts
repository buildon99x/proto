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
    it(`fits low court and finite athletes at ${w}×${h}`, () => {
        const top = h > w ? 146 : 12,
            bottom = h - (h > w ? 90 : 12),
            v = fitCourtCamera(w, h, top, bottom);
        for (const p of FRAMING_POINTS.filter((p) => p.y <= 3.6)) {
            const s = projection(v, w, h, p);
            expect(s.depth).toBeGreaterThan(1);
            expect(s.x).toBeGreaterThanOrEqual(11);
            expect(s.x).toBeLessThanOrEqual(w - 11);
            expect(s.y).toBeGreaterThanOrEqual(top);
            expect(s.y).toBeLessThanOrEqual(bottom);
        }
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

it('places the tape at reference height and keeps the ordinary near athlete readable', () => {
    const w = 1280,
        h = 720,
        v = fitCourtCamera(w, h, 12, h - 12);
    const net = projection(v, w, h, { x: 0, y: 1.524, z: 0 });
    expect(net.y / h).toBeGreaterThanOrEqual(0.45);
    expect(net.y / h).toBeLessThanOrEqual(0.59);
    const feet = projection(v, w, h, { x: 0, y: 0, z: -4.5 });
    const head = projection(v, w, h, { x: 0, y: 1.85, z: -4.5 });
    expect((feet.y - head.y) / h).toBeGreaterThan(0.17);
    expect(v.position.y).toBeLessThan(5);
    const high = flightFov(v, w, h, [{ x: 0, y: 10, z: -3 }]);
    expect(high).toBeGreaterThan(v.fov);
    expect(flightFov(v, w, h, [])).toBe(v.fov);
});
