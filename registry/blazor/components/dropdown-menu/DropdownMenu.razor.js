// RaxUI DropdownMenu: positioning and keyboard navigation for the popover menu (ADR 013).
// The popover attribute already gives the top layer, Esc, and closing on a click outside. Source-owned: edit freely.

const instances = new Map()
const ITEM = '[role="menuitem"]:not(:disabled),[role="menuitemcheckbox"]:not(:disabled),[role="menuitemradio"]:not(:disabled)'
const GAP = 4 // px between trigger and menu
const MARGIN = 8 // px kept free at the viewport edges

export function init(trigger, menu) {
  if (!trigger?.isConnected || !menu?.isConnected || instances.has(menu.id)) return
  const controller = new AbortController()
  const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: controller.signal })
  const place = () => position(trigger, menu)
  instances.set(menu.id, () => { controller.abort(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true) })
  let pointer = false
  listen(trigger, "pointerdown", () => { pointer = true })

  listen(menu, "toggle", (event) => {
    const open = event.newState === "open"
    trigger.setAttribute("aria-expanded", String(open))
    if (open) {
      place()
      // Like Radix: the keyboard focuses the first item, the pointer the menu itself (arrows then move in).
      if (pointer) menu.focus()
      else menu.querySelector(ITEM)?.focus()
      pointer = false
      window.addEventListener("resize", place)
      window.addEventListener("scroll", place, true)
    } else {
      menu.removeAttribute("data-hover")
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
      // Safari does not focus clicked buttons, so the popover may have no element to return focus to.
      if (document.activeElement === document.body || menu.contains(document.activeElement)) trigger.focus()
    }
  })

  listen(trigger, "keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    menu.showPopover()
  })

  listen(menu, "keydown", (event) => onKeyDown(event, menu))
  listen(menu, "click", (event) => {
    if (event.target.closest(ITEM)) menu.hidePopover()
  })
  // Like Radix, the pointer moves the highlight, so mouse and keyboard share one active item.
  listen(menu, "pointermove", (event) => {
    const item = event.target.closest(ITEM)
    if (item && item !== document.activeElement) item.focus()
  })
  // Leaving the items clears the highlight, as in Radix.
  listen(menu, "pointerleave", () => menu.focus())
  listen(menu, "focusin", (event) => glide(menu, event.target.closest(ITEM)))
}

export function dispose(id) { instances.get(id)?.(); instances.delete(id) }

// Slides the highlight to the focused item; it appears in place first, then glides from item to item.
function glide(menu, item) {
  const highlight = menu.querySelector(":scope > .rax-dropdown-highlight")
  if (!highlight) return
  if (!item) return menu.removeAttribute("data-hover")
  const set = () => {
    menu.style.setProperty("--rax-menu-hover-y", `${item.offsetTop}px`)
    menu.style.setProperty("--rax-menu-hover-h", `${item.offsetHeight}px`)
  }
  if (menu.style.getPropertyValue("--rax-menu-hover-y")) {
    set()
    menu.setAttribute("data-hover", "")
    return
  }
  highlight.style.transition = "none"
  set()
  void highlight.offsetHeight // commit the position before transitions return
  highlight.style.transition = ""
  menu.setAttribute("data-hover", "")
}

export function onKeyDown(event, menu, hide = () => menu.hidePopover()) {
  const items = [...menu.querySelectorAll(ITEM)]
  const index = items.indexOf(document.activeElement)
  let next
  switch (event.key) {
    case "ArrowDown": next = items[(index + 1) % items.length]; break
    case "ArrowUp": next = items[index <= 0 ? items.length - 1 : index - 1]; break
    case "Home": next = items[0]; break
    case "End": next = items.at(-1); break
    case "Tab":
      event.preventDefault()
      hide()
      return
    default: {
      // Typeahead: jump to the next item that starts with the typed character.
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || !event.key.trim()) return
      const key = event.key.toLocaleLowerCase()
      const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)]
      next = ordered.find((item) => item.textContent.trim().replace(/^✓\s*/, "").toLocaleLowerCase().startsWith(key))
    }
  }
  if (!next) return
  event.preventDefault()
  next.focus()
}

// Shared viewport helpers, also used by Popover, ContextMenu and Menubar.
// clientWidth/clientHeight exclude the scrollbars that innerWidth/innerHeight include.
export function clampToViewport(x, y, width, height) {
  const root = document.documentElement
  return [
    Math.max(MARGIN, Math.min(x, root.clientWidth - width - MARGIN)),
    Math.max(MARGIN, Math.min(y, root.clientHeight - height - MARGIN)),
  ]
}

// Prefer inline start, then flip to inline end before shifting away from the trigger.
export function alignToTrigger(anchor, width, rtl) {
  const viewportWidth = document.documentElement.clientWidth
  const start = rtl ? anchor.right - width : anchor.left
  const end = rtl ? anchor.left : anchor.right - width
  const fits = (left) => left >= MARGIN && left + width <= viewportWidth - MARGIN
  const aligned = fits(start) ? start : fits(end) ? end : start
  return Math.max(MARGIN, Math.min(aligned, viewportWidth - width - MARGIN))
}

// The horizontal transform origin: the trigger edge the menu is aligned to.
export function originX(left, width, anchor) {
  return Math.abs(left - anchor.left) <= Math.abs(left + width - anchor.right) ? "left" : "right"
}

// Open above the trigger when there is no room below.
function position(trigger, menu) {
  const anchor = trigger.getBoundingClientRect()
  // offset sizes ignore the opening animation's scale.
  const width = menu.offsetWidth
  const height = menu.offsetHeight
  const left = alignToTrigger(anchor, width, getComputedStyle(trigger).direction === "rtl")
  const below = anchor.bottom + GAP
  const above = anchor.top - GAP - height
  const top = below + height <= document.documentElement.clientHeight - MARGIN || above < MARGIN ? below : above
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  menu.style.transformOrigin = `${top === below ? "top" : "bottom"} ${originX(left, width, anchor)}`
}
