const states = new WeakMap()
export function init(root) {
  if (!root?.isConnected) return
  if (states.has(root)) { states.get(root).resize(); return }
  const input = root.querySelector("textarea")
  const count = () => {
    const counter=root.querySelector('[data-count-max]');if(!counter)return
    const max=Number(counter.dataset.countMax),length=input.value.length,remaining=max-length
    const state=remaining<=0?'limit':remaining<=Math.max(10,Math.round(max*.1))?'warn':null
    if(state)counter.dataset.state=state;else counter.removeAttribute('data-state')
    // Preserve the text nodes tracked by Blazor's renderer.
    const text=(selector,value)=>{const el=counter.querySelector(selector);if(el.firstChild?.nodeType===Node.TEXT_NODE)el.firstChild.nodeValue=value;else el.textContent=value}
    text('.rax-textarea-count-text',state?String(remaining):`${length} / ${max}`)
    counter.querySelector('.rax-textarea-count-bar').style.strokeDashoffset=String(1-Math.min(length/max,1))
    text('[data-count-status]',state==='limit'?counter.dataset.limitLabel:'')
  }
  const resize = () => {
    count()
    if(root.dataset.autoResize!=='true'){input.style.removeProperty('height');input.style.removeProperty('overflow-y');input.style.removeProperty('resize');return}
    const style = getComputedStyle(input)
    const line = parseFloat(style.lineHeight) || 22
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + border
    input.style.height = "auto"
    const content = input.scrollHeight + border
    const min = Math.max(1, Number(root.dataset.minRows))
    const max = Math.max(min, Number(root.dataset.maxRows))
    const height = Math.min(Math.max(content, min * line + chrome), max * line + chrome)
    input.style.height = height + "px"
    input.style.overflowY = content > height + 1 ? "auto" : "hidden"
    input.style.resize = "none"
  }
  const focus = event => {
    if (!root.classList.contains('rax-textarea-group') || event.target.closest('button,a,input,select,textarea,[tabindex]')) return
    event.preventDefault();input.focus()
  }
  root.addEventListener('pointerdown',focus)
  input.addEventListener("input", resize)
  let width = input.clientWidth
  const observer = new ResizeObserver(() => { if (width !== input.clientWidth) { width = input.clientWidth; resize() } })
  observer.observe(input)
  states.set(root, { resize, observer, input, focus }); resize()
}
export function dispose(root) {
  const state = states.get(root)
  if (state) {
    state.input.removeEventListener("input", state.resize)
    root.removeEventListener("pointerdown",state.focus)
    state.observer.disconnect()
    state.input.style.removeProperty("height")
    state.input.style.removeProperty("overflow-y")
    state.input.style.removeProperty("resize")
  }
  states.delete(root)
}
