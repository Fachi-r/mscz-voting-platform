<!-- src/routes/elections/+page.svelte -->
<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const fmt = new Intl.DateTimeFormat("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>

<svelte:head><title>Elections</title></svelte:head>

<h1>Elections</h1>

{#if data.needsNrc}
  <p>To take part in elections, <a href="/onboarding">add your NRC</a>.</p>
{:else if !data.isVerified}
  <p>
    Your membership is awaiting verification. You can't vote until an administrator verifies it.
  </p>
{/if}

{#if data.elections.length === 0}
  <p>There are no elections yet.</p>
{:else}
  <table>
    <thead>
      <tr><th>Election</th><th>Opens</th><th>Closes</th><th>Status</th><th>You</th><th></th></tr>
    </thead>
    <tbody>
      {#each data.elections as e (e.id)}
        <tr>
          <td>{e.title}</td>
          <td>{fmt.format(e.startsAt)}</td>
          <td>{fmt.format(e.endsAt)}</td>
          <td>{e.status}</td>
          <td>{e.hasVoted ? "Voted" : e.status === "open" ? "Not voted yet" : ""}</td>
          <td>
            <a href="/elections/{e.id}">
              {e.status === "open" && !e.hasVoted ? "Vote" : "View"}
            </a>
            {#if e.status === "closed"}
              · <a href="/elections/{e.id}/results">Results</a>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
