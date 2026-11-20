import { drizzle } from "drizzle-orm/postgres-js";
import { seed, reset } from "drizzle-seed";
import * as schema from "./schema";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
// import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in your environment.");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// Helper for deterministic pseudo-random numbers
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const rand = mulberry32(2026);

  console.log("Resetting database...");
  // Pass only tables (exclude relations) or full schema; reset handles TRUNCATE CASCADE
  await reset(db, {
    user: schema.user,
    account: schema.account,
    elections: schema.elections,
    polls: schema.polls,
    candidates: schema.candidates,
    ballots: schema.ballots,
    votes: schema.votes,
  });

  // 1. Seed Users via drizzle-seed (adjust fields to match your auth.schema.ts)
  console.log("Seeding users...");
  await seed(db, { user: schema.user }, { seed: 2026 }).refine((f) => ({
    user: {
      count: 40,
      columns: {
        name: f.fullName(),
        email: f.email(),
        emailVerified: f.default({ defaultValue: true }),
      },
    },
  }));

  // 1b. Seed known test accounts with password: "password123"
  console.log("Seeding test accounts...");
  const hashedPassword = await hashPassword("password123");
  const testAccounts = [
    {
      id: "seed-admin-user",
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: true,
      nrc: "100001/10/1",
      isVerified: true,
      role: "admin", // Uncomment if you use Better Auth's admin plugin
    },
    {
      id: "seed-verified-user",
      name: "Verified Voter",
      email: "user@example.com",
      emailVerified: true,
      nrc: "100002/10/1",
      isVerified: true,
    },
    {
      id: "seed-unverified-user",
      name: "Unverified Voter",
      email: "unverified@example.com",
      emailVerified: true,
      nrc: "100003/10/1",
      isVerified: false,
    },
  ];

  await db.insert(schema.user).values(testAccounts);

  await db.insert(schema.account).values(
    testAccounts.map((acc) => ({
      id: `account-${acc.id}`,
      accountId: acc.id,
      providerId: "credential",
      userId: acc.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

  // Select all verified users (including admin@example.com and user@example.com)
  // const eligibleUsers = await db
  //   .select({ id: schema.user.id })
  //   .from(schema.user)
  //   .where(eq(schema.user.isVerified, true));

  const allUsers = await db.select({ id: schema.user.id }).from(schema.user);

  // 2. Seed Elections (satisfying endsAt > startsAt)
  console.log("Seeding elections...");
  const now = new Date();
  const [closedElection, activeElection] = await db
    .insert(schema.elections)
    .values([
      {
        title: "2026 Annual General Executive Election",
        description: "Main election for executive board positions.",
        startsAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        endsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        isClosed: true,
      },
      {
        title: "2026 Mid-Year Committee & Runoff Election",
        description: "Active voting window for open committee seats and tied positions.",
        startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
        endsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // In 5 days
        isClosed: false,
      },
    ])
    .returning();

  // 3. Seed Polls (satisfying unique(electionId, position) and runoff check)
  console.log("Seeding polls...");
  const [chairPoll, deputyPoll, committeePoll] = await db
    .insert(schema.polls)
    .values([
      {
        electionId: closedElection.id,
        position: "Chairperson",
        description: "Presides over executive meetings.",
        maxSelections: 1,
        displayOrder: 1,
        isRunoff: false,
        runoffOfPollId: null,
      },
      {
        electionId: closedElection.id,
        position: "Deputy Chairperson",
        description: "Assists the Chairperson.",
        maxSelections: 1,
        displayOrder: 2,
        isRunoff: false,
        runoffOfPollId: null,
      },
      {
        electionId: activeElection.id,
        position: "Committee Member",
        description: "Select up to 3 committee representatives.",
        maxSelections: 3,
        displayOrder: 1,
        isRunoff: false,
        runoffOfPollId: null,
      },
    ])
    .returning();

  // Example Runoff Poll linked to closedElection's Deputy Chairperson poll
  const [deputyRunoffPoll] = await db
    .insert(schema.polls)
    .values({
      electionId: activeElection.id,
      position: "Deputy Chairperson (Runoff)",
      description: "Runoff election following a tie in the main election.",
      maxSelections: 1,
      displayOrder: 2,
      isRunoff: true,
      runoffOfPollId: deputyPoll.id,
    })
    .returning();

  const allPolls = [chairPoll, deputyPoll, committeePoll, deputyRunoffPoll];

  // 4. Seed Candidates per Poll (with realistic Zambian NRC numbers)
  console.log("Seeding candidates...");
  const candidatePool = [
    { name: "Chanda Mwale", nrc: "148291/10/1" },
    { name: "Mutale Banda", nrc: "209482/11/1" },
    { name: "Bwalya Phiri", nrc: "319402/61/1" },
    { name: "Thabo Zulu", nrc: "184920/10/1" },
    { name: "Natasha Tembo", nrc: "274910/16/1" },
    { name: "Kabwe Mulenga", nrc: "193847/31/1" },
  ];

  const candidatesByPoll = new Map<number, (typeof schema.candidates.$inferSelect)[]>();

  for (const poll of allPolls) {
    const count = poll.maxSelections === 3 ? 5 : 3;
    const rows = Array.from({ length: count }, (_, idx) => {
      const person = candidatePool[(poll.id + idx) % candidatePool.length];
      return {
        pollId: poll.id,
        name: `${person.name} (${poll.position.split(" ")[0]})`,
        nrc: person.nrc,
        image: null,
      };
    });

    const inserted = await db.insert(schema.candidates).values(rows).returning();
    candidatesByPoll.set(poll.id, inserted);
  }

  // 5. Simulate Voters Casting Ballots & Anonymous Votes
  console.log("Seeding ballots and votes...");
  const ballotRows: (typeof schema.ballots.$inferInsert)[] = [];
  const voteRows: (typeof schema.votes.$inferInsert)[] = [];

  // Group polls by election so voters cast ballots across all polls in an election
  const pollsByElection = new Map<number, typeof allPolls>();
  for (const poll of allPolls) {
    const list = pollsByElection.get(poll.electionId) ?? [];
    list.push(poll);
    pollsByElection.set(poll.electionId, list);
  }

  for (const [electionId, electionPolls] of pollsByElection.entries()) {
    const election = electionId === closedElection.id ? closedElection : activeElection;

    // ~75% voter turnout per election
    for (const u of allUsers) {
      if (rand() > 0.75) continue;

      const castAt = new Date(
        election.startsAt.getTime() + rand() * (now.getTime() - election.startsAt.getTime()),
      );

      for (const poll of electionPolls) {
        // Insert 1 ballot per poll (even if voter abstains)
        ballotRows.push({
          userId: u.id,
          pollId: poll.id,
          castAt,
        });

        // 10% chance the voter abstains on this specific poll
        if (rand() < 0.1) continue;

        const pollCandidates = [...(candidatesByPoll.get(poll.id) ?? [])];
        // Shuffle candidates deterministically
        for (let i = pollCandidates.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [pollCandidates[i], pollCandidates[j]] = [pollCandidates[j], pollCandidates[i]];
        }

        // Pick between 1 and maxSelections unique candidates
        const numSelections = Math.min(
          pollCandidates.length,
          Math.floor(rand() * poll.maxSelections) + 1,
        );

        for (let s = 0; s < numSelections; s++) {
          voteRows.push({
            pollId: poll.id,
            candidateId: pollCandidates[s].id,
          });
        }
      }
    }
  }

  if (ballotRows.length > 0) {
    await db.insert(schema.ballots).values(ballotRows);
  }
  if (voteRows.length > 0) {
    // Shuffle voteRows before inserting so row insertion order doesn't correlate with user order
    for (let i = voteRows.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [voteRows[i], voteRows[j]] = [voteRows[j], voteRows[i]];
    }
    await db.insert(schema.votes).values(voteRows);
  }

  console.log(
    `Done! Seeded ${allUsers.length} users, ${allPolls.length} polls, ${ballotRows.length} ballots, and ${voteRows.length} votes.`,
  );
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
