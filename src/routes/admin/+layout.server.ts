// src/routes/admin/+layout.server.ts
import { requireAdmin } from "#lib/server/admin.ts";
import type { LayoutServerLoad } from "../$types";

export const load: LayoutServerLoad = ({ locals }) => {
  const admin = requireAdmin(locals);
  return { adminName: admin.name };
};
