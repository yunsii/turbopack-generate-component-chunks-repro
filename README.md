# `generateComponentChunks: true` → page never hydrates, with zero diagnostics

Reproduction for a Turbopack chunking bug in **Next.js 16.3.0** (Pages Router).

With `experimental.turbopackChunking.generateComponentChunks: true`, a page's
`__NEXT_P` registration module is **declared as a chunk entry** (it appears in that
chunk's `runtimeModuleIds`) and its **factory is registered** in `moduleFactories`,
but the runtime **never instantiates it**. `hydrate()` then waits forever for an
entrypoint that never arrives.

The failure is **completely silent**: the server-rendered HTML is complete, every
asset request succeeds, the console has **no errors or warnings** — the page simply
never becomes interactive. Waiting is a legal state, so nothing reports anything.

**Root cause is identified and a one-line runtime fix is verified** — see
[Root cause](#root-cause) and [Fix](#fix). In short: the entry chunk lists a sibling chunk
in `otherChunks` that is never injected into the document (its modules were duplicated into
another chunk that is), and `doLoadChunk` short-circuits JS runtime dependencies without
loading them — so that chunk's resolver never resolves and the entry is never instantiated.

## Reproduce

```bash
pnpm install

# Bug
MERGE=1 pnpm build && pnpm start
#   http://localhost:3999/p0  -> renders fully, never becomes interactive

# Control: identical source, one config flag flipped
MERGE=0 pnpm build && pnpm start
#   http://localhost:3999/p0  -> works
```

Every page carries a banner that makes the outcome visible without opening DevTools: it
renders red **NOT HYDRATED** in the server HTML and only turns green **HYDRATED** from an
effect, so it stays red for as long as the page never hydrates. The button beside it counts
clicks and does nothing while the page is unhydrated.

Within a single `MERGE=1` build you can see both outcomes side by side: `/p0` stays red
while `/p4` turns green — the threshold behaviour in visible form.

> Serve each build from its own directory (or delete `.next` between runs and restart
> `next start`). Swapping `.next` under a running server produces buildId-mismatch
> 404s that look like the bug but are not.

In the DevTools console on `/p0`:

```js
// false with MERGE=1, true with MERGE=0
Object.keys(document.getElementById('__next')).some((k) => k.startsWith('__reactFiber'))
window.next?.router     // undefined with MERGE=1, defined with MERGE=0
```

### Tooling in this repo

```bash
# End symptom only — no instrumentation (instrumenting the runtime perturbs hydration)
CHROME_PATH=/path/to/chrome node debug/check-hydration.mjs http://localhost:3999/p0

# Mechanism: for every module declared as a chunk entry, was its factory registered,
# and was it ever instantiated?  The bug is  factoryRegistered && !started
CHROME_PATH=/path/to/chrome node debug/audit.mjs http://localhost:3999/p0
```

## Observed

Identical source, only `generateComponentChunks` differs (`/p0`):

| | `MERGE=1` (bug) | `MERGE=0` (control) |
|---|---|---|
| pages registered via `__NEXT_P` | `['/_app']` | `['/_app', '/p0']` |
| module factories registered | 312 | 312 |
| modules instantiated | 115 | **116** |
| entry `632477` (shared) | started | started |
| entry `468146` (`/_app`) | started | started |
| entry `994547` (page registration) | factory registered, **never started** | started |
| `__reactFiber` on `#__next` | **false** | true |
| `window.next.router` | **undefined** | defined |
| SSR HTML | 2.40 MB, complete | 2.41 MB, complete |
| failed requests | none (only `favicon.ico`) | none (only `favicon.ico`) |
| console errors | **0** | 0 |

`/_app`'s own entry instantiates fine in both builds. Only the *page* registration
module is skipped, and exactly one module fewer is instantiated.

## Threshold: it tracks `otherChunks` width

Within a **single** `MERGE=1` build, whether a page breaks correlates 1:1 with how many
sibling chunks its entry-carrying chunk must await:

| page | `otherChunks` width | entry skipped | hydrates |
|---|---|---|---|
| `/p1` | 70 | `598365` | **no** |
| `/p0` | 69 | `994547` | **no** |
| `/p3` | 64 | `577091` | **no** |
| `/p2` | 63 | `119554` | **no** |
| `/p4` | 50 | — | yes |
| `/p5` | 48 | — | yes |
| `/p6` | 30 | — | yes |

All seven pages hydrate in the `MERGE=0` build. The threshold sits between 50 and 63
in this project.

## Root cause

The awaited promise in `registerChunk` never settles, and the reason is a single branch in
`doLoadChunk` (unminified names):

```js
function doLoadChunk(sourceType, url) {
  const resolver = getOrCreateResolver(url)
  if (resolver.loadingStarted) return resolver.promise
  if (sourceType === SourceType.Runtime) {
    resolver.loadingStarted = true
    if (isCss(url)) resolver.resolve()   // CSS resolves right away
    return resolver.promise              // JS: returns without loading anything
  }
  // …normal path: reuse an existing <script src=…> if present, otherwise create and append one
}
```

For a **JS chunk requested as a runtime dependency**, the runtime marks it as "loading
started" and returns — it never inserts a script. The implicit assumption is that such a
chunk is always already present in the document as `<script defer>`, so it will register
itself and resolve the resolver.

`generateComponentChunks: true` breaks that assumption. Traced on `/p0`:

- the entry-carrying chunk lists `static/chunks/32b41v3x3bmf1.js` in its `otherChunks`
- that file **exists** in the build output and serves 200
- it is **not** referenced anywhere in the HTML
- it was **never requested** (0 network requests) and no `<script>` element for it exists
- its resolver is stuck at `{ loadingStarted: true, resolved: false }` — forever
- the module it would provide (`711138`) is **already registered**, because component-level
  chunking duplicated it into `static/chunks/1gtj_3nz9_l8s.js`, which *is* in the HTML

So the chunk is redundant, nobody loads it, nothing resolves it, and
`await Promise.all(otherChunks …)` in `registerChunk` blocks forever — with no error,
because a pending promise is not a failure.

This also explains the width threshold: the wider the chunk graph, the more likely it
contains a chunk that is referenced as a runtime dependency yet never injected.

## Fix

Two places this can be fixed; the runtime one is verified here.

**Runtime (verified).** Don't short-circuit JS runtime dependencies — let them fall through
to the normal find-or-insert path:

```diff
-if (sourceType === SourceType.Runtime)
-  return resolver.loadingStarted = true, isCss(url) && resolver.resolve(), resolver.promise
+if (sourceType === SourceType.Runtime && isCss(url))
+  return resolver.loadingStarted = true, resolver.resolve(), resolver.promise
```

The normal path already reuses an existing `<script>` when there is one, so this only
changes behaviour for the case that is currently broken.

Validated by patching a built output — same artifacts, only this line differs
(`node debug/patch-runtime-fix.mjs .next`):

| page | unpatched | patched |
|---|---|---|
| `/p0` | not hydrated | **hydrated** |
| `/p1` | not hydrated | **hydrated** |
| `/p4` | hydrated | hydrated (unchanged) |

Cost and safety: the patched build issues exactly **one** additional chunk request
(52 vs 51 on `/p0`) — the previously orphaned chunk — with **zero duplicate requests** and
**zero JS exceptions**.

**Build side (not attempted here).** Arguably the real defect: a chunk should not appear in
another chunk's `otherChunks` if it is never injected into the document — or, if its modules
are already provided by a duplicate chunk, it should not be listed as a dependency at all.

## Where it goes wrong (call path)

`BACKEND.registerChunk` in the Turbopack browser runtime
(`next/dist/.../turbopack-<hash>.js`, unminified for readability):

```js
async registerChunk(chunk, params) {
  const chunkPath = getPathFromScript(chunk)
  getOrCreateResolver(getUrlFromScript(chunk)).resolve()
  if (params != null) {
    for (const d of params.otherChunks) getOrCreateResolver(getChunkRelativeUrl(getChunkPath(d)))
    if (await Promise.all(params.otherChunks.map((d) => loadInitialChunk(chunkPath, d))),
        params.runtimeModuleIds.length > 0)
      for (const moduleId of params.runtimeModuleIds)
        getOrInstantiateRuntimeModule(chunkPath, moduleId)
  }
}
```

Entry instantiation happens **after** `await Promise.all(otherChunks …)`. That await
suspends rather than throwing, which is exactly why the failure produces no
diagnostics — and the correlation with `otherChunks` width points here.

Note there are two chunk registration shapes; only the second one executes entries:

```js
(globalThis.TURBOPACK ||= []).push([source, id, factory, id, factory, …])       // registers factories only
(globalThis.TURBOPACK ||= []).push([source, { otherChunks, runtimeModuleIds }]) // registers + instantiates entries
```

## Why the repro is this large

The bug did not appear in small synthetic projects (15 attempts). Three structural
conditions all had to hold; removing any one made it disappear:

1. **A wide `otherChunks` list on the entry-carrying chunk.** Modules imported
   statically by a *single* page are merged into one chunk — 80 components of 135 KB
   each collapsed into a single 10.6 MB chunk with `otherChunks` width 4. Separate
   shared chunks appear only when **several pages import different subsets**, so that
   the "which pages use this module" signatures differ. Here: 7 pages × distinct
   subsets of 80 shared components.
2. **CSS chunks in that list.** Each shared component ships a CSS module.
3. **Enough module factories, from real npm packages.** Synthetic modules — even with
   top-level side effects and cross-page sharing — get merged away and the factory
   count stalls around 240. `antd` + `lodash-es`, each page importing a different
   subset, is what pushed it over.

## Ruled out

- **Not application code.** In the original application the page was reduced to a
  single `<div>` and `_app` to four lines and the bug still reproduced; the same code
  with `generateComponentChunks: false` was fine.
- **Not `turbopackMinify`.** Disabling minify produces an identical silent-hydration
  symptom through a different build transform, so the two must not be changed together
  while investigating. This repro keeps minify **on**.
- **Not a missing/404 chunk.** Both builds request the same assets successfully.

## Versions verified

| version | reproduces | one-line fix (applied to the built output) |
|---|---|---|
| `next@16.3.0` (pinned in this repo) | yes — `/p0`, `/p1` not hydrated | fixes it |
| `next@16.3.1-canary.25` | yes — identical numbers: `registered: ['/_app']`, 312 factories, 115 instantiated | fixes it |

The affected source file is **byte-identical** between `v16.3.0` and `canary`
(`turbopack/crates/turbopack-ecmascript-runtime/js/src/browser/runtime/dom/runtime-backend-dom.ts`).

To check on canary yourself: `pnpm add next@canary && MERGE=1 pnpm build && pnpm start`.

## Environment

- `next@16.3.0`, `react@18.2.0`, `react-dom@18.2.0`, Pages Router, `output: 'standalone'`
- `antd@5.28.0`, `lodash-es@4`
- Node 22, pnpm 10, Linux

The original application where this was found: ~1811 module factories, entry chunk
`otherChunks` width 78 — the same signature (`factoryRegistered && !started` on the
page registration module, `registered: ['/_app']`, zero console errors).
