<script>
  import { Moon, Sun } from "@lucide/svelte";
  const darkTheme = "dim";
</script>

<!-- Theme Toggle -->
<div class="flex px-4">
  <label class="swap swap-rotate">
    <!-- this hidden checkbox controls the state -->
    <input type="checkbox" class="theme-controller" value={darkTheme} />

    <!-- Swap icons -->
    <Sun class="swap-off size-6" />
    <Moon class="swap-on size-6" />
  </label>
</div>
