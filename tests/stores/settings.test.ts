import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_PALETTE } from '@/config/palettes';
import { DEFAULT_LANGUAGE } from '@/config/app';
import { stubLocalStorage } from '../helpers/storage';

const fresh = () => {
  setActivePinia(createPinia());
  return useSettingsStore();
};

describe('settings store', () => {
  let data: Map<string, string>;
  beforeEach(() => void (data = stubLocalStorage()));

  it('starts with defaults', () => {
    const s = fresh();
    expect(s.language).toBe(DEFAULT_LANGUAGE);
    expect(s.dark).toBe(false);
    expect(s.sound).toBe(true);
    expect(s.vibration).toBe(true);
    expect(s.palette).toBe(DEFAULT_PALETTE);
  });

  it('remembers every setting', () => {
    const a = fresh();
    a.setLanguage('en');
    a.setDark(true);
    a.setSound(false);
    a.setVibration(false);
    a.setPalette('teal');
    const b = fresh();
    expect([b.language, b.dark, b.sound, b.vibration, b.palette]).toEqual([
      'en',
      true,
      false,
      false,
      'teal',
    ]);
  });

  it('falls back to the default palette for an unknown one', () => {
    const s = fresh();
    s.setPalette('nope');
    expect(s.palette).toBe(DEFAULT_PALETTE);
    data.set('pantomime:settings', JSON.stringify({ palette: 'gone' }));
    expect(fresh().palette).toBe(DEFAULT_PALETTE);
  });

  it('ignores corrupt saved data and keeps working when storage fails', () => {
    data.set('pantomime:settings', '{not json');
    expect(fresh().sound).toBe(true);
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    });
    const s = fresh();
    s.setDark(true);
    expect(s.dark).toBe(true);
  });
});
