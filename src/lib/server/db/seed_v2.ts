// src/lib/server/db/seed.ts
//
// Run with:  npx tsx --env-file=.env src/lib/server/db/seed.ts
//
// WARNING: truncates every table. Never run against real data.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as schema from "./schema";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV is production.");
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set in your environment.");

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// Deterministic pseudo-random numbers
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 60 * 60 * 1000;
const ADMIN_ID = "seed-admin-user";

const FIRST = ["Chanda", "Mutale", "Bwalya", "Thandiwe", "Kabwe", "Natasha", "Mwila", "Lombe"];
const LAST = ["Mwale", "Banda", "Phiri", "Tembo", "Mulenga", "Zulu", "Sakala", "Lungu"];

// People who stand as candidates. NRCs are unique per poll (not globally).
const PEOPLE = [
  { surname: "Mwale", givenNames: "Chanda", nrc: "148291/10/1", qual: "MBChB" },
  {
    surname: "Banda",
    givenNames: "Mutale",
    nrc: "209482/11/1",
    qual: "MMed (Surgery)",
  },
  { surname: "Phiri", givenNames: "Bwalya", nrc: "319402/61/1", qual: "MBChB" },
  { surname: "Zulu", givenNames: "Thabo", nrc: "184920/10/1", qual: "MPH" },
  {
    surname: "Tembo",
    givenNames: "Natasha",
    nrc: "274910/16/1",
    qual: "MBChB, MSc",
  },
  {
    surname: "Mulenga",
    givenNames: "Kabwe",
    nrc: "193847/31/1",
    qual: "MBChB",
  },
  {
    surname: "Sakala",
    givenNames: "Mwila",
    nrc: "221034/10/1",
    qual: "BSc, MBChB",
  },
  { surname: "Lungu", givenNames: "Lombe", nrc: "245871/20/1", qual: "MBChB" },
  {
    surname: "Daka",
    givenNames: "Chipo",
    nrc: "263015/10/1",
    qual: "MMed (Paeds)",
  },
  {
    surname: "Chilufya",
    givenNames: "Namukolo",
    nrc: "288140/40/1",
    qual: "MBChB",
  },
  {
    surname: "Nkhoma",
    givenNames: "Tendai",
    nrc: "301776/10/1",
    qual: "MBChB, MPH",
  },
  { surname: "Kunda", givenNames: "Mpundu", nrc: "312458/50/1", qual: "MBChB" },
  {
    surname: "Simwanza",
    givenNames: "Given",
    nrc: "327093/10/1",
    qual: "BSc Nursing",
  },
];

type Status = "valid" | "invalid" | "submitted" | "elected_unopposed";

async function main() {
  const rand = mulberry32(2026);
  const now = Date.now();

  console.log("Resetting database...");
  await db.execute(
    sql.raw(
      `TRUNCATE TABLE "votes","ballots","candidates","polls","elections","session","account","verification","user" RESTART IDENTITY CASCADE`,
    ),
  );

  // ------------------------------------------------------------------ users
  console.log("Seeding users...");
  const hashedPassword = await hashPassword("password123");

  const testAccounts: (typeof schema.user.$inferInsert)[] = [
    {
      id: ADMIN_ID,
      name: "Admin User",
      email: "admin@example.com",
      nrc: "100001/10/1",
      isVerified: true,
      role: "admin",
      msczMembershipNumber: `MSCZ-2024-${Math.floor(Math.random() * 10000)}`,
    },
    {
      id: "seed-verified-user",
      name: "Verified Voter",
      email: "user@example.com",
      nrc: "100002/10/1",
      isVerified: true,
      role: "voter",
      msczMembershipNumber: `MSCZ-2024-${Math.floor(Math.random() * 10000)}`,
    },
    {
      id: "seed-unverified-user",
      name: "Unverified Voter",
      email: "unverified@example.com",
      nrc: "100003/10/1",
      isVerified: false,
      role: "voter",
      msczMembershipNumber: `MSCZ-2024-${Math.floor(Math.random() * 10000)}`,
    },
    {
      id: "seed-new-user",
      name: "New Member",
      email: "new@example.com",
      nrc: null,
      isVerified: false,
      role: "voter",
      msczMembershipNumber: `MSCZ-2024-${Math.floor(Math.random() * 10000)}`,
    },
  ];

  // 40 simulated members, every 10th is unverified
  const members: (typeof schema.user.$inferInsert)[] = Array.from({ length: 40 }, (_, i) => ({
    id: `seed-member-${String(i + 1).padStart(2, "0")}`,
    name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
    createdAt: new Date(),
    nrc: `${200000 + i}/10/1`,
    email: `member${i + 1}@example.com`,
    emailVerified: (i + 1) % 10 !== 0,
    updatedAt: new Date(),
    role: "voter",
    isVerified: (i + 1) % 10 !== 0,
    msczMembershipNumber: `MSCZ-2024-${1000 + i}`,
    password: hashedPassword,
  }));

  await db.insert(schema.user).values([...testAccounts, ...members]);

  await db.insert(schema.account).values(
    testAccounts.map((acc) => ({
      id: `account-${acc.id}`,
      accountId: acc.id,
      providerId: "credential",
      userId: acc.id,
      password: hashedPassword,
    })),
  );

  // Only verified simulated members vote in the simulation; the test accounts are
  // left alone so you can cast real ballots with them.
  const simulatedVoters = members.filter((m) => m.isVerified).map((m) => m.id);

  // -------------------------------------------------------------- elections
  console.log("Seeding elections...");
  const [closed, open, upcoming] = await db
    .insert(schema.elections)
    .values([
      {
        title: "2025 Annual General Election (closed)",
        description: "Finished election with results. Deputy Chair ends in a tie.",
        startsAt: new Date(now - 14 * DAY),
        endsAt: new Date(now - 7 * DAY),
        isClosed: true,
      },
      {
        title: "2026 Annual General Election (open)",
        description: "Currently open: Chair, Deputy Chair and Committee on one ballot.",
        startsAt: new Date(now - DAY),
        endsAt: new Date(now + 5 * DAY),
        isClosed: false,
      },
      {
        title: "2027 Annual General Election (upcoming)",
        description: "Not open yet. Deputy Chair has a single candidate (unopposed).",
        startsAt: new Date(now + 10 * DAY),
        endsAt: new Date(now + 17 * DAY),
        isClosed: false,
      },
    ])
    .returning();

  // ------------------------------------------------------------------ polls
  console.log("Seeding polls...");
  const pollSpecs = [
    { position: "Chair", maxSelections: 1 },
    { position: "Deputy Chair", maxSelections: 1 },
    { position: "Committee Member", maxSelections: 3 },
  ];
  const insertedPolls = await db
    .insert(schema.polls)
    .values(
      [closed, open, upcoming].flatMap((e) =>
        pollSpecs.map((p, i) => ({
          electionId: e.id,
          position: p.position,
          maxSelections: p.maxSelections,
          displayOrder: i,
        })),
      ),
    )
    .returning();

  const pollOf = (electionId: number, position: string) =>
    insertedPolls.find((p) => p.electionId === electionId && p.position === position)!;

  // ------------------------------------------------------------- candidates
  console.log("Seeding candidates...");
  // [election, position, [personIndex, status][]]
  const plan: [typeof closed, string, [number, Status][]][] = [
    [
      closed,
      "Chair",
      [
        [0, "valid"],
        [1, "valid"],
        [2, "valid"],
      ],
    ],
    [
      closed,
      "Deputy Chair",
      [
        [3, "valid"],
        [4, "valid"],
        [5, "valid"],
      ],
    ],
    [
      closed,
      "Committee Member",
      [
        [6, "valid"],
        [7, "valid"],
        [8, "valid"],
        [9, "valid"],
        [10, "valid"],
      ],
    ],

    [
      open,
      "Chair",
      [
        [0, "valid"],
        [1, "valid"],
        [2, "valid"],
      ],
    ],
    // 'invalid' and 'submitted' candidates must NOT appear on the ballot
    [
      open,
      "Deputy Chair",
      [
        [3, "valid"],
        [4, "valid"],
        [5, "invalid"],
        [11, "submitted"],
      ],
    ],
    [
      open,
      "Committee Member",
      [
        [6, "valid"],
        [7, "valid"],
        [8, "valid"],
        [9, "valid"],
        [10, "valid"],
      ],
    ],

    [
      upcoming,
      "Chair",
      [
        [0, "valid"],
        [1, "valid"],
      ],
    ],
    [upcoming, "Deputy Chair", [[3, "elected_unopposed"]]],
    [
      upcoming,
      "Committee Member",
      [
        [6, "valid"],
        [7, "valid"],
        [8, "valid"],
      ],
    ],
  ];

  const candidateRows: (typeof schema.candidates.$inferInsert)[] = plan.flatMap(
    ([election, position, people]) =>
      people.map(([personIdx, status]) => {
        const p = PEOPLE[personIdx];
        const reviewed = status !== "submitted";
        return {
          pollId: pollOf(election.id, position).id,
          surname: p.surname,
          givenNames: p.givenNames,
          nrc: p.nrc,
          msczMembershipNumber: `MSCZ-${1000 + personIdx}`,
          highestQualification: p.qual,
          isPaidUp: true,
          isContinuousMember2Years: true,
          isAssociateMember: false,
          hasDisciplinaryRecord: false,
          status,
          invalidReason: status === "invalid" ? "Membership subscription not paid up." : null,
          receivedAt: new Date(now - 20 * DAY),
          receivedVia: "email",
          reviewedBy: reviewed ? ADMIN_ID : null,
          reviewedAt: reviewed ? new Date(now - 18 * DAY) : null,
        };
      }),
  );
  const insertedCandidates = await db.insert(schema.candidates).values(candidateRows).returning();

  // ------------------------------------------------- simulated ballots/votes
  console.log("Seeding ballots and votes...");
  const ballotRows: (typeof schema.ballots.$inferInsert)[] = [];
  const voteRows: (typeof schema.votes.$inferInsert)[] = [];

  function simulate(
    election: typeof closed,
    voterIds: string[],
    opts: { turnout: number; tiePollId?: number },
  ) {
    const electionPolls = insertedPolls.filter((p) => p.electionId === election.id);
    // Same rule as castBallot: only polls with at least one VALID candidate
    const ballotPolls = electionPolls
      .map((poll) => ({
        poll,
        valid: insertedCandidates.filter((c) => c.pollId === poll.id && c.status === "valid"),
      }))
      .filter((x) => x.valid.length > 0);

    let turnout = voterIds.filter(() => rand() <= opts.turnout);
    if (opts.tiePollId !== undefined && turnout.length % 2 === 1) turnout = turnout.slice(0, -1);

    const windowEnd = Math.min(now, election.endsAt.getTime());
    let tieToggle = 0;

    for (const userId of turnout) {
      const castAt = new Date(
        election.startsAt.getTime() + rand() * (windowEnd - election.startsAt.getTime()),
      );

      for (const { poll, valid } of ballotPolls) {
        ballotRows.push({ userId, pollId: poll.id, castAt });

        // Deliberate tie: alternate between the first two candidates, no abstentions
        if (poll.id === opts.tiePollId) {
          voteRows.push({
            pollId: poll.id,
            candidateId: valid[tieToggle++ % 2].id,
          });
          continue;
        }

        if (rand() < 0.1) continue; // abstains on this position

        const shuffled = [...valid];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const picks = Math.min(shuffled.length, Math.floor(rand() * poll.maxSelections) + 1);
        for (let s = 0; s < picks; s++) {
          voteRows.push({ pollId: poll.id, candidateId: shuffled[s].id });
        }
      }
    }
  }

  simulate(closed, simulatedVoters, {
    turnout: 0.8,
    tiePollId: pollOf(closed.id, "Deputy Chair").id,
  });
  simulate(open, simulatedVoters, { turnout: 0.4 });

  if (ballotRows.length) await db.insert(schema.ballots).values(ballotRows);
  if (voteRows.length) {
    // Shuffle so insertion order doesn't line up with ballot order
    for (let i = voteRows.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [voteRows[i], voteRows[j]] = [voteRows[j], voteRows[i]];
    }
    await db.insert(schema.votes).values(voteRows);
  }

  console.log(
    `Done. ${testAccounts.length + members.length} users, ${insertedPolls.length} polls, ` +
      `${insertedCandidates.length} candidates, ${ballotRows.length} ballots, ${voteRows.length} votes.`,
  );
  console.log("\nTest logins (password: password123):");
  for (const a of testAccounts)
    console.log(
      `  ${a.email.padEnd(24)} ${a.role?.padEnd(6)} nrc=${a.nrc ?? "none"} verified=${a.isVerified}`,
    );

  await client.end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
