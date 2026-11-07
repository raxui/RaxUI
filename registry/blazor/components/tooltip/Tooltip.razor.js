// RaxUI manual previews: cancellable delays, hover/focus continuity, RTL positioning.
const states = new WeakMap()
export function init(trigger, content, side, align, openDelay, closeDelay, interactive) {
  const existing = states.get(content)
  if (existing) { Object.assign(existing.options, { side, align, openDelay, closeDelay }); return }
  const controller = new AbortController()
  const options = { side, align, openDelay, closeDelay }
  let timer, generation = 0
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: controller.signal })
  const place = () => {
    if (!content.matches(":popover-open")) return
    const a = trigger.getBoundingClientRect(), w = content.offsetWidth, h = content.offsetHeight
    // clientWidth/clientHeight exclude the scrollbars that innerWidth/innerHeight include.
    const { clientWidth: vw, clientHeight: vh } = document.documentElement
    const rtl = getComputedStyle(trigger).direction === "rtl"
    let s = options.side
    if (s === "start") s = rtl ? "right" : "left"
    if (s === "end") s = rtl ? "left" : "right"
    if (s === "top" && a.top < h + 14) s = "bottom"
    else if (s === "bottom" && a.bottom + h + 14 > vh) s = "top"
    else if (s === "left" && a.left < w + 14) s = "right"
    else if (s === "right" && a.right + w + 14 > vw) s = "left"
    const end = (options.align === "end") !== rtl
    let x = options.align === "center" ? a.left + (a.width - w) / 2 : end ? a.right - w : a.left
    let y = s === "top" ? a.top - h - 6 : a.bottom + 6
    if (s === "left" || s === "right") {
      x = s === "left" ? a.left - w - 6 : a.right + 6
      y = options.align === "center" ? a.top + (a.height - h) / 2 : options.align === "end" ? a.bottom - h : a.top
    }
    content.dataset.side = s
    content.style.left = `${Math.max(8, Math.min(x, vw - w - 8))}px`
    content.style.top = `${Math.max(8, Math.min(y, vh - h - 8))}px`
  }
  const open = () => {
    clearTimeout(timer); generation++
    timer = setTimeout(() => {
      if (!content.isConnected) return
      content.dataset.state = interactive ? "open" : "delayed-open"
      if (!content.matches(":popover-open")) content.showPopover()
      place()
    }, Math.max(0, options.openDelay))
  }
  const close = () => {
    clearTimeout(timer)
    const current = ++generation
    timer = setTimeout(async () => {
      if (!content.matches(":popover-open")) return
      content.dataset.state = "closed"
      await Promise.allSettled(content.getAnimations().map(animation => animation.finished))
      if (generation === current && content.matches(":popover-open")) content.hidePopover()
    }, Math.max(0, options.closeDelay))
  }
  const keep = () => { clearTimeout(timer); generation++; if (content.matches(":popover-open")) content.dataset.state = interactive ? "open" : "delayed-open" }
  const leave = event => {
    if (interactive && (content.contains(event.relatedTarget) || trigger.contains(event.relatedTarget))) return
    if (interactive && (content.contains(document.activeElement) || trigger.contains(document.activeElement)) && event.type === "pointerleave") return
    close()
  }
  listen(trigger, "pointerenter", open); listen(trigger, "focusin", open)
  listen(trigger, "pointerleave", leave); listen(trigger, "focusout", leave)
  if (interactive) {
    listen(content, "pointerenter", keep); listen(content, "focusin", keep)
    listen(content, "pointerleave", leave); listen(content, "focusout", leave)
    listen(trigger, "keydown", event => {
      if (event.key === "Tab" && !event.shiftKey && content.matches(":popover-open")) {
        const first = content.querySelector("a[href],button,input,select,textarea,[tabindex='0']")
        if (first) { event.preventDefault(); first.focus() }
      }
    })
  }
  listen(document, "keydown", event => { if (event.key === "Escape") close() })
  listen(window, "resize", place)
  window.addEventListener("scroll", place, { capture: true, signal: controller.signal })
  const observer = new ResizeObserver(place); observer.observe(content); observer.observe(trigger)
  states.set(content, { options, dispose: () => { clearTimeout(timer); generation++; controller.abort(); observer.disconnect() } })
}
export function dispose(content) { states.get(content)?.dispose(); states.delete(content) }
