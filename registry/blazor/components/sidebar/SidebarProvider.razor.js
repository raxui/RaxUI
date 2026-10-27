const states=new WeakMap()
export function remember(key,value){if(key)try{localStorage.setItem(key,String(value))}catch{}}
export function init(root,receiver,shortcut,key){
 if(!root?.isConnected)return {mobile:matchMedia('(max-width:767.98px)').matches,stored:null}
 let s=states.get(root)
 if(!s){
  const controller=new AbortController(),signal=controller.signal,media=matchMedia('(max-width:767.98px)'),known=new WeakSet(),last=new WeakMap()
  s={controller,media,shortcut,receiver};states.set(root,s);root.dataset.shellReady=''
  media.addEventListener('change',()=>s.receiver.invokeMethodAsync('MediaChanged',media.matches),{signal})
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||!s.shortcut||e.altKey||e.shiftKey||!(e.metaKey||e.ctrlKey)||e.key.toLowerCase()!==s.shortcut.toLowerCase()||e.target.isContentEditable||e.target.closest('input,textarea,select'))return;const owner=e.target.closest('.sheen-sidebar-wrapper');if(owner?owner!==root:document.querySelector('.sheen-sidebar-wrapper')!==root)return;e.preventDefault();s.receiver.invokeMethodAsync('Toggle')},{signal})
  const place=(instant=false)=>root.querySelectorAll('.sheen-sidebar-content').forEach(content=>{
   if(!known.has(content)){known.add(content);content.addEventListener('scroll',()=>place(true),{signal,passive:true});s.resize.observe(content)}
   const active=[...content.querySelectorAll('[data-sidebar="menu-button"][data-active]')].find(el=>el.closest('.sheen-sidebar-content')===content&&el.getClientRects().length),highlight=content.querySelector(':scope > .sheen-sidebar-highlight');content.toggleAttribute('data-highlight',!!active)
   if(!active||!highlight)return
   const b=active.getBoundingClientRect(),o=content.getBoundingClientRect(),previous=last.get(content)
   if(instant||!previous||previous===active)highlight.style.transition='none'
   content.style.setProperty('--sheen-sidebar-hl-x',`${b.left-o.left+content.scrollLeft}px`);content.style.setProperty('--sheen-sidebar-hl-y',`${b.top-o.top+content.scrollTop}px`);content.style.setProperty('--sheen-sidebar-hl-w',`${b.width}px`);content.style.setProperty('--sheen-sidebar-hl-h',`${b.height}px`)
   void highlight.offsetHeight;highlight.style.transition='';last.set(content,active)
  })
  s.resize=new ResizeObserver(()=>place(true));s.resize.observe(root)
  s.mutation=new MutationObserver(()=>place());s.mutation.observe(root,{subtree:true,attributes:true,attributeFilter:['data-active','data-state','dir'],childList:true});s.place=place
 }
 s.shortcut=shortcut;s.receiver=receiver;s.place()
 let stored=null;try{const v=key&&localStorage.getItem(key);stored=v==='true'?true:v==='false'?false:null}catch{}
 return {mobile:s.media.matches,stored}
}
export function dispose(root){const s=states.get(root);if(!s)return;s.controller.abort();s.resize.disconnect();s.mutation.disconnect();states.delete(root)}
