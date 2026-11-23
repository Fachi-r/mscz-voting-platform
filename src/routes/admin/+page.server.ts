// src/routes/admin/+page.server.ts
import { electionStatusSql, parseLusakaLocal, requireAdmin } from "#lib/server/admin.ts";
import { user } from "#lib/server/db/auth.schema.ts";
import { db } from "#lib/server/db/index.ts";
import { elections, polls } from "#lib/server/db/schema.ts";
import { fail, redirect } from "@sveltejs/kit";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const STANDARD_POSITIONS = [
  { position: "Chair", maxSelections: 1 },
  { position: "Deputy Chair", maxSelections: 1 },
  { position: "Committee Member", maxSelections: 3 },
];

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals);

  const electionList = await db
    .select({
      id: elections.id,
      title: elections.title,
      description: elections.description,
      startsAt: elections.startsAt,
      endsAt: elections.endsAt,
      status: electionStatusSql,
    })
    .from(elections)
    .orderBy(desc(elections.startsAt));

  const [pending] = await db
    .select({ n: count() })
    .from(user)
    .where(and(isNotNull(user.nrc), eq(user.isVerified, false), eq(user.banned, false)));

  return { elections: electionList, pendingVerification: pending?.n ?? 0 };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals);

    const f = await request.formData();
    const title = String(f.get("title") ?? "").trim();
    const description = String(f.get("description") ?? "").trim() || null;
    const startsAt = parseLusakaLocal(f.get("startsAt"));
    const endsAt = parseLusakaLocal(f.get("endsAt"));
    const addStandard = f.get("standardPositions") === "on";

    if (!title || title.length > 200) {
      return fail(400, { message: "Enter a title (max 200 characters)." });
    }
    if (!startsAt || !endsAt) {
      return fail(400, { message: "Enter valid start and end times." });
    }
    if (endsAt <= startsAt) {
      return fail(400, {
        message: "The end time must be after the start time.",
      });
    }

    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(elections)
        .values({ title, description, startsAt, endsAt })
        .returning({ id: elections.id });

      if (addStandard) {
        await tx.insert(polls).values(
          STANDARD_POSITIONS.map((p, i) => ({
            electionId: created.id,
            position: p.position,
            maxSelections: p.maxSelections,
            displayOrder: i,
          })),
        );
      }
      return created.id;
    });

    redirect(303, `/admin/elections/${id}`);
  },
};
