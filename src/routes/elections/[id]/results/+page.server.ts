// src/routes/elections/[id]/results/+page.server.ts
import { db } from "#lib/server/db/index.ts";
import { elections } from "#lib/server/db/schema.ts";
import { loadElectionResults } from "#lib/server/voting/results.ts";
import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  // Adjust "/login" to wherever your sign-in page lives
  if (!locals.user) redirect(303, "/login");

  const electionId = Number(params.id);
  if (!Number.isInteger(electionId) || electionId <= 0) error(404, "Election not found");

  const [election] = await db
    .select({
      id: elections.id,
      title: elections.title,
      isClosed: elections.isClosed,
    })
    .from(elections)
    .where(eq(elections.id, electionId));

  if (!election) error(404, "Election not found");

  // Tallies are never exposed while voting is open or the election isn't closed
  if (!election.isClosed) redirect(303, `/elections/${electionId}`);

  const results = await loadElectionResults(electionId);

  return {
    election: { id: election.id, title: election.title },
    // Voters get the public result only; integrity-audit flags are admin-only
    results: results.map(({ auditOk: _auditOk, ...rest }) => rest),
  };
};
