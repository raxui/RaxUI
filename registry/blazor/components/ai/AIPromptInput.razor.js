const instances = new Map()
export function sync(root, dotnet, options) {
  if (!root?.isConnected) return
  let s = instances.get(options.id)
  if (!s) {
    const field = root.querySelector('textarea'), controller = new AbortController()
    s = { root, field, controller, dotnet, options, composing: false }
    instances.set(options.id, s)
    const listen = (el, event, fn) => el.addEventListener(event, fn, { signal: controller.signal })
    const submit = () => {
      if (s.options.status === 'streaming') { s.dotnet.invokeMethodAsync('Stop'); return }
      const text = field.value.trim()
      if (!text || s.options.status !== 'ready' || s.composing) return
      field.value = ''; update(s)
      s.dotnet.invokeMethodAsync('Submit', text)
    }
    listen(root, 'submit', e => { e.preventDefault(); submit() })
    // Clicking the frame focuses the field.
    listen(root, 'click', e => { if (e.target === root) field.focus() })
    listen(field, 'input', () => update(s))
    listen(field, 'compositionstart', () => { s.composing = true })
    listen(field, 'compositionend', () => { s.composing = false })
    listen(field, 'keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && !s.composing) { e.preventDefault(); if (s.options.status !== 'streaming') submit() }
    })
  }
  s.dotnet = dotnet; s.options = options
  update(s)
}
// The send button's enabled state follows the local draft without a server round trip.
function update(s) {
  s.field.style.height = 'auto'; s.field.style.height = `${s.field.scrollHeight}px`
  const send = s.root.querySelector('.rax-ai-prompt-send')
  if (send && !send.hasAttribute('data-stop')) send.disabled = s.options.status !== 'ready' || !s.field.value.trim()
}
export function dispose(id) { instances.get(id)?.controller.abort(); instances.delete(id) }
