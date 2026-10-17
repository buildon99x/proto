import { clamp, distance, solve, solveProfile, CFG } from './physics';
import type { V3, Shot, Quality, Solution } from './physics';
export type Technique =
    'clear' | 'lift' | 'drop' | 'net' | 'block' | 'drive' | 'smash' | 'superSmash' | 'netKill';
export type StrokeContext = {
    side: number;
    body: V3;
    movement: V3;
    contact: V3;
    incoming: V3;
    incomingShot: Shot;
    incomingWeak: boolean;
    quality: Quality;
    preparation: number;
    intent: 'clear' | 'drop' | 'default';
    target: V3;
    timingError: number;
};
export type Stroke = {
    shot: Shot;
    technique: Technique;
    balance: number;
    prepared: number;
    crossCourt: boolean;
    reason: string;
};
export function assessStroke(c: StrokeContext): Stroke {
    const front = (c.contact.z - c.body.z) * -c.side,
        offset = Math.abs(c.contact.x - c.body.x + c.side * 0.35),
        speed = Math.hypot(c.movement.x, c.movement.z),
        prepared = clamp(c.preparation, 0, 1),
        balance = clamp(
            1 -
                Math.max(0, speed - 2.5) * 0.055 -
                Math.max(0, offset - 0.18) * 0.45 -
                Math.max(0, -front) * 0.7,
            0.35,
            1,
        ),
        crossCourt = c.contact.x * c.target.x < -0.3;
    const out = (shot: Shot, technique: Technique, reason: string): Stroke => ({
        shot,
        technique,
        balance,
        prepared,
        crossCourt,
        reason,
    });
    if (c.intent === 'clear')
        return out('clear', c.contact.y < 1.9 ? 'lift' : 'clear', 'RECOVERY_TIME');
    if (c.quality === 'weak' && c.intent === 'default' && c.contact.y >= 2.15)
        return out('clear', 'clear', 'RUSHED_RECOVERY');
    if (c.intent === 'drop')
        return out(
            'drop',
            Math.abs(c.contact.z) < 2.6 ? 'net' : c.contact.y < 2.15 ? 'block' : 'drop',
            'DRAW_FORWARD',
        );
    // Late low contacts are assisted into an intelligible safe return, not an extra precision gate.
    if (c.contact.y < CFG.net - 0.12) return out('clear', 'lift', 'BELOW_TAPE');
    if (c.contact.y < 2.15) {
        if (Math.abs(c.contact.z) < 1.8 && c.contact.y > CFG.net + 0.25 && balance > 0.7)
            return out('smash', 'netKill', 'LOOSE_NET_REPLY');
        if (Math.abs(c.target.z) < 2.1)
            return out('drop', Math.abs(c.contact.z) < 2.6 ? 'net' : 'block', 'TAKE_PACE_OFF');
        return out('drive', 'drive', 'FLAT_EXCHANGE');
    }
    if (front < -0.05 || balance < 0.5 || prepared < 0.45)
        return out('clear', 'clear', 'RECOVER_BALANCE');
    if (
        c.incomingWeak &&
        c.contact.y >= 2.5 &&
        Math.hypot(c.incoming.x, c.incoming.y, c.incoming.z) < 13 &&
        c.quality === 'perfect' &&
        balance >= 0.7 &&
        prepared >= 0.75
    )
        return out('superSmash', 'superSmash', 'EXPOSED_SHORT_LIFT');
    return out('smash', 'smash', 'EARLY_FRONT_CONTACT');
}
export function strokeTarget(c: StrokeContext, s: Stroke) {
    const t = {
        x: clamp(c.target.x, -2.25, 2.25),
        y: 0.025,
        z: -c.side * clamp(Math.abs(c.target.z), 0.8, 6.2),
    };
    if (['drop', 'net', 'block', 'netKill'].includes(s.technique))
        t.z = -c.side * clamp(Math.abs(t.z), 0.8, s.technique === 'drop' ? 1.9 : 1.35);
    if (s.shot === 'clear') t.z = -c.side * Math.max(5.3, Math.abs(t.z));
    // Timing errors move the actual landing. Cross cost also exists as longer flight and recovery geometry.
    const e = clamp(c.timingError, -0.3, 0.3),
        loss = Math.max(0, Math.abs(e) - 0.08) + (1 - s.balance) * 0.12;
    t.x += Math.sign(t.x || c.contact.x || 1) * loss * (s.crossCourt ? 1.25 : 1);
    if (c.quality === 'weak' && s.shot === 'clear') t.z = -c.side * Math.min(4.1, Math.abs(t.z));
    return t;
}
export function solveStroke(c: StrokeContext, s: Stroke, target = strokeTarget(c, s)): Solution {
    if (s.technique === 'netKill')
        return solveProfile(c.contact, target, 'smash', {
            vertical: [-5, -4, -3, -2, -1],
            cap: 26,
            minHeight: CFG.net + 0.25,
        });
    if (s.technique === 'net' || s.technique === 'block') {
        // Rushed low soft replies need safety height: a loose reply can be attacked.
        const loose = c.quality === 'weak' || s.balance < 0.85;
        return solveProfile(c.contact, target, 'drop', {
            vertical: loose ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 8],
            desiredTime: loose ? 1.05 : s.technique === 'net' ? 0.65 : 0.85,
        });
    }
    if (s.technique === 'smash')
        return solveProfile(c.contact, target, 'smash', {
            cap: (c.quality === 'perfect' ? 38 : 34) * (0.82 + 0.18 * s.balance),
            vertical: c.quality === 'perfect' ? [-7, -6, -5, -4, -3, -2, -1] : [-5, -4, -3, -2, -1],
        });
    return solve(c.contact, target, s.shot);
}
export function recoveryBase(
    side: number,
    technique: Technique,
    target: V3,
    contact: V3,
    flightTime = 1,
) {
    const attack = ['smash', 'superSmash', 'netKill'].includes(technique),
        net = ['net', 'block'].includes(technique),
        depth = net ? 2.25 : attack ? 2.65 : technique === 'drop' ? 3.15 : 3.55;
    // Cover the shorter straight reply first; a wide cross requires crossing the base too.
    return {
        x: clamp(target.x * (attack ? 0.55 : 0.36), -1.25, 1.25),
        y: 0,
        z:
            side *
            clamp(depth + (flightTime < 0.6 ? 0.15 : 0) + (contact.y < 1.5 ? 0.1 : 0), 1.9, 4.0),
    };
}
export function chooseTactic(
    c: Omit<StrokeContext, 'intent' | 'target' | 'timingError'>,
    opponent: V3,
    easy = false,
) {
    const options = easy ? (['clear'] as const) : (['clear', 'drop', 'default'] as const);
    let best: {
        intent: 'clear' | 'drop' | 'default';
        target: V3;
        score: number;
        technique: Technique;
    } | null = null;
    for (const intent of options)
        for (const x of [-1.8, 1.8])
            for (const depth of intent === 'default' &&
            ['smash', 'superSmash', 'drive'].includes(c.incomingShot)
                ? [1.15, 5.8]
                : [intent === 'drop' ? 1.15 : 5.8]) {
                const target = { x, y: 0.025, z: -c.side * depth },
                    ctx = { ...c, intent, target, timingError: 0 },
                    s = assessStroke(ctx),
                    p = strokeTarget(ctx, s),
                    f = solveStroke(ctx, s, p);
                if (f.prediction.reason === 'NET' || f.error > 0.08) continue;
                const base = recoveryBase(c.side, s.technique, p, c.contact, f.prediction.time),
                    recover = distance(c.body, base) / CFG.speed,
                    travel = distance(opponent, p) / CFG.speed,
                    score =
                        travel -
                        f.prediction.time * 0.35 -
                        recover * 0.18 +
                        (intent === 'drop' && Math.abs(opponent.z) > 4 ? 0.4 : 0) +
                        (s.shot === 'smash' || s.shot === 'superSmash' ? 0.25 : 0) +
                        (s.technique === 'lift' && s.balance < 0.7 ? 0.2 : 0);
                if (!best || score > best.score)
                    best = { intent, target, score, technique: s.technique };
            }
    return (
        best ?? {
            intent: 'clear' as const,
            target: { x: 0, y: 0.025, z: -c.side * 5.8 },
            score: 0,
            technique: 'lift' as Technique,
        }
    );
}
