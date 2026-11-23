<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  import ThemeToggle from "#lib/components/ThemeToggle.svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import {
    ChevronDown,
    ClipboardCheck,
    FileSearchCorner,
    House,
    Info,
    LogOut,
    Menu,
    setLucideProps,
    ShieldCheck,
    UserGroup,
  } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  setLucideProps({
    size: 18,
  });

  // Navigation structure
  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: House,
    },
    {
      label: "Elections",
      href: "/admin/elections",
      icon: ClipboardCheck,
    },
    {
      label: "Members",
      href: "/admin/members",
      icon: UserGroup,
    },
    {
      label: "Audit Logs",
      href: "/admin/audit",
      icon: FileSearchCorner,
    },
  ];

  // Check if current path matches nav item
  function isActive(href: string, currentPath: string): boolean {
    if (href === "/admin") {
      return currentPath === "/admin" || currentPath === "/admin/";
    }
    return currentPath.startsWith(href);
  }
</script>

<svelte:head>
  <title>MSCZ Admin Dashboard</title>
</svelte:head>

<div class="drawer min-h-screen bg-base-200 lg:drawer-open">
  <!-- Mobile drawer toggle -->
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />

  <!-- Main Content Area -->
  <div class="drawer-content flex flex-col">
    <!-- Top Navbar -->
    <div class="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100 py-3.5 shadow-sm">
      <div class="flex-none lg:hidden">
        <label for="admin-drawer" class="drawer-button btn btn-square btn-ghost">
          <Menu />
        </label>
      </div>

      <!-- Breadcrumbs -->
      <div class="flex-1 px-4">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><a href="/admin" class="font-semibold">Admin</a></li>
            {#if page.url.pathname !== "/admin" && page.url.pathname !== "/admin/"}
              <li class="text-base-content/60 capitalize">
                {page.url.pathname.split("/").filter(Boolean).pop()}
              </li>
            {/if}
          </ul>
        </div>
      </div>

      <!-- Theme Toggle -->
      <ThemeToggle />

      <!-- User Menu -->
      <div class="flex-none gap-2">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn gap-2 btn-ghost">
            <div class="avatar avatar-placeholder">
              <div class="w-8 rounded-full bg-primary text-primary-content">
                <span class="text-sm font-bold"
                  >{data.adminName?.charAt(0).toUpperCase() || "A"}</span
                >
              </div>
            </div>
            <div class="hidden text-left md:block">
              <div class="text-sm font-semibold">
                {data.adminName || "Admin"}
              </div>
              <div class="flex items-center gap-1 text-xs text-base-content/60">
                <span class="badge badge-xs badge-secondary">Returning Officer</span>
              </div>
            </div>
            <ChevronDown />
          </div>
          <ul
            class="dropdown-content menu z-1 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
          >
            <li class="menu-title">
              <span class="text-xs text-base-content/50">Signed in as</span>
            </li>
            <li class="px-3 py-1">
              <div class="text-sm font-semibold">{data.adminName}</div>
              <div class="text-xs text-base-content/60">
                {data.user?.email || "admin@mscz.org.zm"}
              </div>
            </li>
            <div class="divider my-1"></div>

            <li>
              <form
                method="POST"
                action="/?/signOut"
                use:enhance
                class="m-0 flex justify-center p-0"
              >
                <button
                  type="submit"
                  class="btn w-full gap-2 btn-outline text-error btn-error hover:border-error hover:bg-error/20"
                >
                  <LogOut />
                  Logout
                </button>
              </form>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Page Content -->
    <main class="flex-1 p-4 md:p-6 lg:p-8">
      <div class="mx-auto max-w-7xl">
        {@render children()}
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="footer footer-center border-t border-base-300 bg-base-100 p-4 text-sm text-base-content/60"
    >
      <aside>
        <p>© {new Date().getFullYear()} MSCZ Admin Portal • Version 1.0.0</p>
      </aside>
    </footer>
  </div>

  <!-- Sidebar -->
  <div class="drawer-side">
    <label for="admin-drawer" aria-label="close sidebar" class="drawer-overlay"></label>

    <aside class="flex min-h-screen w-72 flex-col border-r border-base-300 bg-base-100">
      <!-- Sidebar Header -->
      <div class="border-b border-base-300 p-3">
        <a href="/admin" class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck />
          </div>
          <div>
            <div class="text-lg font-bold">MSCZ Admin</div>
            <div class="text-xs text-base-content/60">Returning Officer Portal</div>
          </div>
        </a>
      </div>

      <!-- Navigation Menu -->
      <div class="flex-1 overflow-y-auto">
        <ul class="menu p-4 text-base-content">
          {#each navItems as item}
            <li>
              <a
                href={item.href}
                class="flex items-center gap-3 font-medium"
                class:active={isActive(item.href, page.url.pathname)}
                class:font-semibold={isActive(item.href, page.url.pathname)}
              >
                <item.icon />
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Sidebar Footer -->
      <div class="border-t border-base-300 p-4">
        <div class="rounded-lg bg-base-200 p-4">
          <div class="mb-2 flex items-center gap-2">
            <Info />
            <span class="text-sm font-semibold">Security Notice</span>
          </div>
          <p class="text-xs leading-relaxed text-base-content/60">
            All actions are logged and auditable. Unauthorized access attempts will be reported.
          </p>
        </div>
      </div>
    </aside>
  </div>
</div>
