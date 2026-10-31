const states=new WeakMap()
export function init(root){
 if(!root?.isConnected)return
 if(states.has(root)){states.get(root).refresh();return}
 const controller=new AbortController(),signal=controller.signal,media=matchMedia('(max-width:767.98px)'),known=new WeakSet()
 const refresh=()=>root.querySelectorAll('.rax-footer-column').forEach(column=>{
  const button=column.querySelector('[data-footer-toggle]'),title=column.querySelector('[data-footer-title]'),list=column.querySelector('.rax-footer-list-wrap')
  if(!known.has(column)){known.add(column);column.dataset.footerOpen=column.dataset.defaultOpen;button.addEventListener('click',()=>{column.dataset.footerOpen=column.dataset.footerOpen==='true'?'false':'true';refresh()},{signal})}
  const open=!media.matches||column.dataset.footerOpen==='true';button.hidden=!media.matches;title.hidden=media.matches;button.setAttribute('aria-expanded',String(open));list.inert=!open
  if(media.matches)column.dataset.state=open?'open':'closed';else column.removeAttribute('data-state')
 })
 media.addEventListener('change',refresh,{signal});root.addEventListener('click',e=>{const button=e.target.closest('[data-footer-top]');if(!button)return;const target=button.dataset.scrollTarget?document.querySelector(button.dataset.scrollTarget):window;target?.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})},{signal})
 states.set(root,{controller,refresh});refresh()
}
export function dispose(root){states.get(root)?.controller.abort();states.delete(root)}
