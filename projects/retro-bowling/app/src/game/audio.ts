// 초소형 칩튠 사운드. WebAudio로 사각/삼각파 블립과 노이즈를 즉석 생성.

type Wave = "square" | "triangle" | "sawtooth" | "sine";

class Chip {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** 사용자 제스처 후 호출해 오디오 컨텍스트 재개. */
  resume(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  private tone(wave: Wave, freq: number, start: number, dur: number, vol: number, slideTo?: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol: number, filterFreq: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // 결정적 노이즈(간단한 LCG). Math.random 없이도 충분히 지글거림.
    let seed = 1234567;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x3fffffff - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + dur);
  }

  private t(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  play(name: SfxName): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = this.t();
    switch (name) {
      case "ui":
        this.tone("square", 660, now, 0.05, 0.25);
        break;
      case "tick":
        this.tone("square", 330, now, 0.02, 0.12);
        break;
      case "lock":
        this.tone("square", 880, now, 0.06, 0.28);
        this.tone("square", 1320, now + 0.04, 0.05, 0.2);
        break;
      case "roll":
        this.noise(now, 0.5, 0.18, 240);
        this.tone("triangle", 90, now, 0.5, 0.15, 70);
        break;
      case "pin":
        this.noise(now, 0.06, 0.3, 1800);
        this.tone("square", 520, now, 0.04, 0.16);
        break;
      case "gutter":
        this.tone("triangle", 300, now, 0.4, 0.25, 90);
        this.noise(now, 0.4, 0.08, 500);
        break;
      case "strike": {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((f, i) => this.tone("square", f, now + i * 0.08, 0.14, 0.26));
        this.noise(now, 0.1, 0.25, 2000);
        break;
      }
      case "turkey": {
        // 더 화려한 팡파르(연속 스트라이크 3+).
        const notes = [523, 659, 784, 1047, 1319, 1047, 1319, 1568];
        notes.forEach((f, i) => this.tone("square", f, now + i * 0.07, 0.16, 0.28));
        [392, 523].forEach((f, i) => this.tone("triangle", f, now + i * 0.07, 0.5, 0.2));
        this.noise(now, 0.14, 0.3, 2200);
        break;
      }
      case "spare": {
        const notes = [523, 784, 1047];
        notes.forEach((f, i) => this.tone("square", f, now + i * 0.09, 0.14, 0.24));
        break;
      }
      case "miss":
        this.tone("square", 300, now, 0.12, 0.2, 180);
        break;
      case "start":
        [392, 523, 659, 784].forEach((f, i) => this.tone("square", f, now + i * 0.09, 0.16, 0.26));
        break;
      case "over":
        [523, 494, 440, 392].forEach((f, i) => this.tone("triangle", f, now + i * 0.16, 0.26, 0.26));
        break;
    }
  }
}

export type SfxName =
  | "ui"
  | "tick"
  | "lock"
  | "roll"
  | "pin"
  | "gutter"
  | "strike"
  | "turkey"
  | "spare"
  | "miss"
  | "start"
  | "over";

export const audio = new Chip();
