import { db } from "#lib/server/db/index.ts";
import { ballots, candidates, elections, polls } from "#lib/server/db/schema.js";
import { redirect } from "@sveltejs/kit";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { PageServerLoad } from "../$types";

export const load: PageServerLoad = async ({ locals }) => {
  // Adjust "/login" to wherever your sign-in page lives
  if (!locals.user) redirect(303, "/login");
  if (!locals.user.nrc) redirect(303, "/onboarding");

  const allElections = await db.select().from(elections).orderBy(elections.createdAt);

  const electionPolls = await db
    .select()
    .from(polls)
    .orderBy(asc(polls.displayOrder), asc(polls.id));

  const pollIds = electionPolls.map((p) => p.id);

  const pollCandidates = pollIds.length
    ? await db
        .select({
          id: candidates.id,
          pollId: candidates.pollId,
          surname: candidates.surname,
          givenNames: candidates.givenNames,
          image: candidates.image,
        })
        .from(candidates)
        .where(inArray(candidates.pollId, pollIds))
        .orderBy(asc(candidates.id))
    : [];

  const [existingBallot] = pollIds.length
    ? await db
        .select({ id: ballots.id })
        .from(ballots)
        .where(and(eq(ballots.userId, locals.user.id), inArray(ballots.pollId, pollIds)))
        .limit(1)
    : [];

  return {
    elections: allElections,
    polls: electionPolls.map((p) => ({
      ...p,
      candidates: pollCandidates.filter((c) => c.pollId === p.id),
    })),
    hasVoted: !!existingBallot,
    canVote: locals.user.isVerified && !locals.user.banned,
  };
};
