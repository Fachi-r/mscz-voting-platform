import { auth } from "#lib/server/auth.ts";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import { APIError } from "better-auth/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = (event) => {
  const user = event.locals.user;
  if (!user) return;

  const location = user.role === "admin" ? "/admin" : "/";

  return redirect(302, location);
};

export const actions: Actions = {
  signInEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
          callbackURL: "/auth/verification-success",
        },
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Signin failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }

    return redirect(302, "/");
  },
  signUpEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const name = formData.get("name")?.toString() ?? "";
    const msczMembershipNumber = formData.get("msczMembershipNumber")?.toString() ?? "";
    const nrc = formData.get("nrc")?.toString() ?? "";

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          nrc,
          msczMembershipNumber,
          callbackURL: "/auth/verification-success",
        },
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Registration failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }

    return redirect(302, "/");
  },
  signInSocial: async (event) => {
    const formData = await event.request.formData();
    const provider = formData.get("provider")?.toString() ?? "github";
    const callbackURL = formData.get("callbackURL")?.toString() ?? "/";

    const result = await auth.api.signInSocial({
      body: {
        provider: provider as "github",
        callbackURL,
      },
    });

    if (result.url) {
      return redirect(302, result.url, { external: true });
    }
    return fail(400, { message: "Social sign-in failed" });
  },
};
