"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Bracket, Team } from "@/lib/bracket/models";
import { MatchCard } from "@/components/match-card";

interface BracketBoardProps {
  bracket: Bracket;
  onPickWinner: (matchId: string, winnerId: string) => void;
  onClearWinner: (matchId: string) => void;
}

interface ConnectorPath {
  path: string;
}

interface RoundGroup {
  key: string;
  title: string;
  rounds: Bracket["rounds"];
}

const MATCH_CARD_HEIGHT = 170;
const ROUND_MATCH_GAP = 18;
const ROUND_COLUMN_GAP = 56;
const MATCH_SLOT_CENTER_Y: Record<1 | 2, number> = {
  1: 56,
  2: 120,
};

function getSectionRoundPositions(
  rounds: Bracket["rounds"],
  matches: Bracket["matches"],
) {
  const positionsByRoundId: Record<string, number[]> = {};
  const positionsByMatchId: Record<string, number> = {};
  const minimumSpacing = MATCH_CARD_HEIGHT + ROUND_MATCH_GAP;
  const lastRound = rounds[rounds.length - 1];

  if (!lastRound) {
    return { positionsByRoundId, sectionHeight: MATCH_CARD_HEIGHT };
  }

  lastRound.matchIds.forEach((matchId, index) => {
    positionsByMatchId[matchId] = index * (MATCH_CARD_HEIGHT + ROUND_MATCH_GAP);
  });

  for (let roundIndex = rounds.length - 2; roundIndex >= 0; roundIndex -= 1) {
    const round = rounds[roundIndex];
    const desiredPositions = round.matchIds.map((matchId) => {
      const match = matches[matchId];
      const target = match.nextWinner ? matches[match.nextWinner.matchId] : null;

      if (!target || target.groupKey !== round.groupKey) {
        return 0;
      }

      const targetTop = positionsByMatchId[target.id] ?? 0;
      return targetTop + MATCH_SLOT_CENTER_Y[match.nextWinner?.slot ?? 1] - MATCH_CARD_HEIGHT / 2;
    });

    const sortedByDesiredTop = round.matchIds
      .map((matchId, index) => ({
        matchId,
        desiredTop: desiredPositions[index],
      }))
      .sort((left, right) => left.desiredTop - right.desiredTop);

    const transformed = sortedByDesiredTop.map((item, index) => item.desiredTop - index * minimumSpacing);
    const blocks: Array<{ start: number; end: number; value: number }> = [];

    transformed.forEach((value, index) => {
      blocks.push({ start: index, end: index, value });

      while (
        blocks.length > 1 &&
        blocks[blocks.length - 2].value > blocks[blocks.length - 1].value
      ) {
        const right = blocks.pop()!;
        const left = blocks.pop()!;
        const leftCount = left.end - left.start + 1;
        const rightCount = right.end - right.start + 1;
        blocks.push({
          start: left.start,
          end: right.end,
          value: (left.value * leftCount + right.value * rightCount) / (leftCount + rightCount),
        });
      }
    });

    const adjustedBase: number[] = Array.from({ length: sortedByDesiredTop.length }, () => 0);
    blocks.forEach((block) => {
      for (let index = block.start; index <= block.end; index += 1) {
        adjustedBase[index] = block.value;
      }
    });

    sortedByDesiredTop.forEach((item, index) => {
      positionsByMatchId[item.matchId] = adjustedBase[index] + index * minimumSpacing;
    });
  }

  const minimumTop = Math.min(...Object.values(positionsByMatchId), 0);

  rounds.forEach((round) => {
    positionsByRoundId[round.id] = round.matchIds.map(
      (matchId) => (positionsByMatchId[matchId] ?? 0) - minimumTop,
    );
  });

  const sectionHeight = Math.max(
    ...rounds.flatMap((round) =>
      (positionsByRoundId[round.id] ?? []).map((position) => position + MATCH_CARD_HEIGHT),
    ),
    MATCH_CARD_HEIGHT,
  );

  return { positionsByRoundId, sectionHeight };
}

function getChampion(bracket: Bracket, teams: Team[]) {
  return teams.find((team) => team.id === bracket.championId) ?? null;
}

export const BracketBoard = forwardRef<HTMLDivElement, BracketBoardProps>(
  ({ bracket, onPickWinner, onClearWinner }, ref) => {
    const groupedRounds = useMemo<RoundGroup[]>(
      () =>
        bracket.rounds.reduce<RoundGroup[]>((accumulator, round) => {
          const existing = accumulator.find((group) => group.key === round.groupKey);

          if (existing) {
            existing.rounds.push(round);
            return accumulator;
          }

          accumulator.push({
            key: round.groupKey,
            title: round.groupTitle,
            rounds: [round],
          });
          return accumulator;
        }, []),
      [bracket.rounds],
    );

    const champion = getChampion(bracket, bracket.teams);
    const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [connectors, setConnectors] = useState<Record<string, ConnectorPath[]>>({});

    useEffect(() => {
      const buildPaths = () => {
        const nextPaths: Record<string, ConnectorPath[]> = {};

        groupedRounds.forEach((group) => {
          const sectionElement = sectionRefs.current[group.key];

          if (!sectionElement) {
            return;
          }

          const sectionRect = sectionElement.getBoundingClientRect();
          nextPaths[group.key] = [];

          group.rounds.forEach((round) => {
            round.matchIds.forEach((matchId) => {
              const match = bracket.matches[matchId];
              const targetId = match.nextWinner?.matchId;

              if (!targetId) {
                return;
              }

              const targetMatch = bracket.matches[targetId];

              if (targetMatch.groupKey !== group.key) {
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
              const y2 =
                targetRect.top -
                sectionRect.top +
                MATCH_SLOT_CENTER_Y[match.nextWinner?.slot ?? 1];
              const midX = x1 + Math.max(24, (x2 - x1) / 2);

              nextPaths[group.key].push({
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
          {groupedRounds.map((group) => {
            if (group.rounds.length === 0) {
              return null;
            }

            const { positionsByRoundId, sectionHeight } = getSectionRoundPositions(
              group.rounds,
              bracket.matches,
            );

            return (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {group.title}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {group.rounds.length} rounds
                  </p>
                </div>
                <div className="bracket-scrollbar overflow-x-auto rounded-[1.5rem] border border-line/70 bg-mist/60 p-4 pb-3">
                  <div
                    ref={(node) => {
                      sectionRefs.current[group.key] = node;
                    }}
                    className="relative flex min-w-max items-start"
                    style={{ columnGap: `${ROUND_COLUMN_GAP}px` }}
                  >
                    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                      {(connectors[group.key] ?? []).map((connector, index) => (
                        <path
                          key={`${group.key}-connector-${index}`}
                          d={connector.path}
                          fill="none"
                          stroke="rgba(15, 118, 110, 0.4)"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                        />
                      ))}
                    </svg>
                    {group.rounds.map((round) => {
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
                              height: `${sectionHeight}px`,
                            }}
                          >
                            {round.matchIds.map((matchId, matchIndex) => (
                              <div
                                key={matchId}
                                ref={(node) => {
                                  matchRefs.current[matchId] = node;
                                }}
                                className="absolute left-0"
                                style={{
                                  top: `${positionsByRoundId[round.id][matchIndex] ?? 0}px`,
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
