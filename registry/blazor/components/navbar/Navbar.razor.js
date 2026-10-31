// Shared theme geometry, native events and disposal; Razor owns the open binding.
const states=new WeakMap()
const queries={sm:'(max-width:575.98px)',md:'(max-width:767.98px)',lg:'(max-width:991.98px)',never:'all',always:'not all'}
function instant(el,set) { if(!el)return set();el.style.transition='none';set();void el.offsetHeight;el.style.transition='' }
export function init(root,receiver,options) {
 if(!root?.isConnected)return
 let state=states.get(root)
 if(!state){
  const controller=new AbortController(),signal=controller.signal
  state={controller,receiver,options,last:0};states.set(root,state);root.dataset.shellReady=''
  const close=focus=>{if(state.options.open){receiver.invokeMethodAsync('SetOpen',false);if(focus)root.querySelector('.rax-navbar-toggle')?.focus()}}
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true)}},{signal})
  root.addEventListener('click',e=>{if(e.target.closest('.rax-navbar-menu-link'))close(false)},{signal})
  const place=()=>root.querySelectorAll('.rax-navbar-links').forEach(list=>{
   const current=list.querySelector('[aria-current="page"]');list.toggleAttribute('data-current',!!current)
   if(current){const set=()=>{list.style.setProperty('--rax-navbar-current-x',`${current.offsetLeft}px`);list.style.setProperty('--rax-navbar-current-w',`${current.offsetWidth}px`)};if(state.current===current)set();else if(state.current) set();else instant(list.querySelector('.rax-navbar-current'),set);state.current=current}
  })
  root.addEventListener('pointerover',e=>{const link=e.target.closest('.rax-navbar-link'),list=link?.closest('.rax-navbar-links');if(!list)return;const set=()=>{list.style.setProperty('--rax-navbar-hover-x',`${link.offsetLeft}px`);list.style.setProperty('--rax-navbar-hover-w',`${link.offsetWidth}px`)};if(list.hasAttribute('data-hover'))set();else instant(list.querySelector('.rax-navbar-hover'),set);list.dataset.hover=''},{signal})
  root.addEventListener('pointerleave',()=>root.querySelectorAll('[data-hover]').forEach(el=>el.removeAttribute('data-hover')),{signal})
  root.addEventListener('focusin',e=>{if(e.target.matches('.rax-navbar-link'))e.target.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}))},{signal})
  const resize=new ResizeObserver(place);resize.observe(root);state.resize=resize
  const mutation=new MutationObserver(place);mutation.observe(root,{subtree:true,attributes:true,attributeFilter:['aria-current'],childList:true});state.mutation=mutation;state.place=place
 }
 state.options=options;state.receiver=receiver;root.querySelectorAll('.rax-navbar-links').forEach(list=>state.resize.observe(list));state.place()
 const key=options.expand
 if(state.expand!==key){state.media?.removeEventListener('change',state.onMedia);state.expand=key;state.media=matchMedia(queries[key]??queries.md);state.onMedia=()=>{if(!state.media.matches)state.receiver.invokeMethodAsync('SetOpen',false)};state.media.addEventListener('change',state.onMedia)}
 const scroll=options.scrollContainer?document.querySelector(options.scrollContainer):window
 if(state.scroll!==scroll||state.hide!==options.hideOnScroll){
  state.scroll?.removeEventListener('scroll',state.onScroll);state.scroll=scroll;state.hide=options.hideOnScroll
  state.last=scroll===window?scrollY:scroll?.scrollTop??0
  state.onScroll=()=>{const y=scroll===window?scrollY:scroll?.scrollTop??0;root.toggleAttribute('data-scrolled',y>4);if(state.hide){if(y>state.last+4&&y>root.offsetHeight&&!state.options.open)root.dataset.hidden='';else if(y<state.last-4||y<=root.offsetHeight||state.options.open)root.removeAttribute('data-hidden')}else root.removeAttribute('data-hidden');state.last=y}
  scroll?.addEventListener('scroll',state.onScroll,{passive:true});state.onScroll()
 }
 if(options.open)root.removeAttribute('data-hidden')
 root.querySelectorAll('.rax-navbar-menu-link').forEach((el,i)=>{el.classList.add('rax-navbar-menu-item');el.style.setProperty('--rax-i',i)})
}
export function dispose(root){const s=states.get(root);if(!s)return;s.controller.abort();s.media?.removeEventListener('change',s.onMedia);s.scroll?.removeEventListener('scroll',s.onScroll);s.resize.disconnect();s.mutation.disconnect();states.delete(root)}
