// src/routes/onboarding/+page.server.ts
import { getPgErrorCode } from "#lib/server/admin.ts";
import { user } from "#lib/server/db/auth.schema.ts";
import { db } from "#lib/server/db/index.ts";
import { fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const NRC_PATTERN = /^\d{6}\/\d{2}\/\d$/;

/** Accepts "123456/78/1", "123456781" or with spaces; returns canonical form or null. */
function normalizeNrc(raw: string): string | null {
  const compact = raw.replace(/\s/g, "");
  const formatted = /^\d{9}$/.test(compact)
    ? `${compact.slice(0, 6)}/${compact.slice(6, 8)}/${compact.slice(8)}`
    : compact;
  return NRC_PATTERN.test(formatted) ? formatted : null;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, "/login");

  // Read fresh from the DB: the session's copy can be stale right after saving
  const [me] = await db
    .select({ nrc: user.nrc, isVerified: user.isVerified })
    .from(user)
    .where(eq(user.id, locals.user.id));

  return { nrc: me?.nrc ?? null, isVerified: me?.isVerified ?? false };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    if (!locals.user) redirect(303, "/login");

    const raw = String((await request.formData()).get("nrc") ?? "");
    const nrc = normalizeNrc(raw);
    if (!nrc) {
      return fail(400, {
        message: "Enter your NRC in the format 123456/78/1.",
      });
    }

    try {
      // The WHERE clause makes "verified NRCs are locked" atomic: if an admin
      // verifies the account between page load and submit, nothing is updated.
      const updated = await db
        .update(user)
        .set({ nrc })
        .where(and(eq(user.id, locals.user.id), eq(user.isVerified, false)))
        .returning({ id: user.id });

      if (updated.length === 0) {
        return fail(403, {
          message: "Your NRC is already verified and can't be changed. Contact an administrator.",
        });
      }
    } catch (e) {
      if (getPgErrorCode(e) === "23505") {
        return fail(409, {
          message:
            "That NRC is already registered to another account. If this is a mistake, contact an administrator.",
        });
      }
      throw e;
    }

    return { success: true as const, nrc };
  },
};
