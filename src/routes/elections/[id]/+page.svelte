<!-- src/routes/elections/[id]/+page.svelte -->
<script lang="ts">
  import { enhance, type SubmitFunction } from "$app/forms";
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

  function candidateName(poll: PollView, candidateId: number): string {
    return poll.candidates.find((c) => c.id === candidateId)?.name ?? "Unknown";
  }

  function goTo(next: "select" | "review") {
    step = next;
    window.scrollTo({ top: 0 });
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
  <title>{data.election.title}</title>
</svelte:head>

<main>
  <h1>{data.election.title}</h1>
  {#if data.election.description}
    <p class="muted">{data.election.description}</p>
  {/if}

  {#if hasVoted}
    <section class="notice success" role="status">
      <h2>Thank you, your vote has been recorded.</h2>
      <p>Your ballot is final and cannot be changed.</p>
    </section>
  {:else if !data.election.isOpen}
    <section class="notice" role="status">
      <h2>Voting is not open</h2>
      <p>
        Voting runs from {fmt.format(data.election.startsAt)} to {fmt.format(data.election.endsAt)}.
      </p>
    </section>
  {:else if !data.canVote}
    <section class="notice" role="status">
      <h2>You can't vote yet</h2>
      <p>
        Your membership has not been verified. Please contact the MCSZ administrators to have your
        NRC verified.
      </p>
    </section>
  {:else}
    <p class="muted">Voting closes {fmt.format(data.election.endsAt)}.</p>

    <form method="POST" action="?/vote" use:enhance={handleSubmit}>
      <!-- The only fields the server reads. Unselected polls send nothing (= abstain). -->
      {#each data.polls as poll (poll.id)}
        {#each picksFor(poll.id) as candidateId (candidateId)}
          <input type="hidden" name="poll_{poll.id}" value={candidateId} />
        {/each}
      {/each}

      {#if step === "select"}
        {#each data.polls as poll (poll.id)}
          {@const picks = picksFor(poll.id)}
          {@const multi = poll.maxSelections > 1}
          <fieldset>
            <legend>{poll.position}</legend>
            {#if poll.description}<p class="muted">{poll.description}</p>{/if}
            <p class="hint">
              {#if multi}
                Select up to {poll.maxSelections}
                <strong>({picks.length} of {poll.maxSelections} selected)</strong>.
              {:else}
                Select one candidate.
              {/if}
              Leave blank to abstain.
            </p>

            {#each poll.candidates as candidate (candidate.id)}
              {@const checked = picks.includes(candidate.id)}
              {@const limitReached = multi && !checked && picks.length >= poll.maxSelections}
              <label class="candidate" class:checked class:disabled={limitReached}>
                <!-- ui_ names are ignored by the server; they only group the radios -->
                <input
                  type={multi ? "checkbox" : "radio"}
                  name="ui_{poll.id}"
                  {checked}
                  disabled={limitReached}
                  onchange={() => toggle(poll, candidate.id)}
                />
                {#if candidate.image}
                  <img src={candidate.image} alt="" width="40" height="40" />
                {/if}
                <span>{candidate.name}</span>
              </label>
            {:else}
              <p class="muted">No candidates have been listed for this position.</p>
            {/each}

            {#if !multi && picks.length > 0}
              <button type="button" class="link" onclick={() => (selected[poll.id] = [])}>
                Clear selection
              </button>
            {/if}
          </fieldset>
        {/each}

        <div class="actions">
          <button type="button" class="primary" onclick={() => goTo("review")}>
            Review ballot
          </button>
        </div>
      {:else}
        <h2>Review your ballot</h2>

        {#each data.polls as poll (poll.id)}
          {@const picks = picksFor(poll.id)}
          <section class="review-row">
            <h3>{poll.position}</h3>
            {#if picks.length === 0}
              <p class="muted">No selection (abstain)</p>
            {:else}
              <ul>
                {#each picks as candidateId (candidateId)}
                  <li>{candidateName(poll, candidateId)}</li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}

        {#if totalSelected === 0}
          <p class="notice">
            You haven't selected anyone. Submitting will record an abstention for every position.
          </p>
        {/if}
        <p class="warning">Votes are final. You cannot change your ballot after submitting.</p>

        {#if form?.message}
          <p class="error" role="alert">{form.message}</p>
        {/if}

        <div class="actions">
          <button type="button" onclick={() => goTo("select")} disabled={submitting}>Back</button>
          <button type="submit" class="primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit ballot"}
          </button>
        </div>
      {/if}
    </form>
  {/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
  fieldset {
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 0.75rem;
    margin: 1.25rem 0;
    padding: 1rem;
  }
  legend {
    font-weight: 600;
    padding: 0 0.5rem;
  }
  .muted,
  .hint {
    opacity: 0.7;
    font-size: 0.9rem;
    margin: 0.25rem 0 0.75rem;
  }
  .candidate {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 0.5rem;
    margin-top: 0.5rem;
    cursor: pointer;
  }
  .candidate.checked {
    border-color: currentColor;
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  .candidate.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .candidate img {
    border-radius: 50%;
    object-fit: cover;
  }
  .review-row {
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    padding: 0.75rem 0;
  }
  .review-row h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }
  .review-row ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  .notice {
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 0.75rem;
    padding: 1rem;
    margin: 1rem 0;
  }
  .notice.success {
    border-color: #2e7d32;
  }
  .warning {
    font-weight: 600;
    margin: 1rem 0;
  }
  .error {
    color: #c62828;
    font-weight: 600;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
  button {
    font: inherit;
    padding: 0.65rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  button.primary {
    background: #1b5e20;
    border-color: #1b5e20;
    color: #fff;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  button.link {
    border: none;
    padding: 0.5rem 0 0;
    text-decoration: underline;
    opacity: 0.8;
  }
</style>
