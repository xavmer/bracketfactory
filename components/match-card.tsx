"use client";

import { Match, Team } from "@/lib/bracket/models";

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onPickWinner: (matchId: string, winnerId: string) => void;
  onClearWinner: (matchId: string) => void;
}

function getTeam(teams: Team[], teamId: string | null) {
  return teams.find((team) => team.id === teamId) ?? null;
}

function getParticipantLabel(match: Match, index: 0 | 1, teams: Team[]) {
  const participant = match.participants[index];
  const team = getTeam(teams, participant.teamId);

  if (team) {
    return team.seed ? `#${team.seed} ${team.name}` : team.name;
  }

  return participant.label ?? "TBD";
}

export function MatchCard({
  match,
  teams,
  onPickWinner,
  onClearWinner,
}: MatchCardProps) {
  const leftTeamId = match.participants[0].teamId;
  const rightTeamId = match.participants[1].teamId;
  const canPick = Boolean(leftTeamId && rightTeamId);

  return (
    <div className="h-[170px] w-[272px] rounded-[1.7rem] border border-line/90 bg-white p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          {match.title}
        </p>
        {match.winnerId ? (
          <button
            onClick={() => onClearWinner(match.id)}
            className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {[0, 1].map((index) => {
          const teamId = match.participants[index].teamId;
          const isWinner = match.winnerId === teamId && teamId !== null;

          return (
            <button
              key={`${match.id}-${index}`}
              onClick={() => {
                if (teamId) {
                  onPickWinner(match.id, teamId);
                }
              }}
              disabled={!canPick || !teamId}
              className={[
                "flex h-[56px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                isWinner
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-mist/90 text-ink hover:border-accentWarm hover:bg-white",
                !canPick || !teamId ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              <span className="overflow-hidden pr-4 text-sm font-medium">
                {getParticipantLabel(match, index as 0 | 1, teams)}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.2em]">
                {isWinner ? "Winner" : "Pick"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
