const instances = new WeakMap()
const keyOf = date => date.toISOString().slice(0, 10)
const read = key => new Date(`${key}T12:00:00Z`)
const dayButton = (root, key) => root.querySelector(`.rax-calendar-day[data-date="${key}"]:not([data-outside])`)
function moveMonth(date, amount) {
  const day = date.getUTCDate()
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + amount)
  const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0)
  date.setUTCDate(Math.min(day, last.getUTCDate()))
  return date
}
function focus(root, key, activate) {
  const target = dayButton(root, key) ?? root.querySelector('.rax-calendar-day[tabindex="0"]') ?? root.querySelector('.rax-calendar-day:not([data-outside])')
  if (!target) return
  root.querySelectorAll('.rax-calendar-day').forEach(day => { day.tabIndex = day === target ? 0 : -1 })
  const state = instances.get(root); if (state) state.focused = target.dataset.date
  if (activate) target.focus({ preventScroll: true })
}
function paint(root, hovered) {
  const from = root.dataset.rangeStart, to = root.dataset.rangeEnd
  let first = from, last = to, preview = false
  if (from && !to && hovered && hovered.dataset.date !== from && !hovered.hasAttribute('data-out-of-span') && !hovered.hasAttribute('aria-disabled')) {
    first = from < hovered.dataset.date ? from : hovered.dataset.date
    last = from > hovered.dataset.date ? from : hovered.dataset.date
    preview = true
  }
  root.querySelectorAll('.rax-calendar-day').forEach(day => {
    const key = day.dataset.date, cell = day.closest('td'), start = key === first, end = key === last, inside = !!last && key > first && key < last
    cell.toggleAttribute('data-range-start', start && !!last); cell.toggleAttribute('data-range-end', end)
    cell.toggleAttribute('data-in-range', inside); cell.toggleAttribute('data-preview', preview && (start || end || inside))
    if (start || end || inside) cell.setAttribute('aria-selected', 'true'); else cell.removeAttribute('aria-selected')
    day.toggleAttribute('data-preview-end', preview && key === hovered?.dataset.date)
  })
}
export function init(root, receiver) {
  if (!root?.isConnected) return false
  dispose(root)
  const controller = new AbortController(), options = { signal: controller.signal }
  const media = matchMedia('(max-width: 639px)'), state = { controller, focused: null }
  instances.set(root, state)
  root.addEventListener('focusin', event => {
    const target = event.target.closest('.rax-calendar-day')
    if (target) focus(root, target.dataset.date, false)
  }, options)
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.dataset.view !== 'days') {
      event.preventDefault(); event.stopPropagation(); receiver.invokeMethodAsync('ShowDays').catch(() => {}); return
    }
    const target = event.target.closest('.rax-calendar-day')
    if (!target) return
    const date = read(target.dataset.date), rtl = getComputedStyle(root).direction === 'rtl'
    const offset = (date.getUTCDay() - Number(root.dataset.weekStart) + 7) % 7
    const amount = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7, Home: -offset, End: 6 - offset }[event.key]
    if (amount !== undefined) date.setUTCDate(date.getUTCDate() + amount)
    else if (event.key === 'PageUp' || event.key === 'PageDown') moveMonth(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1))
    else return
    event.preventDefault()
    let key = date.getUTCFullYear() < 1 ? root.dataset.min : date.getUTCFullYear() > 9999 ? root.dataset.max : keyOf(date)
    key = key < root.dataset.min ? root.dataset.min : key > root.dataset.max ? root.dataset.max : key
    state.focused = key
    if (dayButton(root, key)) focus(root, key, true)
    else receiver.invokeMethodAsync('Navigate', key).catch(() => {})
  }, options)
  root.addEventListener('pointerover', event => { if (root.hasAttribute('data-range')) paint(root, event.target.closest('.rax-calendar-day')) }, options)
  root.addEventListener('pointerleave', () => { if (root.hasAttribute('data-range')) paint(root, null) }, options)
  if (root.hasAttribute('data-responsive')) media.addEventListener('change', () => receiver.invokeMethodAsync('SetCompact', media.matches).catch(() => {}), options)
  return media.matches
}
export function sync(root, key, activate) {
  const state = instances.get(root)
  if (!state) return
  focus(root, activate ? key : state.focused ?? key, activate)
  if (root.hasAttribute('data-range')) paint(root, null)
}
export function dispose(root) { instances.get(root)?.controller.abort(); instances.delete(root) }
