<!--
  The teacher's note for the selected day. Absent entirely when the diary has
  no note, rather than an empty card.
-->
<script>
  import { state } from "../state.svelte.js";
  import { cleanTeacherNote } from "./teacherNote.js";

  let paragraphs = $derived(cleanTeacherNote(state.dailyData?.teacher_note));
</script>

{#if paragraphs.length > 0}
  <section id="teacher-note-container" class="w-full">
    <div
      class="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-5 shadow-xs flex items-start gap-4 w-full"
    >
      <div
        class="p-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 mt-0.5"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      </div>
      <div class="flex-1 min-w-0 w-full">
        <h4 class="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1.5">
          Teacher's Note for Parents
        </h4>
        <div
          id="teacher-note-body"
          class="text-xs sm:text-sm text-amber-900/90 dark:text-amber-100/90 font-medium leading-relaxed w-full space-y-2.5"
        >
          {#each paragraphs as paragraph, i}
            {#if i > 0}
              <div class="my-2.5 border-t border-amber-200/60 dark:border-amber-800/60"></div>
            {/if}
            <p class="leading-relaxed text-xs sm:text-sm text-amber-900/90 dark:text-amber-100/90 w-full">
              {paragraph}
            </p>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}
