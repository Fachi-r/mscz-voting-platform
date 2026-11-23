<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import type { User } from "better-auth";
  import ThemeToggle from "./ThemeToggle.svelte";

  let { user }: { user: User } = $props();

  let isAdminRoute = $derived(page.url.pathname.startsWith("/admin"));

  function getInitials(name: string) {
    const res = name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("");

    return res;
  }
</script>

<!-- Navbar -->
{#if !isAdminRoute}
  <nav
    class="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/90 px-4 shadow-sm backdrop-blur-md md:px-8"
  >
    <div class="flex-1">
      <a href="/" class="btn gap-2 btn-ghost text-xl font-bold">
        <span class="text-2xl">🗳️</span>
        <div class="flex flex-col items-start leading-none">
          <span class="text-base">MSCZ</span>
          <span class="text-xs font-normal text-base-content/60">Voting Portal</span>
        </div>
      </a>
    </div>

    <!-- Theme Toggle -->
    <ThemeToggle />

    {#if !user}
      <ul class="flex-none gap-2">
        <a href="/login" class="btn hidden btn-ghost btn-sm sm:inline-flex">Voter Login</a>
        <a href="/login" class="btn btn-primary btn-sm">Returning Officer</a>
      </ul>
    {:else}
      <div class="flex gap-2">
        <div class="avatar avatar-placeholder">
          <div class="w-8 rounded-full bg-neutral text-neutral-content">
            <span class="text-sm font-bold uppercase">{getInitials(user.name)}</span>
          </div>
        </div>
        <form method="post" action="/?/signOut" use:enhance>
          <button class="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </div>
    {/if}
  </nav>
{/if}
