const instances = new Map()
export function sync(root, dotnet, options) {
  if (!root?.isConnected) return
  let s = instances.get(options.id)
  if (!s) {
    const field = root.querySelector('textarea'), button = root.querySelector('[type=submit]'), controller = new AbortController()
    s = { field, button, controller, request: 0, dotnet, options, composing: false }
    instances.set(options.id, s)
    const listen = (el, event, fn) => el.addEventListener(event, fn, { signal: controller.signal })
    const send = () => {
      const text = field.value.trim()
      if (!text || s.options.disabled || s.composing) return
      field.value = ''; grow(s); field.focus()
      s.dotnet.invokeMethodAsync('Send', text, ++s.request)
    }
    listen(root, 'submit', e => { e.preventDefault(); send() })
    listen(field, 'input', () => { grow(s); s.dotnet.invokeMethodAsync('Update', field.value, ++s.request) })
    listen(field, 'compositionstart', () => { s.composing = true })
    listen(field, 'compositionend', () => { s.composing = false })
    listen(field, 'keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && !s.composing) { e.preventDefault(); send() }
    })
  }
  s.dotnet = dotnet; s.options = options
  s.field.disabled = options.disabled
  // Ignore server acknowledgements for an older draft while the user continues typing.
  if (options.revision >= s.request && s.field.value !== options.value) s.field.value = options.value
  grow(s)
}
function grow(s) {
  s.field.style.height = 'auto'; s.field.style.height = `${s.field.scrollHeight + 2}px`
  s.button.disabled = s.options.disabled || !s.field.value.trim()
}
export function dispose(id) { instances.get(id)?.controller.abort(); instances.delete(id) }
