<!-- src/routes/elections/+page.svelte -->
<script lang="ts">
  import {
    AlignEndHorizontal,
    Archive,
    Calendar,
    CalendarCheck,
    CalendarX,
    CalendarX2,
    CircleAlert,
    CircleCheck,
    Clipboard,
    ClipboardCheck,
    Clock,
    Eye,
    Info,
    TriangleAlert,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  type StatusConfig = {
    class: string;
    icon: typeof Clock;
  };

  const statusMap: Record<string, StatusConfig> = {
    upcoming: { class: "badge-info", icon: Clock },
    open: { class: "badge-success", icon: CircleCheck },
    active: { class: "badge-success", icon: CircleCheck },
    ended: { class: "badge-warning", icon: CircleAlert },
    closed: { class: "badge-neutral", icon: Archive },
  };

  // Helper to determine badge color and icon based on status
  function getStatusConfig(status: string): StatusConfig {
    return statusMap[status.toLowerCase()] || { class: "badge-info", icon: Info };
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
        <ClipboardCheck class="size-7 stroke-[2.25] text-primary" />
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
      <TriangleAlert size={24} />
      <div>
        <h3 class="font-bold">Action Required</h3>
        <div class="text-sm">
          To take part in elections, you must first
          <a href="/onboarding" class="link font-semibold link-secondary underline"
            >add your National Registration Card (NRC)</a
          >.
        </div>
      </div>
    </div>
  {:else if !data.isVerified}
    <div class="alert alert-info shadow-md">
      <Info class="size-6 shrink-0 stroke-current" />
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
          <Clipboard class="size-8 text-base-content/40" />
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
              {@const status = getStatusConfig(e.status)}
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
                      <Calendar class="size-4 text-base-content/40" />
                      Opens: {fmt.format(e.startsAt)}
                    </div>
                    <div class="flex items-center gap-2">
                      <CalendarX2 class="size-4 text-base-content/40" />
                      Closes: {fmt.format(e.endsAt)}
                    </div>
                  </div>
                </td>

                <!-- Status Badge -->
                <td>
                  <span class={["badge gap-1 text-xs", status.class]}>
                    <status.icon size={14} class="stroke-[2.25]" />
                    <span class="capitalize">{e.status}</span>
                  </span>
                </td>

                <!-- Voter Status -->
                <td>
                  {#if e.hasVoted}
                    <span class="flex items-center gap-1.5 text-sm font-medium text-success">
                      <CircleCheck class="size-4" />
                      Voted
                    </span>
                  {:else if e.status === "open"}
                    <span class="flex items-center gap-1.5 text-sm font-medium text-warning">
                      <CircleAlert class="size-4" />

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
                        <Eye class="size-4" />
                        View Ballot
                      </a>
                    {:else}
                      <a href="/elections/{e.id}" class="btn gap-1 shadow-sm btn-primary btn-sm">
                        <Clipboard class="size-4" />
                        Vote Now
                      </a>
                    {/if}
                  {:else if e.status === "closed"}
                    <a href="/elections/{e.id}/results" class="btn gap-1 btn-outline btn-sm">
                      <!-- <Podium class="size-4" /> -->
                      <!-- <ChartColumnBig class="size-4" /> -->
                      <!-- <SlidersHorizontal class="size-4" /> -->
                      <!-- <ChartArea class="size-4" /> -->
                      <!-- <ChartBarBig class="size-4" /> -->
                      <AlignEndHorizontal class="size-4" />
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
