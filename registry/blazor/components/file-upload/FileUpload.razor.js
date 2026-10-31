// Source-owned: native input handles picker/drop selection; this module adds highlighting only.
const instances = new WeakMap()
export function init(root) {
  if (instances.has(root)) return
  const zone = root.querySelector(".rax-upload-zone")
  const controller = new AbortController()
  let depth = 0
  const listen = (event, handler) => zone.addEventListener(event, handler, { signal: controller.signal })
  listen("dragenter", () => { if (!zone.querySelector("input").disabled) { depth++; zone.dataset.dragging = "true" } })
  listen("dragleave", () => { if (--depth <= 0) { depth = 0; delete zone.dataset.dragging } })
  listen("drop", () => { depth = 0; delete zone.dataset.dragging })
  instances.set(root, controller)
}
// Keep the multipart payload in step with removals without replacing InputFile's retained file handles.
export function remove(root, name, size, modified) {
  const input = root.querySelector("input")
  const data = new DataTransfer()
  let removed = false
  for (const file of input.files) {
    if (!removed && file.name === name && file.size === size && file.lastModified === modified) { removed = true; continue }
    data.items.add(file)
  }
  input.files = data.files
}
export function dispose(root) { instances.get(root)?.abort(); instances.delete(root) }
