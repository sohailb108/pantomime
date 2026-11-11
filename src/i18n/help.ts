import { DEFAULT_GAME_SETTINGS as d } from '@/config/defaults';
import { getLanguage } from './languages';

/** Values interpolated into the Help text, formatted with the language's numerals. */
export function helpValues(code: string): Record<string, string> {
  const nf = new Intl.NumberFormat(`${code}-u-nu-${getLanguage(code).numerals}`, {
    useGrouping: false,
  });
  const f = (n: number) => nf.format(n);
  return {
    turnSeconds: f(d.multi.turnSeconds),
    skipLimit: d.multi.skipLimit === null ? '∞' : f(d.multi.skipLimit),
    skipPenalty: f(d.multi.skipPenalty),
    p1: f(d.points[1]),
    p2: f(d.points[2]),
    p3: f(d.points[3]),
    t1: f(d.single.timerSeconds[1]),
    t2: f(d.single.timerSeconds[2]),
    t3: f(d.single.timerSeconds[3]),
    rerollPenalty: f(d.single.rerollPenalty),
    fastSeconds: f(d.single.fastGuessSeconds),
    fastBonus: f(d.single.fastGuessBonus),
    goldBonus: f(d.gold.bonus),
    goldPenalty: f(d.gold.penalty),
  };
}
