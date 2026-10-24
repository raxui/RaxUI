import { onKeyDown } from "../DropdownMenu/DropdownMenu.razor.js"
const states = new WeakMap()
export function init(target, menu) {
  const controller = new AbortController()
  let generation = 0
  const listen = (node, type, callback) => node.addEventListener(type, callback, { signal: controller.signal })
  const hide = async () => {
    if (!menu.matches(":popover-open")) return
    const current = ++generation
    menu.dataset.state = "closed"
    await Promise.allSettled(menu.getAnimations().map(animation => animation.finished))
    if (current !== generation) return
    menu.hidePopover(); target.setAttribute("aria-expanded", "false"); target.dataset.state = "closed"
    if (menu.contains(document.activeElement) || document.activeElement === document.body) target.focus()
  }
  const show = (x, y, keyboard) => {
    generation++; menu.dataset.state = "open"; target.dataset.state = "open"
    if (!menu.matches(":popover-open")) menu.showPopover()
    menu.style.left = `${Math.max(8, Math.min(x, innerWidth - menu.offsetWidth - 8))}px`
    menu.style.top = `${Math.max(8, Math.min(y, innerHeight - menu.offsetHeight - 8))}px`
    target.setAttribute("aria-expanded", "true")
    if (keyboard) menu.querySelector('[role="menuitem"]:not(:disabled)')?.focus(); else menu.focus()
  }
  listen(target, "contextmenu", event => { event.preventDefault(); show(event.clientX, event.clientY, false) })
  listen(target, "keydown", event => {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return
    event.preventDefault(); const r = target.getBoundingClientRect(); show(r.left, r.bottom, true)
  })
  listen(menu, "keydown", event => { if (event.key === "Escape") { event.preventDefault(); hide() }; onKeyDown(event, menu, hide) })
  listen(menu, "click", event => { if (event.target.closest('[role="menuitem"]:not(:disabled)')) hide() })
  listen(menu, "pointermove", event => event.target.closest('[role="menuitem"]:not(:disabled)')?.focus())
  listen(document, "pointerdown", event => { if (!menu.contains(event.target)) hide() })
  listen(window, "resize", hide)
  states.set(menu, () => { generation++; controller.abort() })
}
export function dispose(menu) { states.get(menu)?.(); states.delete(menu) }
