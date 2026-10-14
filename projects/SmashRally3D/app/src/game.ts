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
    contact: V3 | null;
    motion: string;
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
};
export const profiles = {
    EASY: { delay: 0.5, error: 0.14, timing: 0.24 },
    NORMAL: { delay: 0.3, error: 0.08, timing: 0.19 },
    HARD: { delay: 0.18, error: 0.04, timing: 0.09 },
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
            contact: null,
            motion: 'Ready',
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
        }
    }
    serveReady() {
        this.returns = 0;
        this.resetActors();
        this.p = {
            x: 0.35,
            y: 1.1,
            z: this.actors[this.server].p.z - this.actors[this.server].side * 0.3,
        };
        this.v = { x: 0, y: 0, z: 0 };
        this.transition('SERVE_READY');
        this.feedback(this.server === 0 ? 'CLICK / TAP TO SERVE' : 'AI SERVE');
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
        if (this.contactAt - this.time > CFG.buffer + CFG.swingLead) {
            this.feedback('TOO EARLY');
            return;
        }
        if (this.time > this.contactAt - 0.025) {
            this.feedback('TOO LATE');
            return;
        }
        a.command = cmd;
        a.quality = quality(cmd.issuedAt - (this.contactAt - CFG.swingLead));
    }
    serve(cmd?: Command) {
        const a = this.actors[this.server];
        a.shot = 'clear';
        a.quality = 'good';
        a.swingAt = this.time;
        a.hitFrame = CFG.swingLead;
        a.contact = clone(this.p);
        a.motion = 'Serve';
        a.command = cmd ?? {
            shotIntent: 'clear',
            target: { x: 0.3, y: 0, z: -a.side * 5.4 },
            issuedAt: this.time,
            pointerType: 'ai',
        };
        this.contactAt = this.time + CFG.swingLead;
        this.transition('SERVING');
    }
    sendHit(index: number, isServe = false) {
        const a = this.actors[index],
            cmd = a.command;
        if (!cmd) return false;
        const racket = { x: a.p.x + 0.35, y: this.p.y, z: a.p.z - a.side * 0.3 };
        if (
            !isServe &&
            (distance(racket, this.p) > CFG.reach ||
                this.p.y < 0.75 ||
                this.p.y > 2.9 ||
                a.quality === 'miss')
        ) {
            this.feedback(index === 0 ? 'OUT OF REACH' : 'AI MISSED');
            a.motion = 'Miss';
            return false;
        }
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
        const target = {
            x: clamp(cmd.target.x, -2.25, 2.25),
            y: 0.025,
            z: -a.side * clamp(Math.abs(cmd.target.z), 0.8, 6.2),
        };
        if (shot === 'drop') target.z = -a.side * clamp(Math.abs(target.z), 0.8, 1.9);
        if (shot === 'clear') target.z = -a.side * Math.max(5.1, Math.abs(target.z));
        if (!isServe && a.quality === 'weak')
            target.z = -a.side * Math.min(4.1, Math.abs(target.z));
        let result = solve(this.p, target, shot);
        // An impossible steep attack becomes a safe drive using the same solver, never a fabricated hit.
        if (result.prediction.reason === 'NET' && (shot === 'smash' || shot === 'superSmash')) {
            shot = 'drive';
            result = solve(this.p, target, shot);
        }
        this.v = clone(result.velocity);
        this.hitter = index;
        this.receiver = 1 - index;
        this.incomingWeak = a.quality === 'weak';
        a.shot = shot;
        a.motion = isServe
            ? 'Serve'
            : {
                  clear: 'Clear',
                  drop: 'Drop',
                  drive: 'BasicHit',
                  smash: 'Smash',
                  superSmash: 'Smash',
              }[shot];
        a.recoverUntil =
            this.time + (shot === 'smash' || shot === 'superSmash' ? 0.55 : CFG.recovery);
        a.command = null;
        a.locked = false;
        const hit: Hit = {
            actor: index,
            p: clone(this.p),
            velocity: clone(this.v),
            shot,
            quality: a.quality,
            time: this.time,
            target,
        };
        this.shots.push(hit);
        if (!isServe) this.returns++;
        this.feedback(
            `${a.quality.toUpperCase()} · ${shot === 'superSmash' ? 'SUPER SMASH' : shot.toUpperCase()}`,
        );
        this.onHit(hit);
        this.transition('RALLY');
        this.plan();
        return true;
    }
    plan() {
        this.predicted = flight(this.p, this.v);
        this.contactAt = Infinity;
        const a = this.actors[this.receiver],
            profile = profiles[this.difficulty];
        a.command = null;
        a.locked = false;
        a.contact = null;
        this.reactionAt = this.time + (this.receiver === 1 ? profile.delay : 0.05);
        const delay = this.receiver === 1 ? profile.delay : 0.05;
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
            const feet = { x: f.p.x - 0.35, y: 0, z: f.p.z + a.side * 0.3 };
            const travel =
                distance(a.p, feet) / CFG.speed + 0.12 + Math.max(0, a.recoverUntil - this.time);
            if (travel <= f.t - delay && Math.abs(feet.x) < 2.75 && Math.abs(feet.z) < 6.8) {
                a.contact = clone(f.p);
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
        a.quality = quality(this.time - (this.contactAt - CFG.swingLead));
    }
    point(reason: string, at: V3) {
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
        if (this.phase === 'SERVING' && this.time >= this.contactAt)
            this.sendHit(this.server, true);
        if (this.phase === 'POINT_RESOLVED' && this.time - this.phaseAt > 1.4) {
            if (Math.max(...this.scores) >= 5) this.transition('RESULTS');
            else this.serveReady();
        }
        if (this.phase !== 'RALLY') return;
        for (let i = 0; i < 2; i++) {
            const a = this.actors[i];
            if (this.time < a.recoverUntil && this.time - a.swingAt > 0.25) a.motion = 'Recover';
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
                a.target = { x: recoveryX, y: 0, z: a.side * 3.3 };
            }
            const dx = a.target.x - a.p.x,
                dz = a.target.z - a.p.z,
                d = Math.hypot(dx, dz),
                speed = Math.min(CFG.speed, d * 8);
            const vx = d > 0.01 ? (dx / d) * speed : 0,
                vz = d > 0.01 ? (dz / d) * speed : 0;
            const change = CFG.accel * CFG.dt;
            a.v.x += clamp(vx - a.v.x, -change, change);
            a.v.z += clamp(vz - a.v.z, -change, change);
            a.p.x = clamp(a.p.x + a.v.x * CFG.dt, -2.8, 2.8);
            a.p.z = a.side * clamp(a.side * (a.p.z + a.v.z * CFG.dt), 0.45, 6.8);
            if (this.time - a.swingAt > 0.5)
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
        if (a.command && !a.locked && this.time >= this.contactAt - CFG.swingLead) {
            a.locked = true;
            a.swingAt = this.time;
            a.hitFrame = Math.max(CFG.dt, this.contactAt - this.time);
            a.motion =
                a.command.shotIntent === 'default'
                    ? a.contact && a.contact.y >= 2.15
                        ? 'Smash'
                        : 'BasicHit'
                    : a.command.shotIntent === 'clear'
                      ? 'Clear'
                      : 'Drop';
        }
        const old = clone(this.p);
        advance(this.p, this.v);
        const collision = sweep(old, this.p);
        if (collision) {
            this.point(collision.reason, collision.p);
            return;
        }
        if (a.locked && this.time - a.swingAt >= a.hitFrame) {
            this.contactAt = Infinity;
            if (!this.sendHit(this.receiver)) a.locked = false;
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
            actors: this.actors.map((a) => ({ p: clone(a.p), motion: a.motion, locked: a.locked })),
            returns: this.returns,
            shots: this.shots.map((h) => ({ ...h })),
            points: this.points.map((p) => ({ ...p })),
            message: this.message,
        };
    }
}
