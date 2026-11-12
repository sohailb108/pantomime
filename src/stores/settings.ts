import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_LANGUAGE } from '@/config/app';
import { DEFAULT_PALETTE, getPalette } from '@/config/palettes';

const KEY = 'pantomime:settings';

interface Persisted {
  language: string;
  dark: boolean;
  sound: boolean;
  vibration: boolean;
  palette: string;
}

function load(): Partial<Persisted> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Persisted>;
  } catch {
    return {};
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = load();
  const language = ref(saved.language ?? DEFAULT_LANGUAGE);
  const dark = ref(saved.dark ?? false);
  const sound = ref(saved.sound ?? true);
  const vibration = ref(saved.vibration ?? true);
  const palette = ref(getPalette(saved.palette ?? DEFAULT_PALETTE).id);

  function persist() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          language: language.value,
          dark: dark.value,
          sound: sound.value,
          vibration: vibration.value,
          palette: palette.value,
        }),
      );
    } catch {
      // Storage full or blocked (private mode): the setting still applies for this session.
    }
  }

  function setLanguage(code: string) {
    language.value = code;
    persist();
  }

  function setDark(value: boolean) {
    dark.value = value;
    persist();
  }

  function setSound(value: boolean) {
    sound.value = value;
    persist();
  }

  function setVibration(value: boolean) {
    vibration.value = value;
    persist();
  }

  function setPalette(id: string) {
    palette.value = getPalette(id).id;
    persist();
  }

  return {
    language,
    dark,
    sound,
    vibration,
    palette,
    setLanguage,
    setDark,
    setSound,
    setVibration,
    setPalette,
  };
});
