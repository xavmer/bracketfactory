import {
  Bracket,
  BracketDraft,
  Match,
  Round,
  Team,
} from "@/lib/bracket/models";
import {
  buildSeedOrder,
  createMatch,
  createParticipant,
  createRound,
  createId,
  getRoundLabel,
  normalizeTeams,
  nowIso,
  sortTeamsForSeeding,
} from "@/lib/bracket/utils";

function placeTeamsBySeed(teams: Team[], teamCount: number) {
  const orderedTeams = sortTeamsForSeeding(normalizeTeams(teams, teamCount));
  const seeds = buildSeedOrder(teamCount);

  return seeds.map((seed) => orderedTeams[seed - 1] ?? null);
}

function createSingleEliminationRounds(teams: Team[], teamCount: number) {
  const positions = placeTeamsBySeed(teams, teamCount);
  const matches: Record<string, Match> = {};
  const rounds: Round[] = [];
  let previousRoundMatches: Match[] = [];
  const totalRounds = Math.log2(teamCount);

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const matchCount = teamCount / 2 ** roundNumber;
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
              }),
              createParticipant({
                teamId: positions[index * 2 + 1]?.id ?? null,
                sourceType: "team",
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

function buildLosersRoundMatchCounts(teamCount: number) {
  const winnersRounds = Math.log2(teamCount);
  const counts: number[] = [];

  for (let winnersRound = 1; winnersRound <= winnersRounds - 1; winnersRound += 1) {
    const count = teamCount / 2 ** (winnersRound + 1);
    counts.push(count, count);
  }

  return counts;
}

function createDoubleEliminationRounds(teams: Team[], teamCount: number) {
  const winners = createSingleEliminationRounds(teams, teamCount);
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
  const teams = normalizeTeams(draft.teams, draft.teamCount);
  const createdAt = nowIso();
  const base = {
    id: createId("bracket"),
    name: draft.name.trim() || "Untitled Tournament",
    type: draft.type,
    teamCount: draft.teamCount,
    teams,
    championId: null,
    createdAt,
    updatedAt: createdAt,
  };

  if (draft.type === "single") {
    const single = createSingleEliminationRounds(teams, draft.teamCount);
    return {
      ...base,
      rounds: single.rounds,
      matches: single.matches,
    };
  }

  const double = createDoubleEliminationRounds(teams, draft.teamCount);
  return {
    ...base,
    rounds: double.rounds,
    matches: double.matches,
  };
}
