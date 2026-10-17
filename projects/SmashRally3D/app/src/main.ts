import {
    BLEND_NORMAL,
    TONEMAP_NEUTRAL,
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
import { fitCourtCamera, flightFov, courtAim } from './camera-framing';
import type { ContainerResource, AnimTrack } from 'playcanvas';
import type { Intent, Actor, Hit } from './game';
import { CFG, PERFECT_WINDOW } from './physics';
import { pointPrompt } from './feedback';
import { creditLesson, freshLessons, lessonCopy, lessonsComplete } from './lessons';
import type { RallyLessons } from './lessons';
import type { V3 } from './physics';
import { MOTIONS, skeletonPose, sub } from './motion';
import type { MotionName, SkeletonPose } from './motion';
import { synthImpact, offlineImpacts, synthPoint, offlinePoints } from './audio';
import { impactStyle, impactEnvelope } from './impact';
import { shuttleContrast, shuttleContrastSvg } from './shuttle-contrast';
import type { ShuttleContrast } from './shuttle-contrast';
import { presentStroke } from './stroke-presentation';
import './style.css';
let currentContrast: ShuttleContrast | null = null;
let contrastFrameHit: Hit | null = null;
const contrastContacts: { time: number; visible: boolean }[] = [];
const reviewContact = new URLSearchParams(location.search).get('review-contact');
let reviewHit: Hit | null = null;
const displayedPoses = new Map<Actor, SkeletonPose>();
const cameraPoses = new Map<Actor, SkeletonPose>();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let impactClock = -1000,
    holdUntil = 0,
    queuedSound: Hit | null = null;
let lastImpactHit: Hit | null = null;
let queuedPoint: number | null = null,
    pointAudioEvents = 0;
let pendingContact: Hit | null = null;
let renderedContact: { time: number; actor: number; shuttle: V3; racket: V3; contact: V3 } | null =
    null;
let graphicsLost = false;
let overlayOpener = '';
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
    shake: true,
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
    projectedAtInput: { x: number; y: number };
} | null = null;
let lessons: RallyLessons = freshLessons();
let acceptedLessonIntent: Intent | null = null;
try {
    const saved = JSON.parse(localStorage.getItem('smash-lessons') || '{}');
    lessons = {
        returned: saved.returned === true,
        cleared: saved.cleared === true,
        dropped: saved.dropped === true,
    };
} catch {}
tutorial = tutorial && !lessonsComplete(lessons);
function saveLessons() {
    try {
        localStorage.setItem('smash-lessons', JSON.stringify(lessons));
        if (tutorial) localStorage.removeItem('smash-tutorial');
        else localStorage.setItem('smash-tutorial', '1');
    } catch {}
}
let app: AppBase, camera: Entity;
let courtView: ReturnType<typeof fitCourtCamera>;
let cameraShift = { x: 0, z: 0 },
    cameraLift = 0;
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
    presentedPerf: number | null;
    holdMs: number;
}[] = [];
function sound(h: Hit) {
    if (!settings.sound || !audio || audio.state !== 'running') return null;
    const result = synthImpact(audio, h.shot, h.quality, audio.currentTime, h.technique);
    audioEvents++;
    return { ...result, perf: performance.now() };
}
if (new URLSearchParams(location.search).has('audio-review'))
    Object.defineProperties(window, {
        smashAudioReview: { value: offlineImpacts },
        smashPointAudioReview: { value: offlinePoints },
    });
function controls() {
    return `<div class="settings"><label><input type="checkbox" data-tips ${tutorial ? 'checked' : ''}>Rally tips</label>${[
        ['sound', 'Sound'],
        ['fx', 'Impact response'],
        ['trail', 'Shuttle trail'],
        ['shake', 'Camera response'],
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
            overlay = `<section class="card" role="dialog" aria-modal="true" aria-label="Paused"><div class="eyebrow">TAKE A BREATH</div><h2>PAUSED</h2><button data-action="resume" class="primary">CONTINUE</button><div class="row"><button data-action="start">Restart match</button><button data-action="menu">Main menu</button></div>${controls()}</section>`;
        if (panel)
            overlay = `<section class="card dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="eyebrow">RALLY CLUB</div><h2 id="dialog-title">${panel === 'help' ? 'HOW TO PLAY' : 'SETTINGS'}</h2><div class="dialog-content" tabindex="0">${panel === 'help' ? '<p>Aim at the far court. Your player moves automatically.</p><ul><li>Click / tap: return or smash a high ball.</li><li>Shift + click / swipe up: deep clear.</li><li>Right click / swipe down: front-court drop.</li><li>Press at HIT NOW, just before contact.</li><li>Loose high ball + perfect timing: Super Smash. Aim deep; tight angles use a safe return.</li><li>Esc pauses. Five points wins; no deuce.</li></ul>' : controls()}</div><button data-action="close" class="primary">BACK</button></section>`;
        const hadOverlay = !!ui.querySelector('.overlay');
        const hadDialog = !!ui.querySelector('.dialog');
        ui.innerHTML = `<header class="hud"><div class="brand">SR<span>3D</span></div><div class="scoreboard"><div><small>YOU ${game.server === 0 ? '•' : ''}</small><b>${game.scores[0]}</b></div><div class="versus">FIRST TO 5</div><div><small>${game.server === 1 ? '• ' : ''}AI</small><b>${game.scores[1]}</b></div></div><button data-action="pause" class="pause" aria-label="Pause">II</button></header><div class="arena-label">RALLY CLUB<span>INDOOR SERIES / 01</span></div><div id="feedback" aria-live="polite"></div><div id="timing"></div><div id="shuttle-contrast" aria-hidden="true" hidden>${shuttleContrastSvg}</div><div class="shot-bar" ${['MENU', 'RESULTS'].includes(game.phase) ? 'hidden' : ''}>${(['clear', 'default', 'drop'] as Intent[]).map((s, i) => `<button data-shot="${s}" ${selected === s ? 'class="active"' : ''}><span>${['C', 'R', 'D'][i]}</span><em ${s === 'default' ? 'id="basic-label"' : ''}>${['CLEAR', 'RETURN', 'DROP'][i]}</em><small>${['SHIFT / SWIPE UP', 'CLICK / TAP', 'RIGHT / SWIPE DOWN'][i]}</small></button>`).join('')}</div><div id="tutorial" ${tutorial && game.phase === 'RALLY' ? '' : 'hidden'}></div>${overlay ? `<div class="overlay">${overlay}</div>` : ''}`;
        const overlayElement = ui.querySelector<HTMLElement>('.overlay');
        for (const child of ui.children)
            if (child instanceof HTMLElement && child !== overlayElement)
                child.inert = !!overlayElement;
        if (overlayOpener && ((hadDialog && !panel) || (hadOverlay && !overlayElement))) {
            ui.querySelector<HTMLElement>(`[data-action="${overlayOpener}"]`)?.focus({
                preventScroll: true,
            });
            overlayOpener = '';
        } else if (overlayElement) {
            overlayElement
                .querySelector<HTMLElement>('input, select, .dialog-content, button')
                ?.focus({ preventScroll: true });
        }
    }
    const f = document.getElementById('feedback');
    if (f) {
        f.textContent =
            game.phase === 'COUNTDOWN'
                ? 'READY?'
                : game.time - game.messageAt < 1.5
                  ? game.message
                  : '';
        f.className = game.message.startsWith('YOU · PERFECT') ? 'perfect' : '';
        f.classList.toggle('point-detail', game.phase === 'POINT_RESOLVED');
    }
    const rem = game.contactAt - game.time,
        t = document.getElementById('timing');
    const name = (tech: string) =>
        tech === 'superSmash'
            ? 'SUPER SMASH'
            : tech === 'netKill'
              ? 'NET FINISH'
              : tech.toUpperCase();
    const receiving = game.phase === 'RALLY' && game.receiver === 0;
    if (t) {
        const preview = game.previewStroke(0, target, selected);
        const attacking =
            selected === 'default' &&
            ['smash', 'superSmash', 'netKill'].includes(preview.technique);
        const broad =
            rem < game.inputLead(selected) + 0.24 &&
            rem > Math.max(0.04, game.inputLead(selected) - 0.07);
        const sweet = rem < game.inputLead(selected) + PERFECT_WINDOW;
        t.textContent =
            game.phase === 'POINT_RESOLVED'
                ? pointPrompt(game.points.at(-1)!.winner, Math.max(...game.scores) >= 5)
                : game.phase === 'SERVE_READY'
                  ? game.server === 0
                      ? 'Click the court to serve'
                      : 'Opponent serving'
                  : game.phase === 'RALLY' && game.receiver === 0
                    ? broad
                        ? attacking && !sweet
                            ? '◌ SET · ' + name(preview.technique) + (attacking ? ' CHANCE' : '')
                            : '● HIT NOW · ' +
                              name(preview.technique) +
                              (attacking ? ' CHANCE' : '')
                        : Number.isFinite(rem)
                          ? attacking
                              ? 'HIGH BALL · SET YOUR RACKET'
                              : '◌ GET READY'
                          : 'OUT OF REACH'
                    : '';
        t.classList.toggle(
            'attack-ready',
            attacking && game.phase === 'RALLY' && game.receiver === 0,
        );
        t.classList.toggle('strike-now', attacking && broad && sweet);
    }
    const softLabel = document.querySelector('[data-shot="drop"] em'),
        deepLabel = document.querySelector('[data-shot="clear"] em');
    if (softLabel)
        softLabel.textContent =
            receiving && game.actors[0].contact
                ? name(game.previewStroke(0, target, 'drop').technique)
                : 'DROP';
    if (deepLabel)
        deepLabel.textContent =
            receiving && game.actors[0].contact
                ? name(game.previewStroke(0, target, 'clear').technique)
                : 'CLEAR';
    const b = document.getElementById('basic-label');
    if (b) {
        const p = game.previewStroke(0, target);
        b.textContent =
            receiving && game.actors[0].contact
                ? p.technique === 'superSmash'
                    ? 'SUPER CHANCE'
                    : p.technique === 'netKill'
                      ? 'NET FINISH'
                      : p.technique.toUpperCase()
                : 'RETURN';
    }
    const tut = document.getElementById('tutorial');
    if (tut) tut.textContent = tutorial ? lessonCopy(lessons) : '';
}
ui.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el) return;
    unlock();
    if (el.dataset.shot) {
        selected = el.dataset.shot as Intent;
        if (game.phase === 'RALLY') issue(selected, target, 'keyboard');
        lastUI = '';
        return;
    }
    switch (el.dataset.action) {
        case 'start':
            panel = '';

            impactClock = -1000;
            holdUntil = 0;
            queuedSound = null;
            queuedPoint = null;
            pointAudioEvents = 0;
            lastImpactHit = null;

            impactLedger.length = 0;
            audioEvents = 0;
            pendingContact = null;
            renderedContact = null;
            contrastContacts.length = 0;
            acceptedLessonIntent = null;
            game.start();
            break;
        case 'pause':
            overlayOpener = 'pause';
            if (!['MENU', 'RESULTS'].includes(game.phase)) game.paused = true;
            break;
        case 'resume':
            game.paused = false;
            acc = 0;
            break;
        case 'menu':
            queuedPoint = null;
            game.transition('MENU');
            game.paused = false;
            panel = '';
            break;
        case 'help':
        case 'settings':
            overlayOpener = el.dataset.action;
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
    if ('tips' in el.dataset) {
        tutorial = el.checked;
        if (tutorial && lessonsComplete(lessons)) lessons = freshLessons();
        saveLessons();
        lastUI = '';
        renderUI();
    }
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
    const overlay = ui.querySelector<HTMLElement>('.overlay');
    if (e.key === 'Tab' && overlay) {
        const controls = [
            ...overlay.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]'),
        ].filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
        const first = controls[0],
            last = controls.at(-1);
        if (
            first &&
            last &&
            (!overlay.contains(document.activeElement) ||
                (e.shiftKey && document.activeElement === first) ||
                (!e.shiftKey && document.activeElement === last))
        ) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
        }
    }
    if (e.key === 'Escape' && panel) {
        panel = '';
        renderUI();
        return;
    }
    if (e.key === 'Escape' && !['MENU', 'RESULTS'].includes(game.phase)) {
        overlayOpener = 'pause';
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
    if (game.actors[0].command === cmd) acceptedLessonIntent = intent;
    lastInput = {
        shotIntent: intent,
        target: { ...at },
        issuedAt,
        submittedAt: game.time,
        pointerType: type,
        accepted: game.actors[0].command === cmd,
        projectedAtInput: (() => {
            const p = camera.camera!.worldToScreen(new Vec3(at.x, at.y, at.z));
            return { x: p.x, y: p.y };
        })(),
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
    const physical =
        reviewHit && r.a === game.actors[reviewHit.actor]
            ? reviewHit.renderPose
            : (contactPose ?? r.a.pose ?? skeletonPose(r.a, game.time));
    const index = r.a === game.actors[0] ? 0 : 1;
    const viewMotion: MotionName =
        index === 0 && selected === 'clear'
            ? 'Clear'
            : index === 0 && selected === 'drop'
              ? 'Drop'
              : (r.a.contact?.y ?? 0) >= 2.15
                ? 'Smash'
                : 'BasicHit';
    const pose =
        contactPose || reviewHit
            ? physical
            : presentStroke(r.a, physical, game.time, {
                  incoming: game.phase === 'RALLY' && game.receiver === index,
                  contactAt: game.contactAt,
                  motion: viewMotion,
              });
    const j = pose.joints;
    cameraPoses.set(r.a, physical);
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
        } else if (name === 'WristR') {
            const p = pose.racket;
            const handRight = new Vec3()
                .cross(
                    new Vec3(p.shaft.x, p.shaft.y, p.shaft.z),
                    new Vec3(p.normal.x, p.normal.y, p.normal.z),
                )
                .normalize();
            bodyMatrix.set([
                handRight.x,
                handRight.y,
                handRight.z,
                0,
                p.shaft.x,
                p.shaft.y,
                p.shaft.z,
                0,
                p.normal.x,
                p.normal.y,
                p.normal.z,
                0,
                0,
                0,
                0,
                1,
            ]);
            rotation.setFromMat4(bodyMatrix);
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
    const top = portrait ? 105 : 12;
    const bottom = innerHeight - (portrait ? 90 : 12);
    const view = fitCourtCamera(innerWidth, innerHeight, top, bottom);
    courtView = view;
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
    app.scene.ambientLight = new Color(0.56, 0.63, 0.69);
    camera = new Entity('broadcast camera');
    camera.addComponent('camera', {
        clearColor: new Color(0.55, 0.75, 0.84),
        toneMapping: TONEMAP_NEUTRAL,
        nearClip: 0.1,
        farClip: 100,
    });
    app.root.addChild(camera);
    const light = new Entity('key light');
    light.addComponent('light', {
        type: 'directional',
        color: new Color(1, 0.94, 0.83),
        intensity: 1.65,
    });
    light.setEulerAngles(40, -25, 0);
    app.root.addChild(light);
    // A broad cool fill separates the arm/racket from the torso without a post effect.
    const fill = new Entity('court fill light');
    fill.addComponent('light', {
        type: 'directional',
        color: new Color(0.72, 0.88, 1),
        intensity: 0.65,
        castShadows: false,
    });
    fill.setEulerAngles(35, 160, 0);
    app.root.addChild(fill);
    shape('arena floor', 'box', [0, -0.16, 0], [200, 0.2, 200], '#37314d');
    shape('court surround', 'box', [0, -0.05, 0], [11.4, 0.12, 16.3], '#75629e');
    // Original practice-club courtyard; no seating, spectators or sourced scenery.
    shape('club facade', 'box', [0, 3, 11.5], [24, 6, 0.35], '#a7bab8');
    shape('club lower wall', 'box', [0, 0.9, 11.2], [24, 1.8, 0.3], '#506b78');
    shape('club canopy', 'box', [0, 6.05, 10.7], [25, 0.18, 1.8], '#e0d7bd');
    for (let x = -9; x <= 9; x += 3) {
        shape('club window', 'box', [x, 3.8, 11.28], [2.25, 2.35, 0.08], '#34566b');
        shape('window mullion', 'box', [x, 3.8, 11.2], [0.055, 2.4, 0.08], '#d1dbce');
    }
    for (const x of [-8.5, 8.5]) {
        shape('planter', 'box', [x, 0.45, 7.8], [2.4, 0.9, 2.4], '#78666a');
        shape('tree trunk', 'cylinder', [x, 2, 7.8], [0.32, 3.3, 0.32], '#756354');
        shape('tree canopy', 'sphere', [x, 4.4, 7.8], [4.1, 4.8, 3.5], '#4b7060');
        shape('side canopy', 'sphere', [x + (x < 0 ? -1 : 1), 5.7, 9.2], [3.5, 3.7, 3], '#608474');
    }

    await Promise.all(
        ['athlete-gold', 'athlete-violet', 'racket', 'shuttle', 'court'].map(loadModel),
    );
    const court = model('court');
    const courtSurface = court.findByName('court') as Entity;
    for (const mesh of courtSurface?.render?.meshInstances ?? []) mesh.material = mat('#207bd5');
    // Wide practice surface/net stage the reference's tennis-like proportions;
    // white singles lines, shuttle physics, aim bounds and actor coordinates stay exact.
    if (courtSurface) {
        const s = courtSurface.getLocalScale();
        courtSurface.setLocalScale((s.x * 8.6) / 5.18, s.y, s.z);
    }
    for (const n of court.find((n) => ['net tape', 'net mesh', 'net post'].includes(n.name))) {
        const node = n as Entity,
            p = node.getLocalPosition(),
            scale = node.getLocalScale();
        node.setLocalPosition(p.x * 1.86, p.y, p.z);
        if (n.name === 'net tape' || (n.name === 'net mesh' && scale.x > 1))
            node.setLocalScale(scale.x * 1.86, scale.y, scale.z);
    }

    const player = makeActor(game.actors[0], '#ffba54'),
        opponent = makeActor(game.actors[1], '#8d9aff'),
        shuttle = model('shuttle');
    const renderedCork = shuttle.findByName('cork') as Entity,
        renderedFeathers = shuttle.findByName('feathers') as Entity;
    const shuttleMaterial = mat('#ffffff').clone();
    shuttleMaterial.emissive = new Color(0.85, 0.9, 1);
    shuttleMaterial.update();
    for (const node of shuttle.find((n) => !!(n as Entity).render))
        for (const mesh of (node as Entity).render!.meshInstances) mesh.material = shuttleMaterial;
    const shadow = shape(
            'shuttle shadow',
            'cylinder',
            [0, 0.055, 0],
            [0.23, 0.006, 0.23],
            '#1b696d',
        ),
        ring = shape('aim ring', 'torus', [0, 0.07, 5.5], [0.5, 0.5, 0.5], '#ffd479'),
        timing = shape('timing ring', 'torus', [0, 0.07, -3], [0.9, 0.9, 0.9], '#ffffff'),
        impact = shape('impact', 'torus', [0, 0, 0], [0.1, 0.1, 0.1], '#ffe7ad'),
        trails = Array.from({ length: 9 }, () =>
            shape('trail', 'cylinder', [0, 0, 0], [0.02, 0.1, 0.02], '#dffeff'),
        );
    const history: { p: V3; time: number }[] = [];
    const impactMaterial = mat('#ffe7ad').clone();
    impactMaterial.useLighting = false;
    impactMaterial.emissive = new Color(1, 0.8, 0.42);
    impactMaterial.blendType = BLEND_NORMAL;
    impactMaterial.depthWrite = false;
    impactMaterial.update();
    for (const mesh of impact.render!.meshInstances) mesh.material = impactMaterial;
    const neutralTrail = mat('#dffeff');
    const attackTrail = mat('#ffe0a0').clone();
    attackTrail.useLighting = false;
    attackTrail.emissive = new Color(0.85, 0.52, 0.16);
    attackTrail.update();

    game.onPoint = () => {
        queuedPoint = game.points.at(-1)!.winner;
    };
    game.onMotionTick = (index, dt) => tickMotion(index === 0 ? player : opponent, dt);
    game.onHit = (h) => {
        if (h.actor === 0) {
            if (tutorial) {
                const next = creditLesson(lessons, {
                    actor: h.actor,
                    isServe: game.returns === 0,
                    intent: acceptedLessonIntent,
                    technique: h.technique,
                });
                if (next !== lessons) {
                    lessons = next;
                    tutorial = !lessonsComplete(lessons);
                    saveLessons();
                    lastUI = '';
                }
            }
            acceptedLessonIntent = null;
        }
        if (
            reviewContact &&
            h.actor === 0 &&
            game.shots.length > 1 &&
            (h.shot === reviewContact || h.technique === reviewContact)
        ) {
            reviewHit = h;

            game.paused = true;
            camera.setPosition(game.actors[0].p.x + 1.8, 2.4, game.actors[0].p.z - 4.2);
            camera.camera!.fov = 48;
            camera.lookAt(game.actors[0].p.x, 1.5, game.actors[0].p.z);
        }

        pendingContact = h;
        const impactPerf = performance.now();
        history.length = 0;
        history.push({ p: { ...h.p }, time: game.time });

        impactPos = { ...h.p };
        impactLedger.push({
            shot: h.shot,
            physicsTime: h.time,
            source: h.contact.source,
            impactPerf,
            audioPerf: null,
            audioTime: null,
            fxPerf: performance.now(),
            renderQueuedPerf: null,
            presentedPerf: null,
            holdMs: impactStyle(h.shot, h.quality, reducedMotion || !settings.fx).holdMs,
        });
        if (impactLedger.length > 256) impactLedger.shift();
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
        const holding = performance.now() < holdUntil;
        acc = holding ? 0 : Math.min(acc + dt, CFG.dt * maxSteps);
        let steps = 0;
        while (acc >= CFG.dt && steps < maxSteps) {
            game.step();
            acc -= CFG.dt;
            steps++;
            if (pendingContact) {
                acc = 0;
                break;
            }
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
        if (displayHit) {
            lastImpactHit = displayHit;
            impactClock = performance.now();
            const style = impactStyle(
                displayHit.shot,
                displayHit.quality,
                reducedMotion || !settings.fx,
            );
            holdUntil = impactClock + style.holdMs;
            queuedSound = displayHit;
            const event = [...impactLedger]
                .reverse()
                .find((e) => e.physicsTime === displayHit.time);
            if (event) event.fxPerf = impactClock;
        }
        animate(player, displayHit?.actor === 0 ? displayHit.renderPose : null);
        animate(opponent, displayHit?.actor === 1 ? displayHit.renderPose : null);
        const displayShuttle = reviewHit?.p ?? displayHit?.p ?? game.p;
        if (!reviewHit && courtView) {
            const rally = game.phase === 'RALLY',
                rem = game.contactAt - game.time;
            const aiming = rally && game.receiver === 0 && rem < 0.45 && !game.actors[0].command;
            const recoverView = game.receiver === 0 && rem < 1.2;
            const cameraDt = Math.min(dt, 0.05);
            const factor = 1 - Math.exp(-cameraDt * 7);
            if (!aiming) {
                const desiredX = rally ? Math.max(-1.8, Math.min(1.8, game.actors[0].p.x)) : 0;
                const desiredZ = rally ? Math.max(-2.6, Math.min(0, game.actors[0].p.z + 3.4)) : 0;
                cameraShift.x += (desiredX - cameraShift.x) * factor;
                cameraShift.z += (desiredZ - cameraShift.z) * factor;
                const desiredLift =
                    rally && !recoverView ? Math.min(1, Math.max(0, (game.p.y - 4) / 4)) * 8 : 0;
                cameraLift += (desiredLift - cameraLift) * factor;
            }
            if (!rally) {
                cameraShift = { x: 0, z: 0 };
                cameraLift = 0;
            }
            const pitch = ((8 - cameraLift) * Math.PI) / 180;
            const position = {
                x: courtView.position.x + cameraShift.x,
                y: courtView.position.y,
                z: courtView.position.z + cameraShift.z,
            };
            const view = {
                ...courtView,
                position,
                target: {
                    x: position.x,
                    y: position.y - Math.sin(pitch) * 10,
                    z: position.z + Math.cos(pitch) * 10,
                },
            };
            camera.setPosition(position.x, position.y, position.z);
            camera.lookAt(view.target.x, view.target.y, view.target.z);
            const lead = 0.22;
            const anticipated = {
                x: game.p.x + game.v.x * lead,
                y: Math.max(game.p.y, game.p.y + game.v.y * lead),
                z: game.p.z + game.v.z * lead,
            };
            const actors = [...cameraPoses.values()].flatMap((p) => Object.values(p.joints));
            const wanted = flightFov(
                view,
                innerWidth,
                innerHeight,
                rally ? [displayShuttle, anticipated, ...actors] : [],
            );
            // Tracking eases before the broad visible input window, then holds.
            // The actual finite actors/shuttle remain the visibility safety bound.
            const currentRequired = flightFov(
                view,
                innerWidth,
                innerHeight,
                rally ? [displayShuttle, ...actors] : [],
            );
            camera.camera!.fov = Math.max(
                currentRequired,
                aiming
                    ? camera.camera!.fov
                    : camera.camera!.fov +
                          (wanted - camera.camera!.fov) * Math.min(1, cameraDt * 14),
            );
        }
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
            rem < game.inputLead(selected) + PERFECT_WINDOW &&
            rem > Math.max(0.04, game.inputLead(selected) - 0.07)
                ? 0.9
                : 1.4;
        timing.setLocalScale(scale, scale, scale);
        const style = impactStyle(
            lastImpactHit?.shot ?? 'clear',
            lastImpactHit?.quality ?? 'good',
            reducedMotion || !settings.fx,
        );
        const impactAge = performance.now() - impactClock;
        const response = impactEnvelope(
            style,
            impactAge,
            lastImpactHit?.velocity ?? { x: 0, y: 0, z: 1 },
        );
        impact.enabled = settings.fx && response.visible && !!lastImpactHit;
        impact.setPosition(impactPos.x, impactPos.y, impactPos.z);
        const size = response.radius / 0.45;
        impact.setLocalScale(size, size, size);
        impactMaterial.opacity = response.opacity;
        impactMaterial.update();
        if (lastImpactHit) {
            direction.set(
                lastImpactHit.renderPose.racket.normal.x,
                lastImpactHit.renderPose.racket.normal.y,
                lastImpactHit.renderPose.racket.normal.z,
            );
            rotation.setFromDirections(Vec3.UP, direction);
            impact.setRotation(rotation);
        }
        if (!game.paused && game.phase === 'RALLY') {
            if (!history.length || game.time > history[0].time)
                history.unshift({ p: { ...game.p }, time: game.time });
            while (
                history.length > 12 ||
                (history.length && game.time - history.at(-1)!.time > 0.16)
            )
                history.pop();
        } else if (!reviewHit) history.length = 0;
        trails.forEach((e, i) => {
            const a = history[i],
                b = history[i + 1];
            e.enabled =
                settings.trail && !!a && !!b && (style.attack || settings.quality !== 'LOW');
            if (!a || !b) return;
            const dx = a.p.x - b.p.x,
                dy = a.p.y - b.p.y,
                dz = a.p.z - b.p.z,
                length = Math.hypot(dx, dy, dz);
            e.enabled = e.enabled && length > 0.005;
            e.setPosition((a.p.x + b.p.x) / 2, (a.p.y + b.p.y) / 2, (a.p.z + b.p.z) / 2);
            const width = (style.attack ? 0.05 : 0.025) * (1 - i / 10);
            e.setLocalScale(width, length, width);
            direction.set(dx, dy, dz).normalize();
            rotation.setFromDirections(Vec3.UP, direction);
            e.setRotation(rotation);
            for (const mesh of e.render!.meshInstances)
                mesh.material = style.attack ? attackTrail : neutralTrail;
        });
        if (
            settings.fx &&
            settings.shake &&
            !reducedMotion &&
            lastImpactHit?.actor === 0 &&
            response.visible
        ) {
            const p = camera.getPosition();
            camera.setPosition(
                p.x + response.recoil.x,
                p.y + response.recoil.y,
                p.z + response.recoil.z,
            );
        }
        for (const event of impactLedger)
            if (event.renderQueuedPerf === null) event.renderQueuedPerf = performance.now();
        renderUI();
        contrastFrameHit = displayHit;
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
    // Renderer finalizes camera projection and hierarchy before this event.
    // Match the visible cork in this exact frame, including camera recoil.
    app.on('postrender', () => {
        currentContrast = shuttleContrast({
            cork: camera.camera!.worldToScreen(renderedCork.getPosition()),
            tail: camera.camera!.worldToScreen(renderedFeathers.getPosition()),
            height: shuttle.getPosition().y,
            width: innerWidth,
            viewportHeight: innerHeight,
            rally: game.phase === 'RALLY',
            paused: game.paused || !!reviewHit,
            contact: !!contrastFrameHit,
        });
        const contrast = document.getElementById('shuttle-contrast');
        if (contrast) {
            contrast.hidden = !currentContrast.visible;
            contrast.style.left = `${currentContrast.x}px`;
            contrast.style.top = `${currentContrast.y}px`;
            contrast.style.opacity = `${currentContrast.opacity}`;
            contrast.style.transform = `translate(-50%, -50%) rotate(${currentContrast.angle}deg)`;
        }
        if (contrastFrameHit)
            contrastContacts.push({
                time: contrastFrameHit.time,
                visible: currentContrast.visible,
            });
    });
    app.on('frameend', () => {
        const h = queuedSound;
        if (h) {
            queuedSound = null;
            const event = impactLedger.find((e) => e.physicsTime === h.time);
            const scheduled = sound(h);
            if (event) {
                event.presentedPerf = performance.now();
                event.audioPerf = scheduled?.perf ?? null;
                event.audioTime = scheduled?.scheduledAt ?? null;
            }
        }
        if (queuedPoint !== null) {
            const winner = queuedPoint;
            queuedPoint = null;
            if (settings.sound && audio?.state === 'running') {
                synthPoint(audio, winner);
                pointAudioEvents++;
            }
        }
    });
    Object.defineProperty(window, 'smashDiagnostics', {
        value: () => ({
            ...game.snapshot(),
            reviewContact: reviewHit ? { ...reviewHit } : null,
            fps,
            lessons: { active: tutorial, ...lessons, next: lessonCopy(lessons) },
            shuttleScreen: camera
                .camera!.worldToScreen(new Vec3(game.p.x, game.p.y, game.p.z))
                .clone(),
            renderedContact,
            shuttleContrast: {
                current: currentContrast,
                contacts: contrastContacts.map((c) => ({ ...c })),
            },
            impactVisible: impact.enabled,
            impactResponse: {
                holding: performance.now() < holdUntil,
                holdUntil,
                ageMs: performance.now() - impactClock,
                style: impactStyle(
                    lastImpactHit?.shot ?? 'clear',
                    lastImpactHit?.quality ?? 'good',
                    reducedMotion || !settings.fx,
                ),
                trailSegments: trails.filter((e) => e.enabled).length,
            },
            audioState: audio?.state ?? 'locked',
            audioEvents,
            pointAudioEvents,
            audioLedger: impactLedger.map((e) => ({ ...e })),
            heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
                ?.usedJSHeapSize,
            motions: [player, opponent].map((r) => ({
                motion: r.motion,
                rigJoints: r.nodes.size,
                racket: r.racket.getPosition().clone(),
                racketNormal: r.racket.up.clone(),
                racketShaft: r.racket.forward.clone().mulScalar(-1),
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
