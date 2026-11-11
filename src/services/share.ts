/** The address people should open: this app without the hash route. */
export function appUrl(): string {
  return location.origin + location.pathname;
}

export type ShareResult = 'shared' | 'copied' | 'failed';

/** Shares the app link with the system share sheet, or copies it when sharing is unavailable. */
export async function shareApp(title: string, text: string): Promise<ShareResult> {
  const url = appUrl();
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      // Closing the share sheet is not an error and must not fall through to copying.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
