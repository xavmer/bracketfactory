"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Bracket, BracketSection, Team } from "@/lib/bracket/models";
import { MatchCard } from "@/components/match-card";

interface BracketBoardProps {
  bracket: Bracket;
  onPickWinner: (matchId: string, winnerId: string) => void;
  onClearWinner: (matchId: string) => void;
}

const sectionTitles: Record<BracketSection, string> = {
  winners: "Winners Bracket",
  losers: "Losers Bracket",
  grandFinal: "Finals",
};

interface ConnectorPath {
  path: string;
}

const MATCH_CARD_HEIGHT = 170;
const ROUND_MATCH_GAP = 18;
const ROUND_COLUMN_GAP = 56;

function getRoundLayout(roundIndex: number) {
  const unit = MATCH_CARD_HEIGHT + ROUND_MATCH_GAP;

  if (roundIndex === 0) {
    return {
      paddingTop: 0,
      gap: ROUND_MATCH_GAP,
    };
  }

  return {
    paddingTop: (unit * (2 ** roundIndex - 1)) / 2,
    gap: unit * 2 ** roundIndex - MATCH_CARD_HEIGHT,
  };
}

function getChampion(bracket: Bracket, teams: Team[]) {
  return teams.find((team) => team.id === bracket.championId) ?? null;
}

export const BracketBoard = forwardRef<HTMLDivElement, BracketBoardProps>(
  ({ bracket, onPickWinner, onClearWinner }, ref) => {
    const groupedRounds = useMemo(
      () =>
        bracket.rounds.reduce<Record<BracketSection, typeof bracket.rounds>>(
          (accumulator, round) => {
            accumulator[round.bracket].push(round);
            return accumulator;
          },
          {
            winners: [],
            losers: [],
            grandFinal: [],
          },
        ),
      [bracket.rounds],
    );

    const champion = getChampion(bracket, bracket.teams);
    const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sectionRefs = useRef<Record<BracketSection, HTMLDivElement | null>>({
      winners: null,
      losers: null,
      grandFinal: null,
    });
    const [connectors, setConnectors] = useState<Record<BracketSection, ConnectorPath[]>>({
      winners: [],
      losers: [],
      grandFinal: [],
    });

    useEffect(() => {
      const buildPaths = () => {
        const nextPaths: Record<BracketSection, ConnectorPath[]> = {
          winners: [],
          losers: [],
          grandFinal: [],
        };

        (Object.keys(groupedRounds) as BracketSection[]).forEach((section) => {
          const sectionElement = sectionRefs.current[section];

          if (!sectionElement) {
            return;
          }

          const sectionRect = sectionElement.getBoundingClientRect();

          groupedRounds[section].forEach((round) => {
            round.matchIds.forEach((matchId) => {
              const match = bracket.matches[matchId];
              const targetId = match.nextWinner?.matchId;

              if (!targetId) {
                return;
              }

              const targetMatch = bracket.matches[targetId];

              if (targetMatch.bracket !== section) {
                return;
              }

              const sourceElement = matchRefs.current[matchId];
              const targetElement = matchRefs.current[targetId];

              if (!sourceElement || !targetElement) {
                return;
              }

              const sourceRect = sourceElement.getBoundingClientRect();
              const targetRect = targetElement.getBoundingClientRect();
              const x1 = sourceRect.right - sectionRect.left;
              const y1 = sourceRect.top - sectionRect.top + sourceRect.height / 2;
              const x2 = targetRect.left - sectionRect.left;
              const y2 = targetRect.top - sectionRect.top + targetRect.height / 2;
              const midX = x1 + Math.max(24, (x2 - x1) / 2);

              nextPaths[section].push({
                path: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`,
              });
            });
          });
        });

        setConnectors(nextPaths);
      };

      const animationFrame = requestAnimationFrame(buildPaths);
      const observer = new ResizeObserver(buildPaths);

      (Object.values(sectionRefs.current) as Array<HTMLDivElement | null>).forEach((element) => {
        if (element) {
          observer.observe(element);
        }
      });

      Object.values(matchRefs.current).forEach((element) => {
        if (element) {
          observer.observe(element);
        }
      });

      window.addEventListener("resize", buildPaths);

      return () => {
        cancelAnimationFrame(animationFrame);
        observer.disconnect();
        window.removeEventListener("resize", buildPaths);
      };
    }, [bracket.matches, groupedRounds]);

    return (
      <div
        ref={ref}
        className="rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-panel backdrop-blur sm:p-6"
      >
        <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              {bracket.type === "single" ? "Single Elimination" : "Double Elimination"}
            </p>
            <h2 className="font-display text-3xl font-semibold text-ink">{bracket.name}</h2>
          </div>
          <div className="rounded-2xl border border-line bg-mist px-4 py-3 text-sm text-slate-600">
            {champion ? (
              <span>
                Champion: <strong className="text-ink">{champion.name}</strong>
              </span>
            ) : (
              <span>Pick winners to advance teams through the bracket.</span>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {(["winners", "losers", "grandFinal"] as BracketSection[]).map((section) => {
            if (groupedRounds[section].length === 0) {
              return null;
            }

            return (
              <section key={section} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {sectionTitles[section]}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {groupedRounds[section].length} rounds
                  </p>
                </div>
                <div className="bracket-scrollbar overflow-x-auto rounded-[1.5rem] border border-line/70 bg-mist/60 p-4 pb-3">
                  <div
                    ref={(node) => {
                      sectionRefs.current[section] = node;
                    }}
                    className="relative flex min-w-max items-start"
                    style={{ columnGap: `${ROUND_COLUMN_GAP}px` }}
                  >
                    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                      {connectors[section].map((connector, index) => (
                        <path
                          key={`${section}-connector-${index}`}
                          d={connector.path}
                          fill="none"
                          stroke="rgba(15, 118, 110, 0.4)"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                        />
                      ))}
                    </svg>
                    {groupedRounds[section].map((round, roundIndex) => {
                      const layout = getRoundLayout(roundIndex);

                      return (
                        <div key={round.id} className="min-w-[292px] space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                              {round.title}
                            </p>
                          </div>
                          <div
                            className="relative"
                            style={{
                              paddingTop: `${layout.paddingTop}px`,
                            }}
                          >
                            <div
                              className="flex flex-col"
                              style={{
                                rowGap: `${layout.gap}px`,
                              }}
                            >
                              {round.matchIds.map((matchId) => (
                                <div
                                  key={matchId}
                                  ref={(node) => {
                                    matchRefs.current[matchId] = node;
                                  }}
                                >
                                  <MatchCard
                                    match={bracket.matches[matchId]}
                                    teams={bracket.teams}
                                    onPickWinner={onPickWinner}
                                    onClearWinner={onClearWinner}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  },
);

BracketBoard.displayName = "BracketBoard";
