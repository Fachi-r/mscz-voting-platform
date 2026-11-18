import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  unique,
  foreignKey,
  check,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export * from "./auth.schema";

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------
export const polls = pgTable(
  "polls",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    position: text("position").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isClosed: boolean("is_closed").default(false).notNull(),
    isRunoff: boolean("is_runoff").default(false).notNull(),
    runoffOfPollId: integer("runoff_of_poll_id").references((): AnyPgColumn => polls.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("polls_window_chk", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "polls_runoff_chk",
      sql`(${table.isRunoff} = false AND ${table.runoffOfPollId} IS NULL)
       OR (${table.isRunoff} = true  AND ${table.runoffOfPollId} IS NOT NULL)`,
    ),
    index("polls_status_endsAt_idx").on(table.isClosed, table.endsAt),
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
    image: text("image"),
  },
  (table) => [
    // Target for votes' composite FK (candidate must belong to the poll)
    unique("candidates_id_pollId_unique").on(table.id, table.pollId),
    // No duplicate names in a poll (also covers lookups by pollId)
    unique("candidates_pollId_name_unique").on(table.pollId, table.name),
  ],
);

// ---------------------------------------------------------------------------
// Ballots: records THAT a user voted in a poll (no choice stored).
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
    // One vote per user per poll
    uniqueIndex("ballots_user_poll_uidx").on(table.userId, table.pollId),
    index("ballots_pollId_idx").on(table.pollId), // turnout counts
  ],
);

// ---------------------------------------------------------------------------
// Votes: records WHAT was chosen. Deliberately no userId and no timestamp,
// so a vote can't be tied back to a voter. Insert with a ballot in ONE transaction.
// ---------------------------------------------------------------------------
export const votes = pgTable(
  "votes",
  {
    // Random id (not sequential) so insertion order can't be matched to ballots.id
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id").notNull(),
  },
  (table) => [
    // candidate must belong to this poll (also implies the poll exists)
    foreignKey({
      columns: [table.candidateId, table.pollId],
      foreignColumns: [candidates.id, candidates.pollId],
      name: "votes_candidate_poll_fk",
    }).onDelete("restrict"),
    // Fast tallying
    index("votes_pollId_candidateId_idx").on(table.pollId, table.candidateId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const pollsRelations = relations(polls, ({ one, many }) => ({
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
  // composite: mirrors the composite foreign key
  candidate: one(candidates, {
    fields: [votes.candidateId, votes.pollId],
    references: [candidates.id, candidates.pollId],
  }),
}));
