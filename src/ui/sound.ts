// Tiny synthesized sound effects (no asset files).
let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // Audio is optional.
  }
}

export type SoundKind = 'place' | 'stack' | 'shave' | 'pass' | 'end';

export function play(kind: SoundKind): void {
  switch (kind) {
    case 'place':
      tone(520, 0.08, 'triangle', 0.25);
      break;
    case 'stack':
      tone(380, 0.1, 'triangle', 0.3);
      tone(620, 0.08, 'triangle', 0.18, 0.06);
      break;
    case 'shave':
      tone(180, 0.18, 'square', 0.08, 0.05);
      break;
    case 'pass':
      tone(300, 0.15, 'sine', 0.2);
      break;
    case 'end':
      tone(523, 0.18, 'sine', 0.25);
      tone(659, 0.18, 'sine', 0.25, 0.15);
      tone(784, 0.3, 'sine', 0.25, 0.3);
      break;
  }
}
