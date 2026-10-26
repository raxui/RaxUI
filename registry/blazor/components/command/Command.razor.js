import * as dialog from '../Dialog/Dialog.razor.js'
import { initListbox, disposeListbox } from '../Popover/Popover.razor.js'
export const setOpen = dialog.setOpen
const instances = new WeakMap()
export function init(element, input, list, receiver, shortcut) {
  if (element) dialog.init(element)
  initListbox(input, list, receiver)
  if (instances.get(input)?.shortcut === shortcut) return
  instances.get(input)?.controller.abort()
  const controller = new AbortController()
  if (element && shortcut) document.addEventListener('keydown', event => {
    if (!event.defaultPrevented && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcut.toLowerCase()) {
      event.preventDefault(); receiver.invokeMethodAsync('Toggle')
    }
  }, { signal: controller.signal })
  instances.set(input, { controller, shortcut })
}
export function dispose(element, input) {
  instances.get(input)?.controller.abort(); instances.delete(input)
  disposeListbox(input); if(element) dialog.dispose(element)
}
