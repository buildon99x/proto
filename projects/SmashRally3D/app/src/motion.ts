import { clamp, clone } from './physics';
import type { V3 } from './physics';
import motionData from './motion-data.json';
export const MOTIONS = motionData;
export type MotionName = keyof typeof MOTIONS;
export const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
export const unit = (a: V3): V3 => mul(a, 1 / Math.max(norm(a), 1e-9));
export const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
export const d3 = (a: V3, b: V3) => norm(sub(a, b));
export function twoBone(start: V3, end: V3, l1: number, l2: number, pole: V3) {
    const dir = unit(sub(end, start)),
        length = clamp(d3(start, end), Math.abs(l1 - l2) + 0.002, l1 + l2 - 0.002),
        along = (l1 * l1 - l2 * l2 + length * length) / (2 * length);
    const bend = unit(sub(pole, mul(dir, dot(pole, dir)))),
        joint = add(
            add(start, mul(dir, along)),
            mul(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along))),
        );
    return {
        joint,
        end: add(start, mul(dir, length)),
        clamped: Math.abs(length - d3(start, end)) > 0.003,
    };
}
export type Foot = {
    p: V3;
    from: V3;
    to: V3;
    started: number;
    duration: number;
    swing: boolean;
    cycle: number;
};
export type Feet = { left: Foot; right: Foot; next: 'left' | 'right'; last: number; slip: number };
export function makeFeet(p: V3, side = -1): Feet {
    const foot = (offset: number): Foot => {
        const at = { x: p.x + offset, y: 0.1, z: p.z };
        return {
            p: clone(at),
            from: clone(at),
            to: clone(at),
            started: 0,
            duration: 0.12,
            swing: false,
            cycle: 0,
        };
    };
    return { left: foot(side * 0.17), right: foot(-side * 0.17), next: 'left', last: -10, slip: 0 };
}
export function stepFeet(feet: Feet, p: V3, v: V3, time: number, side = -1) {
    const speed = Math.hypot(v.x, v.z),
        duration = clamp(0.48 / (speed + 1), 0.09, 0.18);
    for (const key of ['left', 'right'] as const) {
        const f = feet[key];
        if (f.swing) {
            const t = clamp((time - f.started) / f.duration, 0, 1);
            f.p = lerp(f.from, f.to, t * t * (3 - 2 * t));
            f.p.y = 0.1 + Math.sin(Math.PI * t) * (speed > 3 ? 0.13 : 0.065);
            if (t >= 1) {
                f.swing = false;
                f.p = clone(f.to);
            }
        }
    }
    const active = feet.left.swing || feet.right.swing;
    if (feet.left.swing && feet.right.swing) return;
    const key = active ? (feet.left.swing ? 'right' : 'left') : feet.next,
        f = feet[key],
        offset = key === 'left' ? side * 0.17 : -side * 0.17,
        ideal = { x: p.x + offset, y: 0.1, z: p.z };
    const lag = Math.hypot(f.p.x - ideal.x, f.p.z - ideal.z);
    // Running can have a brief airborne overlap: lift before a planted leg is overextended.
    if (active && lag < 0.45) return;
    if (speed > 0.35 || lag > 0.12) {
        if (!active && time - feet.last < duration * 0.4) return;
        const dir = speed > 0.1 ? { x: v.x / speed, y: 0, z: v.z / speed } : { x: 0, y: 0, z: 0 };
        f.from = clone(f.p);
        f.to = add(ideal, mul(dir, speed * duration * 0.35));
        f.to.y = 0.1;
        f.started = time;
        f.cycle++;
        f.duration = duration;
        f.swing = true;
        feet.last = time;
        feet.next = key === 'left' ? 'right' : 'left';
    }
}
export type PoseActor = {
    p: V3;
    v: V3;
    side: number;
    motion: string;
    swingAt: number;
    hitFrame: number;
    contact: V3 | null;
    feet: Feet;
    recoverUntil: number;
    movementReadyAt?: number;
    base?: V3;
    shot: string;
    strikeTarget?: V3 | null;
    splitAt?: number;
    technique?: string;
    holdingServe?: boolean;
    swingContact?: V3 | null;
    swingTarget?: V3 | null;
    swingMotion?: string;
    attackBoost?: boolean;
};
export type RacketPose = {
    center: V3;
    normal: V3;
    shaft: V3;
    hand: V3;
    active: boolean;
    reachable: boolean;
    phase: number;
    receiverSide: number;
};
export type SkeletonPose = {
    joints: Record<string, V3>;
    racket: RacketPose;
    hipHeight: number;
    hop: number;
    motion: string;
    footPhases: { left: boolean; right: boolean };
    footCycles: { left: number; right: number };
};
export function skeletonPose(a: PoseActor, time: number): SkeletonPose {
    const contact = a.swingContact ?? a.contact,
        goal = a.swingTarget ?? a.strikeTarget;
    const motion = (a.motion === 'Miss' ? 'Recover' : a.motion) as MotionName,
        def = MOTIONS[motion] ?? MOTIONS.Ready,
        elapsed = time - a.swingAt,
        swing = elapsed >= 0 && elapsed < def.duration && def.lead > 0;
    const t = swing ? clamp(elapsed / Math.max(a.hitFrame, 0.008), 0, 1) : 0,
        follow = swing ? clamp((elapsed - a.hitFrame) / Math.max(def.recover, 0.18), 0, 1) : 0;
    const previous = MOTIONS[(a.swingMotion ?? 'BasicHit') as MotionName] ?? MOTIONS.BasicHit,
        recoverT = clamp((elapsed - a.hitFrame - previous.recover * 0.85) / 0.25, 0, 1);
    const high = (motion === 'Clear' || motion === 'Smash') && a.technique !== 'lift',
        speed = Math.hypot(a.v.x, a.v.z),
        overhead = contact ? clamp((contact.y - 2.1) / 0.6, 0, 1) : 0;
    const splitPhase = time - (a.splitAt ?? -99),
        splitHop =
            !swing && splitPhase >= 0 && splitPhase < 0.12
                ? Math.sin((Math.PI * splitPhase) / 0.12) * 0.035
                : 0;
    const hop =
        splitHop +
        (swing && high
            ? Math.sin(Math.PI * clamp(elapsed / (a.hitFrame + 0.2), 0, 1)) *
              (motion === 'Smash' ? (a.attackBoost ? 0.27 : 0.2) : 0.105) *
              overhead
            : 0);
    const lf = add(a.feet.left.p, { x: 0, y: hop, z: 0 }),
        rf = add(a.feet.right.p, { x: 0, y: hop, z: 0 });
    const rightHip = { x: a.p.x - a.side * 0.16, z: a.p.z },
        leftHip = { x: a.p.x + a.side * 0.16, z: a.p.z };
    const limit = (foot: V3, hip: { x: number; z: number }) =>
        foot.y +
        Math.sqrt(Math.max(0.0004, 0.858 * 0.858 - (foot.x - hip.x) ** 2 - (foot.z - hip.z) ** 2));
    const crouch =
        swing && contact
            ? clamp((1.6 - contact.y) * 0.45, 0, 0.32) * (t * t * (3 - 2 * t)) * (1 - follow)
            : 0;
    const height =
        Math.min((speed > 2 ? 0.84 : 0.92) + hop, limit(rf, rightHip), limit(lf, leftHip)) - crouch;
    const hip = { x: a.p.x, y: height, z: a.p.z },
        forward = { x: 0, y: 0, z: -a.side },
        lean =
            ((motion === 'Recover'
                ? previous.bend + (0.1 - previous.bend) * recoverT
                : 0.1 + (def.bend - 0.1) * Math.min(1, Math.max(0, elapsed / 0.06))) +
                (speed > 2 ? 0.08 : 0)) *
            (swing ? 1 : 1),
        twist =
            motion === 'Recover'
                ? previous.coil * 0.75 * (1 - recoverT)
                : swing
                  ? -def.coil *
                        (a.attackBoost ? 1.2 : 1) *
                        Math.min(1, t / 0.3) *
                        (1 -
                            clamp((t - 0.3) / 0.7, 0, 1) ** 2 *
                                (3 - 2 * clamp((t - 0.3) / 0.7, 0, 1))) +
                    def.coil * 0.75 * follow
                  : 0;
    const spine = add(hip, { x: 0, y: 0.28, z: forward.z * lean * 0.22 }),
        chest = add(spine, { x: Math.sin(twist) * 0.05, y: 0.22, z: forward.z * lean * 0.1 });
    const right = unit({ x: -a.side * Math.cos(twist), y: 0, z: Math.sin(twist) }),
        neck = add(chest, { x: 0, y: 0.16, z: 0 }),
        head = add(neck, { x: 0, y: 0.13, z: 0 });
    const shR = add(chest, add(mul(right, 0.27), { x: 0, y: 0.02, z: 0 })),
        shL = add(chest, add(mul(right, -0.27), { x: 0, y: 0.02, z: 0 }));
    const aim =
        goal && contact
            ? unit({ x: goal.x - contact.x, y: 0, z: goal.z - contact.z })
            : { x: 0, y: 0, z: -a.side };
    const normal = unit({
            x: aim.x,
            y:
                motion === 'Clear'
                    ? 0.25
                    : motion === 'Smash'
                      ? -0.45
                      : motion === 'Drop'
                        ? 0.08
                        : 0,
            z: aim.z,
        }),
        shaft = unit(sub({ x: 0, y: 1, z: 0 }, mul(normal, normal.y)));
    let desired = add(shR, add(mul(right, 0.25), add(mul(forward, 0.3), { x: 0, y: -0.12, z: 0 })));
    if (swing && contact) {
        const wind = add(
            shR,
            add(mul(right, motion === 'Drop' ? 0.25 : 0.55), {
                x: 0,
                y: high ? 0.32 : -0.13,
                z: a.side * 0.24,
            }),
        );
        const through = add(
            contact,
            add(mul(right, -(motion === 'Drop' ? 0.16 : 0.55)), {
                x: 0,
                y: motion === 'Clear' ? 0.28 : motion === 'Smash' ? -0.8 : -0.14,
                z: forward.z * (motion === 'Drop' ? 0.1 : 0.35),
            }),
        );
        const ready = desired;
        if (t < 0.3) {
            const u = t / 0.3;
            desired = lerp(ready, wind, u * u * (3 - 2 * u));
        } else if (t < 1) {
            const u = (t - 0.3) / 0.7;
            desired = lerp(wind, contact, u * u * (3 - 2 * u));
        } else desired = lerp(contact, through, follow);
    }
    if (motion === 'Recover' && contact) {
        const through = add(
            contact,
            add(mul(right, -0.55), {
                x: 0,
                y: a.swingMotion === 'Clear' ? 0.28 : a.swingMotion === 'Smash' ? -0.8 : -0.14,
                z: forward.z * 0.35,
            }),
        );
        desired = lerp(through, desired, recoverT * recoverT * (3 - 2 * recoverT));
    }
    const desiredHand = sub(desired, mul(shaft, 0.46)),
        arm = twoBone(
            shR,
            desiredHand,
            0.36,
            0.36,
            add(mul(right, 1), { x: 0, y: -0.3, z: a.side * 0.2 }),
        ),
        hand = arm.end,
        center = add(hand, mul(shaft, 0.46));
    const balance =
        high && swing
            ? Math.min(1, Math.max(0, elapsed / 0.08)) * (1 - follow)
            : motion === 'Recover' && ['Clear', 'Smash'].includes(a.swingMotion ?? '')
              ? 0.15 * (1 - recoverT)
              : 0;
    let offHand = add(
        shL,
        add(mul(right, -0.15), {
            x: 0,
            y: -0.35 + 0.57 * balance,
            z: forward.z * (0.13 + 0.19 * balance),
        }),
    );
    if (a.holdingServe && contact)
        offHand = lerp(contact, offHand, swing ? clamp(elapsed / 0.08, 0, 1) : 0);
    const offArm = twoBone(shL, offHand, 0.36, 0.36, mul(right, -1));
    const hipR = add(hip, { x: -a.side * 0.16, y: 0, z: 0 }),
        hipL = add(hip, { x: a.side * 0.16, y: 0, z: 0 }),
        legR = twoBone(hipR, rf, 0.43, 0.43, forward),
        legL = twoBone(hipL, lf, 0.43, 0.43, forward);
    const joints = {
        Hip: hip,
        Spine: spine,
        Chest: chest,
        Neck: neck,
        Head: head,
        ShoulderR: shR,
        ElbowR: arm.joint,
        WristR: hand,
        ShoulderL: shL,
        ElbowL: offArm.joint,
        WristL: offArm.end,
        HipR: hipR,
        KneeR: legR.joint,
        AnkleR: legR.end,
        HipL: hipL,
        KneeL: legL.joint,
        AnkleL: legL.end,
    };
    return {
        joints,
        racket: {
            center,
            normal,
            shaft,
            hand,
            active: swing && Math.abs(elapsed - a.hitFrame) <= 0.035,
            reachable: d3(center, desired) < 0.12,
            phase: elapsed,
            receiverSide: a.side,
        },
        hipHeight: height,
        hop,
        motion,
        footPhases: { left: a.feet.left.swing, right: a.feet.right.swing },
        footCycles: { left: a.feet.left.cycle, right: a.feet.right.cycle },
    };
}
export function contactCheck(
    pose: RacketPose,
    ball: V3,
    velocity: V3,
    previous?: { ball: V3; racket: RacketPose },
) {
    const delta = sub(ball, pose.center),
        signed = dot(delta, pose.normal);
    let plane = Math.abs(signed),
        radial = Math.sqrt(Math.max(0, dot(delta, delta) - signed * signed)),
        alpha = 1,
        point = clone(ball),
        center = clone(pose.center),
        swept = false;
    if (previous) {
        const before = sub(previous.ball, previous.racket.center),
            old = dot(before, pose.normal);
        if (old * signed <= 0 && Math.abs(old - signed) > 1e-9) {
            const t = clamp(old / (old - signed), 0, 1),
                relative = lerp(before, delta, t),
                r = Math.sqrt(
                    Math.max(0, dot(relative, relative) - dot(relative, pose.normal) ** 2),
                );
            if (r <= 0.225) {
                radial = r;
                plane = 0;
                alpha = t;
                point = lerp(previous.ball, ball, t);
                center = lerp(previous.racket.center, pose.center, t);
                swept = true;
            }
        }
    }
    return {
        valid:
            pose.active &&
            plane <= 0.045 &&
            radial <= 0.225 &&
            Math.abs(dot(velocity, pose.normal)) > 0.05 &&
            velocity.z * pose.receiverSide > 0,
        planeDistance: plane,
        radialDistance: radial,
        distance: d3(point, center),
        approach: dot(velocity, pose.normal),
        point,
        center,
        alpha,
        swept,
    };
}
export function moveMotor(
    p: V3,
    v: V3,
    target: V3,
    side: number,
    dt: number,
    speedLimit = 5.8,
    acceleration = 24,
) {
    const dx = target.x - p.x,
        dz = target.z - p.z,
        d = Math.hypot(dx, dz),
        speed = Math.min(speedLimit, d * 8),
        vx = d > 0.01 ? (dx / d) * speed : 0,
        vz = d > 0.01 ? (dz / d) * speed : 0,
        change = acceleration * dt;
    v.x += clamp(vx - v.x, -change, change);
    v.z += clamp(vz - v.z, -change, change);
    const actualSpeed = Math.hypot(v.x, v.z);
    if (actualSpeed > speedLimit) {
        v.x *= speedLimit / actualSpeed;
        v.z *= speedLimit / actualSpeed;
    }
    p.x = clamp(p.x + v.x * dt, -2.8, 2.8);
    p.z = side * clamp(side * (p.z + v.z * dt), 0.45, 6.8);
    return { speed, dx, dz };
}
export function predictedRacket(
    a: PoseActor,
    point: V3,
    future: number,
    now: number,
    delay: number,
    dt = 1 / 120,
) {
    const actor = {
        ...a,
        p: { ...a.p },
        v: { ...a.v },
        feet: JSON.parse(JSON.stringify(a.feet)) as Feet,
        contact: { ...point },
        swingContact: { ...point },
        swingTarget: { x: 0, y: 0.025, z: -a.side * 5.8 },
        motion: point.y >= 2.15 ? 'Smash' : 'BasicHit',
        swingAt: now + future - (point.y >= 2.15 ? 0.16 : 0.12),
        hitFrame: point.y >= 2.15 ? 0.16 : 0.12,
        attackBoost: false,
    };
    const target = { x: point.x + a.side * 0.35, y: 0, z: point.z + a.side * 0.3 };
    for (let t = dt; t <= future + dt * 0.1; t += dt) {
        moveMotor(
            actor.p,
            actor.v,
            now + t < (a.movementReadyAt ?? a.recoverUntil) ||
                (now + t >= (a.splitAt ?? -99) && now + t < (a.splitAt ?? -99) + 0.12)
                ? actor.p
                : t >= delay
                  ? target
                  : (a.base ?? actor.p),
            a.side,
            dt,
        );
        stepFeet(actor.feet, actor.p, actor.v, now + t, a.side);
    }
    return skeletonPose(actor, now + future).racket;
}
