import * as popover from '../Popover/Popover.razor.js'
const instances = new WeakMap()
const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
export function sync(root, host, native, size, placeholder, scrollUpLabel, scrollDownLabel) {
  const select = root.querySelector('select')
  if (native || select.multiple) { dispose(root); return }
  let state = instances.get(root)
  if (!state) {
    const controller = new AbortController(), signal = controller.signal
    const originalId = select.id
    const trigger = document.createElement('button')
    const content = document.createElement('div')
    const list = document.createElement('div')
    trigger.type = 'button'; trigger.id = originalId; trigger.role = 'combobox'
    content.id = `${originalId}-popup`; content.popover = 'auto'; content.className = 'rax-popover rax-select-content rax-blazor-select-content'
    list.id = `${originalId}-list`; list.role = 'listbox'; list.className = 'rax-select-viewport rax-choice-list'; list.tabIndex = -1
    trigger.setAttribute('popovertarget', content.id); trigger.setAttribute('aria-controls', list.id); trigger.setAttribute('aria-haspopup','listbox')
    let scrolling
    const scrollButtons = [-1, 1].map(direction => {
      const button = document.createElement('button'); button.type='button'; button.tabIndex=-1; button.className='rax-select-scroll-button'; button.hidden=true
      button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${direction < 0 ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}"/></svg>`
      button.addEventListener('pointerenter', () => { clearInterval(scrolling); scrolling=setInterval(() => list.scrollBy(0,direction*6),16) }, {signal})
      button.addEventListener('pointerleave', () => clearInterval(scrolling), {signal})
      button.addEventListener('click', () => list.scrollBy(0,direction*36), {signal})
      return button
    })
    const updateScroll = () => { scrollButtons[0].hidden=list.scrollTop <= 0; scrollButtons[1].hidden=list.scrollHeight <= list.clientHeight + list.scrollTop + 1 }
    content.append(scrollButtons[0],list,scrollButtons[1]); host.append(trigger, content)
    list.addEventListener('scroll',updateScroll,{signal,passive:true});content.addEventListener('toggle',updateScroll,{signal})
    const resize=new ResizeObserver(updateScroll);resize.observe(list)
    const receiver = { invokeMethodAsync(method, value) {
      if (method === 'Select') {
        const option = [...select.options].find(o => o.value === value && !o.disabled && !o.parentElement.disabled)
        if (!option || select.disabled) return Promise.resolve()
        select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }))
        state.update(); content.hidePopover()
      } else if (method === 'Toggled') { trigger.dataset.state = value ? 'open' : 'closed'; if(value) list.focus(); else trigger.focus() }
      return Promise.resolve()
    }}
    popover.init(trigger, content, receiver)
    const choose = event => { const option = event.target.closest('[role="option"]:not([aria-disabled="true"])'); if(option) receiver.invokeMethodAsync('Select', option.dataset.value) }
    list.addEventListener('click', choose, { signal })
    // Printable keys cycle native option labels, including repeated-letter cycling.
    let typed = '', timer
    const typeahead = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.key.length !== 1 || event.key === ' ') return
      event.preventDefault(); typed += event.key.toLocaleLowerCase(); clearTimeout(timer); timer = setTimeout(() => typed = '', 700)
      const options = [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')]
      const query = [...typed].every(c => c === typed[0]) ? typed[0] : typed
      const index = options.findIndex(o => o.id === list.getAttribute('aria-activedescendant'))
      const ordered = options.slice(index + 1).concat(options.slice(0, index + 1))
      const option = ordered.find(o => o.textContent.trim().toLocaleLowerCase().startsWith(query))
      if(option) { content.showPopover(); list.focus(); option.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: option.offsetLeft, clientY: option.offsetTop })); option.scrollIntoView({block:'nearest'}) }
    }
    list.addEventListener('keydown', typeahead, { signal }); trigger.addEventListener('keydown', typeahead, { signal })
    select.addEventListener('invalid', event => { event.preventDefault(); trigger.focus() }, { signal })
    state = { select, trigger, content, list, originalId, controller, signature: '', scrollButtons, resize, placeholder, timer: () => { clearTimeout(timer); clearInterval(scrolling) }, update() {
      [...list.querySelectorAll('[role="option"]')].forEach(el => {
        const selected = el.dataset.value === select.value
        el.setAttribute('aria-selected', String(selected)); el.dataset.state = selected ? 'checked' : 'unchecked'
        el.querySelector('.rax-select-indicator').hidden = !selected
      })
      const option = select.selectedOptions[0]
      trigger.replaceChildren(document.createElement('span')); trigger.firstChild.textContent = !select.value && state.placeholder ? state.placeholder : option?.label || state.placeholder || ''
      trigger.toggleAttribute('data-placeholder', !select.value)
    }}
    instances.set(root, state)
  }
  const {trigger, content, list} = state
  select.hidden = true; select.id = `${state.originalId}-native`; select.setAttribute('aria-hidden','true'); select.tabIndex = -1
  trigger.className = `${select.className} ${size === 'sm' ? 'form-select-sm' : size === 'lg' ? 'form-select-lg' : ''}`
  trigger.disabled = select.disabled
  for(const name of ['aria-label','aria-labelledby','aria-describedby','aria-invalid','aria-required','dir','title']) {
    if(select.hasAttribute(name)) trigger.setAttribute(name, select.getAttribute(name)); else trigger.removeAttribute(name)
  }
  list.setAttribute('aria-label', trigger.getAttribute('aria-label') || trigger.textContent || 'Options')
  const signature = select.innerHTML
  if(signature !== state.signature) {
    popover.disposeListbox(list); list.replaceChildren()
    const highlight = document.createElement('span'); highlight.className = 'rax-choice-highlight'; highlight.dataset.choiceHighlight = ''; highlight.hidden = true; highlight.setAttribute('aria-hidden','true'); list.append(highlight)
    let index = 0
    const append = (parent, options, disabled = false) => {
      for(const option of options) {
        if(option.tagName === 'OPTGROUP') {
          const group = document.createElement('div'); group.role='group'; group.setAttribute('aria-label',option.label)
          const label = document.createElement('div'); label.className='rax-select-label'; label.textContent=option.label; group.append(label); list.append(group)
          append(group, option.children, option.disabled)
        } else if(option.tagName === 'OPTION' && option.hasAttribute('data-separator')) {
          const separator=document.createElement('div');separator.role='separator';separator.className='rax-select-separator';parent.append(separator)
        } else if(option.tagName === 'OPTION' && !option.hidden) {
          const row=document.createElement('div');row.id=`${state.originalId}-option-${index++}`;row.role='option';row.dataset.value=option.value;row.className='rax-select-item';row.setAttribute('aria-disabled',String(disabled || option.disabled))
          row.toggleAttribute('data-disabled',disabled || option.disabled)
          const label=document.createElement('span');label.textContent=option.label
          const indicator=document.createElement('span');indicator.className='rax-select-indicator';indicator.innerHTML=check
          row.append(label,indicator);parent.append(row)
        }
      }
    }
    append(list,select.children);state.signature=signature
  }
  state.placeholder=placeholder
  state.scrollButtons[0].setAttribute('aria-label',scrollUpLabel);state.scrollButtons[1].setAttribute('aria-label',scrollDownLabel)
  state.update()
  popover.initListbox(list,list,{invokeMethodAsync(method,value) {
    if(method==='Select') { select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));state.update();content.hidePopover() }
    else if(method==='Close' && content.matches(':popover-open')) content.hidePopover()
    return Promise.resolve()
  }})
}
export function dispose(root) {
  const state=instances.get(root);if(!state)return
  state.controller.abort();state.timer();state.resize.disconnect();popover.disposeListbox(state.list);popover.dispose(state.content)
  state.trigger.remove();state.content.remove();state.select.hidden=false;state.select.id=state.originalId;state.select.removeAttribute('aria-hidden');state.select.removeAttribute('tabindex');instances.delete(root)
}
