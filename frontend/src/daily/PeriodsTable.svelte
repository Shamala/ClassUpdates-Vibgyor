<!--
  "Class Work & Timetable": one card per subject taught that day, with its
  topics, classwork, skill assessed and any homework (tickable here too).
-->
<script>
  import { state } from "../state.svelte.js";
  import { getSubjectHeaderClass } from "../subjects.js";
  import { groupPeriodsBySubject, joinOrNil } from "./periods.js";
  import { hasDueDate } from "./homework.js";
  import { toggleHomework } from "../../app.js";

  let periods = $derived(state.dailyData?.periods);
  let groups = $derived(groupPeriodsBySubject(periods));
</script>

<section class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
        Class Work & Timetable
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Periods 1 to 10 covering classroom worksheets (CWSH) and assessed skills
      </p>
    </div>
  </div>

  <div id="periods-container">
    {#if state.dailyData && groups.length === 0}
      <div class="p-4 text-slate-400 dark:text-slate-500 text-sm">No periods found for this date.</div>
    {:else if groups.length > 0}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each groups as g (g.cleanSubject)}
          {@const hasHomework = g.homeworkList.length > 0}
          {@const subTopicDisplay = joinOrNil(g.subTopics, " • ")}
          {@const cwDisplay = joinOrNil(g.classworks, ", ")}
          {@const skillDisplay = joinOrNil(g.skills, ", ")}
          <div
            class="bg-white dark:bg-slate-800 border {hasHomework
              ? 'border-amber-300 dark:border-amber-500/80 ring-2 ring-amber-100 dark:ring-amber-950/60 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 shadow-xs'} rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <!-- Header: HW marker before the subject, and the session count -->
              <div
                class="px-4 py-3 border-b flex items-center justify-between gap-2 {getSubjectHeaderClass(g.subject)}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  {#if hasHomework}
                    <div class="flex items-center gap-1.5 shrink-0" title="Active Homework Assigned">
                      <span class="hw-pulse-dot w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span
                        class="bg-amber-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-xs"
                      >
                        HW
                      </span>
                    </div>
                  {/if}
                  <h4 class="font-extrabold text-base tracking-tight truncate">{g.subject}</h4>
                </div>

                {#if g.periodCount > 1}
                  <span
                    class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-current/20 shrink-0"
                  >
                    {g.periodCount} Sessions
                  </span>
                {/if}
              </div>

              <!-- Body: topic and sub-topic -->
              <div class="p-4 space-y-2">
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-baseline gap-1.5">
                  <span class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider shrink-0"
                    >Topic:</span
                  >
                  <span class="leading-snug">{joinOrNil(g.topics, " • ")}</span>
                </div>
                {#if subTopicDisplay !== "NIL"}
                  <div class="text-xs text-slate-500 dark:text-slate-400 flex items-baseline gap-1.5">
                    <span
                      class="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 tracking-wider shrink-0"
                      >Sub Topic:</span
                    >
                    <span class="leading-snug">{subTopicDisplay}</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Footer: classwork (CWSH), skill assessed and homework -->
            <div class="p-4 pt-0 space-y-2.5">
              <div
                class="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs"
              >
                <span class="text-slate-400 dark:text-slate-400 font-medium">Class Work:</span>
                <span
                  class="font-bold {cwDisplay !== 'NIL'
                    ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/60'
                    : 'text-slate-400 dark:text-slate-500'}"
                >
                  {cwDisplay}
                </span>
              </div>

              {#if skillDisplay !== "NIL"}
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 dark:text-slate-400 font-medium">Skill Assessed:</span>
                  <span
                    class="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-medium border border-emerald-100 dark:border-emerald-800/60"
                    >{skillDisplay}</span
                  >
                </div>
              {/if}

              {#if hasHomework}
                <div
                  class="mt-2 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs space-y-2"
                >
                  <div
                    class="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5"
                  >
                    <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    Homework (RWSH)
                  </div>
                  {#each g.homeworkList as hw (hw.id)}
                    <div class="flex items-start justify-between gap-2">
                      <label class="flex items-start gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          class="hw-checkbox mt-0.5"
                          checked={hw.is_completed}
                          onchange={() => toggleHomework(hw.id)}
                        />
                        <div class="flex-1">
                          <span
                            class="font-bold text-slate-800 dark:text-slate-200 {hw.is_completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : ''}"
                          >
                            {hw.reinforcement}
                          </span>
                          {#if hasDueDate(hw)}
                            <div class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                              Due: {hw.submission_date}
                            </div>
                          {/if}
                        </div>
                      </label>
                      <span
                        class="text-[10px] font-bold {hw.is_completed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'} shrink-0"
                      >
                        {hw.is_completed ? "✓ Done" : "⏳ Due"}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
