import { add, sub, mul, unit, dot, rotate, lerp, twoBone } from './motion';
import type { PoseActor, SkeletonPose, MotionName } from './motion';
import type { V3 } from './physics';
import { clamp } from './physics';

const smooth = (x: number) => {
    const u = clamp(x, 0, 1);
    return u * u * (3 - 2 * u);
};
export type StrokeView = { incoming: boolean; contactAt: number; motion: MotionName };

// Presentation only: the domain pose, prediction and swept contact evaluator never
// consume this result. No additional perception or input command is created.
export function presentStroke(
    a: PoseActor,
    physical: SkeletonPose,
    time: number,
    view: StrokeView,
): SkeletonPose & { presentation?: { anticipation: number; load: number; landing: number } } {
    const elapsed = time - a.swingAt;
    const actual = physical.racket.strokePhase !== 'ready';
    const motion = actual ? (physical.motion as MotionName) : view.motion;
    // Clear, smash and an overhead drop share the same loaded preparation;
    // a late safe-return choice must not pop an already raised arm back down.
    const high =
        motion !== 'Serve' &&
        (!actual || a.technique !== 'lift') &&
        ((actual ? (a.swingContact ?? a.contact) : a.contact)?.y ?? 0) >= 2.15;
    const remaining = view.contactAt - time;
    const incoming = !actual && view.incoming && !!a.contact && Number.isFinite(remaining);
    const anticipation = incoming
        ? smooth((0.52 - remaining) / 0.27) * smooth((remaining + 0.18) / 0.23)
        : 0;
    // Finish all preparation changes before the first swept-contact predecessor.
    const load = !high
        ? 0
        : actual && elapsed >= 0 && elapsed < a.hitFrame - 0.06
          ? 1 - smooth(elapsed / Math.max(0.008, a.hitFrame - 0.06))
          : anticipation;
    const landingStart = a.hitFrame + 0.2;
    const landing =
        actual && high && (motion === 'Smash' || motion === 'Clear')
            ? smooth((elapsed - landingStart + 0.045) / 0.09) *
              (1 - smooth((elapsed - landingStart - 0.07) / 0.16))
            : 0;
    const lower = 0.045 * load + 0.065 * landing;
    if (!load && !lower) return physical;

    const j = Object.fromEntries(
        Object.entries(physical.joints).map(([k, p]) => [k, { ...p }]),
    ) as Record<string, V3>;
    const hip = j.Hip;
    const beforeYaw = Math.atan2(
        j.ShoulderR.z - j.ShoulderL.z,
        (j.ShoulderR.x - j.ShoulderL.x) * -a.side,
    );
    const desiredYaw = high ? -0.8 : -0.24;
    const yaw = (desiredYaw - beforeYaw) * load;
    const up = { x: 0, y: 1, z: 0 };
    for (const name of ['Spine', 'Chest', 'Neck', 'Head', 'ShoulderR', 'ShoulderL']) {
        j[name] = add(hip, rotate(sub(j[name], hip), up, yaw * a.side));
        j[name].y -= lower;
    }
    j.Hip.y -= lower;
    j.HipR.y -= lower;
    j.HipL.y -= lower;
    const right = unit(sub(j.ShoulderR, j.ShoulderL));
    const forward = { x: 0, y: 0, z: -a.side };
    const shaft = unit(lerp(physical.racket.shaft, rotate(up, right, -1.35), load));
    const n0 = lerp(physical.racket.normal, rotate(forward, right, -1.35), load);
    const normal = unit(sub(n0, mul(shaft, dot(n0, shaft))));
    const prepared = add(
        j.ShoulderR,
        add(mul(right, high ? 0.2 : 0.24), {
            x: 0,
            y: high ? 0.4 : -0.12,
            z: a.side * (high ? 0.12 : -0.12),
        }),
    );
    const desiredHand = lerp(physical.racket.hand, prepared, load);
    // During landing the racket stays exactly on its original trajectory. Reduce
    // body compression if that would require stretching the hitting arm.
    if (!load && lower) {
        const d = sub(desiredHand, j.ShoulderR),
            limit = 0.718;
        const margin = Math.sqrt(Math.max(0, limit * limit - d.x * d.x - d.z * d.z)) - d.y;
        const correction = Math.max(0, -margin);
        for (const name of [
            'Hip',
            'HipR',
            'HipL',
            'Spine',
            'Chest',
            'Neck',
            'Head',
            'ShoulderR',
            'ShoulderL',
        ])
            j[name].y += Math.min(lower, correction);
    }
    const arm = twoBone(
        j.ShoulderR,
        desiredHand,
        0.36,
        0.36,
        add(mul(right, 1), { x: 0, y: high ? 0.25 : -0.3, z: a.side * 0.4 }),
    );
    j.ElbowR = arm.joint;
    j.WristR = arm.end;
    const offTarget = add(physical.joints.WristL, { x: 0, y: -lower, z: 0 });
    const off = twoBone(j.ShoulderL, offTarget, 0.36, 0.36, mul(right, -1));
    j.ElbowL = off.joint;
    j.WristL = off.end;
    for (const side of ['R', 'L']) {
        const leg = twoBone(j['Hip' + side], physical.joints['Ankle' + side], 0.43, 0.43, forward);
        j['Knee' + side] = leg.joint;
        j['Ankle' + side] = { ...physical.joints['Ankle' + side] };
    }
    // The unmodified physical racket is mandatory once loading has finished.
    const racket = load
        ? {
              ...physical.racket,
              hand: arm.end,
              shaft,
              normal,
              center: add(arm.end, mul(shaft, 0.46)),
          }
        : physical.racket;
    return {
        ...physical,
        joints: j,
        racket,
        hipHeight: j.Hip.y,
        presentation: { anticipation, load, landing },
    };
}
