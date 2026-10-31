const instances = new Map()
const away = { top: 'ArrowUp', bottom: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
const toward = { top: 'ArrowDown', bottom: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' }
export function sync(root, dotnet, options) {
  if (!root?.isConnected) return
  let s = instances.get(options.id)
  if (!s) {
    s = { root, dotnet, options, open: options.open, request: 0, controller: new AbortController() }
    instances.set(options.id, s)
    const listen = (el, name, fn) => el.addEventListener(name, fn, { signal: s.controller.signal })
    const trigger = () => root.querySelector('.rax-speed-dial-trigger')
    const actions = () => [...root.querySelectorAll('.rax-speed-dial-action:not(:disabled)')].filter(e => e.closest('.rax-speed-dial') === root)
    const set = value => {
      if (s.options.disabled) value = false
      clearTimeout(s.timer)
      if (s.open === value) return
      s.open = value; paint(s)
      s.dotnet.invokeMethodAsync('SetOpen', value, ++s.request)
    }
    listen(root, 'click', e => {
      if (e.target.closest('.rax-speed-dial') !== root) return
      if (e.target.closest('.rax-speed-dial-trigger')) set(!s.open)
      else if (e.target.closest('.rax-speed-dial-action:not(:disabled)')?.dataset.close === 'true') { set(false); trigger()?.focus() }
    })
    listen(root, 'keydown', e => {
      if (e.target.closest('.rax-speed-dial') !== root || e.altKey || e.ctrlKey || e.metaKey) return
      const items = actions(), index = items.indexOf(document.activeElement), side = s.options.side
      let next
      if (e.target === trigger() && e.key === away[side]) { set(true); next = items[0] }
      else if (s.open && index >= 0) {
        if (e.key === away[side]) next = items[index + 1] ?? items[0]
        else if (e.key === toward[side]) next = index === 0 ? trigger() : items[index - 1]
        else if (e.key === 'Home') next = items[0]
        else if (e.key === 'End') next = items.at(-1)
      }
      if (next) { e.preventDefault(); next.focus(); if (next === trigger()) set(false) }
    })
    listen(document, 'keydown', e => {
      if (!s.open || e.key !== 'Escape' || !s.options.closeOnEscape) return
      const focused = root.contains(document.activeElement)
      set(false); if (focused) { e.preventDefault(); trigger()?.focus() }
    })
    listen(document, 'pointerdown', e => { if (s.open && !root.contains(e.target) && s.options.closeOnInteractOutside) set(false) })
    listen(root, 'focusout', e => { if (e.relatedTarget && !root.contains(e.relatedTarget)) set(false) })
    listen(root, 'pointerenter', e => {
      if (e.pointerType !== 'mouse' || !s.options.hover || s.options.disabled) return
      clearTimeout(s.timer); s.timer = setTimeout(() => set(true), s.options.delay)
    })
    listen(root, 'pointerleave', e => {
      if (e.pointerType !== 'mouse' || !s.options.hover) return
      clearTimeout(s.timer); s.timer = setTimeout(() => { if (!root.contains(document.activeElement)) set(false) }, 200)
    })
  }
  s.dotnet = dotnet; s.options = options
  if (options.disabled || options.revision >= s.request) s.open = options.open && !options.disabled
  paint(s)
}
function paint(s) {
  const state = s.open ? 'open' : 'closed', root = s.root
  root.dataset.state = state
  root.querySelector('.rax-speed-dial-trigger')?.setAttribute('aria-expanded', String(s.open))
  const content = root.querySelector('.rax-speed-dial-content')
  if (!content) return
  content.inert = !s.open; content.setAttribute('aria-hidden', String(!s.open))
  const items = [...content.children].filter(e => e.classList.contains('rax-speed-dial-item'))
  content.style.setProperty('--rax-speed-dial-count', items.length)
  root.querySelectorAll('[data-state]').forEach(e => { if (e.closest('.rax-speed-dial') === root) e.dataset.state = state })
  items.forEach((item, index) => {
    item.style.setProperty('--rax-speed-dial-index', index)
    const label = item.querySelector('.rax-speed-dial-label'), action = item.querySelector('.rax-speed-dial-action')
    if (label && action && !action.hasAttribute('aria-label')) action.setAttribute('aria-labelledby', label.id)
  })
}
export function dispose(id) {
  const s = instances.get(id)
  if (s) { clearTimeout(s.timer); s.controller.abort(); instances.delete(id) }
}
