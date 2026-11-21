// src/routes/elections/+page.server.ts
import { electionStatusSql } from "#lib/server/admin.ts";
import { db } from "#lib/server/db/index.ts";
import { ballots, elections, polls } from "#lib/server/db/schema.ts";
import { redirect } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // Adjust "/login" to wherever your sign-in page lives
  if (!locals.user) redirect(303, "/login");

  const list = await db
    .select({
      id: elections.id,
      title: elections.title,
      startsAt: elections.startsAt,
      endsAt: elections.endsAt,
      status: electionStatusSql,
    })
    .from(elections)
    .orderBy(desc(elections.startsAt));

  const votedIn = await db
    .selectDistinct({ electionId: polls.electionId })
    .from(ballots)
    .innerJoin(polls, eq(ballots.pollId, polls.id))
    .where(eq(ballots.userId, locals.user.id));

  const votedSet = new Set(votedIn.map((v) => v.electionId));

  return {
    elections: list.map((e) => ({ ...e, hasVoted: votedSet.has(e.id) })),
    needsNrc: !locals.user.nrc,
    isVerified: locals.user.isVerified,
  };
};
