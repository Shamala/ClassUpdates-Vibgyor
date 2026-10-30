<!--
  The Weekly Overview tab: the week's dictation words, its homework deadlines and
  a card per school day. Everything redraws from state.weeklyData, which
  loadWeeklyUpdate() in data.js sets.

  Shown while state.currentTab is "weekly".
-->
<script>
  import { state } from "../state.svelte.js";
  import { getCanonicalSubject } from "../subjects.js";
  import { getDayName } from "../format.js";
  import { activeHomework, hasDueDate } from "../daily/homework.js";
  import { toggleHomework } from "../data.js";
  import { selectDateAndSwitch } from "../navigation.js";

  let data = $derived(state.weeklyData);
  // UTC, as before: a day counts as "future" until it has begun in UTC.
  let today = $derived(data ? new Date().toISOString().split("T")[0] : "");
  let days = $derived(
    (data?.days || []).map((day) => ({ ...day, homework: activeHomework(day.periods) })),
  );
</script>

<div id="view-weekly" class="space-y-6" class:hidden={state.currentTab !== "weekly"}>
  <!-- Top banner for weekly dictation & homework -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Weekly Dictation Bank -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </span>
          <div>
            <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">Weekly Dictation Bank</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Consolidated vocabulary list for Friday surprise dictation practice
            </p>
          </div>
        </div>
      </div>
      <div id="weekly-words-bank" class="flex flex-wrap gap-2 pt-2">
        {#if data}
          {#if data.weekly_dictation_words?.length > 0}
            {#each data.weekly_dictation_words as w}
              <span
                class="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded-xl font-bold text-sm tracking-wide shadow-sm"
              >
                {w}
              </span>
            {/each}
          {:else}
            <span class="text-xs text-slate-400 dark:text-slate-500">No words found for this week.</span>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Weekly Homework Deadlines -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="p-2 bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-xl">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </span>
          <div>
            <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">Weekly Homework Deadlines</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Reinforcement worksheets assigned across the week
            </p>
          </div>
        </div>
      </div>
      <div id="weekly-hw-summary" class="space-y-2 pt-2">
        {#if data}
          {#if data.active_homework_items?.length > 0}
            {#each data.active_homework_items as item}
              <div
                class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="hw-checkbox"
                    checked={item.is_completed}
                    onchange={() => toggleHomework(item.period_id)}
                  />
                  <div>
                    <span class="font-bold text-slate-800 dark:text-slate-200">{getCanonicalSubject(item.subject)}</span>
                    <p class="text-slate-600 dark:text-slate-400">{item.reinforcement || "NIL"}</p>
                  </div>
                </div>
                <div class="text-right font-medium">
                  <span
                    class="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60"
                  >
                    {hasDueDate(item) ? item.submission_date : "No due date"}
                  </span>
                </div>
              </div>
            {/each}
          {:else}
            <div class="text-xs text-slate-400 dark:text-slate-500">No homework assigned this week.</div>
          {/if}
        {/if}
      </div>
    </div>
  </div>

  <!-- 5-Day Columns Breakdown -->
  <section class="space-y-3">
    <h4 class="font-extrabold text-slate-900 dark:text-white text-base">5-Day Curriculum Coverage</h4>
    <div id="weekly-days-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {#each days as day (day.date)}
        <div
          class="bg-white dark:bg-slate-800 border {day.date === state.selectedDate
            ? 'border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-100 dark:ring-indigo-950/60'
            : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-4 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2 mb-3">
              <div>
                <h5 class="font-bold text-slate-900 dark:text-white text-sm">{getDayName(day.date)}</h5>
                <span class="text-xs text-slate-400 dark:text-slate-400">{day.display_date}</span>
              </div>
              {#if day.homework.length > 0}
                <span
                  class="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 font-bold text-xs px-2 py-0.5 rounded-full"
                  >{day.homework.length} HW</span
                >
              {:else}
                <span class="text-xs text-slate-400 dark:text-slate-500">No HW</span>
              {/if}
            </div>

            {#if day.words_of_the_day?.length > 0}
              <div class="mb-3 bg-indigo-50/50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/60">
                <div class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                  Dictation Words
                </div>
                <div class="font-bold text-indigo-900 dark:text-indigo-200 text-sm">{day.words_of_the_day.join(", ")}</div>
              </div>
            {/if}

            <!-- Homework only, as a list -->
            <div class="mt-2">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Assigned Homework
              </div>
              {#if day.homework.length === 0}
                <div
                  class="text-xs text-slate-400 dark:text-slate-500 italic py-3 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"
                >
                  No homework assigned
                </div>
              {:else}
                <ul class="space-y-2 text-xs">
                  {#each day.homework as p}
                    <li
                      class="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5"
                    >
                      <span class="text-amber-500 font-bold leading-none mt-1">•</span>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-1">
                          <span class="truncate">{p.subject}</span>
                          {#if p.is_completed}
                            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓ Done</span>
                          {:else}
                            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0">⏳ Due</span>
                          {/if}
                        </div>
                        <div class="text-slate-600 dark:text-slate-400 text-[11px] leading-snug mt-0.5">
                          {p.reinforcement || "NIL"}
                        </div>
                        {#if hasDueDate(p)}
                          <div class="text-[10px] text-amber-800 dark:text-amber-300 font-semibold mt-1">
                            Due: {p.submission_date}
                          </div>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>

          {#if day.date > today}
            <button
              disabled
              class="mt-4 w-full text-center text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/40 py-1.5 rounded-lg cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60"
              title="Timetable updates are not yet available for future dates"
            >
              Not Available Yet
            </button>
          {:else}
            <button
              onclick={() => selectDateAndSwitch(day.date)}
              class="mt-4 w-full text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              View Daily Diary →
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </section>
</div>
