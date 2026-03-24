"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileJson, FileText, Trophy } from "lucide-react";
import { BracketBoard } from "@/components/bracket-board";
import { TeamEditor } from "@/components/team-editor";
import { Bracket, BracketDraft } from "@/lib/bracket/models";
import { generateBracket } from "@/lib/bracket/generation";
import { clearMatchWinner, setMatchWinner } from "@/lib/bracket/progression";
import { exportBracketJson, exportBracketPdf, exportBracketPng } from "@/lib/export";
import { loadState, saveState } from "@/lib/storage";
import {
  MAX_TEAM_COUNT,
  MIN_TEAM_COUNT,
  clampTeamCount,
  createId,
  createDraft,
  normalizeTeams,
} from "@/lib/bracket/utils";

export default function HomePage() {
  const [draft, setDraft] = useState<BracketDraft>(() => createDraft());
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [teamImportText, setTeamImportText] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadState();

    if (saved) {
      setDraft({
        ...saved.draft,
        regionCount: saved.draft.regionCount ?? 1,
        teams: normalizeTeams(saved.draft.teams, saved.draft.teamCount),
      });
      setBracket(saved.bracket);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveState({
      draft,
      bracket,
    });
  }, [bracket, draft, isHydrated]);

  const champion = useMemo(
    () => bracket?.teams.find((team) => team.id === bracket.championId) ?? null,
    [bracket],
  );
  const regionOptions = useMemo(() => {
    const options: number[] = [];

    for (let count = 1; count <= draft.teamCount; count *= 2) {
      if (draft.teamCount % count === 0) {
        options.push(count);
      }
    }

    return options;
  }, [draft.teamCount]);

  const exportDisabled = !bracket;

  const importTeams = () => {
    const importedNames = teamImportText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_TEAM_COUNT);

    if (importedNames.length < MIN_TEAM_COUNT) {
      return;
    }

    const teamCount = clampTeamCount(importedNames.length);
    const teams = importedNames.map((name, index) => ({
      id: createId("team"),
      name,
      seed: index + 1,
    }));
    const nextDraft = {
      ...draft,
      teamCount,
      regionCount:
        draft.type === "double"
          ? 1
          : regionOptions.includes(draft.regionCount) && teamCount % draft.regionCount === 0
            ? draft.regionCount
            : 1,
      teams,
    };

    setDraft(nextDraft);
    setBracket(generateBracket(nextDraft));
  };

  return (
    <main className="min-h-screen bg-grain">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:left-0 xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-panel backdrop-blur sm:p-7">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">
                  Bracket Factory
                </p>
                <h1 className="font-display text-4xl font-semibold leading-none text-ink sm:text-[3.25rem]">
                  Build better brackets.
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Set the format, seed the field, and export a polished bracket without
                  leaving the page.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.6rem] border border-line bg-mist px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Format
                  </p>
                  <p className="mt-3 text-lg font-semibold text-ink">
                    {draft.type === "single" ? "Single Elimination" : "Double Elimination"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Standard seeded layout with automatic winner advancement.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-line bg-mist px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Field Size
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-3xl font-semibold leading-none text-ink">{draft.teamCount}</p>
                    <p className="pb-1 text-sm font-medium text-slate-500">teams</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Flexible brackets from 2 to 128 teams with automatic byes.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 sm:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/70">
                        Current Champion
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-ink">
                        {champion?.name ?? "No Winner Yet"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {champion
                          ? "The bracket leader updates automatically as results advance."
                          : "Pick winners through the bracket and the champion will appear here."}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                      <Trophy className="h-5 w-5 text-accentWarm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Tournament Name
                  </span>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      {
                        const name = event.target.value;
                        setDraft((current) => ({
                          ...current,
                          name,
                        }));
                        setBracket((current) =>
                          current
                            ? {
                                ...current,
                                name,
                              }
                            : current,
                        );
                      }
                    }
                    className="w-full rounded-2xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Bracket Type
                    </span>
                    <select
                      value={draft.type}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          type: event.target.value as "single" | "double",
                          regionCount: event.target.value === "double" ? 1 : current.regionCount,
                        }))
                      }
                      className="w-full rounded-2xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
                    >
                      <option value="single">Single elimination</option>
                      <option value="double">Double elimination</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Team Count
                    </span>
                    <input
                      type="number"
                      min={MIN_TEAM_COUNT}
                      max={MAX_TEAM_COUNT}
                      value={draft.teamCount}
                      onChange={(event) => {
                        const teamCount = clampTeamCount(Number(event.target.value));
                        setDraft((current) => ({
                          ...current,
                          teamCount,
                          regionCount:
                            current.type === "double" ||
                            teamCount % current.regionCount !== 0 ||
                            (current.regionCount & (current.regionCount - 1)) !== 0
                              ? 1
                              : current.regionCount,
                          teams: normalizeTeams(current.teams, teamCount).map((team, index) => ({
                            ...team,
                            seed: team.seed ?? index + 1,
                          })),
                        }));
                        setBracket(null);
                      }}
                      className="w-full rounded-2xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Team Regions
                  </span>
                  <select
                    value={draft.type === "double" ? 1 : draft.regionCount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        regionCount: Number(event.target.value),
                      }))
                    }
                    disabled={draft.type === "double"}
                    className="w-full rounded-2xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {regionOptions.map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? "region" : "regions"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button
                  onClick={() =>
                    setBracket(
                      generateBracket({
                        ...draft,
                        teams: normalizeTeams(draft.teams, draft.teamCount),
                      }),
                    )
                  }
                  className="inline-flex items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Generate Bracket
                </button>
                <button
                  onClick={() => {
                    const nextDraft = createDraft(draft.teamCount);
                    setDraft({
                      ...nextDraft,
                      type: draft.type,
                    });
                    setBracket(null);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                >
                  Reset Draft
                </button>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-line bg-white/75 p-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-ink">Import Teams</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Paste one team per line. The list order becomes the seed order.
                  </p>
                </div>
                <textarea
                  value={teamImportText}
                  onChange={(event) => setTeamImportText(event.target.value)}
                  placeholder={`Duke\nKansas\nUConn\nPurdue`}
                  className="min-h-[132px] w-full rounded-2xl border border-line bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
                />
                <button
                  onClick={importTeams}
                  disabled={teamImportText.trim().split("\n").filter(Boolean).length < MIN_TEAM_COUNT}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import List And Generate
                </button>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-line bg-mist/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accentWarm" />
                  <p className="text-sm font-semibold text-ink">Team and seed inputs</p>
                </div>
                <TeamEditor
                  teams={normalizeTeams(draft.teams, draft.teamCount)}
                  onChange={(teams) => {
                    setDraft((current) => ({
                      ...current,
                      teams,
                    }));
                    setBracket((current) =>
                      current
                        ? {
                            ...current,
                            teams: normalizeTeams(teams, current.teamCount),
                          }
                        : current,
                    );
                  }}
                />
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-[2rem] border border-white/70 bg-white/60 p-4 shadow-panel backdrop-blur sm:p-5">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-[1.6rem] border border-line bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Workspace
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                    {bracket?.name ?? "Bracket Preview"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review rounds, pick winners, and export when the bracket looks right.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    disabled={exportDisabled}
                    onClick={() => bracket && exportBracketJson(bracket)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileJson className="h-4 w-4" />
                    Export JSON
                </button>
                <button
                  disabled={exportDisabled}
                  onClick={() =>
                    bracket && boardRef.current && exportBracketPng(boardRef.current, bracket)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileImage className="h-4 w-4" />
                    Export PNG
                </button>
                <button
                  disabled={exportDisabled}
                  onClick={() =>
                    bracket && boardRef.current && exportBracketPdf(boardRef.current, bracket)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              {bracket ? (
                <BracketBoard
                  ref={boardRef}
                  bracket={bracket}
                  onPickWinner={(matchId, winnerId) =>
                    setBracket((current) =>
                      current ? setMatchWinner(current, matchId, winnerId) : current,
                    )
                  }
                  onClearWinner={(matchId) =>
                    setBracket((current) =>
                      current ? clearMatchWinner(current, matchId) : current,
                    )
                  }
                />
              ) : (
                <div className="flex min-h-[560px] items-center justify-center rounded-[2rem] border border-dashed border-line bg-white/70 p-8 text-center">
                  <div className="max-w-md space-y-3">
                    <Download className="mx-auto h-8 w-8 text-slate-400" />
                    <h2 className="font-display text-2xl font-semibold text-ink">
                      Generate your first bracket
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Bracket Factory supports 2 to 128 teams, standard seeding, automatic
                      byes, winner advancement, and local saving.
                    </p>
                  </div>
                </div>
              )}

              {champion ? (
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                  Current champion: <strong>{champion.name}</strong>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
