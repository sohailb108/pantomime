// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useConfirmTap } from '@/composables/confirmTap';

function setup(windowMs?: number) {
  let api!: ReturnType<typeof useConfirmTap>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useConfirmTap(windowMs);
        return () => null;
      },
    }),
  );
  return { api, wrapper };
}

describe('useConfirmTap', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('arms on the first tap and acts on the second', () => {
    const { api } = setup();
    const action = vi.fn();
    api.tap(action);
    expect(api.armed.value).toBe(true);
    expect(action).not.toHaveBeenCalled();
    api.tap(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('disarms after the window, so a late tap only arms again', () => {
    const { api } = setup(1000);
    const action = vi.fn();
    api.tap(action);
    vi.advanceTimersByTime(1000);
    expect(api.armed.value).toBe(false);
    api.tap(action);
    expect(action).not.toHaveBeenCalled();
    expect(api.armed.value).toBe(true);
  });

  it('reset disarms at once', () => {
    const { api } = setup();
    api.tap(() => undefined);
    api.reset();
    expect(api.armed.value).toBe(false);
  });

  it('clears its timer when unmounted', () => {
    const { api, wrapper } = setup();
    api.tap(() => undefined);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
