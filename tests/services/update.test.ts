import { beforeEach, describe, expect, it, vi } from 'vitest';

type State = 'installing' | 'installed' | 'activated' | 'redundant';

/** A service worker whose state the test changes by hand. */
function fakeWorker(state: State = 'installing') {
  const listeners = new Set<() => void>();
  const worker = {
    state,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    set(next: State) {
      worker.state = next;
      [...listeners].forEach((fn) => fn());
    },
  };
  return worker;
}

interface Reg {
  installing: ReturnType<typeof fakeWorker> | null;
  waiting: object | null;
  update: () => Promise<void>;
}

async function setup(reg: Partial<Reg> = {}) {
  vi.resetModules();
  const mod = await import('@/services/update');
  const registration: Reg = { installing: null, waiting: null, update: async () => {}, ...reg };
  mod.setRegistration(registration as unknown as ServiceWorkerRegistration);
  return { ...mod, registration };
}

describe('checkForUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fails without a registration', async () => {
    vi.resetModules();
    const { checkForUpdate } = await import('@/services/update');
    expect(await checkForUpdate()).toBe('failed');
  });

  it('is ready at once when the prompt is already showing', async () => {
    const { checkForUpdate, updateReady } = await setup();
    updateReady.value = true;
    expect(await checkForUpdate()).toBe('ready');
  });

  it('is latest when nothing is installing or waiting', async () => {
    const { checkForUpdate, updateReady } = await setup();
    expect(await checkForUpdate()).toBe('latest');
    expect(updateReady.value).toBe(false);
  });

  it('is ready when an update is already waiting', async () => {
    const { checkForUpdate, updateReady } = await setup({ waiting: {} });
    expect(await checkForUpdate()).toBe('ready');
    expect(updateReady.value).toBe(true);
  });

  it('is failed when the update check itself throws', async () => {
    const { checkForUpdate } = await setup({
      update: () => Promise.reject(new Error('offline')),
    });
    expect(await checkForUpdate()).toBe('failed');
  });

  it.each<State>(['installed', 'activated'])('is ready when the new worker is %s', async (end) => {
    const worker = fakeWorker();
    const { checkForUpdate, updateReady } = await setup({ installing: worker });
    const result = checkForUpdate();
    await vi.advanceTimersByTimeAsync(10);
    worker.set(end);
    expect(await result).toBe('ready');
    expect(updateReady.value).toBe(true);
  });

  it('is ready at once when the worker has already installed', async () => {
    const { checkForUpdate } = await setup({ installing: fakeWorker('installed') });
    expect(await checkForUpdate()).toBe('ready');
  });

  it('is downloading when the install takes too long', async () => {
    const { checkForUpdate, updateReady } = await setup({ installing: fakeWorker() });
    const result = checkForUpdate();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(await result).toBe('downloading');
    expect(updateReady.value).toBe(false);
  });

  it('is failed when the worker goes redundant and nothing replaces it', async () => {
    const worker = fakeWorker();
    const { checkForUpdate, updateReady, registration } = await setup({ installing: worker });
    const result = checkForUpdate();
    await vi.advanceTimersByTimeAsync(10);
    registration.installing = null; // browsers drop a redundant worker from the registration
    worker.set('redundant');
    expect(await result).toBe('failed');
    expect(updateReady.value).toBe(false);
  });

  it('is ready when the worker goes redundant but another one is waiting', async () => {
    const worker = fakeWorker();
    const { checkForUpdate, registration } = await setup({ installing: worker });
    const result = checkForUpdate();
    await vi.advanceTimersByTimeAsync(10);
    registration.waiting = {};
    registration.installing = null;
    worker.set('redundant');
    expect(await result).toBe('ready');
  });

  it('is downloading when the worker is replaced by a newer one that is installing', async () => {
    const worker = fakeWorker();
    const { checkForUpdate, registration } = await setup({ installing: worker });
    const result = checkForUpdate();
    await vi.advanceTimersByTimeAsync(10);
    registration.installing = fakeWorker();
    worker.set('redundant');
    expect(await result).toBe('downloading');
  });
});
