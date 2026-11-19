<script lang="ts">
  import favicon from "#lib/assets/favicon.svg";
  import Navbar from "#lib/components/Navbar.svelte";
  import type { User } from "better-auth/types";
  import type { LayoutProps } from "./$types";
  import "./layout.css";

  let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Navbar user={data.user as User} />

{@render children()}
