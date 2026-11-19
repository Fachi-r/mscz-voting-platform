// src/routes/admin/members/+page.server.ts
import { requireAdmin } from "#lib/server/admin.ts";
import { user } from "#lib/server/db/auth.schema.ts";
import { db } from "#lib/server/db/index.ts";
import { fail } from "@sveltejs/kit";
import { and, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ url, locals }) => {
  requireAdmin(locals);

  const q = url.searchParams.get("q")?.trim() ?? "";
  const filter = url.searchParams.get("filter") === "pending" ? "pending" : "all";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const conditions = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.nrc, pattern)),
    );
  }
  if (filter === "pending") {
    conditions.push(and(isNotNull(user.nrc), eq(user.isVerified, false), eq(user.banned, false)));
  }

  // Fetch one extra row to know whether a next page exists
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      nrc: user.nrc,
      isVerified: user.isVerified,
      banned: user.banned,
      role: user.role,
    })
    .from(user)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  return {
    members: rows.slice(0, PAGE_SIZE),
    hasNext: rows.length > PAGE_SIZE,
    page,
    q,
    filter,
  };
};

async function setVerified(request: Request, locals: App.Locals, value: boolean) {
  requireAdmin(locals);
  const userId = String((await request.formData()).get("userId") ?? "");
  if (!userId) return fail(400, { message: "Missing member." });

  // A member can only be verified once they've supplied an NRC
  const updated = await db
    .update(user)
    .set({ isVerified: value })
    .where(and(eq(user.id, userId), value ? isNotNull(user.nrc) : undefined))
    .returning({ id: user.id });

  if (updated.length === 0) {
    return fail(400, { message: "That member has no NRC on file yet." });
  }
  return { success: true as const };
}

export const actions: Actions = {
  verify: ({ request, locals }) => setVerified(request, locals, true),
  unverify: ({ request, locals }) => setVerified(request, locals, false),
};
