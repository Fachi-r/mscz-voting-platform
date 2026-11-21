<!-- src/routes/elections/[id]/results/+page.svelte -->
<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head><title>Results · {data.election.title}</title></svelte:head>

<p><a href="/elections">← All elections</a></p>

<h1>{data.election.title}: Results</h1>

{#each data.results as r (r.pollId)}
  <section>
    <h2>{r.position}</h2>

    {#if r.unopposed}
      <p>Elected unopposed:</p>
      <ul>
        {#each r.rows as row (row.id)}<li>{row.name}</li>{/each}
      </ul>
    {:else if r.rows.length === 0}
      <p>No candidates.</p>
    {:else}
      <p>
        {r.ballots} voter{r.ballots === 1 ? "" : "s"} · {r.seats} seat{r.seats === 1 ? "" : "s"}
        {#if r.abstentions !== null}· {r.abstentions} abstained{/if}
      </p>

      {#if r.tie}
        <p>
          <strong>Tie for the last seat. A runoff will be held between the tied candidates.</strong>
        </p>
      {/if}

      <table>
        <thead><tr><th>Candidate</th><th>Votes</th><th>% of voters</th><th></th></tr></thead>
        <tbody>
          {#each r.rows as row (row.id)}
            <tr>
              <td>{row.name}</td>
              <td>{row.votes}</td>
              <td>{row.pct}%</td>
              <td>
                {#if row.status === "elected"}Elected{/if}
                {#if row.status === "tied"}Tied{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
{:else}
  <p>No positions in this election.</p>
{/each}
