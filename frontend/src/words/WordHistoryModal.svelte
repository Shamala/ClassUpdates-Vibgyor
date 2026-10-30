<!--
  The Word History pop-up (a bottom sheet on phones): this week's dictation
  words, an archive of past weeks, and flashcards for practising them. Opened
  from the Daily tab; the ×, a click on the backdrop and Escape close it.
-->
<script>
  import { state } from "../state.svelte.js";
  import { getDayName } from "../format.js";
  import { speakForSpelling } from "../speech.js";
  import { groupWordWeeks, getWeekRangeLabel, weekWords } from "./wordHistory.js";
  import {
    wordModal,
    closeWordHistory,
    setWordMode,
    startDrill,
    toggleWeek,
    toggleWordReveal,
    prevWord,
    nextWord,
    shuffleWords,
    copyWords,
  } from "./wordModal.svelte.js";

  const MODE_ACTIVE =
    "px-2.5 py-1 rounded-lg transition-all cursor-pointer bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold";
  const MODE_INACTIVE =
    "px-2.5 py-1 rounded-lg transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold";

  let history = $derived(groupWordWeeks(state.availableDates, state.selectedDate));
  let thisWeekDays = $derived(history.weeksMap[history.activeMonday] || []);
  let thisWeekWords = $derived(weekWords(thisWeekDays));
  let pastWeeks = $derived(
    history.sortedWeekKeys
      .filter((k) => k !== history.activeMonday)
      .map((key) => ({ key, days: history.weeksMap[key] || [], words: weekWords(history.weeksMap[key]) })),
  );

  let total = $derived(wordModal.drillWords.length);
  let index = $derived(wordModal.drillIndex >= 0 && wordModal.drillIndex < total ? wordModal.drillIndex : 0);
  let card = $derived(wordModal.drillWords[index]);
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closeWordHistory()} />

{#if wordModal.open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    id="word-modal"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200"
    onclick={(e) => e.target === e.currentTarget && closeWordHistory()}
  >
    <div
      class="bg-white dark:bg-slate-800 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-100 overflow-hidden"
    >
      <!-- Mobile Drag Pill Indicator -->
      <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto sm:hidden mt-2.5 mb-1 shrink-0"></div>

      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 px-5 py-3.5 shrink-0">
        <div class="flex items-center gap-2.5">
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
            <h4 class="font-extrabold text-slate-900 dark:text-white text-base leading-tight">Dictation Word Bank</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Surprise dictation revision</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Mode Switch: List vs Flashcards -->
          <div class="flex bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl text-xs font-bold">
            <button
              id="word-mode-bank-btn"
              onclick={() => setWordMode("bank")}
              class={wordModal.mode === "bank" ? MODE_ACTIVE : MODE_INACTIVE}
            >
              List
            </button>
            <button
              id="word-mode-drill-btn"
              onclick={() => setWordMode("drill")}
              class={wordModal.mode === "bank" ? MODE_INACTIVE : MODE_ACTIVE}
            >
              Flashcards
            </button>
          </div>

          <button
            id="close-word-modal"
            onclick={closeWordHistory}
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
            title="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Scrollable Modal Body -->
      <div id="modal-words-body" class="overflow-y-auto p-5 space-y-4 flex-1">
        {#if history.sortedWeekKeys.length === 0}
          <div class="text-center py-8 text-slate-400 dark:text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p class="font-medium text-sm">No recorded dictation words found yet.</p>
          </div>
        {:else if wordModal.mode === "bank"}
          <!-- This Week's Revision Focus Box -->
          <div
            class="bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl p-4 shadow-xs"
          >
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-indigo-100 dark:border-indigo-900/60">
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    This Week's Focus
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {getWeekRangeLabel(history.activeMonday)} • {thisWeekWords.length} words for Friday dictation
                </p>
              </div>
              {#if thisWeekWords.length > 0}
                <button
                  onclick={() => copyWords(thisWeekWords)}
                  class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  title="Copy this week's words"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  <span>Copy</span>
                </button>
              {/if}
            </div>

            {#if thisWeekWords.length > 0}
              <!-- Word Pill Cloud -->
              <div class="py-3 flex flex-wrap gap-2">
                {#each thisWeekWords as w}
                  <span
                    class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 font-extrabold text-sm sm:text-base rounded-xl border border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {w}
                  </span>
                {/each}
              </div>

              <!-- Daily Breakdown -->
              <div
                class="pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                {#each thisWeekDays as d (d.date)}
                  <div class="flex items-center gap-1">
                    <span class="font-bold text-slate-800 dark:text-slate-300">{getDayName(d.date).slice(0, 3)}:</span>
                    <span class="text-slate-600 dark:text-slate-400 font-medium">{d.words_of_the_day.join(", ")}</span>
                  </div>
                {/each}
              </div>

              <div class="mt-3 pt-2 border-t border-indigo-100/40 dark:border-indigo-900/30 flex justify-end">
                <button
                  onclick={() => startDrill("this_week")}
                  class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Practice flashcards ({thisWeekWords.length})</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            {:else}
              <p class="text-xs text-slate-500 dark:text-slate-400 py-3">No dictation words recorded yet for this week.</p>
            {/if}
          </div>

          <!-- Past Weeks Archive -->
          {#if pastWeeks.length > 0}
            <div class="space-y-2 pt-1">
              <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Previous Weeks Archive
              </h5>
              <div class="space-y-2">
                {#each pastWeeks as week (week.key)}
                  {@const isExpanded = !!wordModal.expandedWeeks[week.key]}
                  <div
                    class="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-slate-50/60 dark:bg-slate-900/40 transition-colors"
                  >
                    <button
                      onclick={() => toggleWeek(week.key)}
                      class="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          Week of {getWeekRangeLabel(week.key)}
                        </span>
                        <span
                          class="text-[11px] font-semibold px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full"
                        >
                          {week.words.length} words
                        </span>
                      </div>
                      <svg
                        class="w-4 h-4 text-slate-400 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {#if isExpanded}
                      <div class="p-3.5 pt-0 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                        <div class="flex flex-wrap gap-1.5 pt-2.5">
                          {#each week.words as w}
                            <span
                              class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold"
                            >
                              {w}
                            </span>
                          {/each}
                        </div>

                        <!-- Day breakdown for past week -->
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          {#each week.days as d (d.date)}
                            <div class="flex items-center gap-1">
                              <span class="font-semibold text-slate-700 dark:text-slate-300"
                                >{getDayName(d.date).slice(0, 3)} ({d.display_date}):</span
                              >
                              <span>{d.words_of_the_day.join(", ")}</span>
                            </div>
                          {/each}
                        </div>

                        <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <button
                            onclick={() => copyWords(week.words)}
                            class="font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              />
                            </svg>
                            <span>Copy words</span>
                          </button>
                          <button
                            onclick={() => startDrill(`week_${week.key}`)}
                            class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Drill this week →
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else if total === 0}
          <div class="text-center py-10 space-y-3">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">No words found in this practice set.</p>
            <button
              onclick={() => setWordMode("bank")}
              class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Back to Word Bank
            </button>
          </div>
        {:else}
          <!-- Flashcard Practice -->
          <div class="flex flex-col items-center justify-center py-2 space-y-4">
            <!-- Top meta bar -->
            <div class="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span class="font-bold">
                Word <span class="text-indigo-600 dark:text-indigo-400 text-sm font-extrabold">{index + 1}</span> of {total}
              </span>
              <div class="flex items-center gap-3">
                <button
                  onclick={shuffleWords}
                  class="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                  title="Randomize word order"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Shuffle</span>
                </button>
                <button
                  onclick={() => setWordMode("bank")}
                  class="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer transition-colors"
                >
                  View all
                </button>
              </div>
            </div>

            <!-- Flashcard Display Card -->
            <div
              class="w-full max-w-sm bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/40 border-2 border-indigo-200/90 dark:border-indigo-800/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-md relative min-h-[190px] transition-all"
            >
              {#if wordModal.isWordHidden}
                <div class="text-slate-400 dark:text-slate-500 font-mono font-black text-3xl tracking-[0.3em] select-none my-auto">
                  ••••••••
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-3">
                  Listen carefully and spell the word on paper!
                </p>
              {:else}
                <div class="text-4xl sm:text-5xl font-black text-indigo-950 dark:text-white tracking-tight font-sans my-auto">
                  {card.word}
                </div>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  Taught on {card.display_date} ({getDayName(card.date)})
                </p>
              {/if}

              <!-- Floating action buttons -->
              <div class="mt-5 flex items-center gap-2">
                <button
                  onclick={() => speakForSpelling(card.word)}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Read word aloud"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  <span>Pronounce</span>
                </button>

                <button
                  onclick={toggleWordReveal}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  {#if wordModal.isWordHidden}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span>Reveal Word</span>
                  {:else}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                    <span>Hide (Blind Test)</span>
                  {/if}
                </button>
              </div>
            </div>

            <!-- Navigation Prev / Next Buttons -->
            <div class="w-full max-w-sm flex items-center justify-between gap-3 pt-1">
              <button
                onclick={prevWord}
                disabled={index === 0}
                class="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <button
                onclick={nextWord}
                disabled={index === total - 1}
                class="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Next</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
