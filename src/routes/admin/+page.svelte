<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Archive,
    ArrowDown,
    ArrowRight,
    Calendar,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    CirclePlus,
    Clipboard,
    ClipboardCheck,
    Clock,
    Info,
    List,
    SquarePen,
    TriangleAlert,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  let isSubmitting = $state(false);

  type StatusConfig = {
    class: string;
    icon: typeof Clock;
  };

  const statusMap: Record<string, StatusConfig> = {
    draft: { class: "badge-ghost", icon: SquarePen },
    scheduled: { class: "badge-info", icon: Clock },
    active: { class: "badge-success", icon: CircleCheck },
    closed: { class: "badge-warning", icon: CircleAlert },
    // closed: { class: "badge-neutral", icon: Archive },
    archived: { class: "badge-neutral", icon: Archive },

    upcoming: { class: "badge-info", icon: Clock },
    open: { class: "badge-success", icon: CircleCheck },
    ended: { class: "badge-warning", icon: CircleAlert },
  };

  function getStatusConfig(status: string): StatusConfig {
    return statusMap[status.toLowerCase()] || { class: "badge-neutral", icon: Info };
  }
</script>

<svelte:head>
  <title>Admin Dashboard · Elections | MSCZ</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 class="flex items-center gap-3 text-3xl font-bold text-base-content">
      <ClipboardCheck class="size-8 text-primary" />
      Election Management
    </h1>
    <p class="mt-1 text-base-content/60">
      Create, monitor, and manage all MSCZ internal elections.
    </p>
  </div>

  <!-- Quick Stats -->
  <div class="stats stats-vertical border border-base-300 bg-base-100 shadow md:stats-horizontal">
    <div class="stat">
      <div class="stat-title text-xs">Total Elections</div>
      <div class="stat-value text-2xl text-primary">
        {data.elections.length}
      </div>
    </div>
    <div class="stat">
      <div class="stat-title text-xs">Active Now</div>
      <div class="stat-value text-2xl text-success">
        {data.elections.filter((e) => e.status === "open").length}
      </div>
    </div>
  </div>
</div>

<!-- Pending Verification Alert -->
{#if data.pendingVerification > 0}
  <div class="mb-6 alert alert-warning shadow-lg">
    <TriangleAlert class="size-6 shrink-0 stroke-current" />
    <div class="flex-1">
      <h3 class="font-bold">Verification Required</h3>
      <div class="text-sm">
        <strong>{data.pendingVerification}</strong>
        member{data.pendingVerification === 1 ? "" : "s"} awaiting accreditation verification.
      </div>
    </div>
    <a href="/admin/members?filter=pending" class="btn btn-sm btn-warning">
      Review Now
      <ArrowRight class="size-4" />
    </a>
  </div>
{/if}

<!-- Elections List -->
<div class="card mb-8 border border-base-300 bg-base-100 shadow-md">
  <div class="card-body">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="card-title text-xl">
        <List class="size-5 text-base-content/60" />
        All Elections
      </h2>
      {#if data.elections.length > 0}
        <div class="badge badge-outline badge-lg">
          {data.elections.length} total
        </div>
      {/if}
    </div>

    {#if data.elections.length === 0}
      <!-- Empty State -->
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-base-200">
          <Clipboard class="h-10 w-10 text-base-content/40" />
        </div>
        <h3 class="mb-2 text-lg font-semibold text-base-content/80">No Elections Yet</h3>
        <p class="mb-4 max-w-md text-base-content/60">
          Get started by creating your first election using the form below. You can schedule it for
          later or start it immediately.
        </p>
        <a href="#create-election" class="btn btn-primary btn-sm">
          Create First Election
          <ArrowDown class="size-4" />
        </a>
      </div>
    {:else}
      <!-- Elections Table -->
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr class="border-b-2 border-base-300">
              <th class="font-semibold text-base-content/70">Election</th>
              <th class="font-semibold text-base-content/70">Opens</th>
              <th class="font-semibold text-base-content/70">Closes</th>
              <th class="font-semibold text-base-content/70">Status</th>
              <th class="text-right font-semibold text-base-content/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each data.elections as e (e.id)}
              {@const status = getStatusConfig(e.status)}
              <tr class="hover">
                <td>
                  <a
                    href="/admin/elections/{e.id}"
                    class="link font-semibold link-primary hover:link-hover"
                  >
                    {e.title}
                  </a>
                  {#if e.description}
                    <div class="mt-1 line-clamp-1 text-xs text-base-content/50">
                      {e.description}
                    </div>
                  {/if}
                </td>
                <td class="text-sm">
                  <div class="flex items-center gap-2">
                    <Calendar class="size-4 text-base-content/60" />
                    {fmt.format(e.startsAt)}
                  </div>
                </td>
                <td class="text-sm">
                  <div class="flex items-center gap-2">
                    <Clock class="size-4 text-base-content/60" />
                    {fmt.format(e.endsAt)}
                  </div>
                </td>
                <td>
                  <span class={["badge gap-1", status.class]}>
                    <status.icon class="size-3" />
                    <span class="capitalize">{e.status}</span>
                  </span>
                </td>
                <td class="text-right">
                  <a href="/admin/elections/{e.id}" class="btn gap-1 btn-ghost btn-sm">
                    Manage
                    <ChevronRight class="size-4" />
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Create Election Form -->
<div id="create-election" class="card border border-base-300 bg-base-100 shadow-lg">
  <div class="card-body">
    <div class="mb-6 flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <CirclePlus class="size-5 text-primary" />
      </div>
      <div>
        <h2 class="card-title text-xl">Create New Election</h2>
        <p class="text-sm text-base-content/60">
          Set up a new election with candidates and voting periods.
        </p>
      </div>
    </div>

    <form method="POST" action="?/create" use:enhance class="space-y-6">
      <!-- Basic Information -->
      <div class="space-y-4">
        <div class="form-control">
          <label class="label" for="title">
            <span class="label-text font-semibold">Election Title</span>
            <span class="label-text-alt text-base-content/50">Required</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxlength="200"
            placeholder="MSCZ Executive Committee Elections 2026"
            class="input-bordered input w-full bg-base-200/50 transition-colors focus:bg-base-100"
          />
          <label class="label" for="title">
            <span class="label-text-alt text-base-content/50">Maximum 200 characters</span>
          </label>
        </div>

        <div class="form-control">
          <label class="label" for="description">
            <span class="label-text font-semibold">Description</span>
            <span class="label-text-alt text-base-content/50">Optional</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows="3"
            placeholder="Brief description of this election's purpose and scope..."
            class="textarea-bordered textarea w-full bg-base-200/50 transition-colors focus:bg-base-100"
          ></textarea>
        </div>
      </div>

      <!-- Date & Time Section -->
      <div class="divider text-sm text-base-content/40">
        <Calendar class="mr-2 size-4" />
        Voting Period (Africa/Lusaka Timezone)
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="form-control">
          <label class="label" for="startsAt">
            <span class="label-text font-semibold">Opens</span>
            <span class="label-text-alt text-base-content/50">Required</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            class="input-bordered input w-full bg-base-200/50 transition-colors focus:bg-base-100"
          />
          <label class="label" for="startsAt">
            <span class="label-text-alt text-base-content/50">When voting begins</span>
          </label>
        </div>

        <div class="form-control">
          <label class="label" for="endsAt">
            <span class="label-text font-semibold">Closes</span>
            <span class="label-text-alt text-base-content/50">Required</span>
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            class="input-bordered input w-full bg-base-200/50 transition-colors focus:bg-base-100"
          />
          <label class="label" for="endsAt">
            <span class="label-text-alt text-base-content/50">When voting ends</span>
          </label>
        </div>
      </div>

      <!-- Standard Positions -->
      <div class="form-control">
        <label
          class="label cursor-pointer justify-start gap-3 rounded-lg bg-base-200/30 p-4 transition-colors hover:bg-base-200/50"
        >
          <input
            type="checkbox"
            name="standardPositions"
            checked
            class="checkbox checkbox-primary"
          />
          <div class="flex-1">
            <div class="label-text font-semibold">Add Standard Executive Positions</div>
            <div class="mt-1 text-sm text-base-content/60">
              Automatically create seats for: <span class="font-medium text-base-content/80"
                >Chairperson</span
              >,
              <span class="font-medium text-base-content/80">Deputy Chairperson</span>, and
              <span class="font-medium text-base-content/80">Committee Member</span> (3 seats total)
            </div>
          </div>
        </label>
      </div>

      <!-- Error Message -->
      {#if form?.message}
        <div class="alert alert-error" role="alert">
          <CircleAlert class="size-6 shrink-0 stroke-current" />
          <span>{form.message}</span>
        </div>
      {/if}

      <!-- Submit Button -->
      <div class="card-actions justify-end border-t border-base-300 pt-4">
        <button type="submit" class="btn gap-2 btn-primary" disabled={isSubmitting}>
          {#if isSubmitting}
            <span class="loading loading-sm loading-spinner"></span>
            Creating Election...
          {:else}
            <CirclePlus class="size-5" />
            Create Election
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
