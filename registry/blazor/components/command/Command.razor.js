import * as dialog from "../Dialog/Dialog.razor.js"
import { initListbox, disposeListbox } from "../Popover/Popover.razor.js"
export const setOpen = dialog.setOpen
export function init(element, input, list, receiver) {
  dialog.init(element); initListbox(input, list, receiver)
  if (!input.hasAttribute("aria-activedescendant")) {
    const first = list.querySelector('[role="option"]:not([aria-disabled="true"])')
    if (first) { input.setAttribute("aria-activedescendant", first.id); first.dataset.active = "true"; first.setAttribute("aria-selected", "true") }
  }
}
export function dispose(element, input) { disposeListbox(input); dialog.dispose(element) }
