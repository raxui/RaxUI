const outlets = new WeakMap()
export function init(outlet, receiver) {
  let states = outlets.get(outlet)
  if (!states) { states = new Map(); outlets.set(outlet, states) }
  for (const [id, state] of states) if (!document.getElementById(id)) { state.dispose(); states.delete(id) }
  for (const item of outlet.children) {
    if (states.has(item.id)) continue
    const controller = new AbortController()
    let remaining = Number(item.dataset.duration), started, timer, closing = false, startX
    const paused = new Set()
    const resume = () => { if (closing || paused.size || timer || Number(item.dataset.duration) <= 0) return; started = performance.now(); timer = setTimeout(close, remaining) }
    const pause = reason => { if (!paused.size && timer) { clearTimeout(timer); timer = undefined; remaining -= performance.now() - started }; paused.add(reason) }
    const unpause = reason => { if (paused.delete(reason)) resume() }
    const close = async () => {
      if (closing) return
      closing = true; clearTimeout(timer); item.dataset.state = "closed"
      await Promise.allSettled(item.getAnimations().map(animation => animation.finished))
      if (!controller.signal.aborted) await receiver.invokeMethodAsync("Remove", item.id)
    }
    const listen = (type, fn) => item.addEventListener(type, fn, { signal: controller.signal })
    listen("pointerenter", () => pause("hover")); listen("pointerleave", () => unpause("hover"))
    listen("focusin", () => pause("focus")); listen("focusout", event => { if (!item.contains(event.relatedTarget)) unpause("focus") })
    listen("pointerdown", event => { if (event.button !== 0 || event.target.closest("button,a,input")) return; startX = event.clientX; pause("drag"); item.setPointerCapture(event.pointerId) })
    listen("pointermove", event => { if (startX === undefined) return; item.dataset.swipe = "move"; item.style.setProperty("--radix-toast-swipe-move-x", `${event.clientX - startX}px`) })
    const reset = () => { startX = undefined; item.dataset.swipe = "cancel"; unpause("drag") }
    listen("pointerup", event => { const dismiss = startX !== undefined && Math.abs(event.clientX - startX) > 60; reset(); if (dismiss) close() })
    listen("pointercancel", reset)
    states.set(item.id, { close, dispose: () => { controller.abort(); clearTimeout(timer) } }); resume()
  }
}
export function dismiss(outlet, id) { return outlets.get(outlet)?.get(id)?.close() }
export function dispose(outlet) { outlets.get(outlet)?.forEach(state => state.dispose()); outlets.delete(outlet) }
