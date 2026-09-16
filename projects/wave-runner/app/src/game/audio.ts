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

/** 축마다 다른 음정 — 글자 없이 "무엇이 올랐는가"를 알리는 채널이다. */
const TRADE_HZ: Record<string, number> = { slope: 660, speed: 550, bias: 440 };

export const sfx = {
  launch: () => blip(440, 110, "triangle", 0.04, 660),
  /**
   * 게이트 통과. 이 게임의 중심 기제인데 73초 런에서 들리는 소리가 시작·끝 둘뿐이었다.
   * 오른 축을 음정으로 실으면 화면 정보를 늘리지 않고 채널이 하나 는다.
   */
  trade: (plusAxis: string) => blip(TRADE_HZ[plusAxis] ?? 550, 70, "triangle", 0.035),
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
