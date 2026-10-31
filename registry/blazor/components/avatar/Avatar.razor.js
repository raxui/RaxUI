// Interactive image-error fallback. Static SSR deliberately keeps native image behavior.
const bindings = new WeakMap()
export function init(root) {
  if (!root?.isConnected) return
  const image = root.querySelector("img")
  if (bindings.get(root)?.image === image) return
  dispose(root)
  const fallback = root.querySelector(".rax-avatar-fallback")
  if (!image) { fallback.hidden = false; return }
  const update = () => {
    const failed = image.complete && image.naturalWidth === 0
    image.hidden = failed
    fallback.hidden = !failed
  }
  image.addEventListener("error", update)
  image.addEventListener("load", update)
  // Observe src as Blazor can reuse the same img for a different person.
  const observer = new MutationObserver(update)
  observer.observe(image, { attributes: true, attributeFilter: ["src"] })
  bindings.set(root, { image, update, observer })
  update()
}
export function dispose(root) {
  const binding = bindings.get(root)
  if (!binding) return
  binding.image.removeEventListener("error", binding.update)
  binding.image.removeEventListener("load", binding.update)
  binding.observer.disconnect()
  bindings.delete(root)
}
