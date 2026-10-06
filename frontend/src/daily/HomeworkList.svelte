<!--
  "Active Homework (RWSH)": the day's homework as cards with a checkbox each,
  in timetable order, and a done/total badge in the heading.
-->
<script>
  import { state } from "../state.svelte.js";
  import { getSubjectBadgeClass } from "../subjects.js";
  import { activeHomework, hasDueDate } from "./homework.js";
  import { toggleHomework } from "../../app.js";

  const BADGE = "text-xs font-semibold px-2.5 py-0.5 rounded-full";

  let items = $derived(activeHomework(state.dailyData?.periods));
  let done = $derived(items.filter((p) => p.is_completed).length);

  // Before the first day loads the badge reads "0 Due", as the static page did.
  let badge = $derived.by(() => {
    if (!state.dailyData) {
      return {
        text: "0 Due",
        cls: `bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 ${BADGE}`,
      };
    }
    if (items.length === 0) {
      return { text: "0/0 Done", cls: `bg-slate-100 dark:bg-slate-700/60 text-slate-500 ${BADGE}` };
    }
    return {
      text: `${done}/${items.length} Done`,
      cls:
        done === items.length
          ? `bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ${BADGE}`
          : `bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 ${BADGE}`,
    };
  });
</script>

<section class="space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <h3 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
        Active Homework (RWSH)
      </h3>
      <span id="hw-count-badge" class={badge.cls}>{badge.text}</span>
    </div>
    <span class="text-xs text-slate-400 dark:text-slate-500">Click checkbox when completed</span>
  </div>

  <div id="homework-container">
    {#if state.dailyData && items.length === 0}
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm"
      >
        <div
          class="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 mb-2"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 class="font-bold text-slate-800 dark:text-white">No Homework Assigned Today!</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          All classwork was completed in school. Enjoy reading time with your child!
        </p>
      </div>
    {:else if items.length > 0}
      <div class="grid gap-4">
        {#each items as p (p.id)}
          <div
            class="bg-white dark:bg-slate-800 border {p.is_completed
              ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="hw-{p.id}"
                  class="hw-checkbox mt-1"
                  checked={p.is_completed}
                  onchange={() => toggleHomework(p.id)}
                />
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md {getSubjectBadgeClass(
                        p.subject,
                      )}"
                    >
                      {p.subject}
                    </span>
                    {#if hasDueDate(p)}
                      <span
                        class="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Due: {p.submission_date}
                      </span>
                    {/if}
                  </div>
                  <h4
                    class="font-bold text-slate-900 dark:text-white mt-2 text-base {p.is_completed
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : ''}"
                  >
                    {p.topic} : {p.reinforcement}
                  </h4>
                </div>
              </div>
              <div>
                {#if p.is_completed}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full"
                  >
                    Completed ✓
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/80 px-2.5 py-1 rounded-full"
                  >
                    Action Needed
                  </span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
