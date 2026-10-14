export type V3 = { x: number; y: number; z: number };
export type Shot = 'clear' | 'drive' | 'drop' | 'smash' | 'superSmash';
export type Quality = 'perfect' | 'good' | 'weak' | 'miss';
export const CFG = {
    dt: 1 / 120,
    drag: 0.065,
    gravity: 9.81,
    width: 2.59,
    length: 6.7,
    net: 1.524,
    radius: 0.025,
    speed: 5.8,
    accel: 24,
    reach: 0.68,
    swingLead: 0.12,
    buffer: 0.35,
    recovery: 0.3,
};
export const clone = (v: V3): V3 => ({ ...v });
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const distance = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.z - b.z);
export function advance(p: V3, v: V3, dt = CFG.dt) {
    const s = Math.hypot(v.x, v.y, v.z);
    v.x -= CFG.drag * s * v.x * dt;
    v.y += (-CFG.gravity - CFG.drag * s * v.y) * dt;
    v.z -= CFG.drag * s * v.z * dt;
    p.x += v.x * dt;
    p.y += v.y * dt;
    p.z += v.z * dt;
}
export function sweep(a: V3, b: V3): { reason: 'NET' | 'GROUND'; p: V3 } | null {
    if (a.z * b.z <= 0 && a.z !== b.z) {
        const t = -a.z / (b.z - a.z),
            y = a.y + (b.y - a.y) * t,
            x = a.x + (b.x - a.x) * t;
        if (Math.abs(x) <= CFG.width + 0.1 && y <= CFG.net + CFG.radius)
            return { reason: 'NET', p: { x, y, z: 0 } };
    }
    if (b.y <= CFG.radius) {
        const t = clamp((a.y - CFG.radius) / (a.y - b.y), 0, 1);
        return {
            reason: 'GROUND',
            p: { x: a.x + (b.x - a.x) * t, y: CFG.radius, z: a.z + (b.z - a.z) * t },
        };
    }
    return null;
}
export function inside(p: V3) {
    return Math.abs(p.x) <= CFG.width + CFG.radius && Math.abs(p.z) <= CFG.length + CFG.radius;
}
export function flight(start: V3, initial: V3, collisions = true) {
    const p = clone(start),
        v = clone(initial);
    const path: { p: V3; v: V3; t: number }[] = [];
    let apex = p.y,
        netHeight = Infinity;
    for (let i = 1; i <= 720; i++) {
        const old = clone(p);
        advance(p, v);
        apex = Math.max(apex, p.y);
        if (old.z * p.z <= 0 && old.z !== p.z)
            netHeight = old.y + (p.y - old.y) * (-old.z / (p.z - old.z));
        path.push({ p: clone(p), v: clone(v), t: i * CFG.dt });
        const hit = sweep(old, p);
        if ((collisions && hit?.reason === 'NET') || hit?.reason === 'GROUND')
            return { end: hit!.p, time: i * CFG.dt, apex, netHeight, reason: hit!.reason, path };
    }
    return { end: p, time: 6, apex, netHeight, reason: 'TIMEOUT', path };
}
const lifts: Record<Shot, number[]> = {
    clear: [16, 19, 22],
    drive: [3, 5, 7, 9],
    drop: [2, 4, 6, 8],
    smash: [-5, -2, 1, 4, 7],
    superSmash: [-8, -4, 0, 4],
};
// Search horizontal launch speed for each vertical launch candidate using precisely the runtime integrator.
export function solve(start: V3, target: V3, shot: Shot) {
    const dx = target.x - start.x,
        dz = target.z - start.z,
        d = Math.hypot(dx, dz);
    let best: {
        velocity: V3;
        prediction: ReturnType<typeof flight>;
        error: number;
        cost: number;
    } | null = null;
    for (const vy of lifts[shot]) {
        let low = 0.1,
            high = 115;
        for (let i = 0; i < 15; i++) {
            const speed = (low + high) / 2;
            const f = flight(start, { x: (dx / d) * speed, y: vy, z: (dz / d) * speed }, false);
            if (distance(start, f.end) < d) low = speed;
            else high = speed;
        }
        const speed = (low + high) / 2,
            velocity = { x: (dx / d) * speed, y: vy, z: (dz / d) * speed };
        const prediction = flight(start, velocity),
            error = distance(prediction.end, target);
        const desired =
            shot === 'clear' ? 2.5 : shot === 'drop' ? 1.2 : shot === 'drive' ? 0.85 : 0.55;
        const cost =
            error * 30 +
            (prediction.reason === 'NET' ? 100 : 0) +
            Math.abs(prediction.time - desired) +
            speed * 0.003;
        if (!best || cost < best.cost) best = { velocity, prediction, error, cost };
    }
    return best!;
}
export function quality(error: number): Quality {
    const e = Math.abs(error);
    return e <= 0.08 ? 'perfect' : e <= 0.18 ? 'good' : e <= 0.3 ? 'weak' : 'miss';
}
export function chooseShot(
    intent: 'default' | 'clear' | 'drop',
    y: number,
    incomingWeak: boolean,
    speed: number,
    q: Quality,
    reachable: boolean,
): Shot {
    if (intent !== 'default') return intent;
    if (y < 2.15 || !reachable) return 'drive';
    return incomingWeak && y >= 2.5 && speed < 13 && q === 'perfect' ? 'superSmash' : 'smash';
}
