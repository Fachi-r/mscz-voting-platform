// src/lib/server/voting/cast-ballot.ts
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/auth.schema";
import { ballots, candidates, elections, polls, votes } from "../db/schema";

export type BallotErrorCode =
  | "VOTER_NOT_FOUND"
  | "NOT_VERIFIED"
  | "BANNED"
  | "ELECTION_NOT_FOUND"
  | "ELECTION_NOT_OPEN"
  | "INVALID_SELECTION"
  | "TOO_MANY_SELECTIONS"
  | "ALREADY_VOTED";

export class BallotError extends Error {
  constructor(
    public readonly code: BallotErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BallotError";
  }
}

export const BALLOT_ERROR_STATUS: Record<BallotErrorCode, number> = {
  VOTER_NOT_FOUND: 401,
  NOT_VERIFIED: 403,
  BANNED: 403,
  ELECTION_NOT_FOUND: 404,
  ELECTION_NOT_OPEN: 409,
  INVALID_SELECTION: 400,
  TOO_MANY_SELECTIONS: 400,
  ALREADY_VOTED: 409,
};

export interface CastBallotInput {
  userId: string;
  electionId: number;
  /**
   * pollId -> chosen candidateIds.
   * A poll that is missing, or has an empty array, counts as an abstention.
   */
  selections: Record<number, number[]>;
}

/**
 * Casts a complete ballot in ONE transaction: either the voter's ballots and all
 * their votes are recorded, or nothing is.
 *
 * The ballot consists of every poll in the election that has at least one candidate
 * with status = 'valid'. Positions with no valid candidates (empty, or elected
 * unopposed) are not on the ballot and get no ballot row.
 */
export async function castBallot({
  userId,
  electionId,
  selections,
}: CastBallotInput): Promise<void> {
  // 1. Shape validation (no DB needed)
  const chosen = new Map<number, number[]>();
  for (const [rawPollId, ids] of Object.entries(selections)) {
    const pollId = Number(rawPollId);
    if (
      !Number.isInteger(pollId) ||
      pollId <= 0 ||
      !Array.isArray(ids) ||
      !ids.every((id) => Number.isInteger(id) && id > 0)
    ) {
      throw new BallotError("INVALID_SELECTION", "Your selections could not be read.");
    }
    if (new Set(ids).size !== ids.length) {
      throw new BallotError("INVALID_SELECTION", "A candidate was selected more than once.");
    }
    chosen.set(pollId, ids);
  }

  await db.transaction(async (tx) => {
    // 2. Voter eligibility, read fresh from the DB (not the cached session)
    const [voter] = await tx
      .select({
        isVerified: user.isVerified,
        // user.banExpires is `timestamp without time zone` (UTC)
        isBanned: sql<boolean>`${user.banned} AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))`,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!voter) throw new BallotError("VOTER_NOT_FOUND", "Account not found.");
    if (voter.isBanned) throw new BallotError("BANNED", "This account is suspended.");
    if (!voter.isVerified) {
      throw new BallotError("NOT_VERIFIED", "Your membership has not been verified yet.");
    }

    // 3. Election must be open. DB clock + SHARE lock: voters don't block each
    //    other, but an admin closing the election (or editing it) waits for
    //    in-flight ballots.
    const [election] = await tx
      .select({
        isOpen: sql<boolean>`${elections.isClosed} = false AND now() >= ${elections.startsAt} AND now() < ${elections.endsAt}`,
      })
      .from(elections)
      .where(eq(elections.id, electionId))
      .for("share");

    if (!election) throw new BallotError("ELECTION_NOT_FOUND", "Election not found.");
    if (!election.isOpen) {
      throw new BallotError("ELECTION_NOT_OPEN", "This election is not open for voting.");
    }

    // 4. Work out the ballot: polls that have at least one VALID candidate
    const electionPolls = await tx
      .select({
        id: polls.id,
        position: polls.position,
        maxSelections: polls.maxSelections,
      })
      .from(polls)
      .where(eq(polls.electionId, electionId));

    const validCandidates = electionPolls.length
      ? await tx
          .select({ id: candidates.id, pollId: candidates.pollId })
          .from(candidates)
          .where(
            and(
              inArray(
                candidates.pollId,
                electionPolls.map((p) => p.id),
              ),
              eq(candidates.status, "valid"),
            ),
          )
      : [];

    const validPairs = new Set(validCandidates.map((c) => `${c.pollId}:${c.id}`));
    const pollsWithCandidates = new Set(validCandidates.map((c) => c.pollId));
    const ballotPolls = electionPolls.filter((p) => pollsWithCandidates.has(p.id));

    if (ballotPolls.length === 0) {
      throw new BallotError("ELECTION_NOT_FOUND", "There is nothing to vote on in this election.");
    }

    // Selections for a poll that isn't on the ballot are rejected (empty ones ignored)
    const ballotPollIds = new Set(ballotPolls.map((p) => p.id));
    for (const [pollId, ids] of chosen) {
      if (!ballotPollIds.has(pollId) && ids.length > 0) {
        throw new BallotError("INVALID_SELECTION", "Your selections include an unknown position.");
      }
    }

    // 5. Limits and candidate validity per poll
    for (const poll of ballotPolls) {
      const ids = chosen.get(poll.id) ?? [];
      if (ids.length > poll.maxSelections) {
        throw new BallotError(
          "TOO_MANY_SELECTIONS",
          `You can select at most ${poll.maxSelections} for ${poll.position}.`,
        );
      }
      for (const id of ids) {
        if (!validPairs.has(`${poll.id}:${id}`)) {
          throw new BallotError(
            "INVALID_SELECTION",
            `Invalid candidate selected for ${poll.position}.`,
          );
        }
      }
    }

    // 6. Participation: one ballot row per poll on the ballot, including abstentions.
    //    The unique (userId, pollId) index blocks double-voting, even concurrently.
    const inserted = await tx
      .insert(ballots)
      .values(ballotPolls.map((p) => ({ userId, pollId: p.id })))
      .onConflictDoNothing()
      .returning({ id: ballots.id });

    if (inserted.length !== ballotPolls.length) {
      throw new BallotError("ALREADY_VOTED", "You have already voted in this election.");
    }

    // 7. Choices, with no link back to the voter
    const voteRows = ballotPolls.flatMap((p) =>
      (chosen.get(p.id) ?? []).map((candidateId) => ({
        pollId: p.id,
        candidateId,
      })),
    );
    if (voteRows.length > 0) {
      await tx.insert(votes).values(voteRows);
    }
  });
}
