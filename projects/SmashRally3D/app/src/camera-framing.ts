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
    const portrait = height > width;
    const pitches = portrait ? [52, 56, 60, 64] : [28, 32, 36, 40, 44, 48];
    const fov = 44,
        tan = Math.tan((fov * Math.PI) / 360),
        aspect = width / height;
    // UI bounds use CSS pixels, as do PlayCanvas screen/world conversions.
    const upper = 1 - (2 * top) / height,
        lower = 1 - (2 * bottom) / height;
    const horizontal = 1 - (2 * Math.max(12, width * 0.025)) / width;
    let best: (Framing & { cost: number }) | null = null;
    for (const degrees of pitches) {
        const pitch = (degrees * Math.PI) / 180,
            s = Math.sin(pitch),
            c = Math.cos(pitch);
        const range = (d: number) => {
            let lo = -Infinity,
                hi = Infinity,
                valid = true;
            for (const p of FRAMING_POINTS) {
                const depth = d - p.y * s + p.z * c,
                    up = p.y * c + p.z * s;
                if (depth <= 1 || Math.abs(p.x) > horizontal * depth * tan * aspect) valid = false;
                lo = Math.max(lo, up - upper * tan * depth);
                hi = Math.min(hi, up - lower * tan * depth);
            }
            return { lo, hi, valid: valid && lo <= hi };
        };
        let lo = 1,
            hi = 150;
        for (let n = 0; n < 40; n++) {
            const mid = (lo + hi) / 2;
            if (range(mid).valid) hi = mid;
            else lo = mid;
        }
        const distance = hi * 1.01,
            limits = range(distance),
            u = (limits.lo + limits.hi) / 2;
        const target = { x: 0, y: u * c, z: u * s };
        const candidate = {
            position: { x: 0, y: target.y + distance * s, z: target.z - distance * c },
            target,
            fov,
            top,
            bottom,
            cost: distance / c,
        };
        // Favour readable upright players while keeping the full flight hull inside the frame.
        if (!best || candidate.cost < best.cost) best = candidate;
    }
    return best!;
}

export function courtAim(near: V3, far: V3): V3 {
    const t = (0.025 - near.y) / (far.y - near.y);
    return {
        x: clamp(near.x + (far.x - near.x) * t, -2.25, 2.25),
        y: 0.025,
        z: clamp(near.z + (far.z - near.z) * t, 0.8, 6.2),
    };
}
