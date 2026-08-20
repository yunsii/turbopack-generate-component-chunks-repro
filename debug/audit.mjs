// Audits Turbopack chunk entry modules: finds modules that are declared as chunk
// entries (runtimeModuleIds) and have a registered factory, but are never instantiated.
//
// Usage:  CHROME_PATH=/path/to/chrome node debug/audit.mjs http://localhost:3000/p0
//
// Criterion: factoryRegistered === true && started === false  →  the bug.
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2]
if (!url) { console.error('usage: node debug/audit.mjs <url>'); process.exit(1) }

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (existsSync(p)) return p
  }
  const cache = path.join(os.homedir(), '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      if (!d.startsWith('chromium-')) continue
      const p = path.join(cache, d, 'chrome-linux64/chrome')
      if (existsSync(p)) return p
    }
  }
  throw new Error('Chrome not found — set CHROME_PATH')
}

const inject = readFileSync(new URL('./probe-inject.js', import.meta.url), 'utf8')
const port = 9700 + Math.floor(Math.random() * 100)
const child = spawn(findChrome(), [
  '--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(os.tmpdir(), 'tp-audit-' + port)}`,
  '--disable-dev-shm-usage', 'about:blank',
], { stdio: 'ignore' })

for (let i = 0; i < 60; i++) {
  try { await fetch(`http://127.0.0.1:${port}/json/version`); break }
  catch { await new Promise((r) => setTimeout(r, 400)) }
}
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })

await send('Page.enable')
await send('Runtime.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: inject })
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, Number(process.env.WAIT_MS || 30000)))

const out = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const D = window.__TPPROBE || {}
    const started = new Set(D.started || [])
    const all = new Set(D.allIds || [])
    const ids = []
    for (const r of (D.runtimeRegs || [])) for (const i of (r.runtimeModuleIds || [])) ids.push(i)
    return JSON.stringify({
      // NOTE: hydration status is deliberately NOT reported here. Instrumenting the
      // Turbopack runtime perturbs hydration, so it would be misleading. Use
      // debug/check-hydration.mjs (no instrumentation) for the end symptom.
      registeredPages: (D.nextP || {}).registered,
      moduleFactories: all.size,
      instantiated: started.size,
      chunkRegistrations: (D.runtimeRegs || []).map((r) => ({
        entries: r.runtimeModuleIds, otherChunks: r.otherChunksCount,
      })),
      entryAudit: [...new Set(ids)].map((i) => ({
        id: i, factoryRegistered: all.has(i), started: started.has(i),
        BUG: all.has(i) && !started.has(i),
      })),
    })
  })()`,
})
console.log(JSON.stringify(JSON.parse(out?.result?.result?.value ?? '{}'), null, 2))
try { child.kill('SIGKILL') } catch {}
ws.close()
