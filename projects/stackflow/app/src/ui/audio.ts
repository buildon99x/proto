// Synthesized SFX (spec §12): per-link rising pitch, lock thud,
// DANGER heartbeat whose tempo scales with fill, fanfares.
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.12, when = 0): void {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

/** chain-link blip: pitch climbs per link (spec §7.1 live counter) */
export function chainBlip(link: number): void {
  const f = 320 * Math.pow(1.19, Math.min(link, 12));
  tone(f, 0.18, "triangle", 0.16);
  if (link >= 5) tone(f * 1.5, 0.3, "sawtooth", 0.08, 0.03); // tier-up sheen
}

export function lockThud(): void {
  tone(120, 0.08, "square", 0.06);
}

export function heartbeat(): void {
  tone(70, 0.1, "sine", 0.22);
  tone(55, 0.12, "sine", 0.18, 0.13);
}

export function overdriveFanfare(): void {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.14, i * 0.09));
}

export function bossBreak(): void {
  [196, 262, 330, 392, 523].forEach((f, i) => tone(f, 0.4, "sawtooth", 0.1, i * 0.1));
}

export function insaneCombo(): void {
  [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.2, "square", 0.09, i * 0.06));
}

export function buyBlip(): void {
  tone(660, 0.1, "triangle", 0.1);
  tone(880, 0.12, "triangle", 0.1, 0.08);
}

export function gameOverSting(): void {
  [330, 262, 196, 131].forEach((f, i) => tone(f, 0.4, "sine", 0.12, i * 0.16));
}
