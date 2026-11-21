<!-- src/routes/elections/[id]/results/+page.svelte -->
<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Official Results · {data.election.title} | MCSZ</title>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {data.election.title}
          </h1>
          <p class="mt-2 text-base-content/60">Official, finalized results for this election.</p>
        </div>
        <div class="badge gap-2 p-3 badge-lg shadow-sm badge-success">
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
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {r.ballots} voter{r.ballots === 1 ? "" : "s"}
                  </span>
                  {#if r.abstentions !== null && r.abstentions > 0}
                    <span class="flex items-center gap-1.5 rounded-md bg-base-200 px-3 py-1">
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      {r.abstentions} abstained
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Unopposed State -->
            {#if r.unopposed}
              <div class="alert alert-info shadow-sm">
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
                            <span class="badge gap-1 shadow-sm badge-success">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="3"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Elected
                            </span>
                          {:else if row.status === "tied"}
                            <span class="badge gap-1 shadow-sm badge-warning">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      Results are cryptographically sealed and auditable by MCSZ Returning Officers.
    </p>
  </div>
</div>
