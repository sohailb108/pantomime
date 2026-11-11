/** Color themes. The first one is the default and matches `quasar.variables.scss`. */
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
    id: 'orange',
    primary: '#ff7043',
    primaryDark: '#ff7043',
    secondary: '#26a69a',
    accent: '#ffca28',
  },
  {
    id: 'blue',
    primary: '#1976d2',
    primaryDark: '#42a5f5',
    secondary: '#26a69a',
    accent: '#ffb300',
  },
  {
    id: 'green',
    primary: '#388e3c',
    primaryDark: '#4caf50',
    secondary: '#00897b',
    accent: '#ffb300',
  },
  {
    id: 'purple',
    primary: '#ab47bc',
    primaryDark: '#ba68c8',
    secondary: '#26a69a',
    accent: '#ffca28',
  },
];

export const DEFAULT_PALETTE = PALETTES[0]!.id;

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}
