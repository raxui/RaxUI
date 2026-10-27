const states=new WeakMap()
const itemSelector='[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'
export function init(root,receiver,options){
 if(!root?.isConnected)return
 let s=states.get(root)
 if(!s){
  const controller=new AbortController(),signal=controller.signal
  s={controller,receiver,options,value:null,buffer:'',time:0};states.set(root,s);root.dataset.shellReady=''
  const allMenus=()=>[...root.querySelectorAll('[data-menubar-content]')],triggers=()=>[...root.querySelectorAll('[data-menubar-trigger]')].filter(el=>!el.disabled)
  const items=menu=>[...menu.querySelectorAll(itemSelector)].filter(el=>el.closest('[data-menubar-content]')===menu&&!el.disabled&&el.getAttribute('aria-disabled')!=='true')
  const triggerFor=menu=>document.getElementById(menu.getAttribute('aria-labelledby'))
  const rtl=()=>getComputedStyle(root).direction==='rtl'
  const place=menu=>{const trigger=triggerFor(menu);if(!trigger)return;const b=trigger.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight,sub=menu.hasAttribute('data-submenu');let x=rtl()?b.right-w:b.left,y=b.bottom+4
   if(sub){x=rtl()?b.left-w-4:b.right+4;y=b.top;if(x<8||x+w>innerWidth-8)x=rtl()?b.right+4:b.left-w-4}
   if(!sub&&y+h>innerHeight-8&&b.top-h-4>=8)y=b.top-h-4
   menu.style.left=`${Math.max(8,Math.min(x,innerWidth-w-8))}px`;menu.style.top=`${Math.max(8,Math.min(y,innerHeight-h-8))}px`;menu.style.maxHeight=`${innerHeight-16}px`
  }
  const mark=()=>{const t=triggers().find(el=>el.dataset.shellValue===s.value);root.toggleAttribute('data-open',!!t);root.querySelectorAll('[data-menubar-trigger]').forEach(el=>{el.dataset.state=el===t?'open':'closed';el.setAttribute('aria-expanded',String(el===t));el.tabIndex=el===t||!t&&el===triggers()[0]?0:-1});if(t){const b=t.getBoundingClientRect(),o=root.getBoundingClientRect();root.style.setProperty('--sheen-menubar-x',`${b.left-o.left+root.scrollLeft}px`);root.style.setProperty('--sheen-menubar-w',`${b.width}px`)}}
  const hide=menu=>{allMenus().filter(child=>menu.contains(child)&&child!==menu).reverse().forEach(hide);if(menu.matches(':popover-open'))menu.hidePopover();triggerFor(menu)?.setAttribute('aria-expanded','false');menu.removeAttribute('data-hover')}
  const open=(value,focus=false,notify=true)=>{
   const previous=s.value,menu=allMenus().find(el=>!el.hasAttribute('data-submenu')&&el.dataset.shellValue===value);s.value=menu?value:null
   allMenus().filter(el=>!el.hasAttribute('data-submenu')&&el!==menu).forEach(hide)
   if(menu){if(!menu.matches(':popover-open'))menu.showPopover();place(menu);if(focus)(focus==='last'?items(menu).at(-1):items(menu)[0]??menu)?.focus()}
   mark();if(previous!==s.value&&notify)s.receiver.invokeMethodAsync('SetValue',s.value)
  }
  const openSub=(trigger,focus=false)=>{const menu=document.getElementById(trigger.getAttribute('aria-controls')),parent=trigger.closest('[data-menubar-content]');if(!menu||trigger.disabled)return;allMenus().filter(el=>el.hasAttribute('data-submenu')&&el!==menu&&triggerFor(el)?.closest('[data-menubar-content]')===parent).forEach(hide);if(!menu.matches(':popover-open'))menu.showPopover();trigger.setAttribute('aria-expanded','true');place(menu);if(focus)(items(menu)[0]??menu).focus()}
  const glide=item=>{const menu=item?.closest('[data-menubar-content]');if(!menu)return;const h=menu.querySelector(':scope > .sheen-dropdown-highlight');if(!h)return;const b=item.getBoundingClientRect(),o=menu.getBoundingClientRect();menu.style.setProperty('--sheen-menu-hover-y',`${b.top-o.top+menu.scrollTop}px`);menu.style.setProperty('--sheen-menu-hover-h',`${b.height}px`);menu.dataset.hover=''}
  s.open=open;s.refresh=()=>{allMenus().forEach(el=>{el.setAttribute('popover','manual');if(el.matches(':popover-open'))place(el)});mark()};s.refresh()
  root.addEventListener('click',e=>{const trigger=e.target.closest('[data-menubar-trigger]:not(:disabled)');if(trigger){open(s.value===trigger.dataset.shellValue?null:trigger.dataset.shellValue);return}const sub=e.target.closest('[data-menubar-sub-trigger]:not(:disabled)');if(sub){openSub(sub);return}const item=e.target.closest(itemSelector);if(item&&!item.disabled&&item.getAttribute('aria-disabled')!=='true'){const t=triggers().find(el=>el.dataset.shellValue===s.value);open(null);t?.focus()}},{signal})
  root.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const trigger=e.target.closest('[data-menubar-trigger]:not(:disabled)');if(trigger&&s.value&&trigger.dataset.shellValue!==s.value){trigger.focus();open(trigger.dataset.shellValue);return}const item=e.target.closest(itemSelector);if(item&&!item.disabled&&item.getAttribute('aria-disabled')!=='true'){item.focus();glide(item);if(item.matches('[data-menubar-sub-trigger]'))openSub(item);else {const menu=item.closest('[data-menubar-content]');allMenus().filter(el=>el.hasAttribute('data-submenu')&&triggerFor(el)?.closest('[data-menubar-content]')===menu).forEach(hide)}}},{signal})
  root.addEventListener('focusin',e=>{if(e.target.matches(itemSelector)&&!e.target.hasAttribute('data-menubar-trigger'))glide(e.target)},{signal})
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))open(null)},{signal})
  document.addEventListener('focusin',e=>{if(!root.contains(e.target))open(null)},{signal})
  root.addEventListener('keydown',e=>{
   const trigger=e.target.closest('[data-menubar-trigger]'),menu=e.target.closest('[data-menubar-content]'),all=triggers(),active=all.find(el=>el.dataset.shellValue===s.value)
   const horizontal=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,direction=horizontal*(rtl()?-1:1)
   if(e.key==='Escape'&&s.value){e.preventDefault();e.stopPropagation();if(menu?.hasAttribute('data-submenu')){hide(menu);triggerFor(menu)?.focus()}else{open(null);active?.focus()}return}
   if(e.key==='Tab'&&s.value){e.preventDefault();const candidates=[...document.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>!root.contains(el)&&!el.closest('[inert]')&&el.getClientRects().length);const next=e.shiftKey?candidates.filter(el=>root.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_PRECEDING).at(-1):candidates.find(el=>root.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING);open(null);next?.focus();return}
   if(trigger){let next;if(direction){const i=all.indexOf(trigger);next=s.options.loop?all[(i+direction+all.length)%all.length]:all[i+direction]}if(e.key==='Home')next=all[0];if(e.key==='End')next=all.at(-1);if(next){e.preventDefault();next.focus();if(s.value)open(next.dataset.shellValue)}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open(trigger.dataset.shellValue,e.key==='ArrowUp'?'last':true)}return}
   if(!menu)return
   const current=document.activeElement
   if(direction===1&&current.matches('[data-menubar-sub-trigger]')){e.preventDefault();openSub(current,true);return}
   if(direction===-1&&menu.hasAttribute('data-submenu')){e.preventDefault();hide(menu);triggerFor(menu)?.focus();return}
   if(direction&&!menu.hasAttribute('data-submenu')){const i=all.indexOf(active),next=s.options.loop?all[(i+direction+all.length)%all.length]:all[i+direction];if(next){e.preventDefault();open(next.dataset.shellValue,true)}return}
   const list=items(menu),index=list.indexOf(current);let next
   if(e.key==='ArrowDown')next=list[(index+1)%list.length];if(e.key==='ArrowUp')next=list[index<=0?list.length-1:index-1];if(e.key==='Home')next=list[0];if(e.key==='End')next=list.at(-1)
   if(!next&&e.key.length===1&&e.key.trim()&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const now=performance.now();s.buffer=now-s.time>700?e.key:s.buffer+e.key;s.time=now;const text=s.buffer.toLocaleLowerCase();next=[...list.slice(index+1),...list.slice(0,index+1)].find(el=>el.textContent.trim().toLocaleLowerCase().startsWith(text))}
   if(next){e.preventDefault();next.focus()}
  },{signal})
  const placeAll=()=>{allMenus().filter(el=>el.matches(':popover-open')).forEach(place);mark()};window.addEventListener('resize',placeAll,{signal});window.addEventListener('scroll',placeAll,{signal,capture:true});s.resize=new ResizeObserver(placeAll);s.resize.observe(root)
 }
 s.receiver=receiver;s.options=options;s.refresh();if(s.parameter!==options.value){s.parameter=options.value;s.open(options.value,false,false)}
}
export function dispose(root){const s=states.get(root);if(!s)return;s.open(null,false,false);s.controller.abort();s.resize.disconnect();states.delete(root)}
