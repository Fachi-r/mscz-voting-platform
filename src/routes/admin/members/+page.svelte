<!-- src/routes/admin/members/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    Ban,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock,
    Funnel,
    Search,
    ShieldCheck,
    Users,
    X,
  } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  function pageHref(p: number): string {
    const params = new SvelteURLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.filter !== "all") params.set("filter", data.filter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  type MemberStatusConfig = {
    class: string;
    icon: typeof CircleAlert;
    label: string;
  };

  const memberStatusMap: Record<string, MemberStatusConfig> = {
    banned: { class: "badge-error", icon: Ban, label: "Suspended" },
    verified: { class: "badge-success", icon: Check, label: "Verified" },
    pending: { class: "badge-warning", icon: Clock, label: "Pending" },
    default: { class: "badge-ghost", icon: CircleAlert, label: "No NRC" },
  };

  function getMemberStatusConfig(m: (typeof data.members)[0]): MemberStatusConfig {
    if (!m) return memberStatusMap.default;
    if (m.banned) return memberStatusMap.banned;
    if (m.isVerified) return memberStatusMap.verified;
    if (m.nrc) return memberStatusMap.pending;
    return memberStatusMap.default;
  }
</script>

<svelte:head>
  <title>Member Management · MSCZ Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-6">
  <h1 class="flex items-center gap-3 text-3xl font-bold text-base-content">
    <Users class="size-8 text-primary" />
    Member Management
  </h1>
  <p class="mt-2 max-w-3xl text-base-content/60">
    Verify each member's National Registration Card (NRC) against the official MSCZ membership
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
      <Search class="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-base-content/40" />
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
      <Funnel class="size-4" />
      Search
    </button>
  </div>
</form>

<!-- Form Feedback -->
{#if form?.message}
  <div class="mb-6 alert alert-error shadow-lg" role="alert">
    <CircleAlert class="size-6 shrink-0 stroke-current" />
    <span>{form.message}</span>
  </div>
{/if}

<!-- Members Table -->
<div class="card overflow-hidden border border-base-300 bg-base-100 shadow-md">
  {#if data.members.length === 0}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-200">
        <Users class="size-8 text-base-content/40" />
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
            {@const status = getMemberStatusConfig(m)}
            <tr class="hover">
              <td>
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-placeholder">
                    <div class="w-10 rounded-full bg-neutral text-neutral-content">
                      <span class="text-xs font-bold">
                        {m.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center gap-2 font-semibold text-base-content">
                      {m.name}
                      {#if m.role === "admin"}
                        <span class="badge badge-xs badge-primary">
                          <ShieldCheck class="size-3" />
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
                <span class={[status.class, "badge items-center gap-2"]}>
                  <status.icon class="size-3 stroke-3" />
                  {status.label}
                </span>
              </td>
              <td class="text-right">
                {#if m.isVerified}
                  <form method="POST" action="?/unverify" use:enhance class="inline">
                    <input type="hidden" name="userId" value={m.id} />
                    <button
                      type="submit"
                      class="btn gap-1 btn-ghost text-error btn-sm hover:bg-error/10"
                    >
                      <X class="size-4" />
                      Unverify
                    </button>
                  </form>
                {:else if m.nrc}
                  <form method="POST" action="?/verify" use:enhance class="inline">
                    <input type="hidden" name="userId" value={m.id} />
                    <button type="submit" class="btn gap-1 shadow-sm btn-sm btn-success">
                      <Check class="size-4" />
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
      <ChevronLeft class="size-4" />
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
      <ChevronRight class="size-4" />
    </a>
  </div>
{/if}
