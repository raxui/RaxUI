const instances = new WeakMap()
const digit = ch => {
  const n = ch.charCodeAt(0)
  return n >= 0x660 && n <= 0x669 ? String(n - 0x660) : n >= 0x6f0 && n <= 0x6f9 ? String(n - 0x6f0) : ch
}
export function init(root, receiver) {
  dispose(root)
  if (!root?.isConnected) return
  const controller = new AbortController(), options = {signal:controller.signal}
  let buffer='', previous=null, timestamp=0, queue=Promise.resolve()
  const editable = () => !root.hasAttribute('data-disabled') && !root.hasAttribute('data-readonly')
  const send = (el, action, value='') => { queue=queue.then(() => receiver.invokeMethodAsync('EditSegment', el.dataset.segment, action, value)).catch(() => {}) }
  const adjacent = (el, delta) => { const list=Array.from(root.querySelectorAll('[data-segment]')); list[Math.max(0,Math.min(list.length-1,list.indexOf(el)+delta))]?.focus() }
  const input = (el, text) => {
    for (const ch of text) {
      const ascii=digit(ch), type=el.dataset.segment
      if (type==='period') { if (/^[apصم]$/i.test(ch)) send(el,/^[pم]$/i.test(ch)?'pm':'am'); continue }
      if (!/^\d$/.test(ascii)) continue
      const max=Number(el.getAttribute('aria-valuemax')), length=type==='year'?4:2
      if (previous!==el || Date.now()-timestamp>1000) buffer=''
      buffer+=ascii
      if (buffer.length>length || Number(buffer)>max) buffer=ascii
      previous=el; timestamp=Date.now()
      if (Number(buffer)>=Number(el.getAttribute('aria-valuemin'))) send(el,'digits',buffer)
      if (buffer.length===length || Number(buffer)*10>max) { buffer=''; adjacent(el,1) }
    }
  }
  root.addEventListener('keydown', event => {
    const el=event.target.closest('[data-segment]')
    if (!el || !editable() || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
    const actions={ArrowUp:'up',ArrowDown:'down',PageUp:'pageup',PageDown:'pagedown',Home:'home',End:'end',Backspace:'clear',Delete:'clear'}
    if (actions[event.key]) { event.preventDefault(); buffer=''; send(el,actions[event.key]); return }
    if (event.key==='ArrowLeft' || event.key==='ArrowRight') { event.preventDefault(); buffer=''; const list=Array.from(root.querySelectorAll('[data-segment]')).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left); list[Math.max(0,Math.min(list.length-1,list.indexOf(el)+(event.key==='ArrowRight'?1:-1)))]?.focus(); return }
    if (/^[0-9٠-٩۰-۹apصم]$/i.test(event.key)) { event.preventDefault(); input(el,event.key) }
    else if (event.key==='Enter') event.preventDefault()
  },options)
  root.addEventListener('beforeinput', event => {
    const el=event.target.closest('[data-segment]')
    if (!el) return
    event.preventDefault()
    if (editable()) { if (event.inputType.startsWith('delete')) send(el,'clear'); else if (event.data) input(el,event.data) }
  },options)
  root.addEventListener('paste',event=>event.preventDefault(),options)
  instances.set(root,controller)
}
export function dispose(root) { instances.get(root)?.abort(); instances.delete(root) }
