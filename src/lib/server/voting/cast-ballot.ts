// src/lib/server/voting/cast-ballot.ts
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/auth.schema";
import { elections, polls, candidates, ballots, votes } from "../db/schema";

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
 * Casts a complete ballot (every poll in the election) in ONE transaction:
 * either the voter's ballots and all their votes are recorded, or nothing is.
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
    //    other, but an admin closing the election waits for in-flight ballots.
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

    // 4. The polls that make up this ballot
    const electionPolls = await tx
      .select({
        id: polls.id,
        position: polls.position,
        maxSelections: polls.maxSelections,
      })
      .from(polls)
      .where(eq(polls.electionId, electionId));

    if (electionPolls.length === 0) {
      throw new BallotError("ELECTION_NOT_FOUND", "This election has no positions yet.");
    }

    const pollIds = new Set(electionPolls.map((p) => p.id));
    for (const pollId of chosen.keys()) {
      if (!pollIds.has(pollId)) {
        throw new BallotError("INVALID_SELECTION", "Your selections include an unknown position.");
      }
    }

    // 5. Every chosen candidate must belong to the poll it was chosen in
    const allChosenIds = [...chosen.values()].flat();
    const validPairs = new Set<string>();
    if (allChosenIds.length > 0) {
      const rows = await tx
        .select({ id: candidates.id, pollId: candidates.pollId })
        .from(candidates)
        .where(inArray(candidates.id, allChosenIds));
      for (const r of rows) validPairs.add(`${r.pollId}:${r.id}`);
    }

    for (const poll of electionPolls) {
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

    // 6. Participation: one ballot row per poll, including abstentions. The unique
    //    (userId, pollId) index makes double-voting impossible, even concurrently.
    const inserted = await tx
      .insert(ballots)
      .values(electionPolls.map((p) => ({ userId, pollId: p.id })))
      .onConflictDoNothing()
      .returning({ id: ballots.id });

    if (inserted.length !== electionPolls.length) {
      throw new BallotError("ALREADY_VOTED", "You have already voted in this election.");
    }

    // 7. Choices, with no link back to the voter
    const voteRows = electionPolls.flatMap((p) =>
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
