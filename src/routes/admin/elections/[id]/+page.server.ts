// src/routes/admin/elections/[id]/+page.server.ts
import {
  electionStatusSql,
  getPgErrorCode,
  parseLusakaLocal,
  requireAdmin,
  toLusakaInput,
} from "#lib/server/admin.ts";
import { user } from "#lib/server/db/auth.schema.ts";
import { db } from "#lib/server/db/index.ts";
import { ballots, candidates, elections, polls } from "#lib/server/db/schema.ts";
import { candidateName, loadElectionResults } from "#lib/server/voting/results.ts";
import { error, fail } from "@sveltejs/kit";
import { and, asc, count, countDistinct, eq, inArray, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const NRC_PATTERN = /^\d{6}\/\d{2}\/\d$/;

function parseId(raw: string | null | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) error(404, "Not found");
  return id;
}

// ---------------------------------------------------------------------------
// Structural edits are only allowed while the election is open for editing:
// not closed, and no ballot cast yet. The election row is locked FOR UPDATE, which
// serializes against voters (who hold a SHARE lock), so nothing can change while a
// ballot is being cast.
//
// ANY future action that changes a candidate's status (valid / invalid / ...) must
// go through runEdit too, otherwise a candidate could lose validity after votes
// for them were already cast.
// ---------------------------------------------------------------------------
class EditError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function runEdit(electionId: number, fn: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const [e] = await tx
        .select({ isClosed: elections.isClosed })
        .from(elections)
        .where(eq(elections.id, electionId))
        .for("update");

      if (!e) throw new EditError(404, "Election not found.");
      if (e.isClosed) throw new EditError(409, "This election is closed.");

      const [{ n }] = await tx
        .select({ n: count() })
        .from(ballots)
        .innerJoin(polls, eq(ballots.pollId, polls.id))
        .where(eq(polls.electionId, electionId));
      if (n > 0) {
        throw new EditError(
          409,
          "Ballots have already been cast, so this election can no longer be changed.",
        );
      }

      await fn(tx);
    });
    return { success: true as const };
  } catch (e) {
    if (e instanceof EditError) return fail(e.status, { message: e.message });
    if (getPgErrorCode(e) === "23505") {
      return fail(409, { message: "That already exists in this election." });
    }
    throw e;
  }
}

function validImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
export const load: PageServerLoad = async ({ params, locals }) => {
  requireAdmin(locals);
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

  const pollList = await db
    .select({
      id: polls.id,
      position: polls.position,
      description: polls.description,
      maxSelections: polls.maxSelections,
    })
    .from(polls)
    .where(eq(polls.electionId, electionId))
    .orderBy(asc(polls.displayOrder), asc(polls.id));

  const pollIds = pollList.map((p) => p.id);

  // Admins see every candidate, whatever their status. `name` is computed so
  // existing templates that render `c.name` keep working.
  const candidateRows = pollIds.length
    ? await db
        .select({
          id: candidates.id,
          pollId: candidates.pollId,
          surname: candidates.surname,
          givenNames: candidates.givenNames,
          nrc: candidates.nrc,
          status: candidates.status,
          image: candidates.image,
          msczMembershipNumber: candidates.msczMembershipNumber,
          highestQualification: candidates.highestQualification,
        })
        .from(candidates)
        .where(inArray(candidates.pollId, pollIds))
        .orderBy(asc(candidates.id))
    : [];

  const candidateList = candidateRows.map((c) => ({
    id: c.id,
    pollId: c.pollId,
    nrc: c.nrc,
    status: c.status,
    image: c.image,
    msczMembershipNumber: c.msczMembershipNumber,
    highestQualification: c.highestQualification,
    name: candidateName(c),
  }));

  // Turnout: visible live. It reveals how many voted, never what they chose.
  const [turnout] = pollIds.length
    ? await db
        .select({ voters: countDistinct(ballots.userId), ballotRows: count() })
        .from(ballots)
        .where(inArray(ballots.pollId, pollIds))
    : [{ voters: 0, ballotRows: 0 }];

  const [eligible] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.isVerified, true), eq(user.banned, false)));

  const locked = election.isClosed || (turnout?.ballotRows ?? 0) > 0;

  // Results are computed ONLY after the election is closed, even for admins.
  const results = election.isClosed ? await loadElectionResults(electionId) : null;

  return {
    election: {
      ...election,
      startsInput: toLusakaInput(election.startsAt),
      endsInput: toLusakaInput(election.endsAt),
    },
    polls: pollList.map((p) => ({
      ...p,
      candidates: candidateList.filter((c) => c.pollId === p.id),
    })),
    voters: turnout?.voters ?? 0,
    eligible: eligible?.n ?? 0,
    locked,
    results,
  };
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export const actions: Actions = {
  updateDates: async ({ request, params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);
    const f = await request.formData();
    const startsAt = parseLusakaLocal(f.get("startsAt"));
    const endsAt = parseLusakaLocal(f.get("endsAt"));

    if (!startsAt || !endsAt) return fail(400, { message: "Enter valid start and end times." });
    if (endsAt <= startsAt) {
      return fail(400, {
        message: "The end time must be after the start time.",
      });
    }

    return runEdit(electionId, async (tx) => {
      await tx.update(elections).set({ startsAt, endsAt }).where(eq(elections.id, electionId));
    });
  },

  addPoll: async ({ request, params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);
    const f = await request.formData();
    const position = String(f.get("position") ?? "").trim();
    const description = String(f.get("description") ?? "").trim() || null;
    const maxSelections = Number(f.get("maxSelections"));

    if (!position || position.length > 100) {
      return fail(400, {
        message: "Enter a position name (max 100 characters).",
      });
    }
    if (!Number.isInteger(maxSelections) || maxSelections < 1 || maxSelections > 20) {
      return fail(400, {
        message: "Seats must be a whole number between 1 and 20.",
      });
    }

    return runEdit(electionId, async (tx) => {
      const [{ next }] = await tx
        .select({
          next: sql<number>`coalesce(max(${polls.displayOrder}), -1) + 1`,
        })
        .from(polls)
        .where(eq(polls.electionId, electionId));
      await tx.insert(polls).values({
        electionId,
        position,
        description,
        maxSelections,
        displayOrder: next,
      });
    });
  },

  deletePoll: async ({ request, params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);
    const pollId = parseId(String((await request.formData()).get("pollId")));

    return runEdit(electionId, async (tx) => {
      await tx.delete(polls).where(and(eq(polls.id, pollId), eq(polls.electionId, electionId)));
    });
  },

  // Temporary single-candidate form; bulk registration comes later. Candidates
  // added here are recorded as already reviewed and valid.
  addCandidate: async ({ request, params, locals }) => {
    const admin = requireAdmin(locals);
    const electionId = parseId(params.id);
    const f = await request.formData();
    const text = (key: string) => String(f.get(key) ?? "").trim();

    const pollId = parseId(text("pollId"));
    const surname = text("surname");
    const givenNames = text("givenNames");
    const nrc = text("nrc");
    const msczMembershipNumber = text("msczMembershipNumber");
    const highestQualification = text("highestQualification");
    const image = text("image") || null;

    if (!surname || !givenNames || surname.length > 100 || givenNames.length > 150) {
      return fail(400, {
        message: "Enter the candidate's surname and given names.",
      });
    }
    if (!NRC_PATTERN.test(nrc)) {
      return fail(400, { message: "NRC must be in the format 123456/78/1." });
    }
    if (!msczMembershipNumber || !highestQualification) {
      return fail(400, {
        message: "MCSZ membership number and highest qualification are required.",
      });
    }
    if (image && !validImageUrl(image)) {
      return fail(400, { message: "The photo must be a valid http(s) URL." });
    }

    return runEdit(electionId, async (tx) => {
      const [poll] = await tx
        .select({ id: polls.id })
        .from(polls)
        .where(and(eq(polls.id, pollId), eq(polls.electionId, electionId)));
      if (!poll) throw new EditError(400, "That position doesn't belong to this election.");

      await tx.insert(candidates).values({
        pollId,
        surname,
        givenNames,
        nrc,
        msczMembershipNumber,
        highestQualification,
        image,
        status: "valid",
        receivedVia: "admin",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      });
    });
  },

  deleteCandidate: async ({ request, params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);
    const candidateId = parseId(String((await request.formData()).get("candidateId")));

    return runEdit(electionId, async (tx) => {
      await tx
        .delete(candidates)
        .where(
          and(
            eq(candidates.id, candidateId),
            inArray(
              candidates.pollId,
              tx.select({ id: polls.id }).from(polls).where(eq(polls.electionId, electionId)),
            ),
          ),
        );
    });
  },

  // The UPDATE needs a row lock, so it waits for in-flight ballots (SHARE lock)
  // and every later voter sees isClosed = true.
  close: async ({ params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);

    const closed = await db
      .update(elections)
      .set({ isClosed: true })
      .where(and(eq(elections.id, electionId), eq(elections.isClosed, false)))
      .returning({ id: elections.id });

    if (closed.length === 0) {
      return fail(409, { message: "This election is already closed." });
    }
    return { success: true as const };
  },
};
