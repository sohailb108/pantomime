/** Palette teams choose from. Names are in the i18n files under `teamColors.<id>`. */
export const TEAM_COLORS = [
  { id: 'red', hex: '#d32f2f' },
  { id: 'blue', hex: '#1976d2' },
  { id: 'green', hex: '#388e3c' },
  { id: 'amber', hex: '#f9a825' },
  { id: 'purple', hex: '#7b1fa2' },
  { id: 'pink', hex: '#d81b60' },
  { id: 'cyan', hex: '#00838f' },
  { id: 'gray', hex: '#546e7a' },
] as const;

export type TeamColorId = (typeof TEAM_COLORS)[number]['id'];

const FALLBACK = '#9e9e9e';

export function teamHex(id: string): string {
  return TEAM_COLORS.find((c) => c.id === id)?.hex ?? FALLBACK;
}

/** The first palette color not in `used`, or the first color if all are taken. */
export function firstFreeColor(used: readonly string[]): string {
  return (TEAM_COLORS.find((c) => !used.includes(c.id)) ?? TEAM_COLORS[0]).id;
}
