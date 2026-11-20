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
import { ballots, candidates, elections, polls, votes } from "#lib/server/db/schema.ts";
import { error, fail } from "@sveltejs/kit";
import { and, asc, count, countDistinct, eq, inArray, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

function parseId(raw: string | null | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) error(404, "Not found");
  return id;
}

// ---------------------------------------------------------------------------
// Structural edits are only allowed while the election is open for editing:
// not closed, and no ballot cast yet. The election row is locked FOR UPDATE, which
// serializes against voters (who hold a SHARE lock), so a candidate can't be
// added or removed while a ballot is being cast.
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

  const candidateList = pollIds.length
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

  const pollsWithCandidates = pollList.map((p) => ({
    ...p,
    candidates: candidateList.filter((c) => c.pollId === p.id),
  }));

  // Results are computed ONLY after the election is closed, even for admins.
  let results: ReturnType<typeof buildResults> | null = null;
  if (election.isClosed && pollIds.length) {
    const tallies = await db
      .select({
        pollId: votes.pollId,
        candidateId: votes.candidateId,
        total: count(),
      })
      .from(votes)
      .where(inArray(votes.pollId, pollIds))
      .groupBy(votes.pollId, votes.candidateId);

    const ballotCounts = await db
      .select({ pollId: ballots.pollId, total: count() })
      .from(ballots)
      .where(inArray(ballots.pollId, pollIds))
      .groupBy(ballots.pollId);

    results = buildResults(pollsWithCandidates, tallies, ballotCounts);
  }

  return {
    election: {
      ...election,
      startsInput: toLusakaInput(election.startsAt),
      endsInput: toLusakaInput(election.endsAt),
    },
    polls: pollsWithCandidates,
    voters: turnout?.voters ?? 0,
    eligible: eligible?.n ?? 0,
    locked,
    results,
  };
};

function buildResults(
  pollList: {
    id: number;
    position: string;
    maxSelections: number;
    candidates: { id: number; name: string }[];
  }[],
  tallies: { pollId: number; candidateId: number; total: number }[],
  ballotCounts: { pollId: number; total: number }[],
) {
  const tallyMap = new Map(tallies.map((t) => [`${t.pollId}:${t.candidateId}`, t.total]));
  const ballotMap = new Map(ballotCounts.map((b) => [b.pollId, b.total]));

  return pollList.map((poll) => {
    const ballotTotal = ballotMap.get(poll.id) ?? 0;
    const sorted = poll.candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        votes: tallyMap.get(`${poll.id}:${c.id}`) ?? 0,
      }))
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

    const seats = poll.maxSelections;
    const cutoff = sorted[seats - 1]?.votes;
    const next = sorted[seats]?.votes;
    const tie = cutoff !== undefined && cutoff > 0 && next === cutoff;
    const totalVotes = sorted.reduce((n, r) => n + r.votes, 0);

    return {
      pollId: poll.id,
      position: poll.position,
      seats,
      ballots: ballotTotal,
      totalVotes,
      // Only derivable for single-choice polls
      abstentions: seats === 1 ? ballotTotal - totalVotes : null,
      // Integrity invariant: votes can never exceed ballots x seats
      auditOk: totalVotes <= ballotTotal * seats,
      tie,
      rows: sorted.map((r, i) => ({
        ...r,
        pct: ballotTotal > 0 ? Math.round((r.votes / ballotTotal) * 1000) / 10 : 0,
        status:
          r.votes > 0 && tie && r.votes === cutoff
            ? ("tied" as const)
            : i < seats && r.votes > 0
              ? ("elected" as const)
              : ("" as const),
      })),
    };
  });
}

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

  addCandidate: async ({ request, params, locals }) => {
    requireAdmin(locals);
    const electionId = parseId(params.id);
    const f = await request.formData();
    const pollId = parseId(String(f.get("pollId")));
    const name = String(f.get("name") ?? "").trim();
    const nrc = String(f.get("nrc") ?? "").trim();
    const image = String(f.get("image") ?? "").trim() || null;

    if (!name || name.length > 120) {
      return fail(400, {
        message: "Enter a candidate name (max 120 characters).",
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

      await tx.insert(candidates).values({ pollId, name, nrc, image });
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
