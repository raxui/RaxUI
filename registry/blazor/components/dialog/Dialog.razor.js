// RaxUI native dialog lifecycle. Source-owned: edit freely.
const states = new WeakMap()
export function init(dialog) {
  if (states.has(dialog)) return
  const controller = new AbortController()
  const state = { controller, generation: 0 }
  states.set(dialog, state)
  dialog.addEventListener("cancel", event => { event.preventDefault(); setOpen(dialog, false) }, { signal: controller.signal })
  dialog.addEventListener("pointerdown", event => {
    if (event.target !== dialog) return
    const r = dialog.getBoundingClientRect()
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setOpen(dialog, false)
  }, { signal: controller.signal })
}
export async function setOpen(dialog, open) {
  init(dialog)
  const state = states.get(dialog), generation = ++state.generation
  if (open) {
    dialog.dataset.state = "open"
    if (!dialog.open) dialog.showModal()
  } else if (dialog.open) {
    dialog.dataset.state = "closed"
    await Promise.allSettled(dialog.getAnimations().map(animation => animation.finished))
    if (state.generation === generation && dialog.open) dialog.close()
  }
}
export function dispose(dialog) { const state = states.get(dialog); if (state) { state.generation++; state.controller.abort() }; states.delete(dialog) }
