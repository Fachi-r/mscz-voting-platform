<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageServerData } from "./$types";

  let { data }: { data: PageServerData } = $props();
  let user = $derived(data.user);

  $inspect(user);
</script>

<h1>Hi, {user.name}!</h1>
<p>Your user Role is {user.role}.</p>
<form method="post" action="?/signOut" use:enhance>
  <button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
    >Sign out</button
  >
</form>
