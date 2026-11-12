import { ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

/**
 * Asks before leaving a page while `active()` is true. Leaving by the browser's back button or an
 * iOS swipe is cancelled and opens the same dialog (`open`) that the page's own exit button opens.
 * Call `allow()` right before a navigation the page makes itself on purpose.
 */
export function useLeaveGuard(active: () => boolean) {
  const open = ref(false);
  let allowed = false;
  onBeforeRouteLeave(() => {
    if (allowed || !active()) return true;
    open.value = true;
    return false;
  });
  function allow() {
    allowed = true;
    open.value = false;
  }
  return { open, allow };
}
