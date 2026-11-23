<!-- src/routes/elections/[id]/+page.svelte -->
<script lang="ts">
  import { enhance, type SubmitFunction } from "$app/forms";
  import {
    Check,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    ClipboardCheck,
    Clock,
    FileText,
    Info,
    ShieldCheck,
    TriangleAlert,
    X,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  type PollView = (typeof data.polls)[number];

  // pollId -> selected candidateIds. A missing/empty entry means "abstain".
  let selected = $state<Record<number, number[]>>({});
  let step = $state<"select" | "review">("select");
  let submitting = $state(false);

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const hasVoted = $derived(data.hasVoted || form?.success === true);
  const totalSelected = $derived(Object.values(selected).reduce((n, ids) => n + ids.length, 0));

  function picksFor(pollId: number): number[] {
    return selected[pollId] ?? [];
  }

  function toggle(poll: PollView, candidateId: number) {
    const current = picksFor(poll.id);

    if (poll.maxSelections === 1) {
      selected[poll.id] = current[0] === candidateId ? [] : [candidateId];
      return;
    }

    if (current.includes(candidateId)) {
      selected[poll.id] = current.filter((id) => id !== candidateId);
    } else if (current.length < poll.maxSelections) {
      selected[poll.id] = [...current, candidateId];
    }
  }

  function candidateLabel(poll: PollView, candidateId: number): string {
    return poll.candidates.find((c) => c.id === candidateId)?.name ?? "Unknown";
  }

  const handleSubmit: SubmitFunction = () => {
    submitting = true;
    return async ({ update }) => {
      await update({ reset: false });
      submitting = false;
    };
  };
</script>

<svelte:head>
  <title>{data.election.title} | MSCZ Voting</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
  <!-- Breadcrumb -->
  <div class="breadcrumbs text-sm text-base-content/60">
    <ul>
      <li><a href="/elections" class="hover:text-primary">Dashboard</a></li>
      <li class="font-semibold text-base-content">Ballot</li>
    </ul>
  </div>

  <!-- Election Header -->
  <div class="card border border-base-300 bg-base-100 shadow-md">
    <div class="card-body">
      <h1 class="flex items-center gap-3 text-2xl font-bold text-base-content md:text-3xl">
        <ClipboardCheck class="size-8 text-primary" />
        {data.election.title}
      </h1>
      {#if data.election.description}
        <p class="mt-2 text-base-content/70">{data.election.description}</p>
      {/if}
    </div>
  </div>

  <!-- Unopposed Candidates Info -->
  {#if data.unopposed.length > 0}
    <div class="card border border-info/30 bg-info/10 shadow-sm">
      <div class="card-body">
        <h2 class="card-title flex items-center gap-2 text-lg text-info">
          <Info class="size-5" />
          Elected Unopposed
        </h2>
        <p class="mb-3 text-sm text-base-content/80">
          The following positions had only one accredited candidate and have been filled
          automatically. You do not need to vote for these.
        </p>
        <ul class="space-y-2">
          {#each data.unopposed as p (p.id)}
            <li class="flex items-start gap-2 text-sm">
              <span class="mt-0.5 badge badge-sm badge-info">Filled</span>
              <span>
                <strong class="text-base-content">{p.position}:</strong>
                {p.candidates.map((c) => c.name).join(", ")}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}

  <!-- State: Already Voted -->
  {#if hasVoted}
    <div class="card border border-success/30 bg-success/10 shadow-lg">
      <div class="card-body items-center py-10 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <Check class="size-8 text-success" stroke-width="3" />
        </div>
        <h2 class="text-2xl font-bold text-success">Vote Recorded Successfully</h2>
        <p class="mt-2 max-w-md text-base-content/70">
          Thank you for participating. Your encrypted ballot is final and cannot be changed. You may
          proceed to view your cryptographic receipt.
        </p>
        <div class="mt-6 card-actions">
          <a href="/voter/receipt" class="btn gap-2 btn-success">
            <FileText class="size-5" />
            View Voting Receipt
          </a>
        </div>
      </div>
    </div>

    <!-- State: Upcoming -->
  {:else if data.election.status === "upcoming"}
    <div class="alert alert-info shadow-md">
      <Clock class="size-6 shrink-0 stroke-current" />
      <div>
        <h3 class="font-bold">Voting Not Yet Open</h3>
        <div class="text-sm">
          This election opens on {fmt.format(data.election.startsAt)}. Please check back then.
        </div>
      </div>
    </div>

    <!-- State: Ended (Not Closed) -->
  {:else if data.election.status === "ended"}
    <div class="alert alert-warning shadow-md">
      <TriangleAlert class="size-6 shrink-0 stroke-current" />
      <div>
        <h3 class="font-bold">Voting Window Closed</h3>
        <div class="text-sm">
          The voting period has ended. Results will be published once the Returning Officer
          officially closes the election.
        </div>
      </div>
    </div>

    <!-- State: Closed -->
  {:else if data.election.status === "closed"}
    <div class="alert alert-success shadow-md">
      <CircleCheck class="size-6 shrink-0 stroke-current" />
      <div>
        <h3 class="font-bold">Election Concluded</h3>
        <div class="text-sm">
          This election is closed. <a
            href="/elections/{data.election.id}/results"
            class="link font-semibold link-success">View official results</a
          >.
        </div>
      </div>
    </div>

    <!-- State: Not Verified -->
  {:else if !data.canVote}
    <div class="alert alert-error shadow-md">
      <TriangleAlert class="size-6 shrink-0 stroke-current" />
      <div>
        <h3 class="font-bold">Verification Required</h3>
        <div class="text-sm">
          Your membership has not been verified yet. Please contact the MSCZ administrators to have
          your NRC verified before you can vote.
        </div>
      </div>
    </div>

    <!-- State: No Polls -->
  {:else if data.polls.length === 0}
    <div class="alert alert-info shadow-md">
      <div class="text-sm">There are no positions to vote on in this election.</div>
    </div>

    <!-- State: Active Voting -->
  {:else}
    <div class="mb-4 alert alert-info shadow-sm">
      <Clock class="size-5 shrink-0 stroke-current" />
      <span class="text-sm font-medium">
        Voting closes on {fmt.format(data.election.endsAt)}. Take your time to review your
        selections.
      </span>
    </div>

    <form method="POST" action="?/vote" use:enhance={handleSubmit} class="space-y-6">
      <!-- Hidden inputs for server submission -->
      {#each data.polls as poll (poll.id)}
        {#each picksFor(poll.id) as candidateId (candidateId)}
          <input type="hidden" name="poll_{poll.id}" value={candidateId} />
        {/each}
      {/each}

      {#if step === "select"}
        <!-- Selection Step -->
        <div class="space-y-6">
          {#each data.polls as poll (poll.id)}
            {@const picks = picksFor(poll.id)}
            {@const multi = poll.maxSelections > 1}

            <fieldset class="card border border-base-300 bg-base-100 shadow-md">
              <div class="card-body">
                <legend class="mb-1 flex items-center gap-2 text-xl font-bold text-base-content">
                  {poll.position}
                  <span class="badge badge-outline badge-sm font-normal">
                    {multi ? `Select up to ${poll.maxSelections}` : "Single choice"}
                  </span>
                </legend>

                {#if poll.description}
                  <p class="mb-4 text-sm text-base-content/70">
                    {poll.description}
                  </p>
                {/if}

                <div class="space-y-3">
                  {#each poll.candidates as candidate (candidate.id)}
                    {@const checked = picks.includes(candidate.id)}
                    {@const limitReached = multi && !checked && picks.length >= poll.maxSelections}

                    <label
                      class="flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200
                      {checked
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 hover:border-base-content/30 hover:bg-base-200/50'}
                      {limitReached ? 'cursor-not-allowed opacity-50' : ''}"
                    >
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name="ui_{poll.id}"
                        class={multi
                          ? "checkbox mt-1 checkbox-primary"
                          : "radio mt-1 radio-primary"}
                        {checked}
                        disabled={limitReached}
                        onchange={() => toggle(poll, candidate.id)}
                      />

                      <div class="flex-1">
                        <div class="font-semibold text-base-content">
                          {candidate.name}
                        </div>
                        {#if candidate.qualification}
                          <div class="mt-1 text-sm text-base-content/60">
                            {candidate.qualification}
                          </div>
                        {/if}
                        {#if limitReached}
                          <div class="mt-1 text-xs font-medium text-error">
                            Selection limit reached for this position
                          </div>
                        {/if}
                      </div>
                    </label>
                  {/each}
                </div>

                {#if !multi && picks.length > 0}
                  <div class="mt-4 border-t border-base-300 pt-4">
                    <button
                      type="button"
                      class="btn gap-1 btn-ghost text-error btn-sm hover:bg-error/10"
                      onclick={() => (selected[poll.id] = [])}
                    >
                      <X class="size-4" />
                      Clear selection (Abstain)
                    </button>
                  </div>
                {/if}
              </div>
            </fieldset>
          {/each}
        </div>

        <div class="flex justify-end pt-4">
          <button
            type="button"
            class="btn gap-2 shadow-lg shadow-primary/20 btn-lg btn-primary"
            onclick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              step = "review";
            }}
          >
            Review Ballot
            <ChevronRight class="size-5" />
          </button>
        </div>
      {:else}
        <!-- Review Step -->
        <div class="card border-2 border-primary/30 bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="mb-6 flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CircleCheck class="size-6 text-primary" />
              </div>
              <div>
                <h2 class="text-2xl font-bold text-base-content">Review Your Ballot</h2>
                <p class="text-sm text-base-content/60">
                  Please verify your selections carefully before final submission.
                </p>
              </div>
            </div>

            <div class="mb-6 space-y-4 rounded-xl bg-base-200/50 p-6">
              {#each data.polls as poll (poll.id)}
                {@const picks = picksFor(poll.id)}
                <div
                  class="flex flex-col gap-2 border-b border-base-300 pb-4 last:border-0 last:pb-0 sm:flex-row sm:justify-between"
                >
                  <div class="font-semibold text-base-content/80">
                    {poll.position}
                  </div>
                  <div class="text-right">
                    {#if picks.length === 0}
                      <span class="text-sm text-base-content/50 italic">Abstain</span>
                    {:else}
                      <ul class="text-sm font-medium text-base-content">
                        {#each picks as candidateId (candidateId)}
                          <li>{candidateLabel(poll, candidateId)}</li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            {#if totalSelected === 0}
              <div class="mb-4 alert alert-warning">
                <TriangleAlert class="size-6 shrink-0 stroke-current" />
                <span>
                  You haven't selected any candidates. Submitting will record an <strong
                    >abstention</strong
                  > for every position.
                </span>
              </div>
            {/if}

            <div class="mb-6 alert alert-error">
              <TriangleAlert class="size-6 shrink-0 stroke-current" />
              <div>
                <h3 class="font-bold">Final Submission Warning</h3>
                <div class="text-sm">
                  Votes are cryptographically sealed and final. You <strong>cannot</strong> change your
                  ballot after submitting.
                </div>
              </div>
            </div>

            {#if form?.message}
              <div class="mb-4 alert alert-error" role="alert">
                <span>{form.message}</span>
              </div>
            {/if}

            <div class="mt-6 flex flex-col justify-end gap-4 sm:flex-row">
              <button
                type="button"
                class="btn gap-2 btn-ghost"
                onclick={() => (step = "select")}
                disabled={submitting}
              >
                <ChevronLeft class="size-4" />
                Back to Selections
              </button>

              <button
                type="submit"
                class="btn gap-2 shadow-lg shadow-error/20 btn-error btn-lg"
                disabled={submitting}
              >
                {#if submitting}
                  <span class="loading loading-sm loading-spinner"></span>
                  Sealing Ballot...
                {:else}
                  <ShieldCheck class="size-5" />
                  Submit Final Ballot
                {/if}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </form>
  {/if}
</div>
