import { clamp } from './physics';
import type { Quality, Shot, V3 } from './physics';
export type ImpactStyle = {
    attack: boolean;
    holdMs: number;
    durationMs: number;
    recoil: number;
    radius: number;
};
export function impactStyle(shot: Shot, quality: Quality, reducedMotion = false): ImpactStyle {
    const attack = shot === 'smash' || shot === 'superSmash';
    const perfect = quality === 'perfect',
        superShot = shot === 'superSmash';
    return {
        attack,
        holdMs: attack && !reducedMotion ? (superShot ? 32 : perfect ? 28 : 24) : 0,
        durationMs: attack ? 115 : 75,
        recoil: attack && !reducedMotion ? (superShot ? 0.018 : perfect ? 0.015 : 0.011) : 0,
        radius: attack ? (perfect ? 0.2 : 0.16) : 0.075,
    };
}
export function impactEnvelope(style: ImpactStyle, elapsedMs: number, velocity: V3) {
    const t = clamp(elapsedMs / style.durationMs, 0, 1);
    const pulse =
        elapsedMs >= 0 && elapsedMs < style.durationMs ? Math.sin(Math.PI * t) * (1 - t) : 0;
    const horizontal = Math.max(1e-6, Math.hypot(velocity.x, velocity.z));
    return {
        visible: elapsedMs >= 0 && elapsedMs < style.durationMs,
        radius: style.radius * (0.65 + t * 1.6),
        opacity: (1 - t) ** 2,
        recoil: {
            x: (-velocity.x / horizontal) * style.recoil * pulse,
            y: style.recoil * pulse * 0.2,
            z: (-velocity.z / horizontal) * style.recoil * pulse,
        },
    };
}
