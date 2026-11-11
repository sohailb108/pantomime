import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSetupStore } from '@/stores/setup';

describe('setup store', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    setActivePinia(createPinia());
  });

  it('computes the minimum categories from the team count', () => {
    const s = useSetupStore();
    expect(s.minCategories).toBe(1);
    s.addTeam();
    s.addTeam();
    expect(s.teamCount).toBe(4);
    expect(s.minCategories).toBe(2);
  });

  it('reports tile and trimmed counts', () => {
    const s = useSetupStore();
    ['a', 'b', 'c'].forEach((id) => s.toggleCategory(id));
    expect(s.tileCount).toBe(8);
    expect(s.trimmedCount).toBe(1);
  });

  it('keeps the team count between 2 and 6', () => {
    const s = useSetupStore();
    s.removeTeam(0);
    expect(s.teamCount).toBe(2);
    for (let i = 0; i < 10; i++) s.addTeam();
    expect(s.teamCount).toBe(6);
  });

  it('reset clears teams and categories but keeps mode and settings', () => {
    const s = useSetupStore();
    s.toggleCategory('a');
    s.addTeam();
    s.mode = 'multi';
    s.settings.multi.turnSeconds = 45;
    s.reset();
    expect(s.categoryIds).toEqual([]);
    expect(s.teamCount).toBe(2);
    expect(s.mode).toBe('multi');
    expect(s.settings.multi.turnSeconds).toBe(45);
  });

  it('remembers mode and settings for the next game', async () => {
    const first = useSetupStore();
    first.mode = 'multi';
    first.settings.single.timerSeconds[2] = 75;
    await nextTick();
    setActivePinia(createPinia());
    const next = useSetupStore();
    expect(next.mode).toBe('multi');
    expect(next.settings.single.timerSeconds[2]).toBe(75);
    expect(next.settings.single.timerSeconds[1]).toBe(30);
  });

  it('reset to defaults restores the default settings', async () => {
    const s = useSetupStore();
    s.settings.multi.turnSeconds = 45;
    s.resetSettings();
    await nextTick();
    setActivePinia(createPinia());
    expect(useSetupStore().settings.multi.turnSeconds).toBe(60);
  });

  it('gives each team a different color', () => {
    const s = useSetupStore();
    s.addTeam();
    expect(new Set(s.teamColors).size).toBe(3);
    const taken = s.teamColors[1]!;
    s.setColor(0, taken);
    expect(s.teamColors[0]).not.toBe(taken);
    s.setColor(0, 'gray');
    expect(s.teamColors[0]).toBe('gray');
  });
});
