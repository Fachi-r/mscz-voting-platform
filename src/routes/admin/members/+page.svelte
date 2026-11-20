<!-- src/routes/admin/members/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  // Pagination helper
  function pageHref(p: number): string {
    const params = new SvelteURLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.filter !== "all") params.set("filter", data.filter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  // Helper to determine status badge styling
  function getStatusBadge(m: Partial<typeof data.user>): {
    class: string;
    icon: string;
    label: string;
  } {
    const defaultBadge = {
      class: "badge badge-ghost gap-1",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
      label: "No NRC",
    };

    if (!m) return defaultBadge;

    if (m.banned) {
      return {
        class: "badge badge-error gap-1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`,
        label: "Suspended",
      };
    }
    if (m.isVerified) {
      return {
        class: "badge badge-success gap-1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>`,
        label: "Verified",
      };
    }
    if (m.nrc) {
      return {
        class: "badge badge-warning gap-1",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        label: "Pending",
      };
    }
    return defaultBadge;
  }
</script>

<svelte:head>
  <title>Member Management · MCSZ Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-6">
  <h1 class="flex items-center gap-3 text-3xl font-bold text-base-content">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-8 w-8 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
    Member Management
  </h1>
  <p class="mt-2 max-w-3xl text-base-content/60">
    Verify each member's National Registration Card (NRC) against the official MCSZ membership
    register.
    <span class="font-semibold text-base-content/80"
      >Only verified members are eligible to vote.</span
    >
  </p>
</div>

<!-- Search & Filter Toolbar -->
<form
  method="GET"
  class="mb-6 flex flex-col items-end gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm md:flex-row"
>
  <div class="form-control w-full flex-1">
    <label for="q" class="label py-1">
      <span class="label-text font-medium">Search Members</span>
    </label>
    <div class="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-base-content/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        id="q"
        name="q"
        value={data.q}
        placeholder="Name, email, or NRC number..."
        class="input-bordered input w-full bg-base-200/50 pl-10 transition-colors focus:bg-base-100"
      />
    </div>
  </div>

  <div class="form-control w-full md:w-56">
    <label for="filter" class="label py-1">
      <span class="label-text font-medium">Filter Status</span>
    </label>
    <select
      id="filter"
      name="filter"
      value={data.filter}
      class="select-bordered select w-full bg-base-200/50 transition-colors focus:bg-base-100"
    >
      <option value="all">All members</option>
      <option value="pending">Awaiting verification</option>
    </select>
  </div>

  <div class="form-control w-full md:w-auto">
    <button type="submit" class="btn gap-2 btn-primary">
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
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>
      Search
    </button>
  </div>
</form>

<!-- Form Feedback -->
{#if form?.message}
  <div class="mb-6 alert alert-error shadow-lg" role="alert">
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
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span>{form.message}</span>
  </div>
{/if}

<!-- Members Table -->
<div class="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
  {#if data.members.length === 0}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center py-16 text-center">
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h3 class="mb-1 text-lg font-semibold text-base-content/80">No members found</h3>
      <p class="text-sm text-base-content/60">Try adjusting your search or filter criteria.</p>
    </div>
  {:else}
    <!-- Data Table -->
    <div class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr class="border-b-2 border-base-300">
            <th class="font-semibold text-base-content/70">Member</th>
            <th class="font-semibold text-base-content/70">NRC Number</th>
            <th class="font-semibold text-base-content/70">Status</th>
            <th class="text-right font-semibold text-base-content/70">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.members as m (m.id)}
            <tr class="hover">
              <td>
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-placeholder">
                    <div class="w-10 rounded-full bg-neutral text-neutral-content">
                      <span class="text-xs font-bold"
                        >{m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}</span
                      >
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center gap-2 font-semibold text-base-content">
                      {m.name}
                      {#if m.role === "admin"}
                        <span class="badge gap-1 badge-xs badge-primary">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            ><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            /></svg
                          >
                          Admin
                        </span>
                      {/if}
                    </div>
                    <div class="text-sm text-base-content/60">{m.email}</div>
                  </div>
                </div>
              </td>
              <td
                class={[
                  "font-mono text-sm ",
                  m.nrc ? "text-base-content/80" : "text-base-content/30",
                ]}
              >
                {m.nrc ?? "Not provided"}
              </td>
              <td>
                {@html `<span class="${getStatusBadge(m).class}">${getStatusBadge(m).icon} ${getStatusBadge(m).label}</span>`}
              </td>
              <td class="text-right">
                {#if m.isVerified}
                  <form method="POST" action="?/unverify" use:enhance class="inline">
                    <input type="hidden" name="userId" value={m.id} />
                    <button
                      type="submit"
                      class="btn gap-1 btn-ghost text-error btn-sm hover:bg-error/10"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        /></svg
                      >
                      Unverify
                    </button>
                  </form>
                {:else if m.nrc}
                  <form method="POST" action="?/verify" use:enhance class="inline">
                    <input type="hidden" name="userId" value={m.id} />
                    <button type="submit" class="btn gap-1 shadow-sm btn-sm btn-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        /></svg
                      >
                      Verify
                    </button>
                  </form>
                {:else}
                  <span class="text-xs text-base-content/40 italic">Awaiting NRC</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Pagination -->
{#if data.members.length > 0}
  <div class="mt-8 flex items-center justify-center gap-2">
    <a
      href={pageHref(data.page - 1)}
      class="btn gap-1 btn-ghost btn-sm {data.page <= 1
        ? 'btn-disabled pointer-events-none opacity-50'
        : ''}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Previous
    </a>

    <span class="px-4 text-sm font-medium text-base-content/70">
      Page {data.page}
    </span>

    <a
      href={pageHref(data.page + 1)}
      class="btn gap-1 btn-ghost btn-sm {!data.hasNext
        ? 'btn-disabled pointer-events-none opacity-50'
        : ''}"
    >
      Next
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </div>
{/if}
