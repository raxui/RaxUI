const instances = new Map()
export function init(log, id) {
  if (!log?.isConnected || instances.has(id)) return
  const jump = log.parentElement.querySelector('.rax-chat-jump'), controller = new AbortController()
  let bottom = true
  const visible = value => { jump.toggleAttribute('data-visible', value); jump.tabIndex = value ? 0 : -1; jump.setAttribute('aria-hidden', String(!value)) }
  const scroll = smooth => log.scrollTo({ top: log.scrollHeight, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' })
  log.addEventListener('scroll', () => { bottom = log.scrollHeight - log.scrollTop - log.clientHeight < 48; if (bottom) visible(false) }, { signal: controller.signal })
  jump.addEventListener('click', () => { bottom = true; scroll(true); visible(false); log.focus({ preventScroll: true }) }, { signal: controller.signal })
  const observer = new MutationObserver(changes => {
    if (bottom) scroll(true)
    else if (changes.some(change => [...change.addedNodes].some(node => node.nodeType === 1 && (node.matches('.rax-chat-row') || node.querySelector('.rax-chat-row'))))) visible(true)
  })
  observer.observe(log, { childList: true, subtree: true, characterData: true })
  const resize = new ResizeObserver(() => { if (bottom) scroll(false) })
  resize.observe(log)
  instances.set(id, () => { controller.abort(); observer.disconnect(); resize.disconnect() })
  scroll(false)
}
export function dispose(id) { instances.get(id)?.(); instances.delete(id) }
