import type { Shot, Quality } from './physics';
// Original deterministic transient synthesis, shared by live impacts and offline review.
export function synthImpact(
    ctx: BaseAudioContext,
    shot: Shot,
    q: Quality = 'good',
    when = ctx.currentTime,
) {
    const power =
            { clear: 0.5, drive: 0.55, drop: 0.25, smash: 0.8, superSmash: 1 }[shot] *
            (q === 'weak' ? 0.75 : q === 'perfect' ? 1.05 : 1),
        buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate),
        data = buffer.getChannelData(0);
    let state = 0x9e3779b9;
    for (let i = 0; i < data.length; i++) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        data[i] = (((state >>> 0) / 0xffffffff) * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.016));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = {
        clear: 1800,
        drive: 3400,
        drop: 1200,
        smash: 4200,
        superSmash: 5200,
    }[shot];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(power * 0.45, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
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
        { clear: 720, drive: 1400, drop: 540, smash: 1150, superSmash: 1700 }[shot],
        when,
    );
    osc.frequency.exponentialRampToValueAtTime(150, when + 0.06);
    body.gain.setValueAtTime(power * 0.18, when);
    body.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
    osc.connect(body).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.09);
    osc.onended = () => {
        osc.disconnect();
        body.disconnect();
    };
    return { scheduledAt: when, shot, power, duration: 0.1 };
}
export async function offlineImpacts() {
    const samples = [];
    for (const shot of ['clear', 'drive', 'drop', 'smash', 'superSmash'] as Shot[]) {
        const ctx = new OfflineAudioContext(1, 9600, 48000);
        synthImpact(ctx, shot, 'perfect', 0);
        const buffer = await ctx.startRendering();
        samples.push({ shot, sampleRate: 48000, pcm: Array.from(buffer.getChannelData(0)) });
    }
    return samples;
}
