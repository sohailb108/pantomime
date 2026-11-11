import { ref } from 'vue';

/** The browser's deferred install prompt (Chromium only; not in the TypeScript DOM types). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;

export const installAvailable = ref(false);

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone, iPad (including iPadOS, which reports as a Mac with touch) in a browser tab. */
export function needsIosHint(): boolean {
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !isStandalone();
}

/** Listens for the install prompt. Call once at startup, because the event fires early. */
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    installAvailable.value = !isStandalone();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installAvailable.value = false;
  });
}

/** Shows the browser's install dialog. Returns false when there is nothing to show. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  installAvailable.value = false;
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}
