import { useSettingsStore } from '@/stores/settings';

type Cue = 'tick' | 'warn' | 'end' | 'good' | 'skip' | 'gold';

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
  // One soft low tone: a heads-up at 10 seconds that is clearly not the 5-second tick.
  warn: [{ freq: 440, ms: 220, type: 'triangle', gain: 0.08 }],
  // Rising arpeggio for the gold word: the biggest moment of a game.
  gold: [
    { freq: 523, ms: 110, type: 'sine', gain: 0.12 },
    { freq: 659, ms: 110, type: 'sine', gain: 0.12 },
    { freq: 784, ms: 110, type: 'sine', gain: 0.12 },
    { freq: 1047, ms: 320, type: 'sine', gain: 0.12 },
  ],
};

const VIBRATION: Record<Cue, number | number[]> = {
  tick: 15,
  end: [200, 80, 300],
  good: 40,
  skip: 25,
  warn: 20,
  gold: [40, 40, 40, 40, 120],
};

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext();
    // iOS Safari also leaves the context 'interrupted' after a lock or app switch.
    if (ctx.state !== 'running') void ctx.resume();
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
 * from timers, not taps. Keeps listening, since iOS can interrupt the context again later (lock
 * screen, app switch) and only a gesture can resume it.
 */
export function unlockAudioOnGesture(): void {
  const events = ['touchend', 'click', 'keydown'] as const;
  const unlock = () => {
    audio();
  };
  events.forEach((e) => document.addEventListener(e, unlock, true));
}

/** Shortest timer that gets the 10-second heads-up; on shorter ones it would run into the ticks. */
const WARN_MIN_TOTAL = 15;

/** Which cue, if any, a running timer plays when it reaches `secondsLeft`. */
export function timerCue(secondsLeft: number, totalSeconds: number): Cue | undefined {
  if (secondsLeft > 0 && secondsLeft <= 5) return 'tick';
  if (secondsLeft === 10 && totalSeconds > WARN_MIN_TOTAL) return 'warn';
  return undefined;
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
