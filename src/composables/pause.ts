import { ref } from 'vue';
import type { useCountdown } from './countdown';

/**
 * A manual pause for a running countdown. The clock keeps its time left while `paused` is true, and
 * the page shows an overlay that hides the word. Only the player ends it, by calling `resume`.
 */
export function usePause(countdown: Pick<ReturnType<typeof useCountdown>, 'pause' | 'resume' | 'running'>) {
  const paused = ref(false);
  function pause() {
    if (paused.value || !countdown.running.value) return;
    countdown.pause();
    paused.value = true;
  }
  function resume() {
    if (!paused.value) return;
    paused.value = false;
    countdown.resume();
  }
  return { paused, pause, resume };
}
