import * as dialog from "../Dialog/Dialog.razor.js"
const states = new WeakMap()
export const setOpen = dialog.setOpen
export function init(element) {
  dialog.init(element)
  const controller = new AbortController(), handle = element.querySelector(".sheen-drawer-handle")
  let start, delta = 0
  const reset = () => { start = undefined; delta = 0; element.removeAttribute("data-dragging"); element.style.transform = "" }
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0) return
    start = event.clientY; delta = 0; handle.setPointerCapture(event.pointerId); element.dataset.dragging = ""
  }, { signal: controller.signal })
  handle.addEventListener("pointermove", event => {
    if (start === undefined) return
    delta = Math.max(0, event.clientY - start); element.style.transform = `translateY(${delta}px)`
  }, { signal: controller.signal })
  handle.addEventListener("pointerup", () => {
    if (start === undefined) return
    const dismiss = delta > Math.max(60, element.offsetHeight * 0.25)
    if (dismiss) { start = undefined; element.removeAttribute("data-dragging"); dialog.setOpen(element, false).then(reset) }
    else reset()
  }, { signal: controller.signal })
  handle.addEventListener("pointercancel", reset, { signal: controller.signal })
  states.set(element, controller)
}
export function dispose(element) { states.get(element)?.abort(); states.delete(element); dialog.dispose(element) }
