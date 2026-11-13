// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useWakeLock } from '@/composables/wakelock';

function lockStub() {
  const sentinel = {
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
  };
  const request = vi.fn().mockResolvedValue(sentinel);
  vi.stubGlobal('navigator', { wakeLock: { request } });
  return { sentinel, request };
}
const mountIt = () =>
  mount(
    defineComponent({
      setup() {
        useWakeLock();
        return () => null;
      },
    }),
  );

afterEach(() => void vi.unstubAllGlobals());

describe('useWakeLock', () => {
  it('requests a screen lock on mount and releases it on unmount', async () => {
    const { sentinel, request } = lockStub();
    const wrapper = mountIt();
    await flushPromises();
    expect(request).toHaveBeenCalledWith('screen');
    wrapper.unmount();
    expect(sentinel.release).toHaveBeenCalled();
  });

  it('does not keep a lock that arrives after unmount', async () => {
    const { sentinel } = lockStub();
    const wrapper = mountIt();
    wrapper.unmount();
    await flushPromises();
    expect(sentinel.release).toHaveBeenCalled();
  });

  it('does nothing in browsers without the API', async () => {
    vi.stubGlobal('navigator', {});
    const wrapper = mountIt();
    await flushPromises();
    expect(() => wrapper.unmount()).not.toThrow();
  });

  it('does not stack a second request while one is held', async () => {
    const { request } = lockStub();
    mountIt();
    await flushPromises();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
