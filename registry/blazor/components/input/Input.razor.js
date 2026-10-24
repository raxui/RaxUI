// Enhancements run only after an interactive render; inputs still post natively in static SSR.
const states = new WeakMap()
export function init(root) {
  const input = root.querySelector("input")
  const clear = root.querySelector("[data-clear]")
  const toggle = root.querySelector("[data-password]")
  const previous = states.get(root)
  if (previous?.clear === clear && previous?.toggle === toggle) { previous.sync(); return }
  dispose(root)
  const abort = new AbortController()
  const sync = () => {
    if (clear) clear.hidden = !input.value || input.disabled || input.readOnly
    if (toggle) { toggle.hidden = false; toggle.disabled = input.disabled }
  }
  input.addEventListener("input", sync, { signal: abort.signal })
  clear?.addEventListener("click", () => {
    if (input.disabled || input.readOnly) return
    input.value = ""
    input.dispatchEvent(new Event("change", { bubbles: true }))
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.focus()
  }, { signal: abort.signal })
  toggle?.addEventListener("click", () => {
    const visible = input.type === "password"
    input.type = visible ? "text" : "password"
    toggle.setAttribute("aria-pressed", String(visible))
    toggle.toggleAttribute("data-visible", visible)
    toggle.setAttribute("aria-label", visible ? toggle.dataset.hideLabel : toggle.dataset.showLabel)
  }, { signal: abort.signal })
  states.set(root, { sync, abort, clear, toggle }); sync()
}
export function dispose(root) { states.get(root)?.abort.abort(); states.delete(root) }
