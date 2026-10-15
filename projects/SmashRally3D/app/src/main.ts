import {
    AppBase,
    AppOptions,
    Asset,
    AnimEvents,
    AnimClip,
    AnimEvaluator,
    DefaultAnimBinder,
    EventHandler,
    Quat,
    Mat4,
    CameraComponentSystem,
    Color,
    ContainerHandler,
    Entity,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    Mesh,
    MeshInstance,
    TorusGeometry,
    RESOLUTION_AUTO,
    RenderComponentSystem,
    StandardMaterial,
    TextureHandler,
    Vec3,
    createGraphicsDevice,
    DEVICETYPE_WEBGL2,
} from 'playcanvas';
import { Game } from './game';
import { fitCourtCamera, courtAim } from './camera-framing';
import type { ContainerResource, AnimTrack } from 'playcanvas';
import type { Intent, Actor, Hit } from './game';
import { CFG } from './physics';
import type { V3 } from './physics';
import { MOTIONS, skeletonPose, sub } from './motion';
import type { MotionName, SkeletonPose } from './motion';
import { synthImpact, offlineImpacts } from './audio';
import './style.css';
const reviewContact = new URLSearchParams(location.search).get('review-contact');
let reviewHit: Hit | null = null;
const displayedPoses = new Map<Actor, SkeletonPose>();
let impactTechnique = 'clear';
let pendingContact: Hit | null = null;
let renderedContact: { time: number; actor: number; shuttle: V3; racket: V3; contact: V3 } | null =
    null;
let graphicsLost = false;
const canvas = document.getElementById('application-canvas') as HTMLCanvasElement,
    ui = document.getElementById('ui')!,
    game = new Game();
type Settings = {
    sound: boolean;
    fx: boolean;
    shake: boolean;
    trail: boolean;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
};
const settings: Settings = {
    sound: true,
    fx: true,
    shake: false,
    trail: true,
    quality: innerWidth < 900 ? 'MEDIUM' : 'HIGH',
};
try {
    Object.assign(settings, JSON.parse(localStorage.getItem('smash-settings') || '{}'));
} catch {}
let audio: AudioContext | null = null,
    selected: Intent = 'default',
    target: V3 = { x: 0, y: 0.025, z: 5.5 },
    panel = '',
    acc = 0,
    lastUI = '',
    shakeUntil = 0,
    shakeBase = new Vec3(),
    impactAt = -10,
    impactPos: V3 = { x: 0, y: 0, z: 0 },
    tutorial = !localStorage.getItem('smash-tutorial'),
    audioEvents = 0,
    frames = 0,
    frameTime = 0,
    fps = 0;
let lastInput: {
    shotIntent: Intent;
    target: V3;
    issuedAt: number;
    submittedAt: number;
    pointerType: string;
    accepted: boolean;
} | null = null;
let app: AppBase, camera: Entity;
function unlock() {
    if (!audio) audio = new AudioContext();
    void audio.resume();
}
function save() {
    try {
        localStorage.setItem('smash-settings', JSON.stringify(settings));
    } catch {}
}
const impactLedger: {
    shot: string;
    physicsTime: number;
    source: string;
    impactPerf: number;
    audioPerf: number | null;
    audioTime: number | null;
    fxPerf: number;
    renderQueuedPerf: number | null;
}[] = [];
function sound(h: Hit) {
    if (!settings.sound || !audio || audio.state !== 'running') return null;
    const result = synthImpact(audio, h.shot, h.quality, audio.currentTime, h.technique);
    audioEvents++;
    return { ...result, perf: performance.now() };
}
if (new URLSearchParams(location.search).has('audio-review'))
    Object.defineProperty(window, 'smashAudioReview', { value: offlineImpacts });
function controls() {
    return `<div class="settings">${[
        ['sound', 'Sound'],
        ['fx', 'Impact flash'],
        ['trail', 'Shuttle trail'],
        ['shake', 'Camera shake'],
    ]
        .map(
            ([k, t]) =>
                `<label><input data-setting="${k}" type="checkbox" ${(settings as unknown as Record<string, boolean>)[k] ? 'checked' : ''}>${t}</label>`,
        )
        .join(
            '',
        )}<label>Quality<select id="quality">${['HIGH', 'MEDIUM', 'LOW'].map((q) => `<option ${settings.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label></div>`;
}
function renderUI() {
    const key = `${game.phase}|${game.paused}|${panel}|${game.scores}|${selected}|${tutorial}`;
    if (key !== lastUI) {
        lastUI = key;
        let overlay = '';
        if (game.phase === 'MENU')
            overlay = `<section class="card menu"><div class="eyebrow">RALLY CLUB · COURT 01</div><h1>SMASH<br><span>RALLY</span><small>3D</small></h1><p>Read the flight. Find the space.<br>Make your next shot count.</p><div class="rule">SINGLES / FIRST TO 5 / AUTO FOOTWORK</div><label class="difficulty">Opponent<select id="difficulty">${['EASY', 'NORMAL', 'HARD'].map((d) => `<option ${game.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label><button data-action="start" class="primary">QUICK MATCH <span>PLAY</span></button><div class="row"><button data-action="help">How to play</button><button data-action="settings">Settings</button></div></section>`;
        if (game.phase === 'RESULTS')
            overlay = `<section class="card result"><div class="eyebrow">MATCH COMPLETE</div><h2>${game.scores[0] === 5 ? 'YOU WIN' : 'KEEP RALLYING'}</h2><div class="final-score">${game.scores[0]} <span>—</span> ${game.scores[1]}</div><p>${game.shots.length} shots · Longest rally ${Math.max(0, ...game.points.map((p) => p.returns))} returns</p><button data-action="start" class="primary">PLAY AGAIN</button><button data-action="menu">Main menu</button></section>`;
        if (game.paused && !reviewHit)
            overlay = `<section class="card"><div class="eyebrow">TAKE A BREATH</div><h2>PAUSED</h2><button data-action="resume" class="primary">CONTINUE</button><div class="row"><button data-action="start">Restart match</button><button data-action="menu">Main menu</button></div>${controls()}</section>`;
        if (panel)
            overlay = `<section class="card"><div class="eyebrow">RALLY CLUB</div><h2>${panel === 'help' ? 'HOW TO PLAY' : 'SETTINGS'}</h2>${panel === 'help' ? '<p>Aim at the far court. Your player moves automatically.</p><ul><li>Click / tap: return or smash a high ball.</li><li>Shift + click / swipe up: deep clear.</li><li>Right click / swipe down: front-court drop.</li><li>Press at HIT NOW, just before contact.</li><li>A weak high return + PERFECT unlocks Super Smash.</li><li>Esc pauses. Five points wins; no deuce.</li></ul>' : controls()}<button data-action="close" class="primary">BACK</button></section>`;
        ui.innerHTML = `<header class="hud"><div class="brand">SR<span>3D</span></div><div class="scoreboard"><div><small>YOU ${game.server === 0 ? '•' : ''}</small><b>${game.scores[0]}</b></div><div class="versus">FIRST TO 5</div><div><small>${game.server === 1 ? '• ' : ''}AI</small><b>${game.scores[1]}</b></div></div><button data-action="pause" class="pause" aria-label="Pause">II</button></header><div class="arena-label">RALLY CLUB<span>INDOOR SERIES / 01</span></div><div id="feedback" aria-live="polite"></div><div id="timing"></div><div class="shot-bar" ${['MENU', 'RESULTS'].includes(game.phase) ? 'hidden' : ''}>${(['clear', 'default', 'drop'] as Intent[]).map((s, i) => `<button data-shot="${s}" ${selected === s ? 'class="active"' : ''}><span>${['C', 'R', 'D'][i]}</span><em ${s === 'default' ? 'id="basic-label"' : ''}>${['CLEAR', 'RETURN', 'DROP'][i]}</em><small>${['SHIFT / SWIPE UP', 'CLICK / TAP', 'RIGHT / SWIPE DOWN'][i]}</small></button>`).join('')}</div><div id="tutorial" ${tutorial && game.phase === 'RALLY' && game.time < 32 ? '' : 'hidden'}></div>${overlay ? `<div class="overlay">${overlay}</div>` : ''}`;
    }
    const f = document.getElementById('feedback');
    if (f) {
        f.textContent =
            game.phase === 'COUNTDOWN'
                ? 'READY?'
                : game.time - game.messageAt < 1.5
                  ? game.message
                  : '';
        f.className = game.message.includes('PERFECT') ? 'perfect' : '';
    }
    const rem = game.contactAt - game.time,
        t = document.getElementById('timing');
    const name = (tech: string) =>
        tech === 'superSmash'
            ? 'SUPER SMASH'
            : tech === 'netKill'
              ? 'NET FINISH'
              : tech.toUpperCase();
    if (t)
        t.textContent =
            game.phase === 'SERVE_READY'
                ? game.server === 0
                    ? 'Click the court to serve'
                    : 'Opponent serving'
                : game.phase === 'RALLY' && game.receiver === 0
                  ? rem < game.inputLead(selected) + 0.24 &&
                    rem > Math.max(0.04, game.inputLead(selected) - 0.07)
                      ? '● HIT NOW · ' + name(game.previewStroke(0, target, selected).technique)
                      : Number.isFinite(rem)
                        ? '◌ GET READY'
                        : 'OUT OF REACH'
                  : '';
    const softLabel = document.querySelector('[data-shot="drop"] em'),
        deepLabel = document.querySelector('[data-shot="clear"] em');
    if (softLabel)
        softLabel.textContent =
            game.receiver === 0 && game.actors[0].contact
                ? name(game.previewStroke(0, target, 'drop').technique)
                : 'DROP';
    if (deepLabel)
        deepLabel.textContent =
            game.receiver === 0 && game.actors[0].contact
                ? name(game.previewStroke(0, target, 'clear').technique)
                : 'CLEAR';
    const b = document.getElementById('basic-label');
    if (b) {
        const p = game.previewStroke(0, target);
        b.textContent =
            game.receiver === 0 && game.actors[0].contact
                ? p.technique === 'superSmash'
                    ? 'SUPER?'
                    : p.technique === 'netKill'
                      ? 'NET FINISH'
                      : p.technique.toUpperCase()
                : 'RETURN';
    }
    const tut = document.getElementById('tutorial');
    if (tut && tutorial && game.time < 32)
        tut.textContent = [
            '01 / Aim at the far court. Click or tap when HIT NOW appears.',
            '02 / Clear or lift buys recovery time. Same Shift / swipe up.',
            '03 / Right click or swipe down pulls your opponent forward.',
            '04 / High = attack. Low = lift. Aim short to block; watch the label.',
        ][Math.min(3, Math.floor(game.time / 8))];
    if (tutorial && game.time >= 32) {
        tutorial = false;
        localStorage.setItem('smash-tutorial', '1');
    }
}
ui.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el) return;
    unlock();
    if (el.dataset.shot) {
        selected = el.dataset.shot as Intent;
        issue(selected, target, 'keyboard');
        lastUI = '';
        return;
    }
    switch (el.dataset.action) {
        case 'start':
            panel = '';
            impactAt = -1;
            shakeUntil = 0;
            impactLedger.length = 0;
            audioEvents = 0;
            pendingContact = null;
            renderedContact = null;
            game.start();
            break;
        case 'pause':
            if (!['MENU', 'RESULTS'].includes(game.phase)) game.paused = true;
            break;
        case 'resume':
            game.paused = false;
            acc = 0;
            break;
        case 'menu':
            game.transition('MENU');
            game.paused = false;
            panel = '';
            break;
        case 'help':
        case 'settings':
            panel = el.dataset.action;
            break;
        case 'close':
            panel = '';
            break;
    }
    renderUI();
});
ui.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.setting) {
        (settings as unknown as Record<string, boolean>)[el.dataset.setting] = el.checked;
        save();
    }
    if (el.id === 'difficulty') game.difficulty = el.value as typeof game.difficulty;
    if (el.id === 'quality') {
        settings.quality = el.value as Settings['quality'];
        save();
        resize();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !['MENU', 'RESULTS'].includes(game.phase)) {
        game.paused = !game.paused;
        acc = 0;
        renderUI();
    }
});
document.addEventListener('visibilitychange', () => {
    acc = 0;
    if (document.hidden && !['MENU', 'RESULTS'].includes(game.phase)) {
        game.paused = true;
        renderUI();
    }
});
function issue(
    intent: Intent,
    at: V3,
    type: string,
    issuedAt = game.time,
    touchReservation = false,
    gestureId?: number,
) {
    unlock();
    const cmd = {
        shotIntent: intent,
        target: { ...at },
        issuedAt,
        pointerType: type,
        touchReservation,
        gestureId,
    };
    game.command(cmd);
    lastInput = {
        shotIntent: intent,
        target: { ...at },
        issuedAt,
        submittedAt: game.time,
        pointerType: type,
        accepted: game.actors[0].command === cmd,
    };
}
const materials = new Map<string, StandardMaterial>();
function mat(hex: string) {
    if (materials.has(hex)) return materials.get(hex)!;
    const m = new StandardMaterial();
    m.diffuse = new Color().fromString(hex);
    m.gloss = 25;
    m.update();
    materials.set(hex, m);
    return m;
}
function shape(
    name: string,
    type: 'box' | 'capsule' | 'cone' | 'cylinder' | 'plane' | 'sphere' | 'torus',
    p: number[],
    s: number[],
    color: string,
    parent?: Entity,
) {
    const e = new Entity(name);
    if (type === 'torus') {
        const mesh = Mesh.fromGeometry(
            app.graphicsDevice,
            new TorusGeometry({ ringRadius: 0.45, tubeRadius: 0.025, segments: 32, sides: 6 }),
        );
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat(color), e)],
            castShadows: false,
        });
    } else e.addComponent('render', { type, material: mat(color), castShadows: false });
    e.setLocalPosition(p[0], p[1], p[2]);
    e.setLocalScale(s[0], s[1], s[2]);
    (parent ?? app.root).addChild(e);
    return e;
}
const loaded = new Map<string, ContainerResource>();
async function loadModel(name: string) {
    const asset = new Asset(name, 'container', {
        url: `${import.meta.env.BASE_URL}assets/models/${name}.glb`,
    });
    app.assets.add(asset);
    await new Promise<void>((resolve, reject) => {
        asset.once('load', () => resolve());
        asset.once('error', (err: string) => reject(new Error(`Asset ${name}: ${err}`)));
        app.assets.load(asset);
    });
    loaded.set(name, asset.resource as ContainerResource);
}
function model(name: string) {
    const entity = loaded.get(name)!.instantiateRenderEntity();
    app.root.addChild(entity);
    return entity;
}
function makeActor(a: Actor, color: string) {
    const resource = loaded.get(color === '#ffba54' ? 'athlete-gold' : 'athlete-violet')!,
        root = resource.instantiateRenderEntity();
    app.root.addChild(root);
    const tracks = new Map<string, AnimTrack>();
    for (const asset of resource.animations) {
        const clip = asset.resource as AnimTrack,
            definition = MOTIONS[clip.name as MotionName];
        if (definition?.lead)
            clip.events = new AnimEvents([{ name: 'hit_frame', time: definition.lead }]);
        tracks.set(clip.name, clip);
    }
    const nodes = new Map<string, Entity>();
    for (const name of [
        'Hip',
        'Spine',
        'Chest',
        'Neck',
        'Head',
        'ShoulderR',
        'ElbowR',
        'WristR',
        'ShoulderL',
        'ElbowL',
        'WristL',
        'HipR',
        'KneeR',
        'AnkleR',
        'HipL',
        'KneeL',
        'AnkleL',
    ]) {
        const node = root.findByName(name);
        if (!node) throw new Error('Missing skin joint ' + name);
        nodes.set(name, node as Entity);
    }
    const events = new EventHandler(),
        evaluator = new AnimEvaluator(new DefaultAnimBinder(root));
    let pulse = false;
    events.on('hit_frame', () => {
        pulse = true;
    });
    const racket = model('racket'),
        shadow = shape('ground shadow', 'cylinder', [0, 0.02, 0], [0.7, 0.007, 0.5], '#155960');
    return {
        root,
        nodes,
        racket,
        shadow,
        a,
        tracks,
        evaluator,
        events,
        motion: '',
        swingId: -99,
        pulse: () => {
            const result = pulse;
            pulse = false;
            return result;
        },
    };
}
function tickMotion(r: ReturnType<typeof makeActor>, dt: number) {
    const name = (r.a.motion === 'Miss' ? 'Recover' : r.a.motion) as MotionName,
        mode = MOTIONS[name] ? name : 'Ready',
        newSwing = r.a.swingAt !== r.swingId;
    if (mode !== r.motion || newSwing) {
        r.evaluator.removeClips();
        const track = r.tracks.get(mode);
        if (!track) throw new Error('Missing motion ' + mode);
        const lead = MOTIONS[mode].lead,
            speed = lead ? lead / Math.max(r.a.hitFrame, 0.008) : 1;
        if (lead)
            track.events = new AnimEvents([
                { name: 'hit_frame', time: Math.max(0, lead - speed * 0.018) },
            ]);
        const clip = new AnimClip(
            track,
            lead ? Math.max(0, game.time - r.a.swingAt) * speed : 0,
            speed,
            true,
            ['Ready', 'SideStep', 'Run'].includes(mode),
            r.events,
        );
        r.evaluator.addClip(clip);
        r.evaluator.update(0, false);
        r.motion = mode;
        r.swingId = r.a.swingAt;
        r.pulse();
        return false;
    }
    r.evaluator.update(dt, false);
    return r.pulse();
}
const direction = new Vec3(),
    axis = new Vec3(),
    rotation = new Quat(),
    facing = new Quat(),
    bodyMatrix = new Mat4(),
    bodyRotation = new Quat();
function animate(r: ReturnType<typeof makeActor>, contactPose: SkeletonPose | null = null) {
    const pose =
            reviewHit && r.a === game.actors[reviewHit.actor]
                ? reviewHit.renderPose
                : (contactPose ?? r.a.pose ?? skeletonPose(r.a, game.time)),
        j = pose.joints;
    displayedPoses.set(r.a, pose);
    r.root.setPosition(0, 0, 0); // joint world poses own translation; skin matrices remain one coherent hierarchy
    const bodyRight = new Vec3(
            j.ShoulderR.x - j.ShoulderL.x,
            j.ShoulderR.y - j.ShoulderL.y,
            j.ShoulderR.z - j.ShoulderL.z,
        ).normalize(),
        up0 = new Vec3(j.Neck.x - j.Hip.x, j.Neck.y - j.Hip.y, j.Neck.z - j.Hip.z).normalize(),
        bodyUp = up0.sub(bodyRight.clone().mulScalar(up0.dot(bodyRight))).normalize(),
        bodyForward = new Vec3().cross(bodyRight, bodyUp).normalize();
    bodyMatrix.set([
        bodyRight.x,
        bodyRight.y,
        bodyRight.z,
        0,
        bodyUp.x,
        bodyUp.y,
        bodyUp.z,
        0,
        bodyForward.x,
        bodyForward.y,
        bodyForward.z,
        0,
        0,
        0,
        0,
        1,
    ]);
    bodyRotation.setFromMat4(bodyMatrix);
    const yaw = r.a.side === -1 ? 0 : 180;
    facing.setFromEulerAngles(0, yaw, 0);
    const child: Record<string, string> = {
        Hip: 'Spine',
        Spine: 'Chest',
        Chest: 'Neck',
        Neck: 'Head',
        ShoulderR: 'ElbowR',
        ElbowR: 'WristR',
        ShoulderL: 'ElbowL',
        ElbowL: 'WristL',
        HipR: 'KneeR',
        KneeR: 'AnkleR',
        HipL: 'KneeL',
        KneeL: 'AnkleL',
    };
    for (const [name, node] of r.nodes) {
        const at = j[name];
        node.setPosition(at.x, at.y, at.z);
        const end = child[name];
        if (['Spine', 'Chest', 'Neck'].includes(name)) {
            node.setRotation(bodyRotation);
        } else if (end) {
            const to = sub(j[end], at);
            direction.set(to.x, to.y, to.z).normalize();
            axis.set(0, ['Hip', 'Spine', 'Chest', 'Neck'].includes(name) ? 1 : -1, 0);
            rotation.setFromDirections(axis, direction).mul(facing);
            node.setRotation(rotation);
        } else node.setRotation(facing);
    }
    const p = pose.racket;
    r.racket.setPosition(p.center.x, p.center.y, p.center.z);
    r.racket.lookAt(
        new Vec3(p.center.x - p.shaft.x, p.center.y - p.shaft.y, p.center.z - p.shaft.z),
        new Vec3(p.normal.x, p.normal.y, p.normal.z),
    );
    r.shadow.setPosition(r.a.p.x, 0.04, r.a.p.z);
}
function aim(x: number, y: number): V3 {
    const c = canvas.getBoundingClientRect(),
        n = camera.camera!.screenToWorld(x - c.left, y - c.top, 1),
        f = camera.camera!.screenToWorld(x - c.left, y - c.top, 100);
    return courtAim(n, f);
}
let nextGestureId = 0;
let gesture: {
    x: number;
    y: number;
    target: V3;
    sent: boolean;
    gestureId: number;
    id: number;
    issuedAt: number;
} | null = null;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
    if (game.paused || panel || ['MENU', 'RESULTS'].includes(game.phase)) return;
    if (e.pointerType !== 'mouse' && (!e.isPrimary || gesture)) return;
    target = aim(e.clientX, e.clientY);
    unlock();
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse')
        issue(e.button === 2 ? 'drop' : e.shiftKey ? 'clear' : selected, target, 'mouse');
    else {
        gesture = {
            x: e.clientX,
            y: e.clientY,
            target: { ...target },
            sent: false,
            gestureId: ++nextGestureId,
            id: e.pointerId,
            issuedAt: game.time,
        };
        issue(selected, gesture.target, 'touch', gesture.issuedAt, true, gesture.gestureId);
    }
});
function movePointer(e: PointerEvent) {
    if (e.pointerType === 'mouse') target = aim(e.clientX, e.clientY);
    if (
        gesture &&
        gesture.id === e.pointerId &&
        !gesture.sent &&
        Math.abs(e.clientY - gesture.y) >= 22
    ) {
        issue(
            e.clientY < gesture.y ? 'clear' : 'drop',
            gesture.target,
            'touch',
            gesture.issuedAt,
            false,
            gesture.gestureId,
        );
        gesture.sent = true;
    }
}
// Raw movement arrives before frame-aligned/coalesced pointermove on supporting browsers.
// Both paths classify the same reservation once; pointermove remains the fallback.
canvas.addEventListener('pointerrawupdate', (e) => movePointer(e as PointerEvent));
canvas.addEventListener('pointermove', movePointer);
canvas.addEventListener('pointerup', (e) => {
    if (gesture && gesture.id === e.pointerId) {
        gesture = null;
    }
});
canvas.addEventListener('pointercancel', (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    game.cancelTouchCommand(gesture.issuedAt, gesture.gestureId);
    gesture = null;
});
function resize() {
    if (!app) return;
    app.graphicsDevice.maxPixelRatio =
        settings.quality === 'LOW'
            ? 1
            : Math.min(devicePixelRatio, settings.quality === 'HIGH' ? 2 : 1.5);
    app.resizeCanvas();
    app.root
        .find((n) => n.name === 'net mesh')
        .forEach((n, i) => {
            (n as Entity).enabled = settings.quality !== 'LOW' || i % 3 === 0;
        });
    const portrait = innerHeight > innerWidth;
    // Wide-screen UI lives in the side gutters; portrait keeps top/bottom controls.
    const top = portrait ? 146 : 12;
    const bottom = innerHeight - (portrait ? 90 : 12);
    const view = fitCourtCamera(innerWidth, innerHeight, top, bottom);
    camera.setPosition(view.position.x, view.position.y, view.position.z);
    camera.camera!.fov = view.fov;
    camera.lookAt(view.target.x, view.target.y, view.target.z);
}
async function boot() {
    const device = await createGraphicsDevice(canvas, {
            deviceTypes: [DEVICETYPE_WEBGL2],
            antialias: true,
        }),
        o = new AppOptions();
    o.graphicsDevice = device;
    o.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem];
    o.resourceHandlers = [TextureHandler, ContainerHandler];
    app = new AppBase(canvas);
    app.init(o);
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.scene.ambientLight = new Color(0.32, 0.36, 0.4);
    camera = new Entity('broadcast camera');
    camera.addComponent('camera', {
        clearColor: new Color(0.047, 0.075, 0.11),
        nearClip: 0.1,
        farClip: 100,
    });
    app.root.addChild(camera);
    const light = new Entity('key light');
    light.addComponent('light', {
        type: 'directional',
        color: new Color(1, 0.94, 0.83),
        intensity: 0.95,
    });
    light.setEulerAngles(40, -25, 0);
    app.root.addChild(light);
    shape('arena floor', 'box', [0, -0.16, 0], [22, 0.2, 27], '#172d42');
    shape('court surround', 'box', [0, -0.05, 0], [8, 0.12, 16.3], '#227d82');
    await Promise.all(
        ['athlete-gold', 'athlete-violet', 'racket', 'shuttle', 'court'].map(loadModel),
    );
    model('court');
    const player = makeActor(game.actors[0], '#ffba54'),
        opponent = makeActor(game.actors[1], '#8d9aff'),
        shuttle = model('shuttle');
    const shadow = shape(
            'shuttle shadow',
            'cylinder',
            [0, 0.055, 0],
            [0.23, 0.006, 0.23],
            '#1b696d',
        ),
        ring = shape('aim ring', 'torus', [0, 0.07, 5.5], [0.5, 0.5, 0.5], '#ffd479'),
        timing = shape('timing ring', 'torus', [0, 0.07, -3], [0.9, 0.9, 0.9], '#ffffff'),
        impact = shape('impact', 'sphere', [0, 0, 0], [0.1, 0.1, 0.1], '#fff2bd'),
        trails = Array.from({ length: 9 }, (_, i) =>
            shape('trail', 'sphere', [0, 0, 0], [0.05 + 0.05 * (1 - i / 9), 0.05, 0.05], '#dffeff'),
        );
    const history: V3[] = [];
    game.onMotionTick = (index, dt) => tickMotion(index === 0 ? player : opponent, dt);
    game.onHit = (h) => {
        if (
            reviewContact &&
            h.actor === 0 &&
            game.shots.length > 1 &&
            (h.shot === reviewContact || h.technique === reviewContact)
        ) {
            reviewHit = h;
            shakeUntil = 0;
            game.paused = true;
            camera.setPosition(game.actors[0].p.x + 1.8, 2.4, game.actors[0].p.z - 4.2);
            camera.camera!.fov = 48;
            camera.lookAt(game.actors[0].p.x, 1.5, game.actors[0].p.z);
        }
        impactTechnique = h.technique;
        pendingContact = h;
        const impactPerf = performance.now(),
            scheduled = sound(h);
        impactAt = game.time;
        impactPos = { ...h.p };
        impactLedger.push({
            shot: h.shot,
            physicsTime: h.time,
            source: h.contact.source,
            impactPerf,
            audioPerf: scheduled?.perf ?? null,
            audioTime: scheduled?.scheduledAt ?? null,
            fxPerf: performance.now(),
            renderQueuedPerf: null,
        });
        if (impactLedger.length > 256) impactLedger.shift();
        if (!reviewHit && settings.shake && ['smash', 'superSmash'].includes(h.shot)) {
            shakeBase.copy(camera.getPosition());
            shakeUntil = game.time + 0.06;
        }
    };
    window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        graphicsLost = true;
        game.paused = true;
        ui.innerHTML =
            '<div class="overlay"><section class="card"><h2>GRAPHICS PAUSED</h2><p>Graphics context lost. Reload to recover safely.</p><button onclick="location.reload()">Reload game</button></section></div>';
    });
    resize();
    app.on('update', (dt: number) => {
        if (graphicsLost) return;
        // Bound catch-up to the mobile 30fps budget. At lower render rates, slow
        // simulation instead of consuming a whole preparation between pointer tasks.
        // This applies to every frame, not just an undecided/held touch gesture.
        const maxSteps = 4;
        acc = Math.min(acc + dt, CFG.dt * maxSteps);
        let steps = 0;
        while (acc >= CFG.dt && steps < maxSteps) {
            game.step();
            acc -= CFG.dt;
            steps++;
        }
        frames++;
        frameTime += dt;
        if (frameTime >= 1) {
            fps = frames / frameTime;
            frames = 0;
            frameTime = 0;
        }
        // The first render after a real collision displays that actual swept contact snapshot.
        // Physics keeps its fixed clock; no collision or outcome is invented by presentation.
        const displayHit = pendingContact;
        pendingContact = null;
        animate(player, displayHit?.actor === 0 ? displayHit.renderPose : null);
        animate(opponent, displayHit?.actor === 1 ? displayHit.renderPose : null);
        const displayShuttle = reviewHit?.p ?? displayHit?.p ?? game.p;
        shuttle.setPosition(displayShuttle.x, displayShuttle.y, displayShuttle.z);
        if (displayHit)
            renderedContact = {
                time: displayHit.time,
                actor: displayHit.actor,
                shuttle: { ...displayShuttle },
                racket: (displayHit.actor === 0 ? player : opponent).racket.getPosition().clone(),
                contact: { ...displayHit.contact.racket },
            };
        if (Math.hypot(game.v.x, game.v.y, game.v.z) > 0.1) {
            shuttle.lookAt(game.p.x + game.v.x, game.p.y + game.v.y, game.p.z + game.v.z);
            shuttle.rotateLocal(90, 0, 0);
        }
        shadow.setPosition(game.p.x, 0.055, game.p.z);
        ring.setPosition(target.x, 0.07, target.z);
        ring.enabled = !['MENU', 'RESULTS'].includes(game.phase);
        const rem = game.contactAt - game.time;
        timing.enabled = game.phase === 'RALLY' && game.receiver === 0 && Number.isFinite(rem);
        timing.setPosition(game.actors[0].p.x, 0.065, game.actors[0].p.z);
        const scale =
            rem < game.inputLead(selected) + 0.05 &&
            rem > Math.max(0.04, game.inputLead(selected) - 0.07)
                ? 0.9
                : 1.4;
        timing.setLocalScale(scale, scale, scale);
        const age = game.time - impactAt;
        impact.enabled = settings.fx && age >= 0 && age < 0.12;
        impact.setPosition(impactPos.x, impactPos.y, impactPos.z);
        const soft = ['net', 'block'].includes(impactTechnique),
            burst = (soft ? 0.06 : 0.12) + age * (soft ? 1 : 2);
        impact.setLocalScale(burst, burst, burst);
        if (!game.paused && game.phase === 'RALLY') {
            history.unshift({ ...game.p });
            if (history.length > 27) history.pop();
        } else history.length = 0;
        trails.forEach((e, i) => {
            e.enabled = settings.trail && settings.quality !== 'LOW' && !!history[i * 3];
            if (history[i * 3]) e.setPosition(history[i * 3].x, history[i * 3].y, history[i * 3].z);
        });
        if (game.time < shakeUntil)
            camera.setLocalPosition(
                shakeBase.x + Math.sin(game.time * 400) * 0.025,
                shakeBase.y,
                shakeBase.z,
            );
        else if (shakeUntil) {
            shakeUntil = 0;
            resize();
        }
        for (const event of impactLedger)
            if (event.renderQueuedPerf === null) event.renderQueuedPerf = performance.now();
        renderUI();
        if (reviewHit) {
            let badge = document.getElementById('review-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'review-badge';
                badge.style.cssText =
                    'position:fixed;bottom:110px;left:20px;background:#132837;padding:10px;color:white;font:12px Arial';
                document.body.appendChild(badge);
            }
            badge.textContent = 'EVENT-PAUSED CONTACT INSPECTION — NOT NORMAL PLAY QA';
        }
    });
    Object.defineProperty(window, 'smashDiagnostics', {
        value: () => ({
            ...game.snapshot(),
            reviewContact: reviewHit ? { ...reviewHit } : null,
            fps,
            shuttleScreen: camera
                .camera!.worldToScreen(new Vec3(game.p.x, game.p.y, game.p.z))
                .clone(),
            renderedContact,
            impactVisible: impact.enabled,
            audioState: audio?.state ?? 'locked',
            audioEvents,
            audioLedger: impactLedger.map((e) => ({ ...e })),
            heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
                ?.usedJSHeapSize,
            motions: [player, opponent].map((r) => ({
                motion: r.motion,
                rigJoints: r.nodes.size,
                racket: r.racket.getPosition().clone(),
                skinPose: displayedPoses.get(r.a) ?? r.a.pose,
                feet: {
                    left: {
                        ...r.a.feet.left,
                        swing: displayedPoses.get(r.a)?.footPhases.left ?? r.a.feet.left.swing,
                        cycle: displayedPoses.get(r.a)?.footCycles.left ?? r.a.feet.left.cycle,
                        rendered: r.nodes.get('AnkleL')!.getPosition().clone(),
                    },
                    right: {
                        ...r.a.feet.right,
                        swing: displayedPoses.get(r.a)?.footPhases.right ?? r.a.feet.right.swing,
                        cycle: displayedPoses.get(r.a)?.footCycles.right ?? r.a.feet.right.cycle,
                        rendered: r.nodes.get('AnkleR')!.getPosition().clone(),
                    },
                },
            })),
            settings: { ...settings },
            target: { ...target },
            lastInput: lastInput ? { ...lastInput, target: { ...lastInput.target } } : null,
            input: game.actors[0].command ? { ...game.actors[0].command } : null,
            projectedTargets: [-1.8, 0, 1.8].flatMap((x) =>
                [1.2, 5.8].map((z) => {
                    const p = camera.camera!.worldToScreen(new Vec3(x, 0.025, z));
                    return { world: { x, z }, screen: { x: p.x, y: p.y } };
                }),
            ),
        }),
    });
    app.start();
    renderUI();
}
void boot().catch((e) => {
    console.error(e);
    ui.innerHTML =
        '<div class="overlay"><section class="card"><h2>3D UNAVAILABLE</h2><p>WebGL 2 could not start. Try an updated browser with graphics acceleration.</p><button onclick="location.reload()">Retry</button></section></div>';
});
