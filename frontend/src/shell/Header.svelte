<!--
  The sticky header: the brand, the child's name, the date picker, theme,
  Install App, Sync, the freshness stamp, Sign Out (Lock on the class board) and
  the tab bar. Which parts show is decided in app.js through `shell`.
-->
<script>
  import { state } from "../state.svelte.js";
  import { shell } from "../shell.svelte.js";
  import { theme, toggleTheme } from "../theme.svelte.js";
  import { pwa, installApp } from "../pwa.svelte.js";
  import { formatDatePretty, formatSyncStamp } from "../format.js";
  import { isPlaceholderStudentName, isDemoStudent, initials } from "../student.js";
  import { switchTab, chooseDate, triggerManualSync, handleLogout, editStudentName } from "../../app.js";

  const TABS = [
    {
      key: "daily",
      label: "Daily Diary",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      key: "weekly",
      label: "Weekly Overview",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
    {
      key: "circulars",
      label: "Circulars & Notices",
      icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    },
  ];

  // The child's name, or an invitation to add it. The sample's and demo's child
  // cannot be renamed.
  let student = $derived(state.student);
  let isDemo = $derived(isDemoStudent(student));
  let isPlaceholder = $derived(!!student && !isDemo && isPlaceholderStudentName(student.name));
  let canRename = $derived(!!student && !isDemo);
  let displayName = $derived(!student ? "" : isPlaceholder ? "Add student name" : student.name);
  let avatar = $derived(!student ? "--" : isPlaceholder ? "+" : initials(student.name) || (isDemo ? "DS" : "ST"));

  let stamp = $derived.by(() => {
    if (!shell.stampDrawnAt) return null;
    const blob = window.VIBGYOR_ENCRYPTED_DATA;
    const iso = !shell.viewingSample && blob && blob.synced_at;
    if (!iso) return null;
    return {
      text: `Updated ${formatSyncStamp(iso, shell.stampDrawnAt)}`,
      stale: (shell.stampDrawnAt - new Date(iso).getTime()) / 3600000 > 36,
    };
  });
</script>

<!-- Main Navbar -->
<header
  class="bg-white dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-30 shadow-xs transition-colors duration-200"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
    <!-- Brand & School Crest -->
    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
      <div class="flex items-center gap-2.5">
        <div
          class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-200 dark:shadow-indigo-900/40"
        >
          V
        </div>
        <div>
          <h1 class="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">VIBGYOR</h1>
          <p class="text-[11px] font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
            Class Updates & Diary
          </p>
        </div>
      </div>

      <!-- Mobile Profile Snippet -->
      <div id="mobile-profile-snippet" class="sm:hidden text-right" class:hidden={!shell.mobileProfile}>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <span
          id="mobile-student-name"
          class="text-xs font-bold text-slate-800 dark:text-slate-200 block{isPlaceholder ? ' italic' : ''}{canRename
            ? ' cursor-pointer'
            : ''}"
          title={canRename ? "Click to edit child's name" : ""}
          onclick={canRename ? editStudentName : null}>{displayName}</span
        >
        <span id="mobile-student-meta" class="text-[10px] text-slate-500 dark:text-slate-400"
          >{student ? `${student.grade} ${student.section}` : ""}</span
        >
      </div>
    </div>

    <!-- Controls: Date Picker + Theme Toggle + Sync + Profile + Sign Out -->
    <div
      id="header-controls"
      class="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto min-w-0 justify-end"
      class:hidden={!shell.headerControls}
    >
      <!-- Date Selector -->
      <div
        id="date-select-wrap"
        class="relative basis-full order-first min-w-0 sm:order-none sm:basis-auto"
        class:hidden={!shell.dateWrap}
      >
        <label for="date-select" class="sr-only">Select Date</label>
        <select
          id="date-select"
          value={state.selectedDate}
          onchange={(e) => chooseDate(e.currentTarget.value)}
          class="w-full sm:w-64 appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-colors"
        >
          {#each state.availableDates as d (d.date)}
            <option value={d.date}
              >{d.display_date} ({formatDatePretty(d.date)}){d.has_pending_homework ? " 📌 HW Due" : ""}</option
            >
          {:else}
            <option value="">Loading dates...</option>
          {/each}
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 dark:text-slate-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Theme Toggle Button (Always visible) -->
      <button
        id="theme-toggle-btn"
        type="button"
        aria-label="Toggle dark or light theme"
        title={theme.isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        onclick={toggleTheme}
        class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
      >
        <!-- Sun Icon (shown when in dark mode) -->
        <svg id="theme-sun-icon" class="w-4 h-4" class:hidden={!theme.isDark} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <!-- Moon Icon (shown when in light mode) -->
        <svg id="theme-moon-icon" class="w-4 h-4" class:hidden={theme.isDark} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>

      <!-- PWA Install Button (shown when install prompt is supported) -->
      <button
        id="pwa-install-btn"
        title="Install ClassUpdates app on your device"
        onclick={installApp}
        class="items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold px-3 py-2 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
        class:hidden={!pwa.installVisible}
        class:flex={pwa.installVisible}
      >
        <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span class="hidden sm:inline">Install App</span>
      </button>

      <!-- Authenticated Controls (hidden when logged out) -->
      <div
        id="authenticated-controls"
        class="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 sm:flex-initial min-w-0 justify-end"
        class:hidden={!shell.authControls}
      >
        <!-- Sync Button: the board cannot reach the portal, so it has none -->
        <button
          id="sync-btn"
          title="Synchronize from Orion portal or local files"
          onclick={() => triggerManualSync()}
          class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0{state.isSyncing
            ? ' opacity-75 cursor-wait'
            : ''}"
          class:hidden={shell.classBoard}
        >
          <svg
            id="sync-icon"
            class="w-4 h-4 transition-transform"
            class:animate-spin={state.isSyncing}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="hidden sm:inline">Sync Now</span>
        </button>

        <!-- Desktop Student Profile Badge -->
        <div class="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
          <div
            id="student-avatar"
            title={isPlaceholder ? "Click the name to set your child's name" : ""}
            class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-xs"
          >
            {avatar}
          </div>
          <div>
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div
              id="student-name"
              class="text-xs font-bold text-slate-900 dark:text-white leading-tight{isPlaceholder
                ? ' italic text-indigo-600 dark:text-indigo-400'
                : ''}{canRename ? ' cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}"
              title={canRename ? "Click to edit child's name" : ""}
              onclick={canRename ? editStudentName : null}
            >
              {displayName}
            </div>
            <div id="student-meta" class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {student ? `${student.grade} ${student.section} • ${student.school}` : ""}
            </div>
          </div>
        </div>

        <!-- Freshness stamp: says when the class content was last refreshed -->
        <span
          id="last-synced"
          title={stamp?.stale
            ? "These class updates have not been refreshed recently, so they may be out of date."
            : "When these class updates were last refreshed from the school portal."}
          class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap{stamp?.stale
            ? ' text-amber-600 dark:text-amber-400'
            : ''}"
          class:hidden={!stamp}>{stamp?.text ?? ""}</span
        >

        <!-- Sign Out Button: on the board there is no account, so it locks the device -->
        <button
          id="signout-btn"
          onclick={handleLogout}
          title={shell.classBoard
            ? "Lock the board on this device and ask for the passcode again"
            : "Sign out of Hubble Orion"}
          class="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="hidden sm:inline">{shell.classBoard ? "Lock" : "Sign Out"}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Navigation Tabs Bar -->
  <div
    id="tabs-bar"
    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-5 sm:gap-8 border-t border-slate-100 dark:border-slate-700/80 pt-3 overflow-x-auto no-scrollbar"
    class:hidden={!shell.tabsBar}
  >
    {#each TABS as tab (tab.key)}
      <button
        data-tab={tab.key}
        onclick={() => switchTab(tab.key)}
        class="{state.currentTab === tab.key ? 'tab-active' : 'tab-inactive'} pb-3 text-sm flex items-center gap-2 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
        </svg>
        {tab.label}
      </button>
    {/each}
  </div>
</header>
