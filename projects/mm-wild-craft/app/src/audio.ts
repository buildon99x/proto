/** Small synthesized cues; no network, samples or autoplay. */
let context: AudioContext | null = null;
let enabled = true;
export function setSound(value: boolean) { enabled = value; }
export function unlockAudio() {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume().catch(() => {});
  } catch { /* Audio is optional. */ }
}
export function playSound(kind = 'click') {
  if (!enabled || !context || context.state !== 'running') return;
  const notes: Record<string, number[]> = { click: [440], gather: [600, 820], hit: [145], capture: [440, 554, 659, 880], success: [523, 659, 784], error: [180, 145], jump: [320, 490], craft: [392, 523], heal: [330, 440, 660] };
  const aliases: Record<string, string> = { attack: 'hit', fail: 'error', hurt: 'error', skill: 'craft', victory: 'capture' };
  const frequencies = notes[aliases[kind] ?? kind] ?? notes.click;
  frequencies.forEach((frequency, i) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const start = context!.currentTime + i * 0.075;
    oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.052, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    oscillator.connect(gain); gain.connect(context!.destination);
    oscillator.start(start); oscillator.stop(start + 0.17);
  });
}
