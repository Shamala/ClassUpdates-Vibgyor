<!--
  Photos the school sent with the day's update. Absent when there are none.
  Tapping one opens it full size in a new tab.
-->
<script>
  import { state } from "../state.svelte.js";

  let images = $derived(state.dailyData?.images ?? []);
</script>

{#if images.length > 0}
  <section id="attachments-container" class="w-full">
    <h4 class="font-bold text-sm mb-2 text-slate-800 dark:text-slate-100">Attachments</h4>
    <div class="grid gap-3 sm:grid-cols-2">
      {#each images as src, i}
        <a href={src} target="_blank" rel="noopener" class="block">
          <img
            {src}
            alt="Attachment {i + 1} from the school"
            class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs"
          />
        </a>
      {/each}
    </div>
  </section>
{/if}
