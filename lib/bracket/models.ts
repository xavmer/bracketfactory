export type TournamentType = "single" | "double";
export type MatchSlotPosition = 1 | 2;
export type MatchSourceType = "team" | "winner" | "loser";
export type BracketSection = "winners" | "losers" | "grandFinal";

export interface Team {
  id: string;
  name: string;
  seed?: number;
}

export interface MatchParticipant {
  teamId: string | null;
  sourceType: MatchSourceType;
  sourceMatchId?: string;
  label?: string;
}

export interface MatchConnection {
  matchId: string;
  slot: MatchSlotPosition;
}

export interface Match {
  id: string;
  bracket: BracketSection;
  groupKey: string;
  groupTitle: string;
  round: number;
  index: number;
  title: string;
  participants: [MatchParticipant, MatchParticipant];
  winnerId: string | null;
  loserId: string | null;
  nextWinner?: MatchConnection;
  nextLoser?: MatchConnection;
}

export interface Round {
  id: string;
  bracket: BracketSection;
  groupKey: string;
  groupTitle: string;
  round: number;
  title: string;
  matchIds: string[];
}

export interface Bracket {
  id: string;
  name: string;
  type: TournamentType;
  teamCount: number;
  regionCount: number;
  roundCount: number;
  teams: Team[];
  rounds: Round[];
  matches: Record<string, Match>;
  championId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BracketDraft {
  name: string;
  type: TournamentType;
  teamCount: number;
  regionCount: number;
  roundCount: number;
  teams: Team[];
}

export interface SavedBracketState {
  draft: BracketDraft;
  bracket: Bracket | null;
}
