import { sequence, type Handle } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { auth } from "#lib/server/auth.ts";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { redirect } from "@sveltejs/kit";

// 1. Load the session onto event.locals for every request
const handleBetterAuth: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

// 2. Gate /admin routes. Role is checked server-side on every request.
const guardAdmin: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/admin")) {
    const user = event.locals.user;
    if (!user) redirect(303, "/login");
    if (user.role !== "admin" || user.banned) redirect(303, "/");
  }
  return resolve(event);
};

export const handle: Handle = sequence(guardAdmin, handleBetterAuth);
