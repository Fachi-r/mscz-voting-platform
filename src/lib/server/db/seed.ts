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
  const testAccounts: (typeof schema.user.$inferInsert)[] = [
    {
      id: "seed-admin-user",
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: true,
      nrc: "100001/10/1",
      isVerified: true,
      role: "admin", // Uncomment if you use Better Auth's admin plugin
      msczMembershipNumber: "MSCZ-2026-0412",
    },
    {
      id: "seed-verified-user",
      name: "Verified Voter",
      email: "user@example.com",
      emailVerified: true,
      nrc: "100002/10/1",
      isVerified: true,
      msczMembershipNumber: "MSCZ-2023-0194",
    },
    {
      id: "seed-unverified-user",
      name: "Unverified Voter",
      email: "unverified@example.com",
      emailVerified: true,
      nrc: "100003/10/1",
      isVerified: false,
      msczMembershipNumber: "MSCZ-2025-0412",
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

  // 4. Seed Candidates per Poll (with MSCZ membership, review statuses & runoff lineage)
  console.log("Seeding candidates...");

  const candidatePool = [
    {
      surname: "Mwale",
      givenNames: "Chanda",
      nrc: "148291/10/1",
      msczMembershipNumber: "MSCZ-2019-0412",
      highestQualification: "MSc Computer Science",
      address: "Plot 412, Kabulonga, Lusaka",
    },
    {
      surname: "Banda",
      givenNames: "Mutale",
      nrc: "209482/11/1",
      msczMembershipNumber: "MSCZ-2020-0881",
      highestQualification: "BSc Information Technology",
      address: "House 19, Woodlands, Lusaka",
    },
    {
      surname: "Phiri",
      givenNames: "Bwalya",
      nrc: "319402/61/1",
      msczMembershipNumber: "MSCZ-2018-0194",
      highestQualification: "PhD Software Engineering",
      address: "Plot 88, Nkana East, Kitwe",
    },
    {
      surname: "Zulu",
      givenNames: "Thabo",
      nrc: "184920/10/1",
      msczMembershipNumber: "MSCZ-2021-1104",
      highestQualification: "BSc Computer Systems Engineering",
      address: "Flat 4B, Rhodes Park, Lusaka",
    },
    {
      surname: "Tembo",
      givenNames: "Natasha",
      nrc: "274910/16/1",
      msczMembershipNumber: "MSCZ-2020-0530",
      highestQualification: "MSc Information Security",
      address: "Plot 204, Kansenshi, Ndola",
    },
    {
      surname: "Mulenga",
      givenNames: "Kabwe",
      nrc: "193847/31/1",
      msczMembershipNumber: "MSCZ-2022-1492",
      highestQualification: "BEng Telecommunications",
      address: "House 7, Chalala, Lusaka",
    },
  ];

  // Only store 'valid' candidates in this map so votes are cast exclusively for approved candidates
  const validCandidatesByPoll = new Map<number, (typeof schema.candidates.$inferSelect)[]>();
  // Keep all inserted candidates by poll so runoff polls can link sourceCandidateId
  const allCandidatesByPoll = new Map<number, (typeof schema.candidates.$inferSelect)[]>();

  for (const poll of allPolls) {
    // Handle runoff polls by linking top 2 valid candidates from the original poll
    if (poll.isRunoff && poll.runoffOfPollId) {
      const originalValid = validCandidatesByPoll.get(poll.runoffOfPollId) ?? [];
      const runoffContenders = originalValid.slice(0, 2);

      const runoffRows: (typeof schema.candidates.$inferInsert)[] = runoffContenders.map(
        (orig) => ({
          pollId: poll.id,
          surname: orig.surname,
          givenNames: orig.givenNames,
          nrc: orig.nrc,
          msczMembershipNumber: orig.msczMembershipNumber,
          msczMembershipEvidence: orig.msczMembershipEvidence,
          isPaidUp: true,
          isContinuousMember2Years: true,
          isAssociateMember: false,
          hasDisciplinaryRecord: false,
          highestQualification: orig.highestQualification,
          address: orig.address,
          image: orig.image,
          signature: orig.signature,
          signedAt: now,
          status: "valid",
          invalidReason: null,
          receivedAt: now,
          receivedVia: "runoff_carryover",
          receivedBy: "seed-admin-user",
          reviewedBy: "seed-admin-user",
          reviewedAt: now,
          sourceCandidateId: orig.id, // Satisfies runoff lineage FK
        }),
      );

      const insertedRunoff = await db.insert(schema.candidates).values(runoffRows).returning();
      allCandidatesByPoll.set(poll.id, insertedRunoff);
      validCandidatesByPoll.set(poll.id, insertedRunoff);
      continue;
    }

    // Standard polls: insert 3 valid candidates + 1 invalid/submitted candidate on active polls
    const baseCount = poll.maxSelections === 3 ? 5 : 3;
    const rows: (typeof schema.candidates.$inferInsert)[] = [];

    for (let idx = 0; idx < baseCount; idx++) {
      const person = candidatePool[(poll.id + idx) % candidatePool.length];
      const submittedAt = new Date(now.getTime() - (20 - idx) * 24 * 60 * 60 * 1000);
      const reviewedAt = new Date(submittedAt.getTime() + 12 * 60 * 60 * 1000);

      rows.push({
        pollId: poll.id,
        surname: person.surname,
        givenNames: person.givenNames,
        nrc: person.nrc,
        msczMembershipNumber: person.msczMembershipNumber,
        msczMembershipEvidence: `https://example.com{person.msczMembershipNumber}.pdf`,
        isPaidUp: true,
        isContinuousMember2Years: true,
        isAssociateMember: false,
        hasDisciplinaryRecord: false,
        highestQualification: person.highestQualification,
        address: person.address,
        image: null,
        signature: `${person.givenNames} ${person.surname}`,
        signedAt: submittedAt,
        status: "valid",
        invalidReason: null,
        receivedAt: submittedAt,
        receivedVia: idx % 2 === 0 ? "online_portal" : "email",
        receivedBy: "seed-admin-user",
        reviewedBy: "seed-admin-user",
        reviewedAt,
        sourceCandidateId: null,
      });
    }

    // Add edge-case statuses ('invalid' & 'under_review') to the active poll for admin review UI testing
    if (poll.electionId === activeElection.id) {
      const extraPerson = candidatePool[(poll.id + baseCount) % candidatePool.length];
      const submittedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      rows.push({
        pollId: poll.id,
        surname: extraPerson.surname,
        givenNames: extraPerson.givenNames,
        nrc: extraPerson.nrc,
        msczMembershipNumber: extraPerson.msczMembershipNumber,
        msczMembershipEvidence: null,
        isPaidUp: false,
        isContinuousMember2Years: false,
        isAssociateMember: true,
        hasDisciplinaryRecord: false,
        highestQualification: extraPerson.highestQualification,
        address: extraPerson.address,
        image: null,
        signature: `${extraPerson.givenNames} ${extraPerson.surname}`,
        signedAt: submittedAt,
        // Satisfies candidates_invalid_reason_chk (status = 'invalid' requires non-null invalidReason)
        status: "invalid",
        invalidReason:
          "Applicant is an Associate Member and has not completed 2 continuous years as a paid-up Full Member.",
        receivedAt: submittedAt,
        receivedVia: "in_person",
        receivedBy: "seed-admin-user",
        reviewedBy: "seed-admin-user",
        reviewedAt: new Date(submittedAt.getTime() + 4 * 60 * 60 * 1000),
        sourceCandidateId: null,
      });
    }

    const inserted = await db.insert(schema.candidates).values(rows).returning();
    allCandidatesByPoll.set(poll.id, inserted);
    validCandidatesByPoll.set(
      poll.id,
      inserted.filter((c) => c.status === "valid" || c.status === "elected_unopposed"),
    );
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

        const pollCandidates = [...(allCandidatesByPoll.get(poll.id) ?? [])];
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
