<!-- src/routes/admin/elections/[id]/+page.svelte -->
<script lang="ts">
  import { enhance, type SubmitFunction } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Confirmation wrapper for destructive actions
  const confirmFirst = (message: string): SubmitFunction => {
    return ({ cancel }) => {
      if (!confirm(message)) cancel();
    };
  };

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
  <title>{data.election.title} · MCSZ Admin</title>
</svelte:head>

<!-- Breadcrumb & Header -->
<div class="mb-8">
  <div class="breadcrumbs mb-4 text-sm text-base-content/60">
    <ul>
      <li><a href="/admin" class="hover:text-primary">Elections</a></li>
      <li class="font-semibold text-base-content">{data.election.title}</li>
    </ul>
  </div>

  <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
    <div>
      <h1 class="flex flex-wrap items-center gap-3 text-3xl font-bold text-base-content">
        {data.election.title}
        <span class="badge {getStatusBadgeClass(data.election.status)} gap-1 text-sm">
          {@html getStatusIcon(data.election.status)}
          <span class="capitalize">{data.election.status}</span>
        </span>
      </h1>
      {#if data.election.description}
        <p class="mt-2 max-w-3xl text-base-content/70">
          {data.election.description}
        </p>
      {/if}
      <p class="mt-2 flex items-center gap-2 text-sm text-base-content/50">
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {fmt.format(data.election.startsAt)} → {fmt.format(data.election.endsAt)} (Africa/Lusaka)
      </p>
    </div>
  </div>
</div>

<!-- Global Form Feedback -->
{#if form?.message}
  <div class="mb-6 alert alert-error shadow-lg" role="alert">
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
{#if form?.success}
  <div class="mb-6 alert alert-success shadow-lg" role="status">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6 shrink-0 stroke-current"
      fill="none"
      viewBox="0 0 24 24"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      /></svg
    >
    <span>{form.success}</span>
  </div>
{/if}

<!-- Turnout Stats -->
<div class="card mb-6 border border-base-300 bg-base-100 shadow-md">
  <div class="card-body">
    <h2 class="mb-4 card-title flex items-center gap-2 text-lg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-primary"
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
      Live Turnout
    </h2>
    <div class="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
      <div class="md:col-span-2">
        <div class="mb-2 flex justify-between text-sm">
          <span class="font-semibold">{data.voters} voted</span>
          <span class="text-base-content/60">of {data.eligible} eligible members</span>
        </div>
        <progress
          class="progress h-4 w-full progress-primary"
          value={data.voters}
          max={data.eligible > 0 ? data.eligible : 1}
        ></progress>
        <div class="mt-1 text-right text-sm font-bold text-primary">
          {data.eligible > 0 ? Math.round((data.voters / data.eligible) * 100) : 0}% Participation
        </div>
      </div>
      <div class="rounded-lg bg-base-200 p-4 text-center">
        <p class="text-xs font-semibold tracking-wider text-base-content/60 uppercase">Status</p>
        <p class="mt-1 text-sm text-base-content/80">
          {data.election.isClosed
            ? "Voting is closed. Results are published."
            : "Results remain hidden until the election is officially closed."}
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Locked Warning -->
{#if data.locked && !data.election.isClosed}
  <div class="mb-6 alert alert-warning shadow-md">
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
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
    <div>
      <h3 class="font-bold">Election Locked</h3>
      <div class="text-sm">
        Ballots have been cast. Positions, candidates, and dates are now locked to protect the
        integrity of the vote.
      </div>
    </div>
  </div>
{/if}

<!-- Update Dates (Only if not locked) -->
{#if !data.locked}
  <div class="card mb-6 border border-base-300 bg-base-100 shadow-md">
    <div class="card-body">
      <h2 class="mb-4 card-title text-lg">Update Voting Window</h2>
      <form method="POST" action="?/updateDates" use:enhance>
        <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="form-control">
            <label class="label" for="startsAt"
              ><span class="label-text font-medium">Opens (Lusaka Time)</span></label
            >
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              value={data.election.startsInput}
              required
              class="input-bordered input w-full"
            />
          </div>
          <div class="form-control">
            <label class="label" for="endsAt"
              ><span class="label-text font-medium">Closes (Lusaka Time)</span></label
            >
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={data.election.endsInput}
              required
              class="input-bordered input w-full"
            />
          </div>
        </div>
        <div class="card-actions justify-end">
          <button type="submit" class="btn btn-primary btn-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              /></svg
            >
            Update Dates
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Positions and Candidates -->
<div class="mb-6">
  <h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-base-content">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
    Positions & Candidates
  </h2>

  {#if data.polls.length === 0}
    <div class="alert alert-info">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="h-6 w-6 shrink-0 stroke-current"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path></svg
      >
      <span>No positions have been added to this election yet.</span>
    </div>
  {:else}
    <div class="space-y-6">
      {#each data.polls as poll (poll.id)}
        <div class="card border border-base-300 bg-base-100 shadow-md">
          <div class="card-body">
            <!-- Position Header -->
            <div
              class="mb-4 flex flex-col justify-between gap-4 border-b border-base-300 pb-4 sm:flex-row sm:items-center"
            >
              <h3 class="m-0 flex items-center gap-2 text-xl font-bold text-base-content">
                {poll.position}
                <span class="badge badge-outline badge-sm font-normal">
                  {poll.maxSelections} seat{poll.maxSelections === 1 ? "" : "s"}
                </span>
              </h3>
              {#if !data.locked}
                <form
                  method="POST"
                  action="?/deletePoll"
                  use:enhance={confirmFirst(
                    `Delete "${poll.position}" and all its candidates? This cannot be undone.`,
                  )}
                >
                  <input type="hidden" name="pollId" value={poll.id} />
                  <button type="submit" class="btn gap-1 btn-error btn-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      /></svg
                    >
                    Delete Position
                  </button>
                </form>
              {/if}
            </div>

            <!-- Candidates List -->
            {#if poll.candidates.length === 0}
              <p class="mb-4 text-base-content/50 italic">No candidates added yet.</p>
            {:else}
              <div class="mb-4 overflow-x-auto">
                <table class="table table-sm">
                  <tbody>
                    {#each poll.candidates as c (c.id)}
                      <tr class="hover">
                        <td class="font-medium">{c.name}</td>
                        <td class="text-sm text-base-content/60">
                          {#if c.image}
                            <a
                              href={c.image}
                              target="_blank"
                              class="flex link items-center gap-1 link-primary"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                /></svg
                              >
                              View Photo
                            </a>
                          {:else}
                            <span class="text-base-content/30">No photo</span>
                          {/if}
                        </td>
                        <td class="text-right">
                          {#if !data.locked}
                            <form
                              method="POST"
                              action="?/deleteCandidate"
                              use:enhance={confirmFirst(`Remove candidate "${c.name}"?`)}
                            >
                              <input type="hidden" name="candidateId" value={c.id} />
                              <button
                                type="submit"
                                class="btn btn-ghost text-error btn-xs hover:bg-error/10"
                              >
                                Remove
                              </button>
                            </form>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

            <!-- Add Candidate Form -->
            {#if !data.locked}
              <form
                method="POST"
                action="?/addCandidate"
                use:enhance
                class="rounded-lg bg-base-200/50 p-4"
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
                  <div class="form-control md:col-span-3">
                    <label for="name-{poll.id}" class="label py-1"
                      ><span class="label-text text-xs font-semibold uppercase">Candidate Name</span
                      ></label
                    >
                    <input
                      id="name-{poll.id}"
                      name="name"
                      required
                      maxlength="120"
                      placeholder="e.g., Jane Mwamba"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>
                  <div class="form-control md:col-span-3">
                    <label for="nrc-{poll.id}" class="label py-1"
                      ><span class="label-text text-xs font-semibold uppercase">Candidate NRC</span
                      ></label
                    >
                    <input
                      id="nrc-{poll.id}"
                      name="nrc"
                      required
                      maxlength="11"
                      placeholder="123456/78/9"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>
                  <div class="form-control md:col-span-3">
                    <label for="image-{poll.id}" class="label py-1"
                      ><span class="label-text text-xs font-semibold uppercase"
                        >Photo URL (Optional)</span
                      ></label
                    >
                    <input
                      id="image-{poll.id}"
                      name="image"
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>
                  <div class="md:col-span-2">
                    <button type="submit" class="btn w-full gap-1 btn-primary btn-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4v16m8-8H4"
                        /></svg
                      >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Add Position Form -->
  {#if !data.locked}
    <div class="card mt-6 border border-dashed border-base-300 bg-base-100 shadow-md">
      <div class="card-body">
        <h3 class="mb-4 card-title text-base">Add New Position</h3>
        <form method="POST" action="?/addPoll" use:enhance>
          <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            <div class="form-control md:col-span-7">
              <label for="position" class="label py-1"
                ><span class="label-text font-medium">Position Title</span></label
              >
              <input
                id="position"
                name="position"
                required
                maxlength="100"
                placeholder="e.g., Committee Member"
                class="input-bordered input w-full"
              />
            </div>
            <div class="form-control md:col-span-3">
              <label for="maxSelections" class="label py-1"
                ><span class="label-text font-medium">Seats Available</span></label
              >
              <input
                id="maxSelections"
                name="maxSelections"
                type="number"
                min="1"
                max="20"
                value="1"
                class="input-bordered input w-full"
              />
            </div>
            <div class="md:col-span-2">
              <button type="submit" class="btn w-full gap-1 btn-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  /></svg
                >
                Add Position
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<!-- Close Election (Danger Zone) -->
{#if !data.election.isClosed}
  <div class="card mb-6 border border-error/20 bg-error/5 shadow-sm">
    <div class="card-body">
      <h2 class="card-title flex items-center gap-2 text-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Close Election
      </h2>
      <p class="max-w-3xl text-base-content/80">
        Closing ends voting immediately and publishes the results. <strong
          >This action cannot be undone.</strong
        >
        {#if data.election.status === "ended"}
          <span class="mt-2 block font-medium text-error"
            >The voting window has already ended. You should close it now to reveal results.</span
          >
        {/if}
      </p>
      <div class="mt-2 card-actions justify-end">
        <form
          method="POST"
          action="?/close"
          use:enhance={confirmFirst(
            "⚠️ CLOSE ELECTION? Voting will end immediately and results will be revealed. This CANNOT be undone.",
          )}
        >
          <button type="submit" class="btn gap-2 btn-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            Close Election & Reveal Results
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Results Section -->
{#if data.results}
  <div class="mb-6">
    <h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-base-content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 text-success"
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
      Official Results
    </h2>

    <div class="space-y-6">
      {#each data.results as r (r.pollId)}
        <div class="card border border-base-300 bg-base-100 shadow-md">
          <div class="card-body">
            <div class="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <h3 class="text-xl font-bold text-base-content">{r.position}</h3>
              <div class="flex gap-2">
                <span class="badge badge-outline"
                  >{r.ballots} voter{r.ballots === 1 ? "" : "s"}</span
                >
                <span class="badge badge-outline">{r.seats} seat{r.seats === 1 ? "" : "s"}</span>
                {#if r.abstentions !== null}
                  <span class="badge badge-ghost">{r.abstentions} abstained</span>
                {/if}
              </div>
            </div>

            <!-- Integrity Warnings -->
            {#if r.tie}
              <div class="mb-4 alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  /></svg
                >
                <span
                  ><strong>Tie Detected:</strong> A runoff is needed between the tied candidates for the
                  last seat.</span
                >
              </div>
            {/if}
            {#if !r.auditOk}
              <div class="mb-4 alert alert-error">
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
                <span
                  ><strong>Integrity Check Failed:</strong> There are more votes than ballots × seats
                  allow. Investigate before announcing results.</span
                >
              </div>
            {/if}

            <!-- Results Table -->
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr class="bg-base-200">
                    <th class="font-semibold">Candidate</th>
                    <th class="text-right font-semibold">Votes</th>
                    <th class="text-right font-semibold">% of Voters</th>
                    <th class="text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each r.rows as row (row.id)}
                    <tr class="hover {row.status === 'elected' ? 'bg-success/5' : ''}">
                      <td class="font-medium {row.status === 'elected' ? 'text-success' : ''}"
                        >{row.name}</td
                      >
                      <td class="text-right font-mono">{row.votes}</td>
                      <td class="text-right font-mono text-base-content/70">{row.pct}%</td>
                      <td class="text-center">
                        {#if row.status === "elected"}
                          <span class="badge gap-1 badge-success">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="3"
                                d="M5 13l4 4L19 7"
                              /></svg
                            >
                            Elected
                          </span>
                        {:else if row.status === "tied"}
                          <span class="badge gap-1 badge-warning">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              /></svg
                            >
                            Tied
                          </span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
