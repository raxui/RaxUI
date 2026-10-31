const states=new WeakMap()
export function remember(key,value){if(key)try{localStorage.setItem(key,String(value))}catch{}}
export function init(root,receiver,shortcut,key){
 if(!root?.isConnected)return {mobile:matchMedia('(max-width:767.98px)').matches,stored:null}
 let s=states.get(root)
 if(!s){
  const controller=new AbortController(),signal=controller.signal,media=matchMedia('(max-width:767.98px)'),known=new WeakSet(),last=new WeakMap()
  s={controller,media,shortcut,receiver};states.set(root,s);root.dataset.shellReady=''
  media.addEventListener('change',()=>s.receiver.invokeMethodAsync('MediaChanged',media.matches),{signal})
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||!s.shortcut||e.altKey||e.shiftKey||!(e.metaKey||e.ctrlKey)||e.key.toLowerCase()!==s.shortcut.toLowerCase()||e.target.isContentEditable||e.target.closest('input,textarea,select'))return;const owner=e.target.closest('.rax-sidebar-wrapper');if(owner?owner!==root:document.querySelector('.rax-sidebar-wrapper')!==root)return;e.preventDefault();s.receiver.invokeMethodAsync('Toggle')},{signal})
  const place=()=>root.querySelectorAll('.rax-sidebar-content').forEach(content=>{
   if(!known.has(content)){known.add(content);content.addEventListener('scroll',()=>{place();content.removeAttribute('data-hover')},{signal,passive:true});s.resize.observe(content)}
   // Menus too: a group folding above the active item moves it without resizing the content.
   content.querySelectorAll('[data-sidebar="menu"]').forEach(menu=>{if(!known.has(menu)){known.add(menu);s.resize.observe(menu)}})
   const active=[...content.querySelectorAll('[data-sidebar="menu-button"][data-active]')].find(el=>el.closest('.rax-sidebar-content')===content&&el.getClientRects().length),highlight=content.querySelector(':scope > .rax-sidebar-highlight');content.toggleAttribute('data-highlight',!!active)
   if(!active||!highlight)return
   const b=active.getBoundingClientRect(),o=content.getBoundingClientRect(),previous=last.get(content)
   const box={x:`${b.left-o.left+content.scrollLeft}px`,y:`${b.top-o.top+content.scrollTop}px`,w:`${b.width}px`,h:`${b.height}px`}
   // A resize (the page under the inset changing height on navigation) must not cancel a glide that is still running.
   if(previous===active&&Object.entries(box).every(([k,v])=>content.style.getPropertyValue(`--rax-sidebar-hl-${k}`)===v))return
   if(!previous||previous===active)highlight.style.transition='none'
   for(const [k,v] of Object.entries(box))content.style.setProperty(`--rax-sidebar-hl-${k}`,v)
   void highlight.offsetHeight;highlight.style.transition='';last.set(content,active)
  })
  // A hover pill follows the pointer between menu buttons, like the navbar's.
  const items='[data-sidebar="menu-button"],.rax-sidebar-menu-sub-button'
  root.addEventListener('pointerover',e=>{const button=e.target.closest(items),content=button?.closest('.rax-sidebar-content'),pill=content?.querySelector(':scope > .rax-sidebar-hover');if(!pill||button.matches('[aria-disabled=true],:disabled'))return
   const b=button.getBoundingClientRect(),o=content.getBoundingClientRect(),shown=content.hasAttribute('data-hover')
   if(!shown)pill.style.transition='opacity var(--rax-duration-fast) ease'
   content.style.setProperty('--rax-sidebar-hover-x',`${b.left-o.left+content.scrollLeft}px`);content.style.setProperty('--rax-sidebar-hover-y',`${b.top-o.top+content.scrollTop}px`);content.style.setProperty('--rax-sidebar-hover-w',`${b.width}px`);content.style.setProperty('--rax-sidebar-hover-h',`${b.height}px`)
   content.setAttribute('data-hover','');if(!shown){void pill.offsetHeight;pill.style.transition=''}},{signal})
  root.addEventListener('pointerout',e=>{const content=e.target.closest(items)?.closest('.rax-sidebar-content');if(content&&e.relatedTarget?.closest?.(items)?.closest('.rax-sidebar-content')!==content)content.removeAttribute('data-hover')},{signal})
  s.resize=new ResizeObserver(()=>place());s.resize.observe(root)
  s.mutation=new MutationObserver(()=>place());s.mutation.observe(root,{subtree:true,attributes:true,attributeFilter:['data-active','data-state','dir'],childList:true});s.place=place
 }
 s.shortcut=shortcut;s.receiver=receiver;s.place()
 let stored=null;try{const v=key&&localStorage.getItem(key);stored=v==='true'?true:v==='false'?false:null}catch{}
 return {mobile:s.media.matches,stored}
}
export function dispose(root){const s=states.get(root);if(!s)return;s.controller.abort();s.resize.disconnect();s.mutation.disconnect();states.delete(root)}
