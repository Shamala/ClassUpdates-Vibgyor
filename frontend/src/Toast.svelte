<!--
  The toast strip. It reads the shared state in toast.svelte.js and redraws
  whenever showToast() or dismissToast() changes it.

  transition:fly replaces the old hand-rolled animation (toggle `hidden`, force
  a reflow, then remove opacity-0/translate-y-4 with a 300ms timer to hide it
  again). Same movement: 16px up while fading in, reversed on the way out.
-->
<script>
  import { fly } from "svelte/transition";
  import { toast, dismissToast } from "./toast.svelte.js";

  const colours = {
    success: "bg-emerald-600 text-white shadow-emerald-900/30",
    warning: "bg-amber-600 text-white shadow-amber-900/30",
    error: "bg-rose-600 text-white shadow-rose-900/30",
    info: "bg-indigo-600 text-white shadow-indigo-900/30",
  };

  const icons = {
    success: { width: 2.5, path: "M5 13l4 4L19 7" },
    warning: {
      width: 2,
      path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    },
    error: { width: 2, path: "M6 18L18 6M6 6l12 12" },
    info: {
      width: 2,
      path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  };

  // Like a value computed in a React render body, but recomputed only when
  // toast.type changes.
  let colour = $derived(colours[toast.type] || colours.info);
  let icon = $derived(icons[toast.type] || icons.info);
</script>

{#if toast.open}
  <div
    class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 font-medium text-sm {colour}"
    transition:fly={{ y: 16, duration: 300 }}
  >
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={icon.width} d={icon.path} />
    </svg>
    <span class="flex-1">{toast.message}</span>
    <button
      onclick={dismissToast}
      class="ml-2 -mr-1 p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
      title="Dismiss"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
{/if}
