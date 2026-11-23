<!-- src/routes/admin/elections/[id]/+page.svelte -->
<script lang="ts">
  import { enhance, type SubmitFunction } from "$app/forms";
  import {
    Calendar,
    CircleAlert,
    CircleCheck,
    AlignEndHorizontal,
    Lock,
    RefreshCw,
    Users,
    Info,
    Trash,
    Image,
    Plus,
    TriangleAlert,
    CircleX,
    Check,
    FilePen,
    Clock,
    Archive,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const confirmFirst = (message: string): SubmitFunction => {
    return ({ cancel }) => {
      if (!confirm(message)) cancel();
    };
  };

  type ElectionStatusConfig = {
    class: string;
    icon: typeof FilePen;
  };

  const electionStatusMap: Record<string, ElectionStatusConfig> = {
    draft: { class: "badge-ghost", icon: FilePen },
    scheduled: { class: "badge-info", icon: Clock },
    active: { class: "badge-success", icon: CircleCheck },
    closed: { class: "badge-warning", icon: CircleAlert },
    archived: { class: "badge-neutral", icon: Archive },
  };

  let statusConfig = $derived(getElectionStatusConfig(data.election.status));

  function getElectionStatusConfig(status: string): ElectionStatusConfig {
    return (
      electionStatusMap[status.toLowerCase()] || {
        class: "badge-ghost",
        icon: FilePen,
      }
    );
  }

  function getCandidateName(c: { name?: string; surname?: string; givenNames?: string }): string {
    if (c.givenNames && c.surname) return `${c.givenNames} ${c.surname}`;
    return c.name || "Unknown Candidate";
  }
</script>

<svelte:head>
  <title>{data.election.title} · MSCZ Admin</title>
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
        <span class={`badge ${statusConfig.class} gap-1 text-sm`}>
          <statusConfig.icon class="size-3" />
          <span class="capitalize">{data.election.status}</span>
        </span>
      </h1>
      {#if data.election.description}
        <p class="mt-2 max-w-3xl text-base-content/70">
          {data.election.description}
        </p>
      {/if}
      <p class="mt-2 flex items-center gap-2 text-sm text-base-content/50">
        <Calendar class="size-4" />
        {fmt.format(data.election.startsAt)} → {fmt.format(data.election.endsAt)} (Africa/Lusaka)
      </p>
    </div>
  </div>
</div>

<!-- Global Form Feedback -->
{#if form?.message}
  <div class="mb-6 alert alert-error shadow-lg" role="alert">
    <CircleAlert class="size-6 shrink-0 stroke-current" />
    <span>{form.message}</span>
  </div>
{/if}
{#if form?.success}
  <div class="mb-6 alert alert-success shadow-lg" role="status">
    <CircleCheck class="size-6 shrink-0 stroke-current" />
    <span>{form.success}</span>
  </div>
{/if}

<!-- Turnout Stats -->
<div class="card mb-6 border border-base-300 bg-base-100 shadow-md">
  <div class="card-body">
    <h2 class="mb-4 card-title flex items-center gap-2 text-lg">
      <AlignEndHorizontal class="size-5 text-primary" />
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
    <Lock class="size-6 shrink-0 stroke-current" />
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
            <label class="label" for="startsAt">
              <span class="label-text font-medium">Opens (Lusaka Time)</span>
            </label>
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
            <label class="label" for="endsAt">
              <span class="label-text font-medium">Closes (Lusaka Time)</span>
            </label>
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
            <RefreshCw class="size-4" />
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
    <Users class="size-6 text-primary" />
    Positions & Candidates
  </h2>

  {#if data.polls.length === 0}
    <div class="alert alert-info">
      <Info class="size-6 shrink-0 stroke-current" />
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
                    <Trash class="size-4" />
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
                  <thead>
                    <tr class="text-xs text-base-content/60 uppercase">
                      <th>Candidate</th>
                      <th>NRC</th>
                      <th>MSCZ No.</th>
                      <th>Qualification</th>
                      <th>Photo</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each poll.candidates as c (c.id)}
                      <tr class="hover">
                        <td class="text-sm font-medium">{c.name ?? ""}</td>
                        <td class="font-mono text-xs">{c.nrc || "—"}</td>
                        <td class="text-xs">{c.msczMembershipNumber || "—"}</td>
                        <td
                          class="max-w-37.5 truncate text-xs text-base-content/70"
                          title={c.highestQualification}
                        >
                          {c.highestQualification || "—"}
                        </td>
                        <td>
                          {#if c.image}
                            <a
                              href={c.image}
                              target="_blank"
                              class="flex link items-center gap-1 text-xs link-primary"
                            >
                              <Image class="size-3" />
                              View
                            </a>
                          {:else}
                            <span class="text-xs text-base-content/30">None</span>
                          {/if}
                        </td>
                        <td class="text-right">
                          {#if !data.locked}
                            <form
                              method="POST"
                              action="?/deleteCandidate"
                              use:enhance={confirmFirst(
                                `Remove candidate "${getCandidateName(c)}"?`,
                              )}
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
                class="rounded-lg border border-base-300 bg-base-200/50 p-4"
              >
                <input type="hidden" name="pollId" value={poll.id} />

                <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div class="form-control">
                    <label class="label py-1" for="givenNames">
                      <span class="label-text text-xs font-semibold uppercase">Given Names</span>
                    </label>
                    <input
                      name="givenNames"
                      required
                      placeholder="e.g., Jane"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1" for="surname">
                      <span class="label-text text-xs font-semibold uppercase">Surname</span>
                    </label>
                    <input
                      name="surname"
                      required
                      placeholder="e.g., Mwamba"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1" for="nrc">
                      <span class="label-text text-xs font-semibold uppercase">NRC</span>
                    </label>
                    <input
                      name="nrc"
                      required
                      placeholder="123456/78/1"
                      class="input-bordered input w-full font-mono input-sm"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1" for="msczMembershipNumber">
                      <span class="label-text text-xs font-semibold uppercase"
                        >MSCZ Membership No.</span
                      >
                    </label>
                    <input
                      name="msczMembershipNumber"
                      required
                      placeholder="e.g., MSCZ-2024-001"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1" for="highestQualification">
                      <span class="label-text text-xs font-semibold uppercase"
                        >Highest Qualification</span
                      >
                    </label>
                    <input
                      name="highestQualification"
                      required
                      placeholder="e.g., Bachelor of Laws"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label py-1" for="image">
                      <span class="label-text text-xs font-semibold uppercase"
                        >Photo URL (Optional)</span
                      >
                    </label>
                    <input
                      name="image"
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      class="input-bordered input w-full input-sm"
                    />
                  </div>
                </div>

                <div class="flex justify-end">
                  <button type="submit" class="btn gap-1 btn-primary btn-sm">
                    <Plus class="size-4" />
                    Add Candidate
                  </button>
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
              <label for="position" class="label py-1">
                <span class="label-text font-medium">Position Title</span>
              </label>
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
              <label for="maxSelections" class="label py-1">
                <span class="label-text font-medium">Seats Available</span>
              </label>
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
                <Plus class="size-4" />
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
        <TriangleAlert class="size-6" />
        Close Election
      </h2>
      <p class="max-w-3xl text-base-content/80">
        Closing ends voting immediately and publishes the results. <strong
          >This action cannot be undone.</strong
        >
        {#if data.election.status === "ended"}
          <span class="mt-2 block font-medium text-error">
            The voting window has already ended. You should close it now to reveal results.
          </span>
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
            <CircleX class="size-5" />
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
      <CircleCheck class="size-6 text-success" />
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
                <TriangleAlert class="size-6 shrink-0 stroke-current" />
                <span>
                  <strong>Tie Detected:</strong> A runoff is needed between the tied candidates for the
                  last seat.
                </span>
              </div>
            {/if}
            {#if !r.auditOk}
              <div class="mb-4 alert alert-error">
                <CircleAlert class="size-6 shrink-0 stroke-current" />
                <span>
                  <strong>Integrity Check Failed:</strong> There are more votes than ballots × seats allow.
                  Investigate before announcing results.
                </span>
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
                      <td class="font-medium {row.status === 'elected' ? 'text-success' : ''}">
                        {row.name}
                      </td>
                      <td class="text-right font-mono">{row.votes}</td>

                      <td class="text-right font-mono text-base-content/70">
                        <div class="flex items-center gap-3">
                          <div class="flex-1">
                            <progress
                              class="progress {row.status === 'elected'
                                ? 'progress-success'
                                : 'progress-primary'} h-2 w-full"
                              value={row.pct}
                              max="100"
                            ></progress>
                          </div>
                          <span class="w-12 text-right font-mono text-sm text-base-content/70">
                            {row.pct}%
                          </span>
                        </div>
                      </td>
                      <td class="text-center">
                        {#if row.status === "elected"}
                          <span class="badge gap-1 badge-success">
                            <Check class="size-3" stroke-width="3" />
                            Elected
                          </span>
                        {:else if row.status === "tied"}
                          <span class="badge gap-1 badge-warning">
                            <CircleAlert class="size-3" />
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
