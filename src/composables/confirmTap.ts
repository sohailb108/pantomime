import { onBeforeUnmount, ref } from 'vue';

/**
 * Two-tap confirmation for a risky button: the first tap arms it (`armed` turns true for
 * `windowMs`), a second tap inside that window runs the action. Call `reset()` when the action
 * happens another way, so the button does not stay armed.
 */
export function useConfirmTap(windowMs = 3000) {
  const armed = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset() {
    clearTimeout(timer);
    armed.value = false;
  }
  function tap(action: () => void) {
    if (!armed.value) {
      armed.value = true;
      clearTimeout(timer);
      timer = setTimeout(() => (armed.value = false), windowMs);
      return;
    }
    action();
  }

  onBeforeUnmount(() => clearTimeout(timer));
  return { armed, tap, reset };
}
