<!-- src/routes/onboarding/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const savedNrc = $derived(form?.success ? form.nrc : data.nrc);
</script>

<svelte:head><title>Verify your membership</title></svelte:head>

<main>
  <h1>Verify your membership</h1>

  {#if data.isVerified}
    <section class="notice success" role="status">
      <h2>You're verified</h2>
      <p>
        Your NRC <strong>{data.nrc}</strong> is verified. You're all set to vote.
      </p>
    </section>
  {:else}
    <p>
      To vote in MCSZ elections, enter your National Registration Card (NRC) number. An
      administrator will check it against the membership register.
    </p>

    {#if savedNrc}
      <section class="notice" role="status">
        <p>
          NRC on file: <strong>{savedNrc}</strong>. It's awaiting verification by an administrator.
          You can correct it below until it has been verified.
        </p>
      </section>
    {/if}

    <form method="POST" action="?/save" use:enhance>
      <label for="nrc">NRC number</label>
      <input
        id="nrc"
        name="nrc"
        inputmode="numeric"
        autocomplete="off"
        placeholder="123456/78/1"
        value={savedNrc ?? ""}
        required
      />

      {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
      {#if form?.success}<p class="ok" role="status">Saved. Awaiting verification.</p>{/if}

      <p><button class="primary" type="submit">Save NRC</button></p>
    </form>
  {/if}
</main>

<style>
  main {
    max-width: 32rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
  label {
    display: block;
    margin: 1rem 0 0.25rem;
  }
  input {
    font: inherit;
    width: 100%;
    padding: 0.6rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    background: transparent;
    color: inherit;
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
  .error {
    color: #c62828;
    font-weight: 600;
  }
  .ok {
    color: #2e7d32;
    font-weight: 600;
  }
  button {
    font: inherit;
    padding: 0.65rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid #1b5e20;
    background: #1b5e20;
    color: #fff;
    cursor: pointer;
  }
</style>
