<!--
  The Daily Diary tab. Everything here redraws from state.dailyData, which the
  loaders in app.js set when a date is chosen or homework is ticked.

  switchTab() in app.js shows and hides this by toggling `hidden` on
  #view-daily. The class attribute below is static, so Svelte never rewrites it
  and the two do not fight.
-->
<script>
  import { openWordHistoryModal } from "../../app.js";
  import WordsHero from "./WordsHero.svelte";
  import HomeworkList from "./HomeworkList.svelte";
  import TeacherNote from "./TeacherNote.svelte";
  import PeriodsTable from "./PeriodsTable.svelte";
</script>

<div id="view-daily" class="space-y-6">
  <!-- Hero: Words of the Day -->
  <section class="flashcard-gradient rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
    <!-- Background subtle decorative shapes -->
    <div
      class="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"
    ></div>
    <div
      class="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none"
    ></div>

    <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <div
          class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
        >
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Surprise Dictation Prep
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Words of the Day</h2>
        <p class="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
          VIBGYOR conducts continuous surprise dictations for Grade 1. Help your child pronounce, spell,
          and form a sentence with these words:
        </p>
      </div>

      <button
        id="word-history-btn"
        onclick={openWordHistoryModal}
        class="self-start md:self-auto bg-white/10 hover:bg-white/25 border border-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Word History
      </button>
    </div>

    <div id="hero-words-container" class="mt-6 relative z-10">
      <WordsHero />
    </div>
  </section>

  <HomeworkList />
  <TeacherNote />
  <PeriodsTable />
</div>
