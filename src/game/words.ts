import { shuffle } from './rng';
import type { Rng } from './types';

/**
 * Builds the order words are drawn in for one tile (or the gold pool): words not seen before come
 * first in random order, then already-seen words, also random. Drawing is just taking the next
 * entry, so words never repeat within a deck. Duplicates in the pool are ignored.
 *
 * Callers reset the history themselves when the pool is exhausted, see `isPoolExhausted`.
 */
export function buildDeck(pool: readonly string[], seen: ReadonlySet<string>, rng: Rng): string[] {
  const unique = [...new Set(pool)];
  const fresh = unique.filter((w) => !seen.has(w));
  const stale = unique.filter((w) => seen.has(w));
  return [...shuffle(fresh, rng), ...shuffle(stale, rng)];
}

/** True when every word of the pool has been seen, so the history for it should be reset. */
export function isPoolExhausted(pool: readonly string[], seen: ReadonlySet<string>): boolean {
  return pool.length > 0 && pool.every((w) => seen.has(w));
}
