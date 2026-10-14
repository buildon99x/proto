import {
    MOTIONS,
    makeFeet,
    stepFeet,
    skeletonPose,
    contactCheck,
    moveMotor,
    predictedRacket,
} from './motion';
import type { Feet, SkeletonPose } from './motion';
import {
    CFG,
    advance,
    chooseShot,
    clamp,
    clone,
    distance,
    flight,
    inside,
    quality,
    solve,
    sweep,
} from './physics';
import type { V3, Shot, Quality } from './physics';
export type Intent = 'default' | 'clear' | 'drop';
export type Command = { shotIntent: Intent; target: V3; issuedAt: number; pointerType: string };
export type Actor = {
    p: V3;
    v: V3;
    target: V3;
    side: number;
    recoverUntil: number;
    swingAt: number;
    hitFrame: number;
    feet: Feet;
    frameEmitted: boolean;
    armed: boolean;
    attackBoost: boolean;
    previousPose: SkeletonPose | null;
    pose: SkeletonPose | null;
    contact: V3 | null;
    expectedVelocity: V3 | null;
    motion: string;
    swingMotion: string;
    strikeTarget: V3 | null;
    holdingServe: boolean;
    shot: Shot;
    quality: Quality;
    command: Command | null;
    locked: boolean;
};
export type Hit = {
    actor: number;
    p: V3;
    shot: Shot;
    quality: Quality;
    time: number;
    target: V3;
    velocity: V3;
    renderPose:SkeletonPose;
    requestedShot: Shot;
    fallbackReason: string | null;
    contact: {
        racket: V3;
        ball: V3;
        planeDistance: number;
        radialDistance: number;
        source: string;
    };
};
export const profiles = {
    EASY: { delay: 0.5, error: 0.14, timing: 0.24, perceptionPos: 0.035, perceptionVelocity: 0.12 },
    NORMAL: {
        delay: 0.3,
        error: 0.08,
        timing: 0.19,
        perceptionPos: 0.02,
        perceptionVelocity: 0.08,
    },
    HARD: {
        delay: 0.18,
        error: 0.04,
        timing: 0.09,
        perceptionPos: 0.008,
        perceptionVelocity: 0.035,
    },
};
export class Game {
    phase = 'MENU';
    time = 0;
    phaseAt = 0;
    paused = false;
    scores = [0, 0];
    server = 0;
    hitter = 0;
    receiver = 1;
    p: V3 = { x: 0, y: 1, z: -3 };
    v: V3 = { x: 0, y: 0, z: 0 };
    actors: Actor[];
    contactAt = Infinity;
    predicted: ReturnType<typeof flight> | null = null;
    difficulty: keyof typeof profiles = 'NORMAL';
    reactionAt = 0;
    incomingWeak = false;
    returns = 0;
    message = '';
    messageAt = 0;
    shots: Hit[] = [];
    points: { winner: number; reason: string; returns: number }[] = [];
    onMotionTick: ((index: number, dt: number) => boolean) | null = null;
    contactAttempts: {
        actor: number;
        time: number;
        valid: boolean;
        plane: number;
        radial: number;
        quality: Quality;
    }[] = [];
    previousBall: V3 | null = null;
    motionEvents: { actor: number; time: number; name: string; source: string }[] = [];
    aiPerception: {
        samples: number;
        nextAt: number;
        observedAt: number;
        position: V3 | null;
        velocity: V3 | null;
        flightId: number;
    } = {
        samples: 0,
        nextAt: Infinity,
        observedAt: 0,
        position: null,
        velocity: null,
        flightId: 0,
    };
    onHit: (hit: Hit) => void = () => {};
    onPoint: () => void = () => {};
    constructor() {
        this.actors = [-1, 1].map((side) => ({
            p: { x: 0, y: 0, z: side * 3.4 },
            v: { x: 0, y: 0, z: 0 },
            target: { x: 0, y: 0, z: side * 3.4 },
            side,
            recoverUntil: 0,
            swingAt: -99,
            hitFrame: CFG.swingLead,
            feet: makeFeet({ x: 0, y: 0, z: side * 3.4 }, side),
            frameEmitted: false,
            armed: false,
            attackBoost: false,
            pose: null,
            previousPose: null,
            contact: null,
            expectedVelocity: null,
            motion: 'Ready',
            swingMotion: 'BasicHit',
            strikeTarget: null,
            holdingServe: false,
            shot: 'drive',
            quality: 'good',
            command: null,
            locked: false,
        }));
    }
    transition(phase: string) {
        this.phase = phase;
        this.phaseAt = this.time;
    }
    feedback(text: string) {
        this.message = text;
        this.messageAt = this.time;
    }
    start() {
        this.scores = [0, 0];
        this.server = 0;
        this.shots = [];
        this.motionEvents = [];
        this.contactAttempts = [];
        this.previousBall = null;
        this.points = [];
        this.paused = false;
        this.time = 0;
        this.resetActors();
        this.transition('COUNTDOWN');
    }
    resetActors() {
        for (const a of this.actors) {
            a.p = { x: 0, y: 0, z: a.side * 3.4 };
            a.target = clone(a.p);
            a.v = { x: 0, y: 0, z: 0 };
            a.recoverUntil = 0;
            a.swingAt = -99;
            a.contact = null;
            a.command = null;
            a.locked = false;
            a.motion = 'Ready';
            a.feet = makeFeet(a.p, a.side);
            a.frameEmitted = false;
            a.armed = false;
            a.attackBoost = false;
            a.holdingServe = false;
            a.pose = null;
            a.previousPose = null;
        }
    }
    serveReady() {
        this.returns = 0;
        this.resetActors();
        this.p = {
            x: this.actors[this.server].p.x - this.actors[this.server].side * 0.35,
            y: 1.1,
            z: this.actors[this.server].p.z - this.actors[this.server].side * 0.3,
        };
        this.v = { x: 0, y: 0, z: 0 };
        this.actors[this.server].holdingServe = true;
        this.actors[this.server].contact = { ...this.p };
        this.transition('SERVE_READY');
        this.feedback(this.server === 0 ? 'CLICK / TAP TO SERVE' : 'AI SERVE');
    }
    shotTarget(a: Actor, shot: Shot) {
        const cmd = a.command!;
        const target = {
            x: clamp(cmd.target.x, -2.25, 2.25),
            y: 0.025,
            z: -a.side * clamp(Math.abs(cmd.target.z), 0.8, 6.2),
        };
        if (shot === 'drop') target.z = -a.side * clamp(Math.abs(target.z), 0.8, 1.9);
        if (shot === 'clear') target.z = -a.side * Math.max(5.1, Math.abs(target.z));
        if (a.quality === 'weak') target.z = -a.side * Math.min(4.1, Math.abs(target.z));
        return target;
    }
    inputLead(intent: Intent, index = 0) {
        return intent === 'clear'
            ? MOTIONS.Clear.lead
            : intent === 'drop'
              ? MOTIONS.Drop.lead
              : (this.actors[index].contact?.y ?? 0) >= 2.15
                ? MOTIONS.Smash.lead
                : MOTIONS.BasicHit.lead;
    }
    command(cmd: Command) {
        if (this.paused) return;
        if (this.phase === 'SERVE_READY' && this.server === 0) {
            this.serve(cmd);
            return;
        }
        if (this.phase !== 'RALLY' || this.receiver !== 0) return;
        const a = this.actors[0];
        if (a.locked) return;
        if (!Number.isFinite(this.contactAt)) {
            this.feedback('OUT OF REACH');
            return;
        }
        if (this.contactAt - this.time > CFG.buffer + this.inputLead(cmd.shotIntent)) {
            this.feedback('TOO EARLY');
            return;
        }
        if (this.time > this.contactAt - 0.025) {
            this.feedback('TOO LATE');
            return;
        }
        a.command = cmd;
        a.strikeTarget = { ...cmd.target };
        a.quality = quality(cmd.issuedAt - (this.contactAt - this.inputLead(cmd.shotIntent)));
        if (a.quality === 'miss') {
            a.command = null;
            a.motion = 'Miss';
            a.swingAt = this.time;
            a.hitFrame = this.inputLead(cmd.shotIntent);
            this.feedback(cmd.issuedAt < this.contactAt - a.hitFrame ? 'TOO EARLY' : 'TOO LATE');
        }
    }
    serve(cmd?: Command) {
        const a = this.actors[this.server];
        a.shot = 'clear';
        a.quality = 'good';
        a.swingAt = this.time;
        a.hitFrame = MOTIONS.Serve.lead;
        a.frameEmitted = false;
        a.contact = clone(this.p);
        a.motion = 'Serve';
        a.swingMotion = 'Serve';
        a.attackBoost = false;
        a.strikeTarget = cmd ? { ...cmd.target } : { x: 0.3, y: 0.025, z: -a.side * 5.4 };
        a.command = cmd ?? {
            shotIntent: 'clear',
            target: { x: 0.3, y: 0, z: -a.side * 5.4 },
            issuedAt: this.time,
            pointerType: 'ai',
        };
        this.contactAt = this.time + MOTIONS.Serve.lead;
        this.transition('SERVING');
    }
    sendHit(index: number, isServe = false) {
        const a = this.actors[index],
            cmd = a.command;
        if (!cmd) return false;
        const pose = skeletonPose(a, this.time);
        a.pose = pose;
        const contact = contactCheck(
            pose.racket,
            this.p,
            this.v,
            this.previousBall && a.previousPose
                ? { ball: this.previousBall, racket: a.previousPose.racket }
                : undefined,
        );
        const serveContact =
            pose.racket.active && contact.planeDistance <= 0.045 && contact.radialDistance <= 0.225;
        const frameSource = this.onMotionTick ? 'engine:hit_frame' : 'domain:hit_frame';
        this.contactAttempts.push({
            actor: index,
            time: this.time,
            valid: isServe ? serveContact : contact.valid,
            plane: contact.planeDistance,
            radial: contact.radialDistance,
            quality: a.quality,
        });
        if (this.contactAttempts.length > 512) this.contactAttempts.shift();
        if (
            !a.armed ||
            (isServe
                ? !serveContact
                : !contact.valid || this.p.y < 0.75 || this.p.y > 2.9 || a.quality === 'miss')
        ) {
            this.feedback(index === 0 ? 'OUT OF REACH' : 'AI MISSED');
            return false;
        }
        if (!isServe) this.p = { ...contact.point };
        a.armed = false;
        a.holdingServe = false;
        let shot: Shot = isServe
            ? 'clear'
            : chooseShot(
                  cmd.shotIntent,
                  this.p.y,
                  this.incomingWeak,
                  Math.hypot(this.v.x, this.v.y, this.v.z),
                  a.quality,
                  true,
              );
        if (!isServe && a.quality === 'weak') shot = 'clear';
        const target = this.shotTarget(a, shot);
        let result = solve(this.p, target, shot);
        const requestedShot = shot;
        shot = result.resolvedShot;
        this.v = clone(result.velocity);
        this.hitter = index;
        this.receiver = 1 - index;
        this.incomingWeak = a.quality === 'weak';
        a.shot = shot;
        a.motion = isServe ? 'Serve' : a.swingMotion;
        a.recoverUntil =
            this.time +
            (shot === 'superSmash'
                ? 0.65
                : (MOTIONS[
                      (shot === 'drive'
                          ? 'BasicHit'
                          : shot[0].toUpperCase() + shot.slice(1)) as keyof typeof MOTIONS
                  ]?.recover ?? CFG.recovery));
        a.command = null;
        a.locked = false;
        const hit: Hit = {
            actor: index,
            p: clone(this.p),
            velocity: clone(this.v),
            shot,
            quality: a.quality,
            time: this.time,
            target,renderPose:pose,
            requestedShot,
            fallbackReason: result.fallbackReason,
            contact: {
                racket: { ...contact.center },
                ball: { ...this.p },
                planeDistance: contact.planeDistance,
                radialDistance: contact.radialDistance,
                source: frameSource,
            },
        };
        this.shots.push(hit);
        if (!isServe) this.returns++;
        this.feedback(
            `${a.quality.toUpperCase()} · ${shot === 'superSmash' ? 'SUPER SMASH' : shot.toUpperCase()}`,
        );
        if (result.fallbackReason)
            this.feedback(`LIMIT: ${requestedShot.toUpperCase()} > ${shot.toUpperCase()}`);
        this.onHit(hit);
        this.transition('RALLY');
        this.plan();
        return true;
    }
    plan() {
        this.contactAt = Infinity;
        const a = this.actors[this.receiver];
        a.command = null;
        a.locked = false;
        a.contact = null;
        a.expectedVelocity = null;
        a.frameEmitted = false;
        a.armed = false;
        this.reactionAt =
            this.time + (this.receiver === 1 ? profiles[this.difficulty].delay : 0.05);
        if (this.receiver === 1) {
            this.predicted = null;
            this.aiPerception = {
                samples: 0,
                nextAt: this.reactionAt,
                observedAt: 0,
                position: null,
                velocity: null,
                flightId: this.shots.length,
            };
        } else this.intercept(this.p, this.v, 0.05);
    }
    intercept(observed: V3, velocity: V3, delay: number) {
        const a = this.actors[this.receiver];
        this.predicted = flight(observed, velocity);
        this.contactAt = Infinity;
        a.contact = null;
        const overhead = this.shots.at(-1)?.shot === 'clear';
        for (const f of this.predicted.path) {
            if (
                f.p.z * a.side < 0.6 ||
                f.p.y > (overhead ? 2.7 : 1.85) ||
                f.p.y < 1.05 ||
                f.v.y > 0 ||
                f.t < delay + CFG.swingLead
            )
                continue;
            const feet = { x: f.p.x + a.side * 0.35, y: 0, z: f.p.z + a.side * 0.3 };
            if (Math.abs(feet.x) > 2.75 || Math.abs(feet.z) > 6.8) continue;
            const travel = distance(a.p, feet) / CFG.speed;
            if (travel > f.t + 0.22) continue;
            if (this.time + f.t < a.recoverUntil + (f.p.y >= 2.15 ? 0.16 : 0.12)) continue;
            const racket = predictedRacket(a, f.p, f.t, this.time, delay);
            const physical = contactCheck(racket, f.p, f.v);
            if (physical.valid) {
                a.contact = { ...f.p };
                a.expectedVelocity = { ...f.v };
                this.contactAt = this.time + f.t;
                a.target = feet;
                break;
            }
        }
        if (!a.contact)
            a.target = {
                x: clamp(this.predicted.end.x, -2.5, 2.5),
                y: 0,
                z: a.side * clamp(Math.abs(this.predicted.end.z), 0.8, 6.6),
            };
    }
    perceiveAI() {
        const state = this.aiPerception,
            profile = profiles[this.difficulty],
            seed = state.flightId * 17.37 + state.samples * 2.79;
        const posNoise = profile.perceptionPos,
            velNoise = profile.perceptionVelocity;
        const noise = (n: number) => Math.sin(seed + n * 13.13);
        const p = {
                x: this.p.x + noise(1) * posNoise,
                y: Math.max(0.03, this.p.y + noise(2) * posNoise),
                z: this.p.z + noise(3) * posNoise,
            },
            v = {
                x: this.v.x + noise(4) * velNoise,
                y: this.v.y + noise(5) * velNoise,
                z: this.v.z + noise(6) * velNoise,
            };
        state.position = p;
        state.velocity = v;
        state.observedAt = this.time;
        state.samples++;
        state.nextAt = this.time + (this.difficulty === 'HARD' ? 0.08 : 0.12);
        this.intercept(p, v, 0);
        if (this.actors[1].command)
            this.actors[1].quality = quality(
                this.actors[1].command!.issuedAt -
                    (this.contactAt - this.inputLead(this.actors[1].command!.shotIntent, 1)),
            );
        void profile;
    }
    motionFrame(index: number) {
        const a = this.actors[index];
        a.pose = skeletonPose(a, this.time);
        const event = this.onMotionTick
            ? this.onMotionTick(index, CFG.dt)
            : !a.frameEmitted && this.time - a.swingAt >= a.hitFrame - 0.018;
        if (event && !a.frameEmitted) {
            a.frameEmitted = true;
            a.armed = true;
            this.motionEvents.push({
                actor: index,
                time: this.time,
                name: 'hit_frame',
                source: this.onMotionTick ? 'engine' : 'domain',
            });
            return true;
        }
        return false;
    }
    aiCommand() {
        const a = this.actors[1],
            player = this.actors[0],
            profile = profiles[this.difficulty];
        const n = this.shots.length;
        const intent: Intent =
            this.difficulty === 'EASY' || (this.difficulty === 'NORMAL' && this.returns < 3)
                ? 'clear'
                : Math.abs(player.p.z) > 4.3
                  ? 'drop'
                  : n % 3 === 0
                    ? 'clear'
                    : 'default';
        const target = {
            x: clamp(
                -Math.sign(player.p.x || (n % 2 ? 1 : -1)) * 1.8 + Math.sin(n * 8) * profile.error,
                -2.2,
                2.2,
            ),
            y: 0,
            z: intent === 'drop' ? -1.1 : -5.8,
        };
        a.command = { shotIntent: intent, target, issuedAt: this.time, pointerType: 'ai' };
        a.quality = quality(this.time - (this.contactAt - this.inputLead(intent, 1)));
    }
    point(reason: string, at: V3) {
        if (this.phase !== 'RALLY' && this.phase !== 'SERVING') return;
        const winner =
            reason === 'NET' || !inside(at) || at.z * this.actors[this.hitter].side > 0
                ? 1 - this.hitter
                : this.hitter;
        this.scores[winner]++;
        this.server = winner;
        this.points.push({
            winner,
            reason: reason === 'GROUND' ? (inside(at) ? 'IN' : 'OUT') : reason,
            returns: this.returns,
        });
        this.v = { x: 0, y: 0, z: 0 };
        this.p = clone(at);
        this.feedback(
            `${reason === 'GROUND' ? (inside(at) ? 'IN' : 'OUT') : reason} · ${winner === 0 ? 'YOUR' : 'AI'} POINT`,
        );
        this.transition('POINT_RESOLVED');
        this.onPoint();
    }
    step() {
        if (this.paused || this.phase === 'MENU' || this.phase === 'RESULTS') return;
        this.time += CFG.dt;
        if (this.phase === 'COUNTDOWN' && this.time - this.phaseAt > 1.2) this.serveReady();
        if (this.phase === 'SERVE_READY' && this.server === 1 && this.time - this.phaseAt > 0.8)
            this.serve();
        if (this.phase === 'SERVING') {
            const a = this.actors[this.server];
            this.motionFrame(this.server);
            if (a.armed) {
                if (
                    !this.sendHit(this.server, true) &&
                    this.time - a.swingAt > a.hitFrame + 0.035
                ) {
                    this.feedback('SERVE POSE MISSED');
                    this.serveReady();
                }
            } else a.pose = skeletonPose(a, this.time);
            return;
        }
        if (this.phase === 'POINT_RESOLVED' && this.time - this.phaseAt > 1.4) {
            if (Math.max(...this.scores) >= 5) this.transition('RESULTS');
            else this.serveReady();
        }
        if (this.phase !== 'RALLY') {
            for (let i = 0; i < 2; i++) {
                const a = this.actors[i];
                a.v = { x: 0, y: 0, z: 0 };
                stepFeet(a.feet, a.p, a.v, this.time, a.side);
                if (this.time - a.swingAt > 0.7) a.motion = 'Ready';
                a.pose = skeletonPose(a, this.time);
                this.onMotionTick?.(i, CFG.dt);
            }
            return;
        }
        if (this.receiver === 1 && !this.actors[1].locked && this.time >= this.aiPerception.nextAt)
            this.perceiveAI();
        for (let i = 0; i < 2; i++) {
            const a = this.actors[i];
            a.previousPose = a.pose;
            if (
                this.time < a.recoverUntil &&
                this.time - a.swingAt >
                    a.hitFrame + (MOTIONS[a.motion as keyof typeof MOTIONS]?.recover ?? 0.35) * 0.85
            )
                a.motion = 'Recover';
            if (this.time < a.recoverUntil || (i === this.receiver && this.time < this.reactionAt))
                continue;
            if (i !== this.receiver) {
                let recoveryX = a.p.x * 0.3;
                if (i === 1) {
                    const recent = this.shots
                        .filter((h) => h.actor === 0)
                        .slice(-3)
                        .map((h) => h.target.x);
                    if (recent.length === 3 && Math.max(...recent) - Math.min(...recent) < 0.5)
                        recoveryX = (recent.reduce((v, x) => v + x, 0) / 3) * 0.35;
                }
                a.target = {
                    x: recoveryX,
                    y: 0,
                    z: a.side * (a.shot === 'clear' ? 4.7 : a.shot === 'drop' ? 2.8 : 3.6),
                };
            }
            const { dx, dz, speed } = moveMotor(
                a.p,
                a.v,
                a.target,
                a.side,
                CFG.dt,
                CFG.speed,
                CFG.accel,
            );
            stepFeet(a.feet, a.p, a.v, this.time, a.side);
            if (this.time - a.swingAt > 0.7)
                a.motion =
                    speed > 0.3 ? (Math.abs(dx) > Math.abs(dz) ? 'SideStep' : 'Run') : 'Ready';
        }
        const a = this.actors[this.receiver];
        if (
            this.receiver === 1 &&
            !a.command &&
            Number.isFinite(this.contactAt) &&
            this.time >=
                this.contactAt -
                    CFG.swingLead -
                    (0.02 +
                        profiles[this.difficulty].timing *
                            (0.5 + 0.5 * Math.sin(this.shots.length * 3)))
        )
            this.aiCommand();
        if (
            a.command &&
            !a.locked &&
            this.time >= a.recoverUntil &&
            this.time >= this.contactAt - this.inputLead(a.command.shotIntent, this.receiver)
        ) {
            a.locked = true;
            a.swingAt = this.time;
            a.hitFrame = Math.max(CFG.dt, this.contactAt - this.time);
            a.frameEmitted = false;
            a.armed = false;
            const expected = a.expectedVelocity ?? this.v;
            const requested =
                a.quality === 'weak'
                    ? 'clear'
                    : chooseShot(
                          a.command.shotIntent,
                          a.contact?.y ?? 0,
                          this.incomingWeak,
                          Math.hypot(expected.x, expected.y, expected.z),
                          a.quality,
                          true,
                      );
            const prepared = a.contact
                ? solve(a.contact, this.shotTarget(a, requested), requested).resolvedShot
                : requested;
            a.strikeTarget = { ...this.shotTarget(a, prepared) };
            a.attackBoost = prepared === 'superSmash';
            a.motion = (
                {
                    clear: 'Clear',
                    drop: 'Drop',
                    drive: 'BasicHit',
                    smash: 'Smash',
                    superSmash: 'Smash',
                } as const
            )[prepared];
            a.swingMotion = a.motion;
        }
        const old = clone(this.p);
        this.previousBall = old;
        advance(this.p, this.v);
        const collision = sweep(old, this.p);
        if (collision) {
            this.point(collision.reason, collision.p);
            return;
        }
        if (a.locked) {
            this.motionFrame(this.receiver);
            if (a.armed) {
                if (this.sendHit(this.receiver)) {
                } else if (this.time - a.swingAt > a.hitFrame + 0.035) {
                    a.locked = false;
                    a.armed = false;
                    this.contactAt = Infinity;
                    a.motion = 'Miss';
                    this.feedback(this.receiver === 0 ? 'OUT OF REACH' : 'AI MISSED');
                }
            }
        }
        for (let i = 0; i < 2; i++) {
            this.actors[i].pose = skeletonPose(this.actors[i], this.time);
            if (i !== this.receiver) this.onMotionTick?.(i, CFG.dt);
        }
        if (this.time > this.contactAt + 0.025 && !a.command) {
            if (this.receiver === 0) this.feedback('TOO LATE');
            this.contactAt = Infinity;
            a.motion = 'Miss';
        }
    }
    snapshot() {
        return {
            phase: this.phase,
            paused: this.paused,
            time: this.time,
            scores: [...this.scores],
            server: this.server,
            receiver: this.receiver,
            contactAt: this.contactAt,
            contact: this.actors[this.receiver]?.contact,
            position: clone(this.p),
            velocity: clone(this.v),
            contactAttempts: [...this.contactAttempts],
            perception: { ...this.aiPerception },
            motionEvents: [...this.motionEvents],
            actors: this.actors.map((a) => ({ p: clone(a.p), motion: a.motion, locked: a.locked })),
            returns: this.returns,
            shots: this.shots.map((h) => ({ ...h })),
            points: this.points.map((p) => ({ ...p })),
            message: this.message,
        };
    }
}
