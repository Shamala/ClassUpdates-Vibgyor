<!--
  "Whose updates are these?": asks for the child's name. Replaces the browser's
  prompt(), which shows the site's host name above the question.
-->
<script>
  import { nameModal, closeNameModal, submitStudentName } from "./studentName.svelte.js";

  let input = $state();

  // Ready to type over whatever name is there
  $effect(() => {
    if (nameModal.open && input) {
      input.focus();
      input.select();
    }
  });
</script>

{#if nameModal.open}
  <div
    id="name-modal"
    class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="name-modal-title"
  >
    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6"
    >
      <h2 id="name-modal-title" class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
        Whose updates are these?
      </h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        Add your child's name so the dashboard feels like theirs. It is saved on this device only and is never shared.
      </p>
      <form
        class="mt-4 space-y-3"
        onsubmit={(e) => {
          e.preventDefault();
          submitStudentName();
        }}
      >
        <label for="name-modal-input" class="sr-only">Child's name</label>
        <input
          id="name-modal-input"
          type="text"
          autocomplete="off"
          placeholder="e.g. Aarav"
          bind:this={input}
          bind:value={nameModal.value}
          class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div class="flex items-center gap-2 justify-end pt-1">
          <button
            type="button"
            onclick={closeNameModal}
            class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Save name
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
