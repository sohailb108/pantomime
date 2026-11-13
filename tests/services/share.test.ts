import { afterEach, describe, expect, it, vi } from 'vitest';
import { appUrl, shareApp } from '@/services/share';

function stub(nav: Record<string, unknown>) {
  vi.stubGlobal('navigator', nav);
  vi.stubGlobal('location', { origin: 'https://x.test', pathname: '/app/', hash: '#/game' });
}
afterEach(() => void vi.unstubAllGlobals());

describe('shareApp', () => {
  it('uses the app address without the hash route', () => {
    stub({});
    expect(appUrl()).toBe('https://x.test/app/');
  });

  it('shares with the system sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stub({ share });
    expect(await shareApp('T', 'txt')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'T', text: 'txt', url: 'https://x.test/app/' });
  });

  it('counts a closed share sheet as shared and does not copy', async () => {
    const writeText = vi.fn();
    stub({
      share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')),
      clipboard: { writeText },
    });
    expect(await shareApp('T', 'txt')).toBe('shared');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies when sharing is unavailable or fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stub({ clipboard: { writeText } });
    expect(await shareApp('T', 'txt')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://x.test/app/');

    stub({ share: vi.fn().mockRejectedValue(new Error('boom')), clipboard: { writeText } });
    expect(await shareApp('T', 'txt')).toBe('copied');
  });

  it('fails when copying fails too', async () => {
    stub({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } });
    expect(await shareApp('T', 'txt')).toBe('failed');
  });
});
