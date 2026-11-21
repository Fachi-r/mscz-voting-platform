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

<svelte:head><title>{data.election.title}</title></svelte:head>

<p><a href="/elections">← All elections</a></p>

<h1>{data.election.title}</h1>
{#if data.election.description}<p>{data.election.description}</p>{/if}

{#if data.unopposed.length > 0}
  <h2>Elected unopposed</h2>
  <ul>
    {#each data.unopposed as p (p.id)}
      <li>
        <strong>{p.position}:</strong>
        {p.candidates.map((c) => c.name).join(", ")}
      </li>
    {/each}
  </ul>
{/if}

{#if hasVoted}
  <h2>Thank you, your vote has been recorded.</h2>
  <p>Your ballot is final and cannot be changed.</p>
{:else if data.election.status === "upcoming"}
  <p>Voting opens {fmt.format(data.election.startsAt)}.</p>
{:else if data.election.status === "ended"}
  <p>Voting has ended. Results will be published once the election is closed.</p>
{:else if data.election.status === "closed"}
  <p>
    This election is closed. <a href="/elections/{data.election.id}/results">View results</a>
  </p>
{:else if !data.canVote}
  <p>
    Your membership has not been verified yet. Please contact the MCSZ administrators to have your
    NRC verified.
  </p>
{:else if data.polls.length === 0}
  <p>There are no positions to vote on in this election.</p>
{:else}
  <p>Voting closes {fmt.format(data.election.endsAt)}.</p>

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
          {#if poll.description}<p>{poll.description}</p>{/if}
          <p>
            {#if multi}
              Select up to {poll.maxSelections} ({picks.length} of {poll.maxSelections}
              selected).
            {:else}
              Select one candidate.
            {/if}
            Leave blank to abstain.
          </p>

          {#each poll.candidates as candidate (candidate.id)}
            {@const checked = picks.includes(candidate.id)}
            {@const limitReached = multi && !checked && picks.length >= poll.maxSelections}
            <div>
              <label>
                <!-- ui_ names are ignored by the server; they only group the radios -->
                <input
                  type={multi ? "checkbox" : "radio"}
                  name="ui_{poll.id}"
                  {checked}
                  disabled={limitReached}
                  onchange={() => toggle(poll, candidate.id)}
                />
                {candidate.name}
                {#if candidate.qualification}({candidate.qualification}){/if}
              </label>
            </div>
          {/each}

          {#if !multi && picks.length > 0}
            <button type="button" onclick={() => (selected[poll.id] = [])}>Clear selection</button>
          {/if}
        </fieldset>
      {/each}

      <button type="button" onclick={() => (step = "review")}>Review ballot</button>
    {:else}
      <h2>Review your ballot</h2>

      {#each data.polls as poll (poll.id)}
        {@const picks = picksFor(poll.id)}
        <h3>{poll.position}</h3>
        {#if picks.length === 0}
          <p>No selection (abstain)</p>
        {:else}
          <ul>
            {#each picks as candidateId (candidateId)}
              <li>{candidateLabel(poll, candidateId)}</li>
            {/each}
          </ul>
        {/if}
      {/each}

      {#if totalSelected === 0}
        <p>You haven't selected anyone. Submitting will record an abstention for every position.</p>
      {/if}
      <p>
        <strong>Votes are final. You cannot change your ballot after submitting.</strong>
      </p>

      {#if form?.message}<p role="alert">{form.message}</p>{/if}

      <button type="button" onclick={() => (step = "select")} disabled={submitting}>Back</button>
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit ballot"}
      </button>
    {/if}
  </form>
{/if}
