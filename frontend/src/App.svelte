<!--
  The whole page. index.html keeps only the <head>, the two data files and the
  script; which screen shows is decided by the flags in `shell`.
-->
<script>
  import { shell } from "./shell.svelte.js";
  import Toast from "./Toast.svelte";
  import Header from "./shell/Header.svelte";
  import NameModal from "./shell/NameModal.svelte";
  import PasscodeView from "./shell/PasscodeView.svelte";
  import LoginView from "./shell/LoginView.svelte";
  import DailyView from "./daily/DailyView.svelte";
  import WeeklyView from "./weekly/WeeklyView.svelte";
  import CircularsView from "./circulars/CircularsView.svelte";
  import NoticeModal from "./circulars/NoticeModal.svelte";
  import WordHistoryModal from "./words/WordHistoryModal.svelte";
</script>

<!-- Top Rainbow Accent Bar -->
<div class="vibgyor-strip w-full"></div>

<Header />
<NameModal />
<PasscodeView />
<LoginView />

<!-- Main Content Container (Dashboard View) -->
<main id="dashboard-view" class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full" class:hidden={!shell.dashboardView}>
  <!-- Loading Indicator -->
  <div id="daily-content-loader" class="text-center py-12" class:hidden={!shell.dailyLoading}>
    <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
    <p class="text-xs text-slate-500 font-semibold mt-2">Loading timetable updates...</p>
  </div>

  <DailyView />
  <WeeklyView />
  <CircularsView />
</main>

<WordHistoryModal />
<NoticeModal />

<!-- Toast Notification -->
<div id="toast"><Toast /></div>
