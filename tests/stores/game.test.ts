import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { loadJson } from '@/services/storage';
import { useGameStore } from '@/stores/game';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function freshStore() {
  setActivePinia(createPinia());
  return useGameStore();
}

const options = {
  teamColors: ['red', 'blue'],
  categoryIds: ['animals', 'movies'],
  mode: 'multi' as const,
  settings: JSON.parse(JSON.stringify(DEFAULT_GAME_SETTINGS)) as typeof DEFAULT_GAME_SETTINGS,
  lang: 'en',
};

describe('game store persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('restores the game after a reload', async () => {
    const a = freshStore();
    a.start(options);
    await nextTick();
    const b = freshStore();
    expect(b.state?.teams.map((t) => t.color)).toEqual(['red', 'blue']);
    expect(b.lang).toBe('en');
    expect(b.pickedTile).toBeNull();
  });

  it('saves after a turn finishes', async () => {
    const a = freshStore();
    a.start(options);
    a.pick(0);
    a.finish([{ teamId: 0, points: 2 }]);
    await nextTick();
    expect(freshStore().state?.teams[0]?.score).toBe(2);
  });

  it('fills in tile points for a game saved before they were configurable', async () => {
    const a = freshStore();
    a.start(options);
    await nextTick();
    const saved = JSON.parse(localStorage.getItem('pantomime:game')!);
    delete saved.data.state.settings.points;
    localStorage.setItem('pantomime:game', JSON.stringify(saved));
    expect(freshStore().state?.settings.points).toEqual({ 1: 2, 2: 4, 3: 6 });
  });

  it('fills in the gold timer for a game saved before it was configurable', async () => {
    const a = freshStore();
    a.start(options);
    await nextTick();
    const saved = JSON.parse(localStorage.getItem('pantomime:game')!);
    delete saved.data.state.settings.gold.timerSeconds;
    localStorage.setItem('pantomime:game', JSON.stringify(saved));
    expect(freshStore().state?.settings.gold.timerSeconds).toBe(90);
  });

  it('gives colors to teams of a game saved with names', async () => {
    const a = freshStore();
    a.start(options);
    await nextTick();
    const saved = JSON.parse(localStorage.getItem('pantomime:game')!);
    saved.data.state.teams.forEach((t: Record<string, unknown>, i: number) => {
      delete t.color;
      t.name = `Team ${i}`;
    });
    localStorage.setItem('pantomime:game', JSON.stringify(saved));
    expect(freshStore().state?.teams.map((t) => t.color)).toEqual(['red', 'blue']);
  });

  it('ignores corrupt or foreign data', () => {
    localStorage.setItem('pantomime:game', '{not json');
    expect(freshStore().state).toBeNull();
    localStorage.setItem('pantomime:game', JSON.stringify({ version: 99, data: {} }));
    expect(freshStore().state).toBeNull();
  });

  it('keeps shown words across games and resets an exhausted pool', async () => {
    const a = freshStore();
    a.start(options);
    const deck = a.tileDeck('animals', 1);
    expect(deck.length).toBeGreaterThan(1);
    a.markTileSeen('animals', 1, deck[0]!);
    await nextTick();

    const b = freshStore();
    b.start(options);
    expect(b.tileDeck('animals', 1)[deck.length - 1]).toBe(deck[0]);

    deck.forEach((w) => b.markTileSeen('animals', 1, w));
    expect(new Set(b.tileDeck('animals', 1)).size).toBe(deck.length);
    expect(b.tileDeck('animals', 1)).toHaveLength(deck.length);
  });

  it('records a word once and forgets words that left the pool', async () => {
    const a = freshStore();
    a.start(options);
    const deck = a.tileDeck('animals', 1);
    a.markTileSeen('animals', 1, deck[0]!);
    a.markTileSeen('animals', 1, deck[0]!);
    a.markTileSeen('animals', 1, 'removed word');
    await nextTick();
    const history = () =>
      loadJson<Record<string, Record<string, string[]>>>('pantomime:history')![options.lang]!;
    expect(history()['animals:1']).toEqual([deck[0], 'removed word']);

    a.tileDeck('animals', 1);
    await nextTick();
    expect(history()['animals:1']).toEqual([deck[0]]);
  });
});
