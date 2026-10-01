<!--
  The dictation words for the selected day, as large chips in the hero card.
-->
<script>
  import { state } from "../state.svelte.js";

  let words = $derived(state.dailyData?.words_of_the_day ?? []);
</script>

{#if state.dailyData}
  {#if words.length === 0}
    <div class="text-white/80 italic text-sm">
      No special vocabulary words recorded for today.
    </div>
  {:else}
    <div class="flex flex-wrap gap-4 items-center">
      {#each words as word}
        <div class="word-chip px-5 py-3 rounded-2xl flex flex-col items-center shadow-sm">
          <span class="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white">{word}</span>
          <span class="text-xs text-indigo-100 font-medium tracking-normal mt-1">Dictation Prep</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}
