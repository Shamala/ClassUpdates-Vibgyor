<!--
  The pop-up that shows one circular. openNotice() sets which; Close, the ×,
  a click on the backdrop and Escape all clear it.
-->
<script>
  import { state, ORION_APP_URL } from "../state.svelte.js";
  import { getCircularCategoryBadge } from "../subjects.js";
  import { formatDatePretty } from "../format.js";
  import { notice, closeNotice } from "./notice.svelte.js";

  let circular = $derived(
    notice.id == null ? null : (state.circulars || []).find((c) => c.id === notice.id) || null,
  );
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closeNotice()} />

{#if circular}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    id="notice-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    onclick={(e) => e.target === e.currentTarget && closeNotice()}
  >
    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-slate-800 dark:text-slate-100"
    >
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
        <div class="flex items-center gap-2">
          <span id="notice-category-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold {getCircularCategoryBadge(circular.category)}">
            {circular.category}
          </span>
          <span id="notice-date" class="text-xs text-slate-400 dark:text-slate-500">{formatDatePretty(circular.publish_date)}</span>
        </div>
        <button
          id="close-notice-modal"
          onclick={closeNotice}
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <h3 id="notice-title" class="font-extrabold text-slate-900 dark:text-white text-lg leading-snug">{circular.title}</h3>

      <div
        id="notice-content"
        class="overflow-y-auto pr-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-2 whitespace-pre-line flex-1"
      >
        <div
          class="bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
        >
          <div class="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 tracking-wider mb-1">Executive Summary</div>
          {circular.summary || "No summary provided."}
        </div>
        <div
          class="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
        >
          <div class="flex items-center gap-2">
            <span class="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-lg">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </span>
            <div>
              <div class="font-bold text-slate-800 dark:text-slate-200">Hubble Orion Portal</div>
              <div class="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{ORION_APP_URL}</div>
            </div>
          </div>
          <a
            href={ORION_APP_URL}
            target="_blank"
            class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1"
          >
            Open in App →
          </a>
        </div>
      </div>

      <div id="notice-footer" class="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
        <button
          id="btn-close-notice"
          onclick={closeNotice}
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
        >
          Close
        </button>
        <a
          id="notice-pdf-link"
          href={ORION_APP_URL}
          target="_blank"
          class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-sm"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Open in App
        </a>
      </div>
    </div>
  </div>
{/if}
