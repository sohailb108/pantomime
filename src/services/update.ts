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

export type UpdateCheck = 'ready' | 'latest' | 'failed';

/** Asks the server for a newer version and waits until it has been downloaded. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'failed';
  if (updateReady.value) return 'ready';
  try {
    await registration.update();
    const worker = registration.installing;
    if (worker) {
      await new Promise<void>((resolve) => {
        const done = () => {
          if (
            worker.state === 'installed' ||
            worker.state === 'activated' ||
            worker.state === 'redundant'
          ) {
            worker.removeEventListener('statechange', done);
            resolve();
          }
        };
        worker.addEventListener('statechange', done);
        done();
      });
    }
    return updateReady.value ? 'ready' : 'latest';
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
  await attempt(() => localStorage.clear());
  await attempt(() => sessionStorage.clear());
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
  window.location.reload();
}
