# Svelte 5 for a React Developer

Written for someone who knows React and has not used Svelte. Examples are from
this codebase, not a to-do list.

We will be on **Svelte 5**, which introduced *runes*. Most Svelte material online
is Svelte 3/4 and uses `export let` and `$:` — that style still works but is on
the way out. Ignore it; everything here is Svelte 5.

---

## The one idea that explains the rest

React re-runs your component function on every render. That is why you need
`useMemo`, `useCallback`, `React.memo`, dependency arrays, and why a stale
closure is a category of bug you learn to recognise.

Svelte compiles your component. The body runs **once**, at creation. It then
updates exactly the DOM nodes that depend on the value that changed.

Almost every difference below follows from that.

---

## State

```jsx
// React
const [count, setCount] = useState(0);
setCount(count + 1);
```

```svelte
<!-- Svelte 5 -->
<script>
  let count = $state(0);
  count += 1;
</script>
```

`$state` returns a value, not a pair. You assign to it normally. **Mutation
works** — `todos.push(x)` and `obj.name = "Aarav"` both trigger updates, because
`$state` hands back a deep proxy. The React habit of always producing a new
object is unnecessary here.

## Derived values

```jsx
const pending = useMemo(() => items.filter(i => !i.done), [items]);
```

```svelte
<script>
  const pending = $derived(items.filter(i => !i.done));
</script>
```

No dependency array. The compiler works out what `pending` reads. Read it as a
plain value (`pending.length`), not a function call.

## Effects

```jsx
useEffect(() => {
  localStorage.setItem("theme", theme);
}, [theme]);
```

```svelte
<script>
  $effect(() => {
    localStorage.setItem("theme", theme);
  });
</script>
```

Again no dependency array, and the cleanup is the same idea — return a function.

**The biggest beginner mistake, coming from React:** using `$effect` to compute
state from other state.

```svelte
<!-- wrong -->
let total = $state(0);
$effect(() => { total = price * qty; });

<!-- right -->
const total = $derived(price * qty);
```

In React `useEffect` is the everything-hook. In Svelte, if you are assigning
state inside `$effect`, you almost always wanted `$derived`. Reserve `$effect`
for talking to the outside world: `localStorage`, the speech API, a subscription.

---

## Components

One component per `.svelte` file. Three optional sections, in any order:

```svelte
<script>
  let { date, onPick } = $props();   // like function Foo({ date, onPick })
  let open = $state(false);
</script>

<button onclick={() => onPick(date)}>
  {date}
</button>

<style>
  button { font-weight: 600; }   /* scoped to this component automatically */
</style>
```

- `$props()` destructures props. Defaults work the usual way:
  `let { size = "md" } = $props()`.
- Events are plain lowercase DOM attributes: `onclick`, `oninput`, `onsubmit`.
  Not `onClick`. (Svelte 4 used `on:click` — also outdated.)
- `<style>` is scoped to the component, no CSS modules needed. We mostly use
  Tailwind classes anyway, which work exactly as they do now.
- No `className` — it is `class`, because it is real HTML.
- There is no fragment and no single-root rule. Return as many top-level
  elements as you like.

## Markup instead of JavaScript expressions

React expresses control flow with `&&`, ternaries and `.map`. Svelte has blocks:

```svelte
{#if state.loading}
  <Spinner />
{:else if updates.length === 0}
  <p>No updates for this day.</p>
{:else}
  {#each updates as update (update.id)}
    <PeriodCard {update} />
  {/each}
{/if}
```

`(update.id)` is the key — same purpose as React's `key`. `{update}` is
shorthand for `update={update}`.

For the HTML strings this app currently builds by hand, `{@html ...}` exists,
but the point of the migration is to delete those.

## Two-way binding

This is the one thing with no React equivalent, and it removes a lot of the
`getElementById` plumbing in this codebase:

```svelte
<input bind:value={passcode} placeholder="Class passcode" />
```

No `value=` plus `onChange=`. There is also `bind:checked` for the homework
checkboxes, and `bind:this={el}` where you genuinely need the DOM node — that
is the `useRef` equivalent.

## Lifecycle

`onMount(fn)` is `useEffect(fn, [])`. That is usually all you need; `$effect`
covers the rest.

---

## Shared state across components

React reaches for Context or Zustand. Svelte 5 needs neither for something this
size: put runes in a `.svelte.js` file and import it.

```js
// src/lib/board.svelte.js       (the .svelte.js extension is required for runes)
export const board = $state({
  student: null,
  selectedDate: null,
  circulars: [],
});

export function selectDate(date) {
  board.selectedDate = date;
}
```

```svelte
<script>
  import { board, selectDate } from "./lib/board.svelte.js";
</script>

<h2>{board.student?.name}</h2>
```

Any component that reads `board.selectedDate` updates when it changes. No
provider, no hook, no selector. This is the natural home for the global `state`
object in `app.js` today.

---

## Things that will feel strange

| Coming from React | In Svelte |
| --- | --- |
| Re-render the whole component | Only the bound DOM node changes |
| `useMemo` / `useCallback` / `memo` | Not needed — no re-render to optimise |
| Immutable updates everywhere | Mutate freely; `$state` is a proxy |
| Dependency arrays | Tracked automatically |
| `useEffect` for everything | `$derived` for values, `$effect` only for side effects |
| `className`, `onClick` | `class`, `onclick` |
| Context for shared state | A `.svelte.js` module exporting `$state` |
| Stale closures | Largely absent — the body runs once |

The adjustment that takes longest is trusting that you do not need to optimise
anything.

---

## What does not change here

Tailwind classes, the service worker, `localStorage`, the encrypted bundle, the
passcode flow and every Python test stay exactly as they are. Svelte replaces
how the DOM is produced, nothing else.

## Where to look things up

- Official tutorial, interactive, Svelte 5: <https://svelte.dev/tutorial>
- Runes reference: <https://svelte.dev/docs/svelte/what-are-runes>

When searching, add "Svelte 5" or "runes". A result using `export let`,
`on:click` or `$:` is for the older version.
