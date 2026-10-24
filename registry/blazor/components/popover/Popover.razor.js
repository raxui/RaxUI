// Source-owned: position extracted from DropdownMenu (ADR 013); DropdownMenu remains unchanged.
const GAP = 4
const MARGIN = 8
const instances = new WeakMap()
export function init(trigger, content, receiver) {
  dispose(content)
  const controller = new AbortController()
  const place = () => { if (content.matches(":popover-open")) position(trigger, content) }
  content.addEventListener("toggle", event => {
    const open = event.newState === "open"
    trigger.setAttribute("aria-expanded", String(open))
    if (open) {
      place()
      // Button popovers move focus inside; input suggestions retain the input focus.
      if (trigger.tagName === "BUTTON") content.querySelector("input, button, [tabindex]")?.focus()
    } else {
      trigger.removeAttribute("aria-activedescendant")
      content.querySelectorAll("[aria-activedescendant]").forEach(el => el.removeAttribute("aria-activedescendant"))
      content.querySelectorAll("[data-active]").forEach(el => el.removeAttribute("data-active"))
      if (content.contains(document.activeElement) || document.activeElement === document.body) trigger.focus()
    }
    receiver.invokeMethodAsync("Toggled", open)
  }, { signal: controller.signal })
  window.addEventListener("resize", place, { signal: controller.signal })
  window.addEventListener("scroll", place, { capture: true, signal: controller.signal })
  const observer = new ResizeObserver(place)
  observer.observe(content); observer.observe(trigger)
  instances.set(content, { controller, observer })
}
export function setOpen(content, open) {
  if (content.matches(":popover-open") === open) return
  if (open) content.showPopover(); else content.hidePopover()
}
export function dispose(content) {
  const state = instances.get(content)
  state?.controller.abort(); state?.observer.disconnect(); instances.delete(content)
}
function position(trigger, menu) {
  const anchor = trigger.getBoundingClientRect()
  // offset sizes ignore the opening animation's scale.
  const width = menu.offsetWidth
  const height = menu.offsetHeight
  const rtl = getComputedStyle(trigger).direction === "rtl"
  const start = rtl ? anchor.right - width : anchor.left
  const left = Math.max(MARGIN, Math.min(start, window.innerWidth - width - MARGIN))
  const below = anchor.bottom + GAP
  const above = anchor.top - GAP - height
  const top = below + height <= window.innerHeight - MARGIN || above < MARGIN ? below : above
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  menu.style.transformOrigin = `${top === below ? "top" : "bottom"} ${rtl ? "right" : "left"}`
}


// Shared DOM keyboard enhancement for the two Blazor listboxes. C# owns values and filtering.
const lists = new WeakMap()
export function initListbox(input, list, receiver) {
  const previous = lists.get(input)
  if (previous?.list === list) {
    // Filtered/replaced suggestions invalidate stale active descendant IDs.
    if (!list.querySelector(`[id="${input.getAttribute("aria-activedescendant")}"]`)) input.removeAttribute("aria-activedescendant")
    return
  }
  previous?.controller.abort()
  const controller = new AbortController()
  const activate = option => {
    list.querySelectorAll("[data-active]").forEach(el => el.removeAttribute("data-active"))
    if (!option) { input.removeAttribute("aria-activedescendant"); return }
    option.dataset.active = "true"; input.setAttribute("aria-activedescendant", option.id)
    option.scrollIntoView({ block: "nearest" })
  }
  input.addEventListener("keydown", event => {
    const options = [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')]
    const index = options.findIndex(el => el.id === input.getAttribute("aria-activedescendant"))
    let next
    switch (event.key) {
      case "ArrowDown": next = options[(index + 1) % options.length]; break
      case "ArrowUp": next = options[index <= 0 ? options.length - 1 : index - 1]; break
      case "Home": next = options[0]; break
      case "End": next = options.at(-1); break
      case "Enter":
        if (index >= 0) { event.preventDefault(); receiver.invokeMethodAsync("Select", options[index].dataset.value) }
        return
      case "Escape":
        event.preventDefault(); receiver.invokeMethodAsync("Close"); return
      case "Tab": receiver.invokeMethodAsync("Close"); return
      default: return // Text input itself supplies search/typeahead without intercepting IME.
    }
    if (!next || event.isComposing) return
    event.preventDefault(); activate(next); receiver.invokeMethodAsync("Show")
  }, { signal: controller.signal })
  list.addEventListener("pointerdown", event => { if (event.target.closest('[role="option"]')) event.preventDefault() }, { signal: controller.signal })
  list.addEventListener("pointermove", event => {
    const option = event.target.closest('[role="option"]:not([aria-disabled="true"])')
    if (option) activate(option)
  }, { signal: controller.signal })
  const content = list.closest("[popover]")
  const trigger = content && document.querySelector(`[popovertarget="${CSS.escape(content.id)}"]`)
  trigger?.addEventListener("keydown", event => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const options = [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')]
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault(); content.showPopover(); input.focus()
      activate(event.key === "ArrowUp" || event.key === "End" ? options.at(-1) : options[0])
    } else if (event.key.length === 1 && event.key.trim()) {
      event.preventDefault(); content.showPopover(); input.focus()
      input.value = event.key; input.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }, { signal: controller.signal })
  lists.set(input, { controller, list })
}
export function disposeListbox(input) { lists.get(input)?.controller.abort(); lists.delete(input) }
