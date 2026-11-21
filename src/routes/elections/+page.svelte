<!-- src/routes/elections/+page.svelte -->
<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Helper to determine badge color based on status
  function getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      upcoming: "badge-info",
      open: "badge-success",
      active: "badge-success", // Handle both 'open' and 'active' if your backend uses either
      ended: "badge-warning",
      closed: "badge-neutral",
    };
    return statusMap[status.toLowerCase()] || "badge-ghost";
  }

  function getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      upcoming: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      open: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      active: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      ended: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      closed: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>`,
    };
    return iconMap[status.toLowerCase()] || "";
  }
</script>

<svelte:head>
  <title>Active Elections | MSCZ Voting Portal</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="flex items-center gap-3 text-3xl font-bold text-base-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        Elections
      </h1>
      <p class="mt-1 text-base-content/60">
        View and participate in official MSCZ internal elections.
      </p>
    </div>
  </div>

  <!-- Account Status Alerts -->
  {#if data.needsNrc}
    <div class="alert alert-warning shadow-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <h3 class="font-bold">Action Required</h3>
        <div class="text-sm">
          To take part in elections, you must first
          <a href="/onboarding" class="link font-semibold link-warning underline"
            >add your National Registration Card (NRC)</a
          >.
        </div>
      </div>
    </div>
  {:else if !data.isVerified}
    <div class="alert alert-info shadow-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="h-6 w-6 shrink-0 stroke-current"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      <div>
        <h3 class="font-bold">Verification Pending</h3>
        <div class="text-sm">
          Your membership is currently awaiting verification by an MSCZ administrator. You will be
          able to vote as soon as your NRC is approved.
        </div>
      </div>
    </div>
  {/if}

  <!-- Elections List -->
  <div class="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
    {#if data.elections.length === 0}
      <!-- Empty State -->
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 class="mb-1 text-lg font-semibold text-base-content/80">No Elections Available</h3>
        <p class="max-w-sm text-sm text-base-content/60">
          There are currently no active, upcoming, or closed elections to display. Check back later
          or contact your administrator.
        </p>
      </div>
    {:else}
      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr class="border-b-2 border-base-300">
              <th class="font-semibold text-base-content/70">Election</th>
              <th class="hidden font-semibold text-base-content/70 md:table-cell">Voting Period</th>
              <th class="font-semibold text-base-content/70">Status</th>
              <th class="font-semibold text-base-content/70">Your Status</th>
              <th class="text-right font-semibold text-base-content/70">Action</th>
            </tr>
          </thead>
          <tbody>
            {#each data.elections as e (e.id)}
              <tr class="hover">
                <!-- Election Title -->
                <td>
                  <div class="font-semibold text-base-content">{e.title}</div>
                  <div class="mt-1 text-xs text-base-content/50 md:hidden">
                    {fmt.format(e.startsAt)} – {fmt.format(e.endsAt)}
                  </div>
                </td>

                <!-- Voting Period (Hidden on mobile, shown on desktop) -->
                <td class="hidden md:table-cell">
                  <div class="flex flex-col gap-1 text-sm text-base-content/80">
                    <div class="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5 text-base-content/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Opens: {fmt.format(e.startsAt)}
                    </div>
                    <div class="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5 text-base-content/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Closes: {fmt.format(e.endsAt)}
                    </div>
                  </div>
                </td>

                <!-- Status Badge -->
                <td>
                  <span class="badge {getStatusBadgeClass(e.status)} gap-1 text-xs">
                    {@html getStatusIcon(e.status)}
                    <span class="capitalize">{e.status}</span>
                  </span>
                </td>

                <!-- Voter Status -->
                <td>
                  {#if e.hasVoted}
                    <span class="flex items-center gap-1.5 text-sm font-medium text-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Voted
                    </span>
                  {:else if e.status === "open"}
                    <span class="flex items-center gap-1.5 text-sm font-medium text-warning">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Not voted yet
                    </span>
                  {:else}
                    <span class="text-sm text-base-content/40">—</span>
                  {/if}
                </td>

                <!-- Action Button -->
                <td class="text-right">
                  {#if e.status === "open"}
                    {#if e.hasVoted}
                      <a
                        href="/elections/{e.id}"
                        class="btn gap-1 btn-ghost text-success btn-sm hover:bg-success/10"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Ballot
                      </a>
                    {:else}
                      <a href="/elections/{e.id}" class="btn gap-1 shadow-sm btn-primary btn-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        Vote Now
                      </a>
                    {/if}
                  {:else if e.status === "closed"}
                    <a href="/elections/{e.id}/results" class="btn gap-1 btn-outline btn-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Results
                    </a>
                  {:else}
                    <a href="/elections/{e.id}" class="btn btn-ghost btn-sm"> View Details </a>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Helpful Footer Note -->
  {#if data.elections.length > 0}
    <div class="text-center text-sm text-base-content/50">
      <p>
        Need help? Contact the
        <a href="mailto:support@mscz.org.zm" class="link link-primary">MSCZ Technical Support</a>
        or review the
        <a href="/electoral-guidelines" class="link link-primary">Electoral Guidelines</a>.
      </p>
    </div>
  {/if}
</div>
