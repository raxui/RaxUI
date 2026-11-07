// Source-owned: positioning shares DropdownMenu's viewport helpers (ADR 013).
import { alignToTrigger, clampToViewport, originX } from "../DropdownMenu/DropdownMenu.razor.js"
const GAP = 4
const MARGIN = 8
const instances = new WeakMap()
export function init(trigger, content, receiver, anchor = trigger) {
  anchor ||= trigger
  dispose(content)
  const controller = new AbortController()
  const place = () => { if (content.matches(":popover-open")) position(anchor, content) }
  content.addEventListener("toggle", event => {
    const open = event.newState === "open"
    trigger.setAttribute("aria-expanded", String(open))
    content.dataset.state = open ? "open" : "closed"
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
  observer.observe(content); observer.observe(anchor)
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
  menu.style.setProperty("--radix-popover-trigger-width", `${anchor.width}px`)
  const viewportHeight = document.documentElement.clientHeight
  menu.style.setProperty("--radix-popover-content-available-height", `${Math.max(anchor.top, viewportHeight - anchor.bottom) - GAP - MARGIN}px`)
  const width = menu.offsetWidth
  const height = menu.offsetHeight
  const left = alignToTrigger(anchor, width, getComputedStyle(trigger).direction === "rtl")
  const below = anchor.bottom + GAP
  const above = anchor.top - GAP - height
  const preferredTop = below + height <= viewportHeight - MARGIN || above < MARGIN ? below : above
  const [, top] = clampToViewport(left, preferredTop, width, height)
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  menu.style.transformOrigin = `${top === below ? "top" : "bottom"} ${originX(left, width, anchor)}`
}



// C# owns selection/filtering; this shared enhancement owns transient navigation and motion.
const lists = new WeakMap()
export function initListbox(input, list, receiver) {
  const previous = lists.get(input)
  if (previous?.list === list) { previous.refresh(); return }
  disposeListbox(input)
  const controller = new AbortController()
  const signal = controller.signal
  const content = list.closest('[popover]')
  const inner = list.querySelector('.rax-command-list-inner') || list
  const highlight = inner.querySelector('[data-choice-highlight]')
  let active, frame, pointerX, pointerY
  const options = () => [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')].filter(el => !el.hidden)
  const keepOpen = () => list.dataset.multiple === 'true' || list.dataset.closeOnSelect === 'false'
  const hide = () => { if (!keepOpen() && content?.matches(':popover-open')) content.hidePopover() }
  const measure = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      if (highlight) {
        const visible = active?.isConnected && active.getClientRects().length > 0
        highlight.hidden = !visible
        inner.toggleAttribute('data-highlight', !!visible)
        if (visible) {
          let x = 0, y = 0
          for (let node = active; node && node !== inner; node = node.offsetParent) { x += node.offsetLeft; y += node.offsetTop }
          highlight.style.width = `${active.offsetWidth}px`; highlight.style.height = `${active.offsetHeight}px`
          highlight.style.left = '0'; highlight.style.right = 'auto'
          highlight.style.transform = `translate(${x}px, ${y}px)`
        }
      }
      if (inner !== list) list.style.height = `${inner.offsetHeight}px`
    })
  }
  const activate = (option, scroll = false) => {
    list.querySelectorAll('[data-active], [data-highlighted]').forEach(el => { delete el.dataset.active; delete el.dataset.highlighted })
    active = option
    if (!option) input.removeAttribute('aria-activedescendant')
    else {
      option.dataset.active = 'true'; option.dataset.highlighted = ''
      input.setAttribute('aria-activedescendant', option.id)
      if (list.hasAttribute('data-command-list')) list.querySelectorAll('[role="option"]').forEach(el => el.setAttribute('aria-selected', String(el === option)))
      if (scroll) option.scrollIntoView({ block: 'nearest' })
    }
    measure()
  }
  const refresh = () => {
    const choices = options()
    if (content && !content.matches(':popover-open')) { activate(null); return }
    activate(choices.includes(active) ? active : choices.find(el => el.getAttribute('aria-selected') === 'true') || choices[0])
  }
  const select = option => { if (option) { hide(); receiver.invokeMethodAsync('Select', option.dataset.value) } }
  input.addEventListener('keydown', event => {
    if (event.isComposing || input.disabled || input.readOnly || (list.dataset.minChars && input.value.trim().length < Number(list.dataset.minChars))) return
    const choices = options(), index = choices.indexOf(active), loop = list.dataset.loop !== 'false'
    let next
    switch (event.key) {
      case 'ArrowDown': next = choices[index + 1] || (loop ? choices[0] : choices.at(-1)); break
      case 'ArrowUp': next = choices[index - 1] || (loop ? choices.at(-1) : choices[0]); break
      case 'Home': next = choices[0]; break
      case 'End': next = choices.at(-1); break
      case ' ': if (input.tagName !== 'INPUT') { event.preventDefault(); if(active) select(active) }; return
      case 'Enter': if (active || content?.matches(':popover-open') || list.hasAttribute('data-command-list')) event.preventDefault(); if (active) select(active); return
      case 'Escape': event.preventDefault(); if(content?.matches(':popover-open')) content.hidePopover(); receiver.invokeMethodAsync('Close'); return
      case 'Tab': if(content?.matches(':popover-open')) content.hidePopover(); receiver.invokeMethodAsync('Close'); return
      default: return
    }
    event.preventDefault()
    if (content && !content.matches(':popover-open')) content.showPopover()
    activate(next, true)
  }, { signal })
  list.addEventListener('pointerdown', event => { if(event.target.closest('[role="option"]')) event.preventDefault() }, { signal })
  list.addEventListener('click', event => { if(event.target.closest('[role="option"]:not([aria-disabled="true"])')) hide() }, { signal })
  list.addEventListener('pointermove', event => {
    if (event.clientX === pointerX && event.clientY === pointerY) return
    pointerX = event.clientX; pointerY = event.clientY
    const option = event.target.closest('[role="option"]:not([aria-disabled="true"])')
    if(option) activate(option)
  }, { signal })
  list.addEventListener('scroll', measure, { signal, passive: true })
  content?.addEventListener('toggle', () => { if(content.matches(':popover-open')) refresh(); else activate(null) }, { signal })
  const trigger = content && document.querySelector(`[popovertarget="${CSS.escape(content.id)}"]`)
  trigger?.addEventListener('keydown', event => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    if(event.key === 'Backspace' && list.dataset.multiple === 'true') { event.preventDefault(); receiver.invokeMethodAsync('RemoveLast'); return }
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault(); content.showPopover(); input.focus()
      activate(event.key === 'ArrowUp' || event.key === 'End' ? options().at(-1) : options()[0], true)
    } else if(input.tagName === 'INPUT' && event.key.length === 1 && event.key.trim()) {
      event.preventDefault(); content.showPopover(); input.focus()
      input.value = event.key; input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, { signal })
  const field = trigger?.closest('.rax-rich-combobox')
  field?.addEventListener('pointerdown', event => {
    if(event.target.closest('button') || field.hasAttribute('data-disabled') || content.contains(event.target)) return
    event.preventDefault(); content.showPopover(); input.focus()
  }, { signal })
  const observer = new ResizeObserver(measure); observer.observe(inner)
  window.addEventListener('resize', measure, { signal })
  lists.set(input, { list, refresh, dispose() { controller.abort(); observer.disconnect(); cancelAnimationFrame(frame) } })
  refresh()
}
export function disposeListbox(input) { lists.get(input)?.dispose(); lists.delete(input) }

export function focusTrigger(input) { const content=input.closest('[popover]'); if(content) document.querySelector(`[popovertarget="${CSS.escape(content.id)}"]`)?.focus() }
