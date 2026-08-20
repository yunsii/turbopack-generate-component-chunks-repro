// 在页面任何 JS 之前执行:劫持 TURBOPACK.push,包装模块工厂与 context,记录导入解析情况。
(function () {
  var D = (window.__TPPROBE = {
    factoriesSeen: 0, started: [], finished: [], threw: [],
    undefImports: [], // [模块id, 被导入的id]
    rCalls: [], vCalls: [], lCalls: [],
    pushCount: 0,
  })
  function wrapCtx(modId, ctx) {
    try {
      return new Proxy(ctx, {
        get: function (t, k) {
          if (k === 'i') return function (mid) {
            var v
            try { v = t.i(mid) } catch (e) { D.threw.push([modId, 'i:' + mid, String(e).slice(0, 120)]); throw e }
            if (v === undefined || v === null) D.undefImports.push([modId, mid])
            return v
          }
          if (k === 'r') return function (mid) { D.rCalls.push([modId, mid]); return t.r(mid) }
          if (k === 'v') return function (fn) { D.vCalls.push(modId); return t.v(fn) }
          if (k === 'l') return function (c) { D.lCalls.push([modId, String(c).slice(0, 60)]); return t.l(c) }
          var val = t[k]
          return typeof val === 'function' ? val.bind(t) : val
        },
      })
    } catch (e) { return ctx }
  }
  D.runtimeRegs = []   // 带 runtimeModuleIds 的注册(唯一会执行入口模块的形态)
  function wrapChunk(chunk) {
    try {
      if (!Array.isArray(chunk)) return chunk
      // registerChunk: length===2 时 chunk[1] 是 runtimeParams,含 runtimeModuleIds(入口模块)
      if (chunk.length === 2 && chunk[1] && typeof chunk[1] === 'object') {
        D.runtimeRegs.push({
          runtimeModuleIds: chunk[1].runtimeModuleIds || null,
          otherChunksCount: (chunk[1].otherChunks || []).length,
          // 记录 otherChunks 的路径:runtime 要 await 它们全部加载完才实例化入口模块
          otherChunks: (chunk[1].otherChunks || []).map(function (d) {
            return typeof d === 'string' ? d : (d && (d.path || d[0])) || String(d)
          }),
        })
        return chunk
      }
      for (var i = 1; i < chunk.length - 1; i += 2) {
        var id = chunk[i], f = chunk[i + 1]
        if (typeof f !== 'function') continue
        D.factoriesSeen++
        ;(D.allIds = D.allIds || []).push(id)
        chunk[i + 1] = (function (id, orig) {
          return function (ctx) {
            D.started.push(id)
            var args = Array.prototype.slice.call(arguments)
            args[0] = wrapCtx(id, ctx)
            try { var r = orig.apply(this, args); D.finished.push(id); return r }
            catch (e) { D.threw.push([id, 'factory', String(e).slice(0, 160)]); throw e }
          }
        })(id, f)
      }
    } catch (e) {}
    return chunk
  }
  // 劫持 __NEXT_P:记录页面注册、注册函数是否被调用、其结果是否 settle
  D.nextP = { registered: [], invoked: [], settled: [], rejected: [], pending: [] }
  function wrapEntry(entry) {
    try {
      if (!Array.isArray(entry)) return entry
      var page = entry[0], fn = entry[1]
      D.nextP.registered.push(String(page))
      if (typeof fn === 'function') {
        entry[1] = function () {
          D.nextP.invoked.push(String(page))
          var r
          try { r = fn.apply(this, arguments) }
          catch (e) { D.nextP.rejected.push([String(page), 'throw:' + String(e).slice(0, 120)]); throw e }
          if (r && typeof r.then === 'function') {
            D.nextP.pending.push(String(page))
            r.then(
              function () { D.nextP.settled.push(String(page)) },
              function (e) { D.nextP.rejected.push([String(page), 'reject:' + String(e).slice(0, 120)]) }
            )
          } else { D.nextP.settled.push(String(page) + '(sync)') }
          return r
        }
      }
    } catch (e) {}
    return entry
  }
  // Next 的写法是两步:先 window.__NEXT_P = [](走 setter),再 __NEXT_P.push = register
  // (直接改数组实例属性,绕过 setter)。所以要给 push 本身装 accessor,才能包住 register。
  function armPushHook(arr) {
    try {
      var real = function (e) { return Array.prototype.push.call(arr, e) }
      var wrapped = function (e) { return real(wrapEntry(e)) }
      Object.defineProperty(arr, 'push', {
        configurable: true,
        get: function () { return wrapped },
        set: function (fn) {
          real = function (e) { return fn.call(arr, e) }
          wrapped = function (e) { return real(wrapEntry(e)) }
          D.nextP.pushReplaced = (D.nextP.pushReplaced || 0) + 1
        },
      })
    } catch (e) { D.nextP.armError = String(e).slice(0, 120) }
    return arr
  }
  var npTarget = armPushHook(window.__NEXT_P || [])
  Object.defineProperty(window, '__NEXT_P', {
    configurable: true,
    get: function () { return npTarget },
    set: function (v) { npTarget = armPushHook(v || []) },
  })

  var target = []
  function hookPush(o) {
    try {
      if (!o || typeof o.push !== 'function' || o.__hooked) return o
      var op = o.push.bind(o)
      o.push = function (chunk) { D.pushCount++; return op(wrapChunk(chunk)) }
      o.__hooked = true
    } catch (e) {}
    return o
  }
  hookPush(target)
  Object.defineProperty(globalThis, 'TURBOPACK', {
    configurable: true,
    get: function () { return target },
    set: function (v) { target = hookPush(v) },
  })
})()
