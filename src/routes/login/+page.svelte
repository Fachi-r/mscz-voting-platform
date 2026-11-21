<script lang="ts">
  import { enhance } from "$app/forms";
  import { Mail, Lock, setLucideProps, User, IdCard, Hash } from "@lucide/svelte";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();

  // Svelte 5 state for form submission feedback
  let isSubmitting = $state(false);
  let activeAction = $state<string | null>(null);

  setLucideProps({
    size: 22,
    class: "text-base-content/50",
  });
</script>

<svelte:head>
  <title>Secure Login | MCSZ Voting Portal</title>
</svelte:head>

<div
  class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base-200 p-4"
>
  <!-- Subtle background pattern -->
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(#444cf7_1px,transparent_1px)] bg-size-[24px_24px] opacity-[0.03]"
  ></div>

  <div class="z-10 w-full max-w-md">
    <!-- Header / Branding -->
    <div class="mb-8 text-center">
      <div
        class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-base-content">MCSZ Voting Portal</h1>
      <p class="mt-2 text-base-content/60">
        Secure access for accredited members and returning officers.
      </p>
    </div>

    <!-- Form Feedback Message -->
    {#if form?.message}
      <div class="mb-6 alert animate-pulse alert-error shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          /></svg
        >
        <span>{form.message}</span>
      </div>
    {/if}

    <!-- Main Auth Card -->
    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body p-6 md:p-8">
        <!-- Email / Password Form -->
        <form method="POST" action="?/signInEmail" use:enhance class="grid space-y-4">
          <!-- Email Field -->
          <div>
            <span class="label-text font-medium">Email Address</span>
            <label class="input transition-colors">
              <Mail />

              <input
                type="email"
                name="email"
                placeholder="name@mcsz.org.zm"
                class="grow bg-transparent"
                required
              />
            </label>
          </div>

          <!-- Password Field -->
          <div class="form-control">
            <span class="label-text font-medium">Password</span>
            <a href="/forgot-password" class="label-text-alt link link-primary hover:link-secondary"
              >Forgot password?</a
            >
            <label class="input transition-colors">
              <Lock />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                class="grow bg-transparent"
                required
              />
            </label>
          </div>

          <!-- Name Field (Only visually prominent if registering, but kept in form for scaffolding) -->
          <div class="form-control">
            <span class="label-text font-medium"
              >Full Name <span class="font-normal text-base-content/40"
                >(Required for new registration)</span
              ></span
            >
            <label class="input transition-colors">
              <User />
              <input type="text" name="name" placeholder="John Doe" class="grow bg-transparent" />
            </label>
          </div>

          <!-- MCSZ Membership Number (Only visually prominent if registering, but kept in form for scaffolding) -->
          <div class="form-control">
            <span class="label-text font-medium"
              >MCSZ Membership Number <span class="font-normal text-base-content/40"
                >(Required for new registration)</span
              ></span
            >
            <label class="input transition-colors">
              <IdCard />
              <input
                type="text"
                name="mcszMembershipNumber"
                placeholder="MCSZ-2021-1234"
                class="grow bg-transparent"
              />
            </label>
          </div>

          <!-- NRC Number -->
          <div class="form-control">
            <span class="label-text font-medium">NRC Number </span>
            <label class="input transition-colors">
              <Hash />
              <input type="text" name="nrc" placeholder="123456/78/9" class="grow bg-transparent" />
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="form-control mt-6 space-y-3">
            <button
              type="submit"
              class="btn w-full shadow-md shadow-primary/20 btn-primary"
              disabled={isSubmitting && activeAction === "?/signInEmail"}
            >
              {#if isSubmitting && activeAction === "?/signInEmail"}
                <span class="loading loading-sm loading-spinner"></span>
                Signing In...
              {:else}
                Sign In
              {/if}
            </button>

            <button
              formaction="?/signUpEmail"
              type="submit"
              class="btn w-full btn-outline btn-primary"
              disabled={isSubmitting && activeAction === "?/signUpEmail"}
            >
              {#if isSubmitting && activeAction === "?/signUpEmail"}
                <span class="loading loading-sm loading-spinner"></span>
                Registering...
              {:else}
                Create New Account
              {/if}
            </button>
          </div>
        </form>

        <!-- Divider -->
        <div class="divider my-6 text-sm text-base-content/40">or continue with</div>

        <!-- Social Login Forms -->
        <div class="grid gap-2">
          <form method="POST" action="?/signInSocial" use:enhance class="m-0">
            <input type="hidden" name="provider" value="github" />
            <input type="hidden" name="callbackURL" value="/" />
            <button type="submit" class="btn w-full gap-3" disabled={isSubmitting}>
              <!-- GitHub Icon -->
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clip-rule="evenodd"
                />
              </svg>
              {#if isSubmitting && activeAction === "?/signInSocial"}
                <span class="loading loading-xs loading-spinner"></span>
              {/if}
              Sign in with GitHub
            </button>
          </form>

          <form method="POST" action="?/signInSocial" use:enhance class="m-0">
            <input type="hidden" name="provider" value="google" />
            <input type="hidden" name="callbackURL" value="/" />
            <button type="submit" class="btn w-full gap-3" disabled={isSubmitting}>
              <!-- Google Icon -->
              <svg class="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {#if isSubmitting && activeAction === "?/signInSocial"}
                <span class="loading loading-xs loading-spinner"></span>
              {/if}
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="mt-8 space-y-2 text-center">
      <p class="text-sm text-base-content/50">
        Protected by end-to-end encryption.
        <a href="/privacy" class="link link-primary">Privacy Policy</a> •
        <a href="/support" class="link link-primary">Technical Support</a>
      </p>
      <p class="text-xs text-base-content/30">
        © {new Date().getFullYear()} Media Self-Regulation Council of Zambia
      </p>
    </div>
  </div>
</div>

<style>
  .input {
    width: 100%;
  }
</style>
