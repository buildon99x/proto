import type { Technique } from './tactics';
import type { Shot, Quality } from './physics';
// Original deterministic transient synthesis, shared by live impacts and offline review.
export function synthImpact(
    ctx: BaseAudioContext,
    shot: Shot,
    q: Quality = 'good',
    when = ctx.currentTime,
    technique: Technique = shot,
) {
    if (shot === 'smash' || shot === 'superSmash') {
        // Short cork/string crack plus damped string modes; no bass explosion,
        // long pitch dive or unrelated cinematic layer.
        const power =
            (shot === 'superSmash' ? 1 : 0.86) * (q === 'perfect' ? 1 : q === 'good' ? 0.88 : 0.72);
        const duration = 0.085,
            buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let seed = 0x3456789;
        for (let i = 0; i < data.length; i++) {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            const t = i / ctx.sampleRate;
            data[i] =
                (((seed >>> 0) / 0xffffffff) * 2 - 1) *
                (Math.exp(-t / 0.0035) * 0.8 + Math.exp(-t / 0.018) * 0.2);
        }
        const noise = ctx.createBufferSource(),
            filter = ctx.createBiquadFilter(),
            gain = ctx.createGain();
        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 2300;
        gain.gain.setValueAtTime(power * 0.56, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start(when);
        noise.onended = () => {
            noise.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        for (const [frequency, level, decay] of [
            [1550, 0.16, 0.026],
            [2670, 0.07, 0.018],
            [4210, 0.035, 0.011],
        ]) {
            const string = ctx.createOscillator(),
                body = ctx.createGain();
            string.frequency.setValueAtTime(frequency * (shot === 'superSmash' ? 1.05 : 1), when);
            string.frequency.exponentialRampToValueAtTime(frequency * 0.94, when + decay);
            body.gain.setValueAtTime(power * level, when);
            body.gain.exponentialRampToValueAtTime(0.0001, when + decay);
            string.connect(body).connect(ctx.destination);
            string.start(when);
            string.stop(when + decay + 0.004);
            string.onended = () => {
                string.disconnect();
                body.disconnect();
            };
        }
        return { scheduledAt: when, shot, technique, power, duration };
    }
    const power =
            {
                clear: 0.5,
                lift: 0.42,
                net: 0.18,
                block: 0.24,
                netKill: 0.65,
                drive: 0.55,
                drop: 0.25,
                smash: 0.8,
                superSmash: 1,
            }[technique] * (q === 'weak' ? 0.75 : q === 'perfect' ? 1.05 : 1),
        duration = ['net', 'block'].includes(technique)
            ? 0.06
            : technique === 'drive'
              ? 0.075
              : 0.1,
        buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate),
        data = buffer.getChannelData(0);
    let state = 0x9e3779b9;
    for (let i = 0; i < data.length; i++) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        data[i] =
            (((state >>> 0) / 0xffffffff) * 2 - 1) *
            Math.exp(
                -i /
                    (ctx.sampleRate *
                        (technique === 'net' ? 0.008 : technique === 'block' ? 0.011 : 0.016)),
            );
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = {
        lift: 1500,
        net: 900,
        block: 2200,
        netKill: 4500,
        clear: 1800,
        drive: 3400,
        drop: 1200,
        smash: 4200,
        superSmash: 5200,
    }[technique];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(power * 0.45, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.9);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(when);
    source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
    };
    const osc = ctx.createOscillator(),
        body = ctx.createGain();
    osc.frequency.setValueAtTime(
        {
            clear: 720,
            lift: 600,
            net: 420,
            block: 780,
            netKill: 1450,
            drive: 1400,
            drop: 540,
            smash: 1150,
            superSmash: 1700,
        }[technique],
        when,
    );
    osc.frequency.exponentialRampToValueAtTime(150, when + duration * 0.6);
    body.gain.setValueAtTime(power * 0.18, when);
    body.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.8);
    osc.connect(body).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + duration * 0.9);
    osc.onended = () => {
        osc.disconnect();
        body.disconnect();
    };
    return { scheduledAt: when, shot, technique, power, duration };
}
export async function offlineImpacts() {
    const samples = [];
    for (const technique of [
        'clear',
        'lift',
        'drive',
        'drop',
        'net',
        'block',
        'netKill',
        'smash',
        'superSmash',
    ] as Technique[]) {
        const shot: Shot =
            technique === 'lift'
                ? 'clear'
                : ['net', 'block'].includes(technique)
                  ? 'drop'
                  : technique === 'netKill'
                    ? 'smash'
                    : (technique as Shot);
        const ctx = new OfflineAudioContext(1, 9600, 48000);
        synthImpact(ctx, shot, 'perfect', 0, technique);
        const buffer = await ctx.startRendering();
        samples.push({
            shot: technique,
            physicalShot: shot,
            sampleRate: 48000,
            pcm: Array.from(buffer.getChannelData(0)),
        });
    }
    return samples;
}
