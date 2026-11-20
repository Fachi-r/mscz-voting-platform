// src/lib/server/db/schema.ts
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export * from "./auth.schema";

// ---------------------------------------------------------------------------
// Elections: one voting window containing several polls (Chair, Deputy, Committee).
// A runoff is simply a new election containing the tied polls.
// ---------------------------------------------------------------------------
export const elections = pgTable(
  "elections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isClosed: boolean("is_closed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("elections_window_chk", sql`${table.endsAt} > ${table.startsAt}`),
    index("elections_status_endsAt_idx").on(table.isClosed, table.endsAt),
  ],
);

// ---------------------------------------------------------------------------
// Polls: one position within an election.
// maxSelections = number of seats (1 for Chair/Deputy, 3 for Committee).
// ---------------------------------------------------------------------------
export const polls = pgTable(
  "polls",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    electionId: integer("election_id")
      .notNull()
      .references(() => elections.id, { onDelete: "restrict" }),
    position: text("position").notNull(),
    description: text("description"),
    maxSelections: integer("max_selections").default(1).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isRunoff: boolean("is_runoff").default(false).notNull(),
    runoffOfPollId: integer("runoff_of_poll_id").references((): AnyPgColumn => polls.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    unique("polls_election_position_unique").on(table.electionId, table.position),
    check("polls_max_selections_chk", sql`${table.maxSelections} >= 1`),
    check(
      "polls_runoff_chk",
      sql`(${table.isRunoff} = false AND ${table.runoffOfPollId} IS NULL)
       OR (${table.isRunoff} = true  AND ${table.runoffOfPollId} IS NOT NULL)`,
    ),
    index("polls_runoffOf_idx").on(table.runoffOfPollId),
  ],
);

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
export const candidates = pgTable(
  "candidates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nrc: text("nrc").notNull(),
    image: text("image"),
  },
  (table) => [
    index("candidates_pollId_idx").on(table.pollId),
    // Target for votes' composite FK (candidate must belong to the poll)
    unique("candidates_id_pollId_unique").on(table.id, table.pollId),
  ],
);

// ---------------------------------------------------------------------------
// Ballots: records THAT a user took part in a poll (no choices stored).
// castBallot inserts one row per poll in the election, even when the voter abstains.
// ---------------------------------------------------------------------------
export const ballots = pgTable(
  "ballots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    pollId: integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "restrict" }),
    castAt: timestamp("cast_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ballots_user_poll_uidx").on(table.userId, table.pollId),
    index("ballots_pollId_idx").on(table.pollId),
  ],
);

// ---------------------------------------------------------------------------
// Votes: one row per selected candidate. No userId, no timestamp, random id.
// "At most maxSelections per voter" and "no duplicate picks" are enforced in
// castBallot (the DB can't, by design: there's no link to the voter).
// Audit invariant per poll: count(votes) <= count(ballots) * maxSelections.
// ---------------------------------------------------------------------------
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.candidateId, table.pollId],
      foreignColumns: [candidates.id, candidates.pollId],
      name: "votes_candidate_poll_fk",
    }).onDelete("restrict"),
    index("votes_pollId_candidateId_idx").on(table.pollId, table.candidateId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const electionsRelations = relations(elections, ({ many }) => ({
  polls: many(polls),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  election: one(elections, {
    fields: [polls.electionId],
    references: [elections.id],
  }),
  candidates: many(candidates),
  ballots: many(ballots),
  votes: many(votes),
  runoffOf: one(polls, {
    fields: [polls.runoffOfPollId],
    references: [polls.id],
    relationName: "poll_runoff",
  }),
  runoffs: many(polls, { relationName: "poll_runoff" }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  poll: one(polls, { fields: [candidates.pollId], references: [polls.id] }),
  votes: many(votes),
}));

export const ballotsRelations = relations(ballots, ({ one }) => ({
  user: one(user, { fields: [ballots.userId], references: [user.id] }),
  poll: one(polls, { fields: [ballots.pollId], references: [polls.id] }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, { fields: [votes.pollId], references: [polls.id] }),
  candidate: one(candidates, {
    fields: [votes.candidateId, votes.pollId],
    references: [candidates.id, candidates.pollId],
  }),
}));
