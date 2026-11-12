/**
 * Color themes. The first one is the default and matches `quasar.variables.scss`.
 * Deliberately muted and dusty, so they are not mistaken for the saturated team colors.
 */
export interface Palette {
  id: string;
  primary: string;
  /** Lighter primary for dark mode, so text and outlines in the theme color stay readable. */
  primaryDark: string;
  secondary: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  {
    id: 'orange', // terracotta
    primary: '#b4573a',
    primaryDark: '#cf7455',
    secondary: '#5a8f8a',
    accent: '#d4a24c',
  },
  {
    id: 'blue', // slate blue
    primary: '#4e6a96',
    primaryDark: '#7894c4',
    secondary: '#5a8f8a',
    accent: '#d4a24c',
  },
  {
    id: 'green', // sage
    primary: '#56795c',
    primaryDark: '#7aa881',
    secondary: '#5a8f8a',
    accent: '#d4a24c',
  },
  {
    id: 'purple', // mauve
    primary: '#8a5a80',
    primaryDark: '#b384a8',
    secondary: '#5a8f8a',
    accent: '#d4a24c',
  },
  {
    id: 'brown', // cocoa
    primary: '#7a5c4a',
    primaryDark: '#a8846f',
    secondary: '#5a8f8a',
    accent: '#d4a24c',
  },
  {
    id: 'teal', // dusty lagoon
    primary: '#3f7f87',
    primaryDark: '#6aa9b1',
    secondary: '#b07a5a',
    accent: '#d4a24c',
  },
];

export const DEFAULT_PALETTE = PALETTES[0]!.id;

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}
