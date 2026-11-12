import { useSettingsStore } from '@/stores/settings';

type Cue = 'tick' | 'end' | 'good' | 'skip';

const TONES: Record<Cue, { freq: number; ms: number; type: OscillatorType; gain: number }[]> = {
  tick: [{ freq: 880, ms: 60, type: 'square', gain: 0.05 }],
  end: [
    { freq: 220, ms: 250, type: 'sawtooth', gain: 0.12 },
    { freq: 165, ms: 400, type: 'sawtooth', gain: 0.12 },
  ],
  good: [
    { freq: 660, ms: 90, type: 'sine', gain: 0.12 },
    { freq: 990, ms: 140, type: 'sine', gain: 0.12 },
  ],
  skip: [{ freq: 330, ms: 120, type: 'triangle', gain: 0.1 }],
};

const VIBRATION: Record<Cue, number | number[]> = {
  tick: 15,
  end: [200, 80, 300],
  good: 40,
  skip: 25,
};

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

/** True when the browser can vibrate. iOS browsers cannot. */
export const vibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/**
 * Creates and resumes the audio context on the first tap, click or key press. Browsers with strict
 * autoplay rules (iOS) only allow that inside a user gesture, and the first cues of a game come
 * from timers, not taps. Stops listening once the context is running.
 */
export function unlockAudioOnGesture(): void {
  const events = ['touchend', 'click', 'keydown'] as const;
  const unlock = () => {
    const c = audio();
    if (c?.state === 'running') events.forEach((e) => document.removeEventListener(e, unlock, true));
  };
  events.forEach((e) => document.addEventListener(e, unlock, true));
}

/** Plays a short synthesized cue and vibrates, each only if enabled and supported. Never throws. */
export function cue(name: Cue): void {
  try {
    play(name);
  } catch {
    // Audio or vibration failed: feedback is optional.
  }
}

function play(name: Cue): void {
  const settings = useSettingsStore();
  if (settings.vibration && typeof navigator.vibrate === 'function') {
    navigator.vibrate(VIBRATION[name]);
  }
  if (!settings.sound) return;
  const c = audio();
  if (!c) return;
  let at = c.currentTime;
  for (const tone of TONES[name]) {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    amp.gain.setValueAtTime(tone.gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + tone.ms / 1000);
    osc.connect(amp).connect(c.destination);
    osc.start(at);
    osc.stop(at + tone.ms / 1000);
    at += tone.ms / 1000;
  }
}
