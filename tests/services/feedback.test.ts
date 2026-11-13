import { describe, expect, it } from 'vitest';
import { timerCue } from '@/services/feedback';

describe('timerCue', () => {
  it('ticks in the last five seconds', () => {
    expect(timerCue(5, 60)).toBe('tick');
    expect(timerCue(1, 60)).toBe('tick');
    expect(timerCue(0, 60)).toBeUndefined();
  });

  it('warns once at 10 seconds on a long timer', () => {
    expect(timerCue(10, 60)).toBe('warn');
    expect(timerCue(9, 60)).toBeUndefined();
  });

  it('skips the warning on short timers', () => {
    expect(timerCue(10, 15)).toBeUndefined();
    expect(timerCue(10, 16)).toBe('warn');
  });
});
