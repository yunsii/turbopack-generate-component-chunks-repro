// Applies the one-line runtime fix to a built .next output, so the fix can be
// validated without rebuilding Next.js itself.
//
//   node debug/patch-runtime-fix.mjs .next
//
// What it changes, in the Turbopack browser runtime's doLoadChunk:
//
//   before:  if (sourceType === SourceType.Runtime)
//              return resolver.loadingStarted = true, isCss(url) && resolver.resolve(), resolver.promise
//
//   after:   if (sourceType === SourceType.Runtime && isCss(url))
//              return resolver.loadingStarted = true, resolver.resolve(), resolver.promise
//
// i.e. a JS chunk requested as a runtime dependency no longer short-circuits to
// "assume something else will load me". It falls through to the normal path,
// which reuses an existing <script> if present and inserts one otherwise.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const out = process.argv[2] || '.next'
const dir = path.join(out, 'static/chunks')
const re = /if\((\w+)===(\w+)\.Runtime\)return (\w+)\.loadingStarted=!0,(\w+)\((\w+)\)&&\3\.resolve\(\),\3\.promise;/

let patched = 0
for (const f of readdirSync(dir)) {
  if (!f.startsWith('turbopack-') || !f.endsWith('.js')) continue
  const p = path.join(dir, f)
  const src = readFileSync(p, 'utf8')
  const m = re.exec(src)
  if (!m) continue
  const [, st, S, res, isCss, url] = m
  const replacement =
    `if(${st}===${S}.Runtime&&${isCss}(${url}))return ${res}.loadingStarted=!0,${res}.resolve(),${res}.promise;`
  writeFileSync(p, src.slice(0, m.index) + replacement + src.slice(m.index + m[0].length))
  patched++
}

if (patched === 0) {
  console.error('No runtime chunk matched the expected pattern — the minified shape changed.')
  process.exit(1)
}
console.log(`Patched ${patched} runtime chunk(s).`)
