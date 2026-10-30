<!--
  The Circulars tab: a category filter, a search box and a card per circular.
  Redraws from state.circulars, which loadCirculars() in app.js sets, and from
  the filter and search, which live in state so they survive a tab switch.

  switchTab() in app.js shows and hides this by toggling `hidden` on
  #view-circulars. The class attribute below is static, so Svelte never
  rewrites it and the two do not fight.
-->
<script>
  import { state, ORION_APP_URL } from "../state.svelte.js";
  import { getCircularCategoryBadge } from "../subjects.js";
  import { formatDatePretty } from "../format.js";
  import { filterCirculars, CATEGORIES } from "./circulars.js";
  import { openNotice } from "./notice.svelte.js";

  const ACTIVE = "px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-full cursor-pointer";
  const INACTIVE =
    "px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full cursor-pointer transition-colors";

  let shown = $derived(
    filterCirculars(state.circulars, state.selectedCircularCategory, state.circularSearchTerm),
  );
</script>

<div id="view-circulars" class="hidden space-y-6">
  <!-- Filter Bar -->
  <div
    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs"
  >
    <div class="flex flex-wrap items-center gap-2">
      {#each CATEGORIES as cat (cat.key)}
        <button
          data-circ-cat={cat.key}
          onclick={() => (state.selectedCircularCategory = cat.key)}
          class={state.selectedCircularCategory === cat.key ? ACTIVE : INACTIVE}
        >
          {cat.label}
        </button>
      {/each}
    </div>

    <div class="w-full sm:w-64">
      <input
        type="text"
        placeholder="Search circulars..."
        bind:value={state.circularSearchTerm}
        class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
      />
    </div>
  </div>

  <!-- Circulars Grid -->
  <div id="circulars-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#if shown.length === 0}
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm"
      >
        No circulars match your current filter.
      </div>
    {:else}
      {#each shown as c (c.id)}
        <div
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full {getCircularCategoryBadge(c.category)}">
                {c.category}
              </span>
              <span class="text-xs text-slate-400 dark:text-slate-500">{formatDatePretty(c.publish_date)}</span>
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <h4
              class="font-bold text-slate-900 dark:text-white text-base mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              onclick={() => openNotice(c.id)}
            >
              {c.title}
            </h4>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-2">
              {c.summary || "No summary provided."}
            </p>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/80 gap-2">
            <span class="text-[11px] text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Hubble Orion Portal
            </span>

            <div class="flex items-center gap-2">
              <a
                href={ORION_APP_URL}
                target="_blank"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-xs transition-colors"
                title="Navigate to Hubble Orion App ({ORION_APP_URL})"
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
              <button
                onclick={() => openNotice(c.id)}
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Read Notice
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
