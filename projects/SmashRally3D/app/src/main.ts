import {
    AppBase,
    AppOptions,
    Asset,
    AnimEvents,
    AnimComponentSystem,
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
import type { ContainerResource, AnimTrack } from 'playcanvas';
import type { Intent, Actor, Hit } from './game';
import { CFG, clamp } from './physics';
import type { V3 } from './physics';
import './style.css';
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
function sound(h: Hit) {
    if (!settings.sound || !audio || audio.state !== 'running') return;
    const t = audio.currentTime,
        p = h.shot === 'superSmash' ? 1 : h.shot === 'smash' ? 0.8 : h.shot === 'drop' ? 0.25 : 0.5;
    const b = audio.createBuffer(1, audio.sampleRate * 0.1, audio.sampleRate),
        d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audio.sampleRate * 0.016));
    const n = audio.createBufferSource();
    n.buffer = b;
    const f = audio.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = { clear: 1800, drive: 3400, drop: 1200, smash: 4200, superSmash: 5200 }[
        h.shot
    ];
    const g = audio.createGain();
    g.gain.setValueAtTime(p * 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    n.connect(f).connect(g).connect(audio.destination);
    n.start(t);
    const o = audio.createOscillator(),
        body = audio.createGain();
    o.frequency.setValueAtTime(
        { clear: 720, drive: 1400, drop: 540, smash: 1150, superSmash: 1700 }[h.shot],
        t,
    );
    o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    body.gain.setValueAtTime(p * 0.18, t);
    body.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(body).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.09);
    audioEvents++;
}
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
        if (game.paused)
            overlay = `<section class="card"><div class="eyebrow">TAKE A BREATH</div><h2>PAUSED</h2><button data-action="resume" class="primary">CONTINUE</button><div class="row"><button data-action="start">Restart match</button><button data-action="menu">Main menu</button></div>${controls()}</section>`;
        if (panel)
            overlay = `<section class="card"><div class="eyebrow">RALLY CLUB</div><h2>${panel === 'help' ? 'HOW TO PLAY' : 'SETTINGS'}</h2>${panel === 'help' ? '<p>Aim at the far court. Your player moves automatically.</p><ul><li>Click / tap: return or smash a high ball.</li><li>Shift + click / swipe up: deep clear.</li><li>Right click / swipe down: front-court drop.</li><li>Press at HIT NOW, just before contact.</li><li>A weak high return + PERFECT unlocks Super Smash.</li><li>Esc pauses. Five points wins; no deuce.</li></ul>' : controls()}<button data-action="close" class="primary">BACK</button></section>`;
        ui.innerHTML = `<header class="hud"><div class="brand">SR<span>3D</span></div><div class="scoreboard"><div><small>YOU ${game.server === 0 ? '•' : ''}</small><b>${game.scores[0]}</b></div><div class="versus">FIRST TO 5</div><div><small>${game.server === 1 ? '• ' : ''}AI</small><b>${game.scores[1]}</b></div></div><button data-action="pause" class="pause" aria-label="Pause">II</button></header><div class="arena-label">RALLY CLUB<span>INDOOR SERIES / 01</span></div><div id="feedback" aria-live="polite"></div><div id="timing"></div><div class="shot-bar" ${['MENU', 'RESULTS'].includes(game.phase) ? 'hidden' : ''}>${(['clear', 'default', 'drop'] as Intent[]).map((s, i) => `<button data-shot="${s}" ${selected === s ? 'class="active"' : ''}><span>${['C', 'R', 'D'][i]}</span><em ${s === 'default' ? 'id="basic-label"' : ''}>${['CLEAR', 'RETURN', 'DROP'][i]}</em><small>${['SHIFT / SWIPE UP', 'CLICK / TAP', 'RIGHT / SWIPE DOWN'][i]}</small></button>`).join('')}</div><div id="tutorial" ${tutorial && game.phase === 'RALLY' && game.time < 32 ? '' : 'hidden'}></div><div class="rotate">Turn your phone sideways for a wider court view.</div>${overlay ? `<div class="overlay">${overlay}</div>` : ''}`;
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
    if (t)
        t.textContent =
            game.phase === 'SERVE_READY'
                ? game.server === 0
                    ? 'Click the court to serve'
                    : 'Opponent serving'
                : game.phase === 'RALLY' && game.receiver === 0
                  ? rem < 0.35 && rem > 0.04
                      ? '● HIT NOW'
                      : Number.isFinite(rem)
                        ? '◌ GET READY'
                        : 'OUT OF REACH'
                  : '';
    const b = document.getElementById('basic-label');
    if (b)
        b.textContent =
            game.actors[0].contact && game.actors[0].contact!.y > 2.15 && game.receiver === 0
                ? 'SMASH'
                : 'RETURN';
    const tut = document.getElementById('tutorial');
    if (tut && tutorial && game.time < 32)
        tut.textContent = [
            '01 / Aim at the far court. Click or tap when HIT NOW appears.',
            '02 / Shift + click or swipe up buys time with a deep CLEAR.',
            '03 / Right click or swipe down pulls your opponent forward.',
            '04 / A high ball enables SMASH. Time the solid ring.',
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
function issue(intent: Intent, at: V3, type: string, issuedAt = game.time) {
    unlock();
    const cmd = { shotIntent: intent, target: { ...at }, issuedAt, pointerType: type };
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
function poseRod(e: Entity, a: V3, b: V3, w: number) {
    e.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    e.setLocalScale(w, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z), w);
    e.lookAt(b.x, b.y, b.z);
    e.rotateLocal(90, 0, 0);
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
    const resource = loaded.get(color === '#ffba54' ? 'athlete-gold' : 'athlete-violet')!;
    const root = resource.instantiateRenderEntity();
    app.root.addChild(root);
    root.addComponent('anim', { activate: true });
    const motionNames = [
        'Ready',
        'SideStep',
        'Run',
        'BasicHit',
        'Drop',
        'Clear',
        'Smash',
        'Recover',
        'Serve',
    ];
    root.anim!.loadStateGraph({
        layers: [
            {
                name: 'Base',
                states: [
                    { name: 'START' },
                    ...motionNames.map((name) => ({
                        name,
                        speed: 1,
                        loop: ['Ready', 'SideStep', 'Run'].includes(name),
                    })),
                ],
                transitions: [{ from: 'START', to: 'Ready' }],
            },
        ],
        parameters: {},
    });
    for (const asset of resource.animations) {
        const clip = asset.resource as AnimTrack;
        if (['BasicHit', 'Drop', 'Clear', 'Smash', 'Serve'].includes(clip.name))
            clip.events = new AnimEvents([{ name: 'hit_frame', time: CFG.swingLead }]);
        root.anim!.assignAnimation(clip.name, clip);
    }
    const node = (name: string) => {
        const e = root.findByName(name);
        if (!e) throw new Error('Missing rig node ' + name);
        return e as Entity;
    };
    const body = node('jersey'),
        head = node('head'),
        leg1 = node('left leg'),
        leg2 = node('right leg'),
        shoe1 = node('left shoe'),
        shoe2 = node('right shoe'),
        upper = node('upper arm'),
        lower = node('forearm'),
        racket = model('racket');
    shape('ground shadow', 'cylinder', [0, 0.015, 0], [0.72, 0.007, 0.55], '#155960', root);
    return {
        root,
        body,
        head,
        leg1,
        leg2,
        shoe1,
        shoe2,
        upper,
        lower,
        racket,
        a,
        motion: 'Ready',
        swingId: -99,
    };
}
function animate(r: ReturnType<typeof makeActor>) {
    const a = r.a,
        m = Math.hypot(a.v.x, a.v.z),
        stride = Math.sin(game.time * (8 + m)) * Math.min(0.3, m * 0.07),
        sw = game.time - a.swingAt;
    r.root.setPosition(a.p.x, 0, a.p.z);
    r.root.setEulerAngles(0, a.side === -1 ? 180 : 0, 0);
    r.leg1.setLocalEulerAngles(stride * 90, 0, 0);
    r.leg2.setLocalEulerAngles(-stride * 90, 0, 0);
    r.shoe1.setLocalPosition(-0.15, 0.1, stride);
    r.shoe2.setLocalPosition(0.15, 0.1, -stride);
    const motion = a.motion === 'Miss' ? 'Recover' : a.motion;
    r.root.anim!.speed = game.paused ? 0 : 1;
    if (motion !== r.motion || (sw < 0.25 && a.swingAt !== r.swingId)) {
        r.root.anim!.baseLayer!.transition(motion, 0.06);
        r.motion = motion;
        r.swingId = a.swingAt;
    }
    r.head.setLocalPosition(0, 1.7 + Math.abs(stride) * 0.12, 0);
    const high = a.motion === 'Smash' || a.motion === 'Clear';
    let end: V3 = { x: a.p.x + 0.46, y: high ? 2.15 : 1.25, z: a.p.z - a.side * 0.28 };
    if (sw >= 0 && sw < 0.48 && a.contact) {
        const w = clamp(sw / a.hitFrame, 0, 1),
            follow = clamp((sw - a.hitFrame) / 0.28, 0, 1);
        end = {
            x: a.contact.x + 0.65 * (1 - w) - 0.5 * follow,
            y:
                a.contact.y +
                (high ? 0.35 : -0.15) * (1 - w) -
                follow * (a.motion === 'Drop' ? 0.12 : 0.7),
            z: a.contact.z + a.side * (0.4 * (1 - w) - 0.3 * follow),
        };
    }
    const shoulder = { x: a.p.x + 0.25, y: 1.4, z: a.p.z },
        hand = { x: end.x, y: end.y - 0.18, z: end.z },
        elbow = {
            x: (shoulder.x + hand.x) / 2 + 0.1,
            y: (shoulder.y + hand.y) / 2 - 0.12,
            z: (shoulder.z + hand.z) / 2 + a.side * 0.16,
        };
    poseRod(r.upper, shoulder, elbow, 0.14);
    poseRod(r.lower, elbow, hand, 0.11);
    r.racket.setPosition(end.x, end.y, end.z);
    r.racket.setEulerAngles(-90, 0, high ? -15 : 30);
}
function aim(x: number, y: number): V3 {
    const c = canvas.getBoundingClientRect(),
        n = camera.camera!.screenToWorld(x - c.left, y - c.top, 1),
        f = camera.camera!.screenToWorld(x - c.left, y - c.top, 100),
        t = -n.y / (f.y - n.y);
    return {
        x: clamp(n.x + (f.x - n.x) * t, -2.25, 2.25),
        y: 0.025,
        z: clamp(n.z + (f.z - n.z) * t, 0.8, 6.2),
    };
}
let gesture: {
    x: number;
    y: number;
    target: V3;
    sent: boolean;
    id: number;
    issuedAt: number;
} | null = null;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
    if (game.paused || panel || ['MENU', 'RESULTS'].includes(game.phase)) return;
    target = aim(e.clientX, e.clientY);
    unlock();
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse')
        issue(e.button === 2 ? 'drop' : e.shiftKey ? 'clear' : selected, target, 'mouse');
    else
        gesture = {
            x: e.clientX,
            y: e.clientY,
            target: { ...target },
            sent: false,
            id: e.pointerId,
            issuedAt: game.time,
        };
});
canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') target = aim(e.clientX, e.clientY);
    if (
        gesture &&
        gesture.id === e.pointerId &&
        !gesture.sent &&
        Math.abs(e.clientY - gesture.y) >= 22
    ) {
        issue(e.clientY < gesture.y ? 'clear' : 'drop', gesture.target, 'touch', gesture.issuedAt);
        gesture.sent = true;
    }
});
canvas.addEventListener('pointerup', (e) => {
    if (gesture && gesture.id === e.pointerId) {
        if (!gesture.sent) issue(selected, gesture.target, 'touch', gesture.issuedAt);
        gesture = null;
    }
});
canvas.addEventListener('pointercancel', () => {
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
        .find((n) => n.name === 'spectator' || n.name === 'net mesh')
        .forEach((n, i) => {
            (n as Entity).enabled = settings.quality !== 'LOW' || i % 3 === 0;
        });
    const portrait = innerHeight > innerWidth;
    camera.setPosition(portrait ? 0 : 1, portrait ? 19 : 11.5, portrait ? -23 : -14);
    camera.camera!.fov = portrait ? 62 : 49;
    camera.lookAt(0, 0.25, 0);
}
async function boot() {
    const device = await createGraphicsDevice(canvas, {
            deviceTypes: [DEVICETYPE_WEBGL2],
            antialias: true,
        }),
        o = new AppOptions();
    o.graphicsDevice = device;
    o.componentSystems = [
        RenderComponentSystem,
        CameraComponentSystem,
        LightComponentSystem,
        AnimComponentSystem,
    ];
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
    for (const s of [-1, 1])
        for (let row = 0; row < 3; row++) {
            shape(
                'seating',
                'box',
                [s * (6.2 + row * 0.75), 0.3 + row * 0.4, 1],
                [0.65, 0.35, 16],
                '#273e54',
            );
            for (let z = -5; z <= 7; z += 2)
                shape(
                    'spectator',
                    'capsule',
                    [s * (6.2 + row * 0.75), 0.85 + row * 0.4, z],
                    [0.3, 0.6, 0.3],
                    ['#6395a9', '#d7b38a', '#6f82ae'][(row + Math.abs(z)) % 3],
                );
        }
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
    game.onHit = (h) => {
        sound(h);
        impactAt = game.time;
        impactPos = { ...h.p };
        if (settings.shake && ['smash', 'superSmash'].includes(h.shot))
            shakeUntil = game.time + 0.06;
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
        acc = Math.min(acc + Math.min(dt, 0.1), 0.1);
        let steps = 0;
        while (acc >= CFG.dt && steps < 12) {
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
        animate(player);
        animate(opponent);
        shuttle.setPosition(game.p.x, game.p.y, game.p.z);
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
        const scale = rem < 0.35 && rem > 0.025 ? 0.9 : 1.4;
        timing.setLocalScale(scale, scale, scale);
        const age = game.time - impactAt;
        impact.enabled = settings.fx && age < 0.12;
        impact.setPosition(impactPos.x, impactPos.y, impactPos.z);
        impact.setLocalScale(0.12 + age * 2, 0.12 + age * 2, 0.12 + age * 2);
        if (!game.paused && game.phase === 'RALLY') {
            history.unshift({ ...game.p });
            if (history.length > 27) history.pop();
        } else history.length = 0;
        trails.forEach((e, i) => {
            e.enabled = settings.trail && settings.quality !== 'LOW' && !!history[i * 3];
            if (history[i * 3]) e.setPosition(history[i * 3].x, history[i * 3].y, history[i * 3].z);
        });
        if (game.time < shakeUntil)
            camera.setLocalPosition(1 + Math.sin(game.time * 400) * 0.025, 12.5, -15);
        else if (shakeUntil) {
            shakeUntil = 0;
            resize();
        }
        renderUI();
    });
    Object.defineProperty(window, 'smashDiagnostics', {
        value: () => ({
            ...game.snapshot(),
            fps,
            audioState: audio?.state ?? 'locked',
            audioEvents,
            heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
                ?.usedJSHeapSize,
            motions: [player, opponent].map((r) => ({
                motion: r.motion,
                torso: r.body.getLocalEulerAngles().clone(),
                racket: r.racket.getPosition().clone(),
                animation: r.root.anim?.baseLayer?.activeState,
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
