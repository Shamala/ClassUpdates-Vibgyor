<!--
  Sign in with Hubble Orion credentials, or try the demo account. Only the local
  server shows this; the published board asks for the class passcode instead.
-->
<script>
  import { shell, login } from "../shell.svelte.js";
  import { handleLoginSubmit, handleDemoLogin } from "../../app.js";

  let showPassword = $state(false);
</script>

<!-- Login Screen View (Shown when unauthenticated) -->
<div id="login-view" class="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" class:hidden={!shell.loginView}>
  <div class="max-w-md w-full space-y-6">
    <!-- School Brand Header -->
    <div class="text-center">
      <div
        class="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-500/25 mx-auto mb-4"
      >
        V
      </div>
      <h2 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">VIBGYOR Parent Portal</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
        Sign in with your Hubble Orion credentials to access your child's daily diary, homework, and circulars.
      </p>
    </div>

    <!-- Login Card -->
    <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-5">
      <!-- Error Alert Banner -->
      <div
        id="login-error-alert"
        class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
        class:hidden={!login.errorShown}
      >
        <svg class="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span id="login-error-text">{login.error}</span>
      </div>

      <form
        id="login-form"
        onsubmit={(e) => {
          e.preventDefault();
          handleLoginSubmit();
        }}
        class="space-y-4"
      >
        <div>
          <label for="login-username" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Username / Email
          </label>
          <div class="relative">
            <input
              type="text"
              id="login-username"
              required
              placeholder="e.g. parent.email@example.com"
              autocomplete="username"
              bind:value={login.username}
              class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label for="login-password" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Password
          </label>
          <div class="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              required
              placeholder="••••••••••••"
              autocomplete="current-password"
              bind:value={login.password}
              class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors pr-10"
            />
            <button
              type="button"
              id="toggle-pwd-btn"
              onclick={() => (showPassword = !showPassword)}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Show/hide password"
            >
              <svg id="eye-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="submit"
          id="login-submit-btn"
          disabled={login.submitting}
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg
            id="login-spinner"
            class="w-4 h-4 animate-spin"
            class:hidden={!login.submitting}
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
          <span id="login-btn-text">{login.submitting ? "Connecting to Hubble Orion..." : "Sign In & Sync"}</span>
        </button>
      </form>

      <div class="relative flex py-1 items-center">
        <div class="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        <span class="flex-shrink mx-3 text-slate-400 text-xs uppercase font-semibold">Or</span>
        <div class="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
      </div>

      <!-- 1-Click Demo / Sample Mode -->
      <button
        type="button"
        onclick={handleDemoLogin}
        id="demo-login-btn"
        disabled={login.demoBusy}
        class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        class:opacity-75={login.demoBusy}
      >
        <span>✨</span>
        <span>Explore Demo / Sample Account</span>
      </button>

      <!-- 100% Privacy & Security Guarantee -->
      <div
        class="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-left leading-relaxed"
      >
        <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <span class="font-bold block text-emerald-900 dark:text-emerald-200">🔒 100% Client-Side Privacy Guarantee</span>
          <span
            >Your credentials (username & password) are never stored on any remote server. All homework checkmarks and
            preferences reside solely inside your browser (localStorage).</span
          >
        </div>
      </div>
    </div>
  </div>
</div>
