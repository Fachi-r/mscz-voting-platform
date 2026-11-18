import { db } from "#lib/server/db/index.ts";
import { ballots, candidates, polls, user, votes } from "#lib/server/db/schema.ts";
import { and, eq, sql } from "drizzle-orm";

export type VoteErrorCode =
  | "VOTER_NOT_FOUND"
  | "NOT_VERIFIED"
  | "BANNED"
  | "POLL_NOT_FOUND"
  | "POLL_NOT_OPEN"
  | "BAD_CANDIDATE"
  | "ALREADY_VOTED";

export class VoteError extends Error {
  constructor(
    public readonly code: VoteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VoteError";
  }
}

export const VOTE_ERROR_STATUS: Record<VoteErrorCode, number> = {
  VOTER_NOT_FOUND: 401,
  NOT_VERIFIED: 403,
  BANNED: 403,
  POLL_NOT_FOUND: 404,
  POLL_NOT_OPEN: 409,
  BAD_CANDIDATE: 400,
  ALREADY_VOTED: 409,
};

interface CastVoteInput {
  userId: string;
  pollId: number;
  candidateId: number;
}

/**
 * Casts one vote atomically. Everything below runs in a single transaction:
 * any thrown VoteError rolls back, so a ballot never exists without its vote
 * (or vice versa).
 *
 * Voter eligibility is read fresh from the DB, NOT from the session, so a ban or
 * un-verification takes effect immediately even if the session is cached.
 */
export async function castVote({ userId, pollId, candidateId }: CastVoteInput): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Voter eligibility
    const [voter] = await tx
      .select({
        isVerified: user.isVerified,
        // user.banExpires is `timestamp without time zone` (UTC), so compare against UTC now
        isBanned: sql<boolean>`${user.banned} AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))`,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!voter) throw new VoteError("VOTER_NOT_FOUND", "Account not found.");
    if (voter.isBanned) throw new VoteError("BANNED", "This account is suspended.");
    if (!voter.isVerified) {
      throw new VoteError("NOT_VERIFIED", "Your membership has not been verified yet.");
    }

    // 2. Poll must be open. Uses the DB clock (not the app server's) and a SHARE lock:
    //    voters don't block each other, but an admin closing the poll (UPDATE) waits
    //    for in-flight votes, and later voters see isClosed = true.
    const [poll] = await tx
      .select({
        isOpen: sql<boolean>`${polls.isClosed} = false AND now() >= ${polls.startsAt} AND now() < ${polls.endsAt}`,
      })
      .from(polls)
      .where(eq(polls.id, pollId))
      .for("share");

    if (!poll) throw new VoteError("POLL_NOT_FOUND", "Poll not found.");
    if (!poll.isOpen) throw new VoteError("POLL_NOT_OPEN", "This poll is not open for voting.");

    // 3. Candidate must belong to this poll (the composite FK also enforces this;
    //    checking first gives a clean error instead of a constraint violation)
    const [candidate] = await tx
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, candidateId), eq(candidates.pollId, pollId)));

    if (!candidate) throw new VoteError("BAD_CANDIDATE", "Invalid candidate for this poll.");

    // 4. Record participation. The unique (userId, pollId) index makes double-voting
    //    impossible even under concurrent requests.
    const inserted = await tx
      .insert(ballots)
      .values({ userId, pollId })
      .onConflictDoNothing()
      .returning({ id: ballots.id });

    if (inserted.length === 0) {
      throw new VoteError("ALREADY_VOTED", "You have already voted in this poll.");
    }

    // 5. Record the choice, with no link back to the voter
    await tx.insert(votes).values({ pollId, candidateId });
  });
}
