// src/routes/elections/[id]/+page.server.ts
import { electionStatusSql } from "#lib/server/admin.ts";
import { db } from "#lib/server/db/index.ts";
import { ballots, candidates, elections, polls } from "#lib/server/db/schema.ts";
import { BALLOT_ERROR_STATUS, BallotError, castBallot } from "#lib/server/voting/cast-ballot.ts";
import { candidateName } from "#lib/server/voting/results.ts";
import { error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq, inArray } from "drizzle-orm";
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
      isClosed: elections.isClosed,
      status: electionStatusSql,
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

  // PRIVACY: only name, photo and qualification are exposed to voters.
  // NRC, address, membership evidence and signature never leave the server here.
  const rows = pollIds.length
    ? await db
        .select({
          id: candidates.id,
          pollId: candidates.pollId,
          surname: candidates.surname,
          givenNames: candidates.givenNames,
          image: candidates.image,
          highestQualification: candidates.highestQualification,
          status: candidates.status,
        })
        .from(candidates)
        .where(
          and(
            inArray(candidates.pollId, pollIds),
            inArray(candidates.status, ["valid", "elected_unopposed"]),
          ),
        )
        .orderBy(asc(candidates.id))
    : [];

  const toView = (c: (typeof rows)[number]) => ({
    id: c.id,
    name: candidateName(c),
    image: c.image,
    qualification: c.highestQualification,
  });

  // Ballot = polls with at least one VALID candidate (mirrors castBallot)
  const ballotPolls = electionPolls
    .map((p) => ({
      ...p,
      candidates: rows.filter((c) => c.pollId === p.id && c.status === "valid").map(toView),
    }))
    .filter((p) => p.candidates.length > 0);

  // Positions decided without a vote
  const unopposed = electionPolls
    .map((p) => ({
      id: p.id,
      position: p.position,
      candidates: rows
        .filter((c) => c.pollId === p.id && c.status === "elected_unopposed")
        .map(toView),
    }))
    .filter((p) => p.candidates.length > 0);

  const ballotPollIds = ballotPolls.map((p) => p.id);
  const [existingBallot] = ballotPollIds.length
    ? await db
        .select({ id: ballots.id })
        .from(ballots)
        .where(and(eq(ballots.userId, locals.user.id), inArray(ballots.pollId, ballotPollIds)))
        .limit(1)
    : [];

  return {
    election,
    polls: ballotPolls,
    unopposed,
    hasVoted: !!existingBallot,
    canVote: locals.user.isVerified && !locals.user.banned,
  };
};

export const actions: Actions = {
  /**
   * Expects form fields named `poll_<pollId>` (one per selected candidate).
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
