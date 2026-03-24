import { Bracket, Match, MatchParticipant } from "@/lib/bracket/models";
import { cloneBracket, nowIso } from "@/lib/bracket/utils";

function getParticipantTeamId(participant: MatchParticipant) {
  return participant.teamId;
}

function clearMatchOutcome(match: Match) {
  match.winnerId = null;
  match.loserId = null;
}

function propagateTeam(
  bracket: Bracket,
  matchId: string | undefined,
  slot: 1 | 2 | undefined,
  teamId: string | null,
) {
  if (!matchId || !slot) {
    return;
  }

  const target = bracket.matches[matchId];
  target.participants[slot - 1].teamId = teamId;
  clearMatchOutcome(target);

  if (target.nextWinner) {
    propagateTeam(bracket, target.nextWinner.matchId, target.nextWinner.slot, null);
  }

  if (target.nextLoser) {
    propagateTeam(bracket, target.nextLoser.matchId, target.nextLoser.slot, null);
  }
}

function syncDerivedSlots(bracket: Bracket) {
  Object.values(bracket.matches).forEach((match) => {
    match.participants.forEach((participant) => {
      if (!participant.sourceMatchId) {
        return;
      }

      const source = bracket.matches[participant.sourceMatchId];
      participant.teamId =
        participant.sourceType === "winner" ? source.winnerId : source.loserId;
    });
  });
}

export function applyAutomaticAdvancements(bracket: Bracket) {
  let changed = true;

  while (changed) {
    changed = false;
    syncDerivedSlots(bracket);

    Object.values(bracket.matches).forEach((match) => {
      if (match.winnerId) {
        return;
      }

      const [leftId, rightId] = match.participants.map((participant) => participant.teamId);

      if ((leftId && rightId) || (!leftId && !rightId)) {
        return;
      }

      match.winnerId = leftId ?? rightId ?? null;
      match.loserId = leftId && rightId ? null : null;

      if (match.nextWinner) {
        propagateTeam(bracket, match.nextWinner.matchId, match.nextWinner.slot, match.winnerId);
      }

      if (match.nextLoser) {
        propagateTeam(bracket, match.nextLoser.matchId, match.nextLoser.slot, null);
      }

      changed = true;
    });
  }

  return bracket;
}

export function updateTeam(
  bracket: Bracket,
  teamId: string,
  updates: { name?: string; seed?: number | undefined },
) {
  const next = cloneBracket(bracket);
  next.teams = next.teams.map((team) =>
    team.id === teamId
      ? {
          ...team,
          ...updates,
        }
      : team,
  );
  next.updatedAt = nowIso();
  return next;
}

export function setMatchWinner(bracket: Bracket, matchId: string, winnerId: string) {
  const next = cloneBracket(bracket);
  const match = next.matches[matchId];
  const participantIds = [
    getParticipantTeamId(match.participants[0]),
    getParticipantTeamId(match.participants[1]),
  ];

  if (!participantIds.includes(winnerId)) {
    return next;
  }

  match.winnerId = winnerId;
  match.loserId = participantIds.find((teamId) => teamId && teamId !== winnerId) ?? null;

  if (match.nextWinner) {
    propagateTeam(next, match.nextWinner.matchId, match.nextWinner.slot, match.winnerId);
  }

  if (match.nextLoser) {
    propagateTeam(next, match.nextLoser.matchId, match.nextLoser.slot, match.loserId);
  }

  applyAutomaticAdvancements(next);

  const grandFinal = Object.values(next.matches).find(
    (candidate) => candidate.bracket === "grandFinal" && candidate.round === 1,
  );
  const reset = Object.values(next.matches).find(
    (candidate) => candidate.bracket === "grandFinal" && candidate.round === 2,
  );

  if (grandFinal && reset) {
    const winnersChampion = grandFinal.participants[0].teamId;
    const grandFinalWinner = grandFinal.winnerId;
    const resetShouldBeActive =
      grandFinalWinner !== null && winnersChampion !== null && grandFinalWinner !== winnersChampion;

    if (!resetShouldBeActive) {
      reset.participants[0].teamId = null;
      reset.participants[1].teamId = null;
      reset.winnerId = null;
      reset.loserId = null;
    }
  }

  const grandFinalReset = Object.values(next.matches).find(
    (candidate) => candidate.bracket === "grandFinal" && candidate.round === 2,
  );

  if (grandFinalReset?.winnerId) {
    next.championId = grandFinalReset.winnerId;
  } else if (grandFinal?.winnerId) {
    const winnersChampion = grandFinal.participants[0].teamId;
    next.championId = grandFinal.winnerId === winnersChampion ? grandFinal.winnerId : null;
  } else {
    const singleFinal = Object.values(next.matches)
      .filter((candidate) => candidate.bracket === "winners")
      .sort((left, right) => right.round - left.round)[0];
    next.championId = singleFinal?.winnerId ?? null;
  }

  next.updatedAt = nowIso();
  return next;
}

export function clearMatchWinner(bracket: Bracket, matchId: string) {
  const next = cloneBracket(bracket);
  const match = next.matches[matchId];

  clearMatchOutcome(match);
  if (match.nextWinner) {
    propagateTeam(next, match.nextWinner.matchId, match.nextWinner.slot, null);
  }

  if (match.nextLoser) {
    propagateTeam(next, match.nextLoser.matchId, match.nextLoser.slot, null);
  }

  applyAutomaticAdvancements(next);
  next.championId = null;
  next.updatedAt = nowIso();
  return next;
}
