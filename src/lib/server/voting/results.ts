// src/lib/server/voting/results.ts
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { polls, candidates, votes, ballots } from "../db/schema";

export type RowStatus = "elected" | "tied" | "";

export interface PollResult {
  pollId: number;
  position: string;
  seats: number;
  ballots: number;
  totalVotes: number;
  /** Only derivable for single-seat polls */
  abstentions: number | null;
  /** Integrity invariant: votes <= ballots x seats */
  auditOk: boolean;
  tie: boolean;
  unopposed: boolean;
  rows: {
    id: number;
    name: string;
    votes: number;
    pct: number;
    status: RowStatus;
  }[];
}

/** Display name for a candidate. Client-safe: takes only the name columns. */
export function candidateName(c: { name?: string; surname?: string; givenNames?: string }): string {
  if (c.givenNames && c.surname) return `${c.givenNames} ${c.surname}`;
  return c.name || "Unknown Candidate";
}

/**
 * Computes results for an election. CALLERS MUST ONLY USE THIS FOR CLOSED ELECTIONS:
 * tallies must never be visible while voting is in progress.
 */
export async function loadElectionResults(electionId: number): Promise<PollResult[]> {
  const pollList = await db
    .select({
      id: polls.id,
      position: polls.position,
      maxSelections: polls.maxSelections,
    })
    .from(polls)
    .where(eq(polls.electionId, electionId))
    .orderBy(asc(polls.displayOrder), asc(polls.id));

  if (pollList.length === 0) return [];
  const pollIds = pollList.map((p) => p.id);

  // Only candidates who were actually on the ballot (or elected unopposed)
  const cands = await db
    .select({
      id: candidates.id,
      pollId: candidates.pollId,
      surname: candidates.surname,
      givenNames: candidates.givenNames,
      status: candidates.status,
    })
    .from(candidates)
    .where(
      and(
        inArray(candidates.pollId, pollIds),
        inArray(candidates.status, ["valid", "elected_unopposed"]),
      ),
    )
    .orderBy(asc(candidates.id));

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

  const tallyMap = new Map(tallies.map((t) => [`${t.pollId}:${t.candidateId}`, t.total]));
  const ballotMap = new Map(ballotCounts.map((b) => [b.pollId, b.total]));

  return pollList.map((poll): PollResult => {
    const pollCands = cands.filter((c) => c.pollId === poll.id);
    const seats = poll.maxSelections;

    const unopposed =
      pollCands.length > 0 && pollCands.every((c) => c.status === "elected_unopposed");
    if (unopposed) {
      return {
        pollId: poll.id,
        position: poll.position,
        seats,
        ballots: 0,
        totalVotes: 0,
        abstentions: null,
        auditOk: true,
        tie: false,
        unopposed: true,
        rows: pollCands.map((c) => ({
          id: c.id,
          name: candidateName(c),
          votes: 0,
          pct: 0,
          status: "elected",
        })),
      };
    }

    const ballotTotal = ballotMap.get(poll.id) ?? 0;
    const sorted = pollCands
      .map((c) => ({
        id: c.id,
        name: candidateName(c),
        votes: tallyMap.get(`${poll.id}:${c.id}`) ?? 0,
      }))
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

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
      abstentions: seats === 1 ? ballotTotal - totalVotes : null,
      auditOk: totalVotes <= ballotTotal * seats,
      tie,
      unopposed: false,
      rows: sorted.map((r, i) => ({
        ...r,
        pct: ballotTotal > 0 ? Math.round((r.votes / ballotTotal) * 1000) / 10 : 0,
        status:
          r.votes > 0 && tie && r.votes === cutoff
            ? "tied"
            : i < seats && r.votes > 0
              ? "elected"
              : "",
      })),
    };
  });
}
