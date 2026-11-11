import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Keeps the screen awake while the component is mounted, using the Screen Wake Lock API.
 * The browser drops the lock when the page is hidden, so it is requested again on return.
 * Unsupported browsers or refused requests are ignored.
 */
export function useWakeLock() {
  let sentinel: WakeLockSentinel | null = null;
  let wanted = false;

  async function acquire() {
    if (!wanted || sentinel || document.visibilityState !== 'visible') return;
    try {
      sentinel = (await navigator.wakeLock?.request('screen')) ?? null;
      sentinel?.addEventListener('release', () => (sentinel = null));
    } catch {
      sentinel = null;
    }
  }

  function onVisible() {
    void acquire();
  }

  onMounted(() => {
    wanted = true;
    document.addEventListener('visibilitychange', onVisible);
    void acquire();
  });
  onBeforeUnmount(() => {
    wanted = false;
    document.removeEventListener('visibilitychange', onVisible);
    void sentinel?.release().catch(() => undefined);
    sentinel = null;
  });
}
