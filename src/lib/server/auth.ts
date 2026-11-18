import {
  BETTER_AUTH_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  ORIGIN,
} from "$app/env/private";

import { db } from "#lib/server/db/index.ts";
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins";
import { sveltekitCookies } from "better-auth/svelte-kit";

export const auth = betterAuth({
  baseURL: ORIGIN,
  secret: BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    },
    google: {
      prompt: "select_account",
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      nrc: { type: "string", required: false, input: true },
      isVerified: { type: "boolean", defaultValue: false, input: false }, // critical
    },
  },
  plugins: [
    admin({
      defaultRole: "voter",
    }),
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
});
