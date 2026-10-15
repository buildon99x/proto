import { clamp } from './physics';
import type { V3 } from './physics';

// Court/runoff, full finite actor/racket extent, and an upper clear-flight hull.
// The hull is deliberately above the current16/19/22m/s clear profiles; tests
// project the real solver paths as well as these bounds through every view.
export const FRAMING_POINTS: V3[] = [-3.5, 3.5]
    .flatMap((x) => [-7.5, 7.5].flatMap((z) => [0, 3.6].map((y) => ({ x, y, z }))))
    .concat(
        [-7.5, -6, -5, -4, 4, 5, 6, 7.5].flatMap((z, i) =>
            [-3.5, 3.5].map((x) => ({ x, y: [4, 8, 10, 11.2, 11.2, 10, 8, 4][i], z })),
        ),
    );
export type Framing = { position: V3; target: V3; fov: number; top: number; bottom: number };

export function fitCourtCamera(
    width: number,
    height: number,
    top: number,
    bottom: number,
): Framing {
    // A low rear view gives the near athlete/court priority. High flights widen
    // only the lens; court picking still inverts the current camera exactly.
    const pitch = (8 * Math.PI) / 180,
        s = Math.sin(pitch),
        c = Math.cos(pitch),
        aspect = width / height,
        fov = 58,
        tan = Math.tan((fov * Math.PI) / 360),
        upper = 1 - (2 * top) / height,
        lower = 1 - (2 * bottom) / height,
        horizontal = 0.95,
        netY = height > width ? 0.5 : 0.52;
    const points = [-3.5, 3.5].flatMap((x) =>
        [-7.5, 7.5].flatMap((z) => [0, 3.6].map((y) => ({ x, y, z }))),
    );
    const offset = (d: number) => 1.524 * c - (1 - 2 * netY) * tan * (d - 1.524 * s);
    const fits = (d: number) =>
        points.every((p) => {
            const depth = d - p.y * s + p.z * c,
                up = p.y * c + p.z * s - offset(d);
            return (
                depth > 1 &&
                Math.abs(p.x) <= horizontal * depth * tan * aspect &&
                up <= upper * depth * tan &&
                up >= lower * depth * tan
            );
        });
    let lo = 8,
        hi = 150;
    for (let n = 0; n < 40; n++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid;
    }
    const distance = hi * 1.01,
        u = offset(distance),
        target = { x: 0, y: u * c, z: u * s };
    return {
        position: { x: 0, y: target.y + distance * s, z: target.z - distance * c },
        target,
        fov,
        top,
        bottom,
    };
}

// Pure projection bounds shared by runtime and tests. Include an anticipated
// shuttle position so lens expansion happens before a fast ascending flight clips.
export function flightFov(view: Framing, width: number, height: number, points: V3[]): number {
    const dy = view.target.y - view.position.y,
        dz = view.target.z - view.position.z,
        length = Math.hypot(dy, dz),
        fy = dy / length,
        fz = dz / length,
        upper = Math.max(0.1, 1 - (2 * view.top) / height),
        lower = Math.max(0.1, (2 * view.bottom) / height - 1);
    let tan = Math.tan((view.fov * Math.PI) / 360);
    for (const p of points) {
        const y = p.y - view.position.y,
            z = p.z - view.position.z,
            depth = Math.max(0.2, y * fy + z * fz),
            up = y * fz - z * fy;
        tan = Math.max(
            tan,
            Math.abs(p.x) / (((depth * width) / height) * 0.94),
            Math.abs(up) / (depth * (up >= 0 ? upper : lower) * 0.94),
        );
    }
    return (Math.atan(tan) * 360) / Math.PI;
}

export function courtAim(near: V3, far: V3): V3 {
    const t = (0.025 - near.y) / (far.y - near.y);
    return {
        x: clamp(near.x + (far.x - near.x) * t, -2.25, 2.25),
        y: 0.025,
        z: clamp(near.z + (far.z - near.z) * t, 0.8, 6.2),
    };
}
