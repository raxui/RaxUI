const instances = new WeakMap()
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
function height(root) { return parseFloat(getComputedStyle(root).getPropertyValue('--rax-wheel-item')) || 36 }
function move(root, index, smooth) {
  const state = instances.get(root), target = index * height(root)
  if (!state) return
  clearTimeout(state.timer); state.target = target
  root.scrollTo({top: target, behavior: smooth && !reduced() ? 'smooth' : 'instant'})
}
export function init(root, receiver, autoFocus) {
  if (!root?.isConnected) return
  dispose(root)
  const controller = new AbortController(), options = {signal: controller.signal}
  const state = {controller, timer: null, target: null, index: Number(root.dataset.index)}
  instances.set(root, state)
  const disabled = () => root.hasAttribute('data-disabled')
  const choose = index => {
    if (disabled()) return
    index = Math.max(0, Math.min(root.children.length - 1, index))
    move(root, index, true); state.index = index
    receiver.invokeMethodAsync('Choose', index).catch(() => {})
  }
  const userScroll = () => { if (!disabled()) { state.target = null; clearTimeout(state.timer) } }
  root.addEventListener('wheel', userScroll, options)
  root.addEventListener('pointerdown', userScroll, options)
  root.addEventListener('scroll', () => {
    if (disabled()) { move(root, Number(root.dataset.index), false); return }
    if (state.target !== null) {
      if (Math.abs(root.scrollTop - state.target) < 1) state.target = null
      return
    }
    clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      const index = Math.max(0, Math.min(root.children.length - 1, Math.round(root.scrollTop / height(root))))
      if (index !== Number(root.dataset.index) || !root.hasAttribute('data-committed')) choose(index)
    }, 90)
  }, options)
  root.addEventListener('click', event => {
    const item = event.target.closest('[role=option]')
    if (item) choose(Array.from(root.children).indexOf(item))
  }, options)
  root.addEventListener('keydown', event => {
    if (disabled() || event.isComposing) return
    const index = state.index
    const next = {ArrowUp:index-1, ArrowDown:index+1, PageUp:index-5, PageDown:index+5, Home:0, End:root.children.length-1}[event.key]
    if (next !== undefined) { event.preventDefault(); choose(next) }
  }, options)
  move(root, state.index, false)
  if (autoFocus && !disabled()) root.focus({preventScroll:true})
}
export function sync(root) {
  const state = instances.get(root)
  if (!state) return
  const index = Number(root.dataset.index)
  if (index !== state.index) { state.index = index; move(root, index, true) }
}
export function dispose(root) {
  const state = instances.get(root)
  if (state) { state.controller.abort(); clearTimeout(state.timer); instances.delete(root) }
}
