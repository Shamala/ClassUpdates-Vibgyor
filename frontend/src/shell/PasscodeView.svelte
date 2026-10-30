<!--
  The class passcode screen of the published board, with a way in to the sample
  for anyone who has not been given the passcode.
-->
<script>
  import { tick } from "svelte";
  import { shell, passcode } from "../shell.svelte.js";
  import { handlePasscodeSubmit, viewSampleInstead } from "../board.js";

  let input = $state();

  // A class passcode is typed from a WhatsApp message, often one-handed with a
  // child in tow, and a wrong character just says it is wrong. Being able to see
  // what you typed is the difference between a second attempt and giving up.
  let revealed = $state(false);

  async function toggleReveal() {
    revealed = !revealed;
    // Tapping the icon moves focus off the field; put the caret back at the end
    // so typing can carry on uninterrupted.
    await tick();
    const caret = input.value.length;
    input.focus();
    try {
      input.setSelectionRange(caret, caret);
    } catch (e) {
      // setSelectionRange is not allowed on every input type in every browser
    }
  }

  $effect(() => {
    if (passcode.focusRequest && input) {
      tick().then(() => input.focus());
    }
  });
</script>

<!-- Class Passcode Gate (published board only) -->
<div id="passcode-view" class="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" class:hidden={shell.screen !== "passcode"}>
  <div class="max-w-sm w-full">
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-7">
      <div
        class="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md mb-4"
      >
        V
      </div>
      <h1 class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Class Updates</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
        Enter the class passcode to view the daily diary, homework and circulars.
      </p>

      <form
        class="mt-5 space-y-3"
        onsubmit={(e) => {
          e.preventDefault();
          handlePasscodeSubmit();
        }}
      >
        <label for="passcode-input" class="sr-only">Class passcode</label>
        <div class="relative">
          <input
            id="passcode-input"
            type={revealed ? "text" : "password"}
            autocomplete="current-password"
            placeholder="Class passcode"
            bind:this={input}
            bind:value={passcode.value}
            class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium pl-3.5 pr-11 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            id="toggle-passcode-btn"
            onclick={toggleReveal}
            aria-controls="passcode-input"
            aria-pressed={String(revealed)}
            aria-label={revealed ? "Hide passcode" : "Show passcode"}
            title={revealed ? "Hide passcode" : "Show passcode"}
            class="absolute inset-y-0 right-0 pr-3 pl-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus:text-indigo-600 dark:focus:text-indigo-400"
          >
            <svg
              id="passcode-eye-open"
              class="w-4 h-4"
              class:hidden={revealed}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <svg
              id="passcode-eye-closed"
              class="w-4 h-4"
              class:hidden={!revealed}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </button>
        </div>
        <p id="passcode-error" class="text-xs font-semibold text-rose-600 dark:text-rose-400" class:hidden={!passcode.error}>
          {passcode.error}
        </p>
        <button
          id="passcode-submit"
          type="submit"
          disabled={passcode.submitting}
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          {passcode.submitting ? "Unlocking..." : "View class updates"}
        </button>
      </form>

      <p id="passcode-synced-at" class="text-[11px] text-slate-400 dark:text-slate-500 mt-4">{passcode.syncedAt}</p>
      <button
        type="button"
        onclick={viewSampleInstead}
        class="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
      >
        Don't have the passcode? See a sample
      </button>
    </div>
  </div>
</div>
