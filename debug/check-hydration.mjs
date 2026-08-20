// Checks the end symptom only: does the page hydrate? No instrumentation is
// injected, because instrumenting the Turbopack runtime perturbs hydration itself.
//
// Usage:  CHROME_PATH=/path/to/chrome node debug/check-hydration.mjs <url>
import { spawn } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import os from 'node:os'; import path from 'node:path'
const url=process.argv[2]
function findChrome(){
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const p of ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']) if (existsSync(p)) return p
  const cache=path.join(os.homedir(),'.cache/ms-playwright')
  if (existsSync(cache)) for (const d of readdirSync(cache)) {
    if (!d.startsWith('chromium-')) continue
    const p=path.join(cache,d,'chrome-linux64/chrome'); if (existsSync(p)) return p
  }
  throw new Error('Chrome not found — set CHROME_PATH')
}
const bin=findChrome()
const port=9500+Math.floor(Math.random()*60)
const ch=spawn(bin,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/h-${port}`,'--disable-dev-shm-usage','about:blank'],{stdio:'ignore'})
for(let i=0;i<60;i++){try{await fetch(`http://127.0.0.1:${port}/json/version`);break}catch{await new Promise(r=>setTimeout(r,400))}}
const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const ws=new WebSocket(list.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j})
let id=0;const p=new Map();const errs=[];const failed=[]
ws.onmessage=m=>{const g=JSON.parse(m.data)
 if(g.id&&p.has(g.id)){p.get(g.id)(g);p.delete(g.id)}
 if(g.method==='Runtime.exceptionThrown')errs.push(g.params.exceptionDetails.text)
 if(g.method==='Log.entryAdded'&&g.params.entry.level==='error')errs.push(g.params.entry.text)
 if(g.method==='Network.responseReceived'&&g.params.response.status>=400)failed.push(g.params.response.status+' '+g.params.response.url)
 if(g.method==='Network.loadingFailed')failed.push('FAILED '+(g.params.errorText||''))}
const send=(m,x={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:x}))})
await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable')
await send('Page.navigate',{url});await new Promise(r=>setTimeout(r,25000))
const o=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
  const root=document.getElementById('__next')||document.body
  const hasFiber=Object.keys(root).some(k=>k.startsWith('__reactContainer')||k.startsWith('__reactFiber'))
  return JSON.stringify({hasFiber, routerReady: !!(window.next&&window.next.router),
    htmlBytes: document.documentElement.outerHTML.length, hasContent: root.innerHTML.length>500})
})()`})
console.log('  hydration:', o?.result?.result?.value)
console.log('  failed requests(' + failed.length + '):'); failed.forEach(e => console.log('    - ' + e))
try{ch.kill('SIGKILL')}catch{}; ws.close()
