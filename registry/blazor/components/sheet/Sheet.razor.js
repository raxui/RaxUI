// Native Sheet/Drawer lifecycle, transient gestures and snap geometry; C# owns public state.
import * as dialog from '../Dialog/Dialog.razor.js'
const states = new Map()
const noDrag = 'input,textarea,select,button,a,label,[contenteditable],[data-panel-no-drag],[data-sheet-no-drag],[data-vaul-no-drag],.form-range'
let locks = 0, previousOverflow
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
export function parseSnap(point, size) {
  const text = String(point).trim(), match = /^(\d*\.?\d+)(px|%)?$/.exec(text)
  if (!match) throw new Error(`Invalid snap point: ${text}`)
  const value = Number(match[1])
  if (value <= 0 || (!match[2] && value > 1)) throw new Error(`Invalid snap point: ${text}`)
  return Math.min(size, match[2] === 'px' ? value : match[2] === '%' ? size * value / 100 : size * value)
}
function axis(state) { const side=state.physical; return { horizontal: side==='left'||side==='right', sign: side==='left'||side==='top'?-1:1 } }
function position(state, offset) {
  state.offset = offset
  const {horizontal,sign}=axis(state)
  state.element.style.setProperty('--rax-panel-x',`${horizontal?offset*sign:0}px`)
  state.element.style.setProperty('--rax-panel-y',`${horizontal?0:offset*sign}px`)
  let opacity = 1
  if (state.points.length > 1) {
    const index=clamp(state.options.fadeFromIndex,1,state.points.length-1), lower=state.points[index-1].size, upper=state.points[index].size
    opacity=clamp((state.size-offset-lower)/(upper-lower),0,1)
  } else if(!state.points.length) opacity=clamp(1-offset/state.size,0,1)
  state.element.style.setProperty('--rax-panel-backdrop-opacity',String(opacity))
  if(state.points.length) {
    const visible=state.size-offset
    state.element.style.setProperty('--rax-panel-visible-size',`${visible}px`)
    const body=state.element.querySelector('.rax-drawer-body')
    const other=[...state.element.children].filter(el=>el!==body&&!el.matches('.rax-drawer-close')).reduce((sum,el)=>sum+el.offsetHeight+parseFloat(getComputedStyle(el).marginTop||0)+parseFloat(getComputedStyle(el).marginBottom||0),0)
    state.element.style.setProperty('--rax-panel-body-max',`${Math.max(0,visible-other-2)}px`)
    state.element.toggleAttribute('data-panel-full',visible>=state.points.at(-1).size-1)
  }
}
function layout(state) {
  const el=state.element, rtl=getComputedStyle(el).direction==='rtl'
  state.physical=state.options.side==='start'?(rtl?'right':'left'):state.options.side==='end'?(rtl?'left':'right'):state.options.side
  el.dataset.physicalSide=state.physical
  if(state.options.kind==='drawer') el.dataset.vaulDrawerDirection=state.physical
  const {horizontal,sign}=axis(state), viewport=horizontal?innerWidth:innerHeight
  state.points=state.options.snapPoints.map(value=>({value,size:parseSnap(value,viewport)})).sort((a,b)=>a.size-b.size).filter((p,i,all)=>!i||p.size!==all[i-1].size)
  el.toggleAttribute('data-panel-snaps',state.points.length>0)
  el.style.setProperty('--rax-panel-exit-x',horizontal?`calc(${sign} * (100% + 1rem))`:'0px')
  el.style.setProperty('--rax-panel-exit-y',horizontal?'0px':`calc(${sign} * (100% + 1rem))`)
  state.size=horizontal?el.offsetWidth:state.points.length?innerHeight:el.offsetHeight
  if(!el.open || state.drag?.active) return
  const active=state.points.find(p=>p.value===state.active)||state.points[0]
  if(active) state.active=active.value
  position(state,active?state.size-active.size:0)
}
function snap(state, point, notify=true) {
  if(!point)return
  state.active=point.value;position(state,state.size-point.size)
  if(notify) state.receiver.invokeMethodAsync('Snapped',point.value)
}
function cleanupOpen(state) {
  if(!state.locked)return
  state.locked=false;state.drag=null;state.element.removeAttribute('data-dragging');state.element.removeAttribute('data-panel-entering')
  if(--locks===0) document.documentElement.style.overflow=previousOverflow
  if(state.parent) {
    const parent=states.get(state.parent)
    if(parent) { parent.children=Math.max(0,parent.children-1);parent.element.toggleAttribute('data-panel-nested',parent.children>0) }
    state.parent=null;state.element.removeAttribute('data-panel-child')
  }
}
export function configure(element,receiver,options) {
  let state=states.get(element)
  if(!state) {
    dialog.init(element)
    const controller=new AbortController(),signal=controller.signal
    state={element,receiver,options,controller,points:[],active:options.activeSnapPoint,parameterSnap:options.activeSnapPoint,offset:0,size:1,children:0,locked:false,drag:null,generation:0}
    states.set(element,state)
    const coordinate=(x,y)=>axis(state).horizontal?x:y
    const scrolled=target=>{for(let el=target;el&&el!==element;el=el.parentElement)if(el.scrollTop>0||Math.abs(el.scrollLeft||0)>0)return true;return false}
    const start=(target,x,y,id,touch)=>{
      if(!state.options.draggable||!element.open||target.closest('dialog')!==element)return
      const bounds=element.getBoundingClientRect();if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return
      const handle=target.closest('[data-panel-handle]')
      if(!handle&&target.closest(noDrag))return
      const point=coordinate(x,y)
      state.drag={id,touch,target,start:point,last:point,cross:axis(state).horizontal?y:x,time:performance.now(),velocity:0,base:state.offset,active:false}
    }
    const move=(x,y,event)=>{
      const drag=state.drag;if(!drag)return
      const point=coordinate(x,y),{horizontal,sign}=axis(state),delta=(point-drag.start)*sign,cross=(horizontal?y:x)-drag.cross
      if(!drag.active) {
        if(Math.abs(delta)<6)return
        if(Math.abs(cross)>Math.abs(delta)){state.drag=null;return}
        if(scrolled(drag.target)){drag.start=point;drag.last=point;drag.time=performance.now();return}
        if(delta<0&&(!state.points.length||drag.base<=0)){state.drag=null;return}
        drag.active=true;element.removeAttribute('data-panel-entering');element.dataset.dragging=''
        if(!drag.touch)try{element.setPointerCapture(drag.id)}catch{}
      }
      if(event.cancelable)event.preventDefault()
      const now=performance.now();drag.velocity=(point-drag.last)*sign/Math.max(1,now-drag.time);drag.last=point;drag.time=now
      let offset=drag.base+delta;if(offset<0)offset*=.15
      position(state,clamp(offset,-30,state.size+30))
    }
    const end=cancel=>{
      const drag=state.drag;state.drag=null;if(!drag?.active)return
      element.removeAttribute('data-dragging');state.suppressClick=performance.now()+300
      const velocity=performance.now()-drag.time>100?0:drag.velocity
      if(cancel){layout(state);return}
      if(state.points.length) {
        const visible=state.size-state.offset,minimum=state.points[0].size,index=state.points.findIndex(p=>p.value===state.active)
        if(visible<minimum*.5||(velocity>.4&&index===0&&state.offset-drag.base>10)){setOpen(element,false);return}
        const projected=visible-velocity*180
        let next=state.points.reduce((a,b)=>Math.abs(b.size-projected)<Math.abs(a.size-projected)?b:a)
        if(Math.abs(velocity)>.4&&next.value===state.active)next=state.points[clamp(index+(velocity<0?1:-1),0,state.points.length-1)]
        snap(state,next)
      } else if(state.offset>state.size*.3||(velocity>.4&&state.offset>10))setOpen(element,false)
      else position(state,0)
    }
    element.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0)start(event.target,event.clientX,event.clientY,event.pointerId,false)},{signal})
    element.addEventListener('pointermove',event=>{if(state.drag&&!state.drag.touch&&state.drag.id===event.pointerId)move(event.clientX,event.clientY,event)},{signal})
    element.addEventListener('pointerup',event=>{if(state.drag&&!state.drag.touch&&state.drag.id===event.pointerId)end(false)},{signal})
    element.addEventListener('pointercancel',()=>{if(!state.drag?.touch)end(true)},{signal})
    element.addEventListener('touchstart',event=>{if(event.touches.length===1){const t=event.touches[0];start(event.target,t.clientX,t.clientY,t.identifier,true)}},{signal,passive:true})
    element.addEventListener('touchmove',event=>{const t=[...event.touches].find(t=>t.identifier===state.drag?.id);if(t&&state.drag?.touch)move(t.clientX,t.clientY,event)},{signal,passive:false})
    element.addEventListener('touchend',()=>{if(state.drag?.touch)end(false)},{signal})
    element.addEventListener('touchcancel',()=>end(true),{signal})
    element.addEventListener('click',event=>{
      if(event.target.closest('dialog')!==element||!event.target.closest('[data-panel-handle]'))return
      if(performance.now()<state.suppressClick){event.preventDefault();return}
      if(state.points.length)snap(state,state.points[(state.points.findIndex(p=>p.value===state.active)+1)%state.points.length])
    },{signal})
    element.addEventListener('keydown',event=>{
      if(event.target.closest('dialog')!==element||!event.target.closest('[data-panel-handle]')||!state.points.length)return
      const index=state.points.findIndex(p=>p.value===state.active),next={ArrowUp:index+1,ArrowRight:index+1,ArrowDown:index-1,ArrowLeft:index-1,Home:0,End:state.points.length-1}[event.key]
      if(next!==undefined){event.preventDefault();snap(state,state.points[clamp(next,0,state.points.length-1)])}
    },{signal})
    element.addEventListener('close',()=>cleanupOpen(state),{signal})
    window.addEventListener('resize',()=>layout(state),{signal})
    const observer=new ResizeObserver(()=>layout(state));observer.observe(element);state.observer=observer
  }
  state.receiver=receiver;state.options=options
  if(state.parameterSnap!==options.activeSnapPoint){state.parameterSnap=options.activeSnapPoint;state.active=options.activeSnapPoint}
  layout(state)
}
export async function setOpen(element,open) {
  const state=states.get(element);if(!state)return
  const generation=++state.generation
  if(open) {
    if(!state.locked) {
      if(locks++===0){previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden'}
      state.locked=true
      const parent=element.parentElement?.closest('dialog.rax-drawer-content')
      if(parent?.open&&states.has(parent)){state.parent=parent;element.dataset.panelChild='';states.get(parent).children++;parent.dataset.panelNested=''}
    }
    layout(state);element.dataset.panelEntering=''
    await dialog.setOpen(element,true);layout(state)
    await Promise.allSettled(element.getAnimations().map(a=>a.finished))
    if(generation===state.generation)element.removeAttribute('data-panel-entering')
  } else {
    for(const child of states.values())if(child.parent===element&&child.element.open)await setOpen(child.element,false)
    element.removeAttribute('data-panel-entering');element.removeAttribute('data-dragging')
    await dialog.setOpen(element,false)
  }
}
export function dispose(element) {
  const state=states.get(element);if(!state)return
  for(const child of [...states.values()])if(child.parent===element)dispose(child.element)
  if(element.open)element.close()
  cleanupOpen(state);state.controller.abort();state.observer.disconnect();states.delete(element);dialog.dispose(element)
}
