import type { User, Session } from "better-auth";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

export interface AuthUser extends User {
  role: "admin" | "user";
  banned?: boolean;
  banReason?: string;
  banExpires?: Date;
}

export interface AuthSession extends Session {
  impersonatedBy?: string;
}

declare global {
  namespace App {
    interface Locals {
      user?: AuthUser;
      session?: AuthSession;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
