import {
  Bracket,
  BracketDraft,
  Match,
  Round,
  Team,
} from "@/lib/bracket/models";
import {
  buildSeedOrder,
  clampTeamCount,
  createMatch,
  createParticipant,
  createRound,
  createId,
  getBracketSize,
  getRoundLabel,
  normalizeTeams,
  nowIso,
  sortTeamsForSeeding,
} from "@/lib/bracket/utils";
import { applyAutomaticAdvancements } from "@/lib/bracket/progression";

function placeTeamsBySeed(teams: Team[], teamCount: number) {
  const orderedTeams = sortTeamsForSeeding(normalizeTeams(teams, teamCount));
  const bracketSize = getBracketSize(teamCount);
  const seeds = buildSeedOrder(bracketSize);

  return seeds.map((seed) => orderedTeams[seed - 1] ?? null);
}

function createExpandedSingleEliminationRounds(teams: Team[], teamCount: number) {
  const bracketSize = getBracketSize(teamCount);
  const positions = placeTeamsBySeed(teams, teamCount);
  const matches: Record<string, Match> = {};
  const rounds: Round[] = [];
  let previousRoundMatches: Match[] = [];
  const totalRounds = Math.log2(bracketSize);

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const matchCount = bracketSize / 2 ** roundNumber;
    const currentRoundMatches: Match[] = [];

    for (let index = 0; index < matchCount; index += 1) {
      const isOpeningRound = roundNumber === 1;
      const match = createMatch({
        bracket: "winners",
        round: roundNumber,
        index,
        title: getRoundLabel("winners", roundNumber, totalRounds),
        participants: isOpeningRound
          ? [
              createParticipant({
                teamId: positions[index * 2]?.id ?? null,
                sourceType: "team",
                label: positions[index * 2] ? undefined : "Bye",
              }),
              createParticipant({
                teamId: positions[index * 2 + 1]?.id ?? null,
                sourceType: "team",
                label: positions[index * 2 + 1] ? undefined : "Bye",
              }),
            ]
          : [
              createParticipant({
                sourceType: "winner",
                sourceMatchId: previousRoundMatches[index * 2].id,
                label: "Winner",
              }),
              createParticipant({
                sourceType: "winner",
                sourceMatchId: previousRoundMatches[index * 2 + 1].id,
                label: "Winner",
              }),
            ],
      });

      matches[match.id] = match;
      currentRoundMatches.push(match);
    }

    if (roundNumber > 1) {
      previousRoundMatches.forEach((match, index) => {
        match.nextWinner = {
          matchId: currentRoundMatches[Math.floor(index / 2)].id,
          slot: (index % 2 === 0 ? 1 : 2) as 1 | 2,
        };
      });
    }

    rounds.push(
      createRound(
        "winners",
        roundNumber,
        getRoundLabel("winners", roundNumber, totalRounds),
        currentRoundMatches.map((match) => match.id),
      ),
    );
    previousRoundMatches = currentRoundMatches;
  }

  return { rounds, matches, finalMatchId: previousRoundMatches[0]?.id ?? null };
}

function createCompactSingleEliminationRounds(teams: Team[], teamCount: number) {
  const normalizedTeamCount = clampTeamCount(teamCount);
  const orderedTeams = sortTeamsForSeeding(normalizeTeams(teams, normalizedTeamCount));
  const mainBracketSize = 2 ** Math.floor(Math.log2(normalizedTeamCount));

  if (mainBracketSize === normalizedTeamCount) {
    return createExpandedSingleEliminationRounds(teams, normalizedTeamCount);
  }

  const matches: Record<string, Match> = {};
  const rounds: Round[] = [];
  const byeSeedsCount = mainBracketSize * 2 - normalizedTeamCount;
  const playInMatchCount = normalizedTeamCount - mainBracketSize;
  const totalRounds = Math.log2(mainBracketSize) + 1;
  const playInMatchesBySeedSlot = new Map<number, Match>();

  const playInMatches: Match[] = [];

  for (let seedSlot = byeSeedsCount + 1; seedSlot <= mainBracketSize; seedSlot += 1) {
    const lowSeed = normalizedTeamCount - (seedSlot - (byeSeedsCount + 1));
    const match = createMatch({
      bracket: "winners",
      round: 1,
      index: playInMatches.length,
      title: "Play-In Round",
      participants: [
        createParticipant({
          sourceType: "team",
          teamId: orderedTeams[seedSlot - 1]?.id ?? null,
        }),
        createParticipant({
          sourceType: "team",
          teamId: orderedTeams[lowSeed - 1]?.id ?? null,
        }),
      ],
    });

    matches[match.id] = match;
    playInMatches.push(match);
    playInMatchesBySeedSlot.set(seedSlot, match);
  }

  if (playInMatches.length > 0) {
    rounds.push(createRound("winners", 1, "Play-In Round", playInMatches.map((match) => match.id)));
  }

  const mainSeedOrder = buildSeedOrder(mainBracketSize);
  let previousRoundMatches: Match[] = [];
  const mainRounds = Math.log2(mainBracketSize);

  for (let mainRoundIndex = 1; mainRoundIndex <= mainRounds; mainRoundIndex += 1) {
    const actualRoundNumber = mainRoundIndex + 1;
    const matchCount = mainBracketSize / 2 ** mainRoundIndex;
    const currentRoundMatches: Match[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const match = createMatch({
        bracket: "winners",
        round: actualRoundNumber,
        index: matchIndex,
        title: getRoundLabel("winners", actualRoundNumber, totalRounds),
        participants:
          mainRoundIndex === 1
            ? [0, 1].map((slotOffset) => {
                const seedSlot = mainSeedOrder[matchIndex * 2 + slotOffset];

                if (seedSlot <= byeSeedsCount) {
                  return createParticipant({
                    sourceType: "team",
                    teamId: orderedTeams[seedSlot - 1]?.id ?? null,
                  });
                }

                const playInMatch = playInMatchesBySeedSlot.get(seedSlot);
                return createParticipant({
                  sourceType: "winner",
                  sourceMatchId: playInMatch?.id,
                  label: "Winner",
                });
              }) as [ReturnType<typeof createParticipant>, ReturnType<typeof createParticipant>]
            : [
                createParticipant({
                  sourceType: "winner",
                  sourceMatchId: previousRoundMatches[matchIndex * 2].id,
                  label: "Winner",
                }),
                createParticipant({
                  sourceType: "winner",
                  sourceMatchId: previousRoundMatches[matchIndex * 2 + 1].id,
                  label: "Winner",
                }),
              ],
      });

      matches[match.id] = match;
      currentRoundMatches.push(match);
    }

    if (mainRoundIndex === 1) {
      playInMatches.forEach((match) => {
        const target = currentRoundMatches.find((candidate) =>
          candidate.participants.some((participant) => participant.sourceMatchId === match.id),
        );

        if (target) {
          const slot = target.participants[0].sourceMatchId === match.id ? 1 : 2;
          match.nextWinner = { matchId: target.id, slot };
        }
      });
    } else {
      previousRoundMatches.forEach((match, index) => {
        match.nextWinner = {
          matchId: currentRoundMatches[Math.floor(index / 2)].id,
          slot: (index % 2 === 0 ? 1 : 2) as 1 | 2,
        };
      });
    }

    rounds.push(
      createRound(
        "winners",
        actualRoundNumber,
        getRoundLabel("winners", actualRoundNumber, totalRounds),
        currentRoundMatches.map((match) => match.id),
      ),
    );
    previousRoundMatches = currentRoundMatches;
  }

  return { rounds, matches, finalMatchId: previousRoundMatches[0]?.id ?? null };
}

function buildLosersRoundMatchCounts(teamCount: number) {
  const winnersRounds = Math.log2(getBracketSize(teamCount));
  const counts: number[] = [];

  for (let winnersRound = 1; winnersRound <= winnersRounds - 1; winnersRound += 1) {
    const count = getBracketSize(teamCount) / 2 ** (winnersRound + 1);
    counts.push(count, count);
  }

  return counts;
}

function createDoubleEliminationRounds(teams: Team[], teamCount: number) {
  const bracketSize = getBracketSize(teamCount);

  if (bracketSize === 2) {
    const winners = createExpandedSingleEliminationRounds(teams, teamCount);
    const rounds = [...winners.rounds];
    const matches = { ...winners.matches };
    const openingMatch = matches[rounds[0].matchIds[0]];
    const grandFinal = createMatch({
      bracket: "grandFinal",
      round: 1,
      index: 0,
      title: "Grand Final",
      participants: [
        createParticipant({
          sourceType: "winner",
          sourceMatchId: openingMatch.id,
          label: "Winners Champion",
        }),
        createParticipant({
          sourceType: "loser",
          sourceMatchId: openingMatch.id,
          label: "Challenger",
        }),
      ],
    });
    const reset = createMatch({
      bracket: "grandFinal",
      round: 2,
      index: 0,
      title: "Grand Final Reset",
      participants: [
        createParticipant({
          sourceType: "winner",
          sourceMatchId: grandFinal.id,
          label: "Final Winner",
        }),
        createParticipant({
          sourceType: "loser",
          sourceMatchId: grandFinal.id,
          label: "Reset Opponent",
        }),
      ],
    });

    openingMatch.nextWinner = { matchId: grandFinal.id, slot: 1 };
    openingMatch.nextLoser = { matchId: grandFinal.id, slot: 2 };
    grandFinal.nextWinner = { matchId: reset.id, slot: 1 };
    grandFinal.nextLoser = { matchId: reset.id, slot: 2 };

    matches[grandFinal.id] = grandFinal;
    matches[reset.id] = reset;
    rounds.push(createRound("grandFinal", 1, "Grand Final", [grandFinal.id]));
    rounds.push(createRound("grandFinal", 2, "Grand Final Reset", [reset.id]));

    return { rounds, matches, finalMatchId: reset.id, grandFinalId: grandFinal.id };
  }

  const winners = createExpandedSingleEliminationRounds(teams, teamCount);
  const rounds = [...winners.rounds];
  const matches = { ...winners.matches };
  const winnersRoundIds = rounds.filter((round) => round.bracket === "winners");
  const losersRoundCounts = buildLosersRoundMatchCounts(teamCount);
  const losersRounds: Match[][] = [];

  losersRoundCounts.forEach((matchCount, index) => {
    const roundNumber = index + 1;
    const totalRounds = losersRoundCounts.length;
    const currentRoundMatches: Match[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const match = createMatch({
        bracket: "losers",
        round: roundNumber,
        index: matchIndex,
        title: getRoundLabel("losers", roundNumber, totalRounds),
        participants: [createParticipant(), createParticipant()],
      });

      matches[match.id] = match;
      currentRoundMatches.push(match);
    }

    losersRounds.push(currentRoundMatches);
    rounds.push(
      createRound(
        "losers",
        roundNumber,
        getRoundLabel("losers", roundNumber, totalRounds),
        currentRoundMatches.map((match) => match.id),
      ),
    );
  });

  const winnersMatchesByRound = winnersRoundIds.map((round) =>
    round.matchIds.map((matchId) => matches[matchId]),
  );

  if (losersRounds[0]) {
    const openingWinnersRound = winnersMatchesByRound[0];
    losersRounds[0].forEach((match, index) => {
      const leftSource = openingWinnersRound[index * 2];
      const rightSource = openingWinnersRound[index * 2 + 1];

      match.participants[0] = createParticipant({
        sourceType: "loser",
        sourceMatchId: leftSource.id,
        label: "Loser",
      });
      match.participants[1] = createParticipant({
        sourceType: "loser",
        sourceMatchId: rightSource.id,
        label: "Loser",
      });

      leftSource.nextLoser = { matchId: match.id, slot: 1 };
      rightSource.nextLoser = { matchId: match.id, slot: 2 };
    });
  }

  for (let roundIndex = 1; roundIndex < losersRounds.length; roundIndex += 1) {
    const current = losersRounds[roundIndex];
    const previous = losersRounds[roundIndex - 1];
    const isMergeRound = roundIndex % 2 === 1;

    if (isMergeRound) {
      const incomingWinnersRound = winnersMatchesByRound[Math.floor(roundIndex / 2) + 1];

      current.forEach((match, index) => {
        const previousMatch = previous[index];
        const winnersSource = incomingWinnersRound[index];

        match.participants[0] = createParticipant({
          sourceType: "winner",
          sourceMatchId: previousMatch.id,
          label: "Winner",
        });
        match.participants[1] = createParticipant({
          sourceType: "loser",
          sourceMatchId: winnersSource.id,
          label: "Loser",
        });

        previousMatch.nextWinner = { matchId: match.id, slot: 1 };
        winnersSource.nextLoser = { matchId: match.id, slot: 2 };
      });
    } else {
      current.forEach((match, index) => {
        const leftSource = previous[index * 2];
        const rightSource = previous[index * 2 + 1];

        match.participants[0] = createParticipant({
          sourceType: "winner",
          sourceMatchId: leftSource.id,
          label: "Winner",
        });
        match.participants[1] = createParticipant({
          sourceType: "winner",
          sourceMatchId: rightSource.id,
          label: "Winner",
        });

        leftSource.nextWinner = { matchId: match.id, slot: 1 };
        rightSource.nextWinner = { matchId: match.id, slot: 2 };
      });
    }
  }

  const winnersFinal = winnersMatchesByRound[winnersMatchesByRound.length - 1][0];
  const losersFinal = losersRounds[losersRounds.length - 1][0];
  const grandFinal = createMatch({
    bracket: "grandFinal",
    round: 1,
    index: 0,
    title: "Grand Final",
    participants: [
      createParticipant({
        sourceType: "winner",
        sourceMatchId: winnersFinal.id,
        label: "Winners Champion",
      }),
      createParticipant({
        sourceType: "winner",
        sourceMatchId: losersFinal.id,
        label: "Losers Champion",
      }),
    ],
  });

  const grandFinalReset = createMatch({
    bracket: "grandFinal",
    round: 2,
    index: 0,
    title: "Grand Final Reset",
    participants: [
      createParticipant({
        sourceType: "winner",
        sourceMatchId: grandFinal.id,
        label: "Grand Finalist",
      }),
      createParticipant({
        sourceType: "loser",
        sourceMatchId: grandFinal.id,
        label: "Reset Opponent",
      }),
    ],
  });

  winnersFinal.nextWinner = { matchId: grandFinal.id, slot: 1 };
  losersFinal.nextWinner = { matchId: grandFinal.id, slot: 2 };
  grandFinal.nextWinner = { matchId: grandFinalReset.id, slot: 1 };
  grandFinal.nextLoser = { matchId: grandFinalReset.id, slot: 2 };

  matches[grandFinal.id] = grandFinal;
  matches[grandFinalReset.id] = grandFinalReset;

  rounds.push(createRound("grandFinal", 1, "Grand Final", [grandFinal.id]));
  rounds.push(createRound("grandFinal", 2, "Grand Final Reset", [grandFinalReset.id]));

  return { rounds, matches, finalMatchId: grandFinalReset.id, grandFinalId: grandFinal.id };
}

export function generateBracket(draft: BracketDraft): Bracket {
  const teamCount = clampTeamCount(draft.teamCount);
  const teams = normalizeTeams(draft.teams, teamCount);
  const createdAt = nowIso();
  const base = {
    id: createId("bracket"),
    name: draft.name.trim() || "Untitled Tournament",
    type: draft.type,
    teamCount,
    teams,
    championId: null,
    createdAt,
    updatedAt: createdAt,
  };

  if (draft.type === "single") {
    const single = createCompactSingleEliminationRounds(teams, teamCount);
    return applyAutomaticAdvancements({
      ...base,
      rounds: single.rounds,
      matches: single.matches,
    });
  }

  const double = createDoubleEliminationRounds(teams, teamCount);
  return applyAutomaticAdvancements({
    ...base,
    rounds: double.rounds,
    matches: double.matches,
  });
}
