const states = new WeakMap()
export function init(root) {
  if (states.has(root)) { states.get(root).resize(); return }
  const input = root.querySelector("textarea")
  const resize = () => {
    const style = getComputedStyle(input)
    const line = parseFloat(style.lineHeight) || 22
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + border
    input.style.height = "auto"
    const content = input.scrollHeight + border
    const min = Math.max(1, Number(root.dataset.minRows))
    const max = Math.max(min, Number(root.dataset.maxRows))
    const height = Math.min(Math.max(content, min * line + chrome), max * line + chrome)
    input.style.height = height + "px"
    input.style.overflowY = content > height + 1 ? "auto" : "hidden"
    input.style.resize = "none"
  }
  input.addEventListener("input", resize)
  let width = input.clientWidth
  const observer = new ResizeObserver(() => { if (width !== input.clientWidth) { width = input.clientWidth; resize() } })
  observer.observe(input)
  states.set(root, { resize, observer, input }); resize()
}
export function dispose(root) {
  const state = states.get(root)
  if (state) {
    state.input.removeEventListener("input", state.resize)
    state.observer.disconnect()
    state.input.style.removeProperty("height")
    state.input.style.removeProperty("overflow-y")
    state.input.style.removeProperty("resize")
  }
  states.delete(root)
}
