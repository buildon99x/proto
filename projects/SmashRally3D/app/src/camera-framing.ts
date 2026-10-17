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
    const pitch = (8 * Math.PI) / 180,
        s = Math.sin(pitch),
        c = Math.cos(pitch),
        fov = height > width ? 48 : 42,
        tan = Math.tan((fov * Math.PI) / 360),
        feetY = 0.815,
        headY = 0.54,
        foot = 0.04,
        head = 1.85,
        qFoot = (1 - 2 * feetY) * tan,
        qHead = (1 - 2 * headY) * tan,
        depth = ((head - foot) * c + qHead * (head - foot) * s) / (qHead - qFoot),
        up = qFoot * depth,
        position = { x: 0, y: foot - up * c + depth * s, z: -3.4 - up * s - depth * c };
    return {
        position,
        target: { x: 0, y: position.y - s * 10, z: position.z + c * 10 },
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
