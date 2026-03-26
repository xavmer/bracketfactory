"use client";

import { Team } from "@/lib/bracket/models";

interface TeamEditorProps {
  teams: Team[];
  onChange: (teams: Team[]) => void;
  showColors?: boolean;
}

export function TeamEditor({ teams, onChange, showColors = false }: TeamEditorProps) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-line bg-white/80">
      <div
        className={[
          "grid items-center gap-2 border-b border-line/80 bg-mist/70 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500",
          "grid-cols-[56px_minmax(0,1fr)_56px]",
        ].join(" ")}
      >
        <span>Team</span>
        <span>Name</span>
        <span>Seed</span>
      </div>

      <div className="max-h-[640px] overflow-y-auto">
        {teams.map((team, index) => (
          <div
            key={team.id}
            className={[
              "grid items-center gap-2 px-3 py-2.5 transition",
              "border-t border-line/70 first:border-t-0",
              "hover:bg-mist/40",
              "grid-cols-[56px_minmax(0,1fr)_56px]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              {showColors ? (
                <label
                  className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm transition hover:scale-105"
                  style={{ backgroundColor: team.color ?? "#d8e3e1" }}
                >
                  <input
                    type="color"
                    value={team.color ?? "#0f766e"}
                    onChange={(event) => {
                      const nextTeams = teams.map((candidate) =>
                        candidate.id === team.id
                          ? {
                              ...candidate,
                              color: event.target.value,
                            }
                          : candidate,
                      );
                      onChange(nextTeams);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label={`Pick a color for ${team.name}`}
                  />
                </label>
              ) : null}
              <span>{index + 1}</span>
            </div>

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
              className="h-12 w-full min-w-0 rounded-[1.15rem] border border-line bg-white px-4 text-sm outline-none transition focus:border-accent"
              placeholder={`Team ${index + 1}`}
              aria-label={`Team ${index + 1} name`}
            />

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
              className="h-9 w-full rounded-lg border border-line bg-white px-2 text-center text-xs font-semibold outline-none transition focus:border-accent"
              placeholder={`${index + 1}`}
              aria-label={`Team ${index + 1} seed`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
