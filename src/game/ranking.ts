import type { Team } from './types';

export interface RankedTeam {
  teamId: number;
  color: string;
  score: number;
  /** Competition ranking: ties share a rank and the next rank is skipped (1, 1, 3). */
  rank: number;
}

/** Teams by descending score. Ties are shown as ties. */
export function rankTeams(teams: readonly Team[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.score - a.score || a.id - b.id);
  return sorted.map((team) => {
    const firstWithScore = sorted.findIndex((t) => t.score === team.score);
    return { teamId: team.id, color: team.color, score: team.score, rank: firstWithScore + 1 };
  });
}

/** Every team sharing the top score. */
export function leaders(teams: readonly Team[]): Team[] {
  const top = Math.max(...teams.map((t) => t.score));
  return teams.filter((t) => t.score === top);
}
