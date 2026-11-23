<!-- src/routes/elections/[id]/results/+page.svelte -->
<script lang="ts">
  import {
    Check,
    CircleAlert,
    CircleCheck,
    FileChartColumn,
    Info,
    ShieldCheck,
    TriangleAlert,
    Users,
    X,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Official Results · {data.election.title} | MSCZ</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
  <!-- Breadcrumb -->
  <div class="breadcrumbs text-sm text-base-content/60">
    <ul>
      <li><a href="/elections" class="hover:text-primary">Elections</a></li>
      <li class="font-semibold text-base-content">Results</li>
    </ul>
  </div>

  <!-- Header -->
  <div class="card border border-base-300 bg-base-100 shadow-md">
    <div class="card-body">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 class="flex items-center gap-3 text-2xl font-bold text-base-content md:text-3xl">
            <CircleCheck class="size-8 text-success" />
            {data.election.title}
          </h1>
          <p class="mt-2 text-base-content/60">Official, finalized results for this election.</p>
        </div>
        <div class="badge gap-2 p-3 badge-lg shadow-sm badge-success">
          <ShieldCheck class="size-5" />
          Verified Results
        </div>
      </div>
    </div>
  </div>

  <!-- Results Sections -->
  {#if data.results.length === 0}
    <div class="card border border-base-300 bg-base-100 shadow-md">
      <div class="card-body items-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
          <FileChartColumn class="size-8 text-base-content/40" />
        </div>
        <h3 class="text-lg font-semibold text-base-content/80">No Positions in this Election</h3>
        <p class="mt-1 text-sm text-base-content/60">
          There are no results to display for this election.
        </p>
      </div>
    </div>
  {:else}
    <div class="space-y-6">
      {#each data.results as r (r.pollId)}
        <div class="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
          <div class="card-body">
            <!-- Position Header -->
            <div
              class="mb-4 flex flex-col justify-between gap-2 border-b border-base-300 pb-4 sm:flex-row sm:items-center"
            >
              <h2 class="flex items-center gap-2 text-xl font-bold text-base-content">
                {r.position}
                <span class="badge badge-outline badge-sm font-normal">
                  {r.seats} seat{r.seats === 1 ? "" : "s"} available
                </span>
              </h2>

              {#if !r.unopposed && r.ballots !== undefined}
                <div class="flex flex-wrap gap-2 text-sm text-base-content/70">
                  <span class="flex items-center gap-1.5 rounded-md bg-base-200 px-3 py-1">
                    <Users class="size-4" />
                    {r.ballots} voter{r.ballots === 1 ? "" : "s"}
                  </span>
                  {#if r.abstentions !== null && r.abstentions > 0}
                    <span class="flex items-center gap-1.5 rounded-md bg-base-200 px-3 py-1">
                      <X class="size-4" />
                      {r.abstentions} abstained
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Unopposed State -->
            {#if r.unopposed}
              <div class="alert alert-info shadow-sm">
                <Info class="size-6 shrink-0 stroke-current" />
                <div>
                  <h3 class="font-bold">Elected Unopposed</h3>
                  <div class="text-sm">
                    The following candidate(s) were the only accredited nominees for this position
                    and are declared elected:
                  </div>
                  <ul class="mt-2 list-inside list-disc font-medium">
                    {#each r.rows as row (row.id)}
                      <li>{row.name}</li>
                    {/each}
                  </ul>
                </div>
              </div>

              <!-- No Candidates State -->
            {:else if r.rows.length === 0}
              <div class="py-8 text-center text-base-content/50 italic">
                No candidates were nominated for this position.
              </div>

              <!-- Standard Results State -->
            {:else}
              {#if r.tie}
                <div class="mb-4 alert alert-warning shadow-sm">
                  <TriangleAlert class="size-6 shrink-0 stroke-current" />
                  <div>
                    <h3 class="font-bold">Tie Detected</h3>
                    <div class="text-sm">
                      A tie occurred for the final seat. A runoff election will be held between the
                      tied candidates.
                    </div>
                  </div>
                </div>
              {/if}

              <div class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr class="bg-base-200/80">
                      <th class="font-semibold text-base-content/80">Candidate</th>
                      <th class="text-right font-semibold text-base-content/80">Votes</th>
                      <th class="w-1/3 font-semibold text-base-content/80">Share of Vote</th>
                      <th class="text-center font-semibold text-base-content/80">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each r.rows as row (row.id)}
                      <tr class="hover {row.status === 'elected' ? 'bg-success/5' : ''}">
                        <td
                          class="font-medium {row.status === 'elected'
                            ? 'text-success'
                            : 'text-base-content'}"
                        >
                          {row.name}
                        </td>
                        <td class="text-right font-mono text-base-content/90">
                          {row.votes}
                        </td>
                        <td>
                          <div class="flex items-center gap-3">
                            <div class="flex-1">
                              <progress
                                class="progress {row.status === 'elected'
                                  ? 'progress-success'
                                  : 'progress-primary'} size-full"
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
                            <span class="badge gap-1 shadow-sm badge-success">
                              <Check class="size-3" stroke-width="3" />
                              Elected
                            </span>
                          {:else if row.status === "tied"}
                            <span class="badge gap-1 shadow-sm badge-warning">
                              <CircleAlert class="size-3" />
                              Tied
                            </span>
                          {:else}
                            <span class="text-sm text-base-content/40">—</span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Footer / Audit Note -->
  <div class="pt-4 pb-8 text-center">
    <p class="flex items-center justify-center gap-2 text-sm text-base-content/50">
      <ShieldCheck class="size-4" />
      Results are cryptographically sealed and auditable by MSCZ Returning Officers.
    </p>
  </div>
</div>
