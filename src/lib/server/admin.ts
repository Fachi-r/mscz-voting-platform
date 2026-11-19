// src/lib/server/admin.ts
import { error, redirect } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import { elections } from "./db/schema";

/**
 * Defense in depth: hooks.server.ts already gates /admin, but every load and
 * action re-checks, so a future routing mistake can't expose admin actions.
 */
export function requireAdmin(locals: App.Locals) {
  const user = locals.user;
  if (!user) redirect(303, "/login");
  if (user.role !== "admin" || user.banned) error(403, "Admins only");
  return user;
}

/** Postgres error code, unwrapping Drizzle's `cause` chain. */
export function getPgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  if ("code" in err && typeof err.code === "string") return err.code;
  if ("cause" in err) return getPgErrorCode(err.cause);
  return undefined;
}

// Zambia is UTC+2 all year (no DST), so a fixed offset is safe.
const LUSAKA_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Parses a <input type="datetime-local"> value as Africa/Lusaka time. */
export function parseLusakaLocal(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/.exec(value);
  if (!m) return null;
  const d = new Date(`${m[1]}:00+02:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formats a Date for a datetime-local input, in Africa/Lusaka time. */
export function toLusakaInput(d: Date): string {
  return new Date(d.getTime() + LUSAKA_OFFSET_MS).toISOString().slice(0, 16);
}

/** upcoming | open | ended (window over, not yet closed) | closed. Uses the DB clock. */
export const electionStatusSql = sql<"upcoming" | "open" | "ended" | "closed">`CASE
  WHEN ${elections.isClosed} THEN 'closed'
  WHEN now() < ${elections.startsAt} THEN 'upcoming'
  WHEN now() >= ${elections.endsAt} THEN 'ended'
  ELSE 'open' END`;
