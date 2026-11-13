import { ref } from 'vue';

/** Set by the service worker registration when a new version of the app has been downloaded. */
export const updateReady = ref(false);

/** True once a service worker is registered, so a manual check can run (never in dev). */
export const updateSupported = ref(false);

let registration: ServiceWorkerRegistration | undefined;

export function setRegistration(r: ServiceWorkerRegistration) {
  registration = r;
  updateSupported.value = true;
}

export type UpdateCheck = 'ready' | 'downloading' | 'latest' | 'failed';

/** How long a manual check waits for a found update to finish downloading. */
const INSTALL_TIMEOUT_MS = 30_000;

/** Resolves with the worker's state once it settles (installed, activated or redundant), or 'timeout'. */
function waitForInstall(worker: ServiceWorker): Promise<ServiceWorkerState | 'timeout'> {
  return new Promise((resolve) => {
    const finish = (result: ServiceWorkerState | 'timeout') => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', check);
      resolve(result);
    };
    const check = () => {
      if (
        worker.state === 'installed' ||
        worker.state === 'activated' ||
        worker.state === 'redundant'
      ) {
        finish(worker.state);
      }
    };
    const timer = setTimeout(() => finish('timeout'), INSTALL_TIMEOUT_MS);
    worker.addEventListener('statechange', check);
    check();
  });
}

/** Asks the server for a newer version and waits until it has been downloaded. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'failed';
  if (updateReady.value) return 'ready';
  try {
    await registration.update();
    const worker = registration.installing;
    if (worker) {
      const result = await waitForInstall(worker);
      // Still downloading: the refresh prompt appears by itself once it is done.
      if (result === 'timeout') return 'downloading';
      // The worker skips waiting, so installed or activated means the update is ready.
      if (result !== 'redundant') updateReady.value = true;
    }
    // Redundant means failed or replaced by a newer worker, so look at what is left.
    if (registration.waiting) updateReady.value = true;
    if (updateReady.value) return 'ready';
    if (registration.installing) return 'downloading';
    // A worker that went redundant with nothing replacing it failed; no worker means up to date.
    return worker ? 'failed' : 'latest';
  } catch {
    return 'failed';
  }
}

/** Wipes everything this app keeps on the device, then reloads it from the network. */
export async function resetApp(): Promise<void> {
  // Each step is best-effort: one failing must not stop the others.
  const attempt = async (step: () => unknown) => {
    try {
      await step();
    } catch {
      // Ignored on purpose.
    }
  };
  await attempt(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  });
  await attempt(async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
  await attempt(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve) => {
            if (!db.name) return resolve();
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }),
      ),
    );
  });
  // Last, right before the reload, so no store watcher can write its state back in between.
  await attempt(() => localStorage.clear());
  await attempt(() => sessionStorage.clear());
  window.location.reload();
}
