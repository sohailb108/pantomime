import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from '@/composables/countdown';

describe('countdown pause', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the remaining time while paused and ends later', () => {
    const onEnd = vi.fn();
    const c = useCountdown(onEnd);
    c.start(10);
    vi.advanceTimersByTime(4000);
    c.pause();
    expect(c.running.value).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(onEnd).not.toHaveBeenCalled();
    c.resume();
    expect(c.running.value).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(c.secondsLeft.value).toBe(1);
    expect(c.elapsedSeconds()).toBeCloseTo(9, 0);
    vi.advanceTimersByTime(1100);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores pause and resume when not running', () => {
    const c = useCountdown(() => {});
    c.pause();
    c.resume();
    expect(c.running.value).toBe(false);
  });
});
