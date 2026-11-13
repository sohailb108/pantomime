import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { usePause } from '@/composables/pause';

function fakeCountdown(running: boolean) {
  const r = ref(running);
  return {
    running: r,
    pause: vi.fn(() => (r.value = false)),
    resume: vi.fn(() => (r.value = true)),
  };
}

describe('usePause', () => {
  it('pauses a running countdown and resumes it', () => {
    const c = fakeCountdown(true);
    const p = usePause(c);
    p.pause();
    expect(p.paused.value).toBe(true);
    expect(c.pause).toHaveBeenCalledTimes(1);
    p.resume();
    expect(p.paused.value).toBe(false);
    expect(c.resume).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the countdown is not running', () => {
    const c = fakeCountdown(false);
    const p = usePause(c);
    p.pause();
    expect(p.paused.value).toBe(false);
    expect(c.pause).not.toHaveBeenCalled();
  });

  it('ignores a second pause and a resume without a pause', () => {
    const c = fakeCountdown(true);
    const p = usePause(c);
    p.resume();
    expect(c.resume).not.toHaveBeenCalled();
    p.pause();
    p.pause();
    expect(c.pause).toHaveBeenCalledTimes(1);
  });
});
