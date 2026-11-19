<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Svelte 5 state for form feedback
  let isSubmitting = $state(false);

  // Helper to determine badge color based on status
  function getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      draft: "badge-ghost",
      scheduled: "badge-info",
      active: "badge-success",
      closed: "badge-warning",
      archived: "badge-neutral",
    };
    return statusMap[status.toLowerCase()] || "badge-ghost";
  }

  // Helper to get status icon
  function getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      draft: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
      scheduled: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      active: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      closed: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      archived: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>`,
    };
    return iconMap[status.toLowerCase()] || "";
  }
</script>

<svelte:head>
  <title>Admin Dashboard · Elections | MCSZ</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
      Election Management
    </h1>
    <p class="mt-1 text-base-content/60">
      Create, monitor, and manage all MCSZ internal elections.
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
        {data.elections.filter((e) => e.status === "active").length}
      </div>
    </div>
  </div>
</div>

<!-- Pending Verification Alert -->
{#if data.pendingVerification > 0}
  <div class="mb-6 alert alert-warning shadow-lg">
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
    <div class="flex-1">
      <h3 class="font-bold">Verification Required</h3>
      <div class="text-sm">
        <strong>{data.pendingVerification}</strong>
        member{data.pendingVerification === 1 ? "" : "s"} awaiting accreditation verification.
      </div>
    </div>
    <a href="/admin/members?filter=pending" class="btn btn-sm btn-warning">
      Review Now
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
          d="M17 8l4 4m0 0l-4 4m4-4H3"
        />
      </svg>
    </a>
  </div>
{/if}

<!-- Elections List -->
<div class="card mb-8 border border-base-300 bg-base-100 shadow-md">
  <div class="card-body">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="card-title text-xl">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-base-content/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 text-base-content/40"
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
        <h3 class="mb-2 text-lg font-semibold text-base-content/80">No Elections Yet</h3>
        <p class="mb-4 max-w-md text-base-content/60">
          Get started by creating your first election using the form below. You can schedule it for
          later or start it immediately.
        </p>
        <a href="#create-election" class="btn btn-primary btn-sm">
          Create First Election
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
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 text-base-content/40"
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
                    {fmt.format(e.startsAt)}
                  </div>
                </td>
                <td class="text-sm">
                  <div class="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 text-base-content/40"
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
                    {fmt.format(e.endsAt)}
                  </div>
                </td>
                <td>
                  <span class="badge {getStatusBadgeClass(e.status)} gap-1">
                    {@html getStatusIcon(e.status)}
                    <span class="capitalize">{e.status}</span>
                  </span>
                </td>
                <td class="text-right">
                  <a href="/admin/elections/{e.id}" class="btn gap-1 btn-ghost btn-sm">
                    Manage
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
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
            placeholder="MCSZ Executive Committee Elections 2026"
            class="input-bordered input w-full bg-base-200/50 transition-colors focus:bg-base-100"
          />
          <label class="label">
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mr-2 h-4 w-4"
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
          <label class="label">
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
          <label class="label">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Create Election
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
