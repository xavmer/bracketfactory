import { Bracket, BracketDraft, BracketSection, Match, MatchParticipant, Round, Team } from "@/lib/bracket/models";

export const SUPPORTED_TEAM_COUNTS = [4, 8, 16, 32] as const;

let idCounter = 0;

export function createId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createEmptyTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: createId("team"),
    name: `Team ${index + 1}`,
    seed: index + 1,
  }));
}

export function normalizeTeams(teams: Team[], teamCount: number): Team[] {
  const nextTeams: Team[] = teams.slice(0, teamCount).map((team, index) => ({
    ...team,
    name: team.name || `Team ${index + 1}`,
    seed: team.seed ?? index + 1,
  }));

  if (nextTeams.length >= teamCount) {
    return nextTeams;
  }

  return [...nextTeams, ...createEmptyTeams(teamCount - nextTeams.length)];
}

export function sortTeamsForSeeding(teams: Team[]): Team[] {
  return [...teams].sort((left, right) => {
    const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;

    if (leftSeed !== rightSeed) {
      return leftSeed - rightSeed;
    }

    return left.name.localeCompare(right.name);
  });
}

export function buildSeedOrder(teamCount: number): number[] {
  if (teamCount === 2) {
    return [1, 2];
  }

  const previous = buildSeedOrder(teamCount / 2);
  return previous.flatMap((seed) => [seed, teamCount + 1 - seed]);
}

export function createParticipant(partial?: Partial<MatchParticipant>): MatchParticipant {
  return {
    teamId: null,
    sourceType: "team",
    ...partial,
  };
}

export function createRound(
  bracket: BracketSection,
  round: number,
  title: string,
  matchIds: string[],
): Round {
  return {
    id: createId("round"),
    bracket,
    round,
    title,
    matchIds,
  };
}

export function createMatch(match: Omit<Match, "id" | "winnerId" | "loserId">): Match {
  return {
    ...match,
    id: createId("match"),
    winnerId: null,
    loserId: null,
  };
}

export function getRoundLabel(bracket: BracketSection, round: number, totalRounds: number) {
  if (bracket === "winners") {
    if (round === totalRounds) {
      return "Winners Final";
    }

    return `Round ${round}`;
  }

  if (bracket === "losers") {
    if (round === totalRounds) {
      return "Losers Final";
    }

    return `Losers ${round}`;
  }

  return round === 1 ? "Grand Final" : "Grand Final Reset";
}

export function createDraft(teamCount = 8): BracketDraft {
  return {
    name: "Bracket Factory Invitational",
    type: "single",
    teamCount,
    teams: createEmptyTeams(teamCount),
  };
}

export function cloneBracket(bracket: Bracket): Bracket {
  return JSON.parse(JSON.stringify(bracket)) as Bracket;
}
