import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetApp } from '@/services/update';

/** Records every wipe step in order, so tests can check what ran and when. */
let log: string[];

interface Fakes {
  registrations?: () => Promise<{ unregister: () => Promise<boolean> }[]>;
  cacheKeys?: () => Promise<string[]>;
  databases?: () => Promise<{ name?: string }[]>;
  clearLocal?: () => void;
  clearSession?: () => void;
}

function install(f: Fakes = {}) {
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistrations:
        f.registrations ??
        (() =>
          Promise.resolve([
            {
              unregister: () => {
                log.push('unregister');
                return Promise.resolve(true);
              },
            },
          ])),
    },
  });
  vi.stubGlobal('caches', {
    keys: f.cacheKeys ?? (() => Promise.resolve(['precache', 'runtime'])),
    delete: (k: string) => {
      log.push(`cache:${k}`);
      return Promise.resolve(true);
    },
  });
  vi.stubGlobal('indexedDB', {
    databases: f.databases ?? (() => Promise.resolve([{ name: 'db1' }])),
    deleteDatabase: (name: string) => {
      log.push(`idb:${name}`);
      const req: { onsuccess?: () => void } = {};
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  });
  vi.stubGlobal('localStorage', {
    clear:
      f.clearLocal ??
      (() => {
        log.push('local');
      }),
  });
  vi.stubGlobal('sessionStorage', {
    clear:
      f.clearSession ??
      (() => {
        log.push('session');
      }),
  });
  vi.stubGlobal('window', {
    location: {
      reload: () => {
        log.push('reload');
      },
    },
  });
}

describe('resetApp', () => {
  beforeEach(() => {
    log = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wipes workers, caches, databases and storage, then reloads last', async () => {
    install();
    await resetApp();
    expect(log).toEqual([
      'unregister',
      'cache:precache',
      'cache:runtime',
      'idb:db1',
      'local',
      'session',
      'reload',
    ]);
  });

  it('clears local storage only after the other steps, so nothing can write it back', async () => {
    install();
    await resetApp();
    expect(log.indexOf('local')).toBeGreaterThan(log.indexOf('idb:db1'));
    expect(log.at(-1)).toBe('reload');
  });

  it('unregisters every registration and deletes every cache and database', async () => {
    install({
      registrations: () =>
        Promise.resolve(
          ['a', 'b'].map((n) => ({
            unregister: () => {
              log.push(`unregister:${n}`);
              return Promise.resolve(true);
            },
          })),
        ),
      cacheKeys: () => Promise.resolve(['c1', 'c2', 'c3']),
      databases: () => Promise.resolve([{ name: 'x' }, { name: 'y' }]),
    });
    await resetApp();
    expect(log).toEqual(
      expect.arrayContaining([
        'unregister:a',
        'unregister:b',
        'cache:c1',
        'cache:c2',
        'cache:c3',
        'idb:x',
        'idb:y',
      ]),
    );
  });

  it('skips databases without a name', async () => {
    install({ databases: () => Promise.resolve([{}, { name: 'real' }]) });
    await resetApp();
    expect(log.filter((l) => l.startsWith('idb:'))).toEqual(['idb:real']);
  });

  it.each([
    ['service workers', { registrations: () => Promise.reject(new Error('no sw')) }],
    ['caches', { cacheKeys: () => Promise.reject(new Error('no caches')) }],
    ['databases', { databases: () => Promise.reject(new Error('no idb listing')) }],
    [
      'local storage',
      {
        clearLocal: () => {
          throw new Error('denied');
        },
      },
    ],
    [
      'session storage',
      {
        clearSession: () => {
          throw new Error('denied');
        },
      },
    ],
  ] as [string, Fakes][])('keeps going and still reloads when %s fail', async (_name, fakes) => {
    install(fakes);
    await expect(resetApp()).resolves.toBeUndefined();
    expect(log.at(-1)).toBe('reload');
    // The other steps still ran.
    const steps = ['unregister', 'cache:precache', 'idb:db1', 'local', 'session'];
    expect(steps.filter((s) => log.includes(s)).length).toBeGreaterThanOrEqual(4);
  });
});
