/** 즉석 합성 효과음. 파일 자산 없이 WebAudio 로만 낸다. */
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, durMs: number, type: OscillatorType, gain = 0.05, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const osc = a.createOscillator();
  const env = a.createGain();
  const now = a.currentTime;
  const dur = durMs / 1000;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + dur);
  env.gain.setValueAtTime(gain, now);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(env).connect(a.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export const sfx = {
  launch: () => blip(440, 110, "triangle", 0.04, 660),
  die: () => blip(200, 180, "sawtooth", 0.05, 60),
  clear: () => {
    blip(523, 120, "triangle", 0.05);
    window.setTimeout(() => blip(784, 200, "triangle", 0.05), 110);
  }
};

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}
