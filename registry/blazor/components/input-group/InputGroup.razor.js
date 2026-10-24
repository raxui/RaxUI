const states = new WeakMap()
export function init(root) {
  if (states.has(root)) return
  const abort = new AbortController()
  const fields = () => Array.from(root.querySelectorAll(":scope > input")).filter(el => !el.disabled && !el.readOnly)
  const move = (input, step) => {
    const all = fields(), next = all[all.indexOf(input) + step]
    if (!next) return
    next.focus()
    try { const at = step < 0 ? next.value.length : 0; next.setSelectionRange(at, at) } catch { /* Number fields do not have a selection. */ }
  }
  root.addEventListener("input", event => {
    const input = event.target
    if (!event.isComposing && input.maxLength > 0 && input.value.length >= input.maxLength) move(input, 1)
  }, { signal: abort.signal })
  root.addEventListener("keydown", event => {
    const input = event.target
    if (!fields().includes(input)) return
    const rtl = getComputedStyle(input).direction === "rtl"
    const start = input.selectionStart === 0 && input.selectionEnd === 0
    const end = input.selectionStart === input.value.length && input.selectionEnd === input.value.length
    if ((event.key === "Backspace" && !input.value) || (event.key === (rtl ? "ArrowRight" : "ArrowLeft") && start)) { event.preventDefault(); move(input, -1) }
    else if (event.key === (rtl ? "ArrowLeft" : "ArrowRight") && end) { event.preventDefault(); move(input, 1) }
  }, { signal: abort.signal })
  root.addEventListener("paste", event => {
    const input = event.target, max = input.maxLength
    const text = event.clipboardData.getData("text").trim()
    if (!fields().includes(input) || max <= 0 || text.length <= max) return
    event.preventDefault()
    const parts = /[\s.\-:/,]/.test(text) ? text.split(/[\s.\-:/,]+/) : (text.match(new RegExp('.{1,' + max + '}', 'g')) ?? [])
    let last = input
    fields().slice(fields().indexOf(input)).forEach((field, i) => {
      if (parts[i] === undefined) return
      field.value = parts[i].slice(0, field.maxLength > 0 ? field.maxLength : undefined)
      field.dispatchEvent(new Event("change", { bubbles: true })); last = field
    })
    last.focus()
  }, { signal: abort.signal })
  states.set(root, abort)
}
export function dispose(root) { states.get(root)?.abort(); states.delete(root) }
