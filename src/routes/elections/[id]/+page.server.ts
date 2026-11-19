// src/routes/elections/[id]/+page.server.ts
import { db } from "#lib/server/db/index.ts";
import { ballots, candidates, elections, polls } from "#lib/server/db/schema.ts";
import { BALLOT_ERROR_STATUS, BallotError, castBallot } from "#lib/server/voting/cast-ballot.ts";
import { error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) error(404, "Election not found");
  return id;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  // Adjust "/login" to wherever your sign-in page lives
  if (!locals.user) redirect(303, "/login");
  if (!locals.user.nrc) redirect(303, "/onboarding");

  const electionId = parseId(params.id);

  const [election] = await db
    .select({
      id: elections.id,
      title: elections.title,
      description: elections.description,
      startsAt: elections.startsAt,
      endsAt: elections.endsAt,
      isOpen: sql<boolean>`${elections.isClosed} = false AND now() >= ${elections.startsAt} AND now() < ${elections.endsAt}`,
    })
    .from(elections)
    .where(eq(elections.id, electionId));

  if (!election) error(404, "Election not found");

  const electionPolls = await db
    .select({
      id: polls.id,
      position: polls.position,
      description: polls.description,
      maxSelections: polls.maxSelections,
    })
    .from(polls)
    .where(eq(polls.electionId, electionId))
    .orderBy(asc(polls.displayOrder), asc(polls.id));

  const pollIds = electionPolls.map((p) => p.id);

  const pollCandidates = pollIds.length
    ? await db
        .select({
          id: candidates.id,
          pollId: candidates.pollId,
          name: candidates.name,
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
    election,
    polls: electionPolls.map((p) => ({
      ...p,
      candidates: pollCandidates.filter((c) => c.pollId === p.id),
    })),
    hasVoted: !!existingBallot,
    canVote: locals.user.isVerified && !locals.user.banned,
  };
};

export const actions: Actions = {
  /**
   * Expects form fields named `poll_<pollId>`:
   *   - Chair / Deputy: radio inputs, name="poll_12", value=<candidateId>
   *   - Committee:      checkboxes,   name="poll_14", value=<candidateId> (repeat per candidate)
   * Unselected polls send no field at all, which counts as an abstention.
   */
  vote: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Please sign in to vote." });

    const electionId = parseId(params.id);
    const form = await request.formData();

    const selections: Record<number, number[]> = {};
    for (const key of new Set(form.keys())) {
      const match = /^poll_(\d+)$/.exec(key);
      if (!match) continue;
      selections[Number(match[1])] = form.getAll(key).map((v) => Number(v));
    }

    try {
      await castBallot({ userId: locals.user.id, electionId, selections });
    } catch (e) {
      if (e instanceof BallotError) {
        return fail(BALLOT_ERROR_STATUS[e.code], {
          message: e.message,
          code: e.code,
        });
      }
      console.error("Unexpected error casting ballot", e);
      return fail(500, {
        message: "Something went wrong. Your ballot was not recorded.",
      });
    }

    return { success: true };
  },
};
