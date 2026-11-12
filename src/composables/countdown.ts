import { computed, onBeforeUnmount, ref } from 'vue';

/**
 * A countdown based on a deadline timestamp, so it stays correct when the browser throttles timers.
 * `onEnd` fires once when time runs out.
 */
export function useCountdown(onEnd: () => void) {
  const total = ref(0);
  const remainingMs = ref(0);
  const running = ref(false);
  let deadline = 0;
  let startedAt = 0;
  let pausedAt = 0;
  let handle: ReturnType<typeof setInterval> | undefined;

  function tick() {
    remainingMs.value = Math.max(0, deadline - Date.now());
    if (remainingMs.value === 0) {
      stop();
      onEnd();
    }
  }

  function start(seconds: number) {
    stop();
    pausedAt = 0;
    total.value = seconds;
    startedAt = Date.now();
    deadline = startedAt + seconds * 1000;
    remainingMs.value = seconds * 1000;
    running.value = true;
    handle = setInterval(tick, 100);
  }

  function stop() {
    running.value = false;
    if (handle !== undefined) clearInterval(handle);
    handle = undefined;
  }

  /** Freezes a running countdown until `resume`. Does nothing when it is not running. */
  function pause() {
    if (!running.value) return;
    stop();
    pausedAt = Date.now();
  }
  /** Continues a paused countdown with the time it had left. */
  function resume() {
    if (!pausedAt) return;
    const shift = Date.now() - pausedAt;
    pausedAt = 0;
    deadline += shift;
    startedAt += shift;
    running.value = true;
    handle = setInterval(tick, 100);
  }

  /** Whole seconds left, rounded up so the display reaches 0 only when time is over. */
  const secondsLeft = computed(() => Math.ceil(remainingMs.value / 1000));
  /** Seconds elapsed since start, as a decimal. */
  function elapsedSeconds(): number {
    return (Date.now() - startedAt) / 1000;
  }

  onBeforeUnmount(stop);
  return { start, stop, pause, resume, running, secondsLeft, total, remainingMs, elapsedSeconds };
}
