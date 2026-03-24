"use client";

import { Team } from "@/lib/bracket/models";

interface TeamEditorProps {
  teams: Team[];
  onChange: (teams: Team[]) => void;
}

export function TeamEditor({ teams, onChange }: TeamEditorProps) {
  return (
    <div className="space-y-3">
      {teams.map((team, index) => (
        <div
          key={team.id}
          className="grid gap-3 rounded-2xl border border-line bg-white/90 p-4 shadow-sm sm:grid-cols-[1fr_96px]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Team {index + 1}</span>
            <input
              value={team.name}
              onChange={(event) => {
                const nextTeams = teams.map((candidate) =>
                  candidate.id === team.id
                    ? {
                        ...candidate,
                        name: event.target.value,
                      }
                    : candidate,
                );
                onChange(nextTeams);
              }}
              className="w-full rounded-xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
              placeholder={`Team ${index + 1}`}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-600">Seed</span>
            <input
              type="number"
              min={1}
              max={teams.length}
              value={team.seed ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                const nextTeams = teams.map((candidate) =>
                  candidate.id === team.id
                    ? {
                        ...candidate,
                        seed: value ? Number(value) : undefined,
                      }
                    : candidate,
                );
                onChange(nextTeams);
              }}
              className="w-full rounded-xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
              placeholder={`${index + 1}`}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
