const states=new WeakMap()
const focusable=panel=>[...panel.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>!el.closest('[inert]')&&el.getClientRects().length)
export function init(root,receiver,options){
 if(!root?.isConnected)return
 let s=states.get(root)
 if(!s){
  const controller=new AbortController(),signal=controller.signal
  s={controller,receiver,options,value:null,timer:0};states.set(root,s);root.dataset.shellReady=''
  const panels=()=>[...root.querySelectorAll('[data-nav-content]')],triggers=()=>[...root.querySelectorAll('[data-nav-trigger]:not(:disabled)')],backdrop=root.querySelector('[data-nav-viewport]')
  backdrop.setAttribute('popover','manual')
  const place=()=>{
   const trigger=triggers().find(el=>el.dataset.shellValue===s.value),panel=panels().find(el=>el.dataset.shellValue===s.value);if(!trigger||!panel)return
   const b=(s.options.viewportAlign==='start'?root:trigger).getBoundingClientRect(),rtl=getComputedStyle(root).direction==='rtl',width=panel.offsetWidth,height=Math.min(panel.scrollHeight,innerHeight-16)
   const x=Math.max(8,Math.min(rtl?b.right-width:b.left,innerWidth-width-8)),y=Math.max(8,Math.min(b.bottom+8,innerHeight-height-8))
   panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.maxHeight=`${innerHeight-y-8}px`
   const indicator=root.querySelector('[data-nav-indicator]');if(indicator){indicator.setAttribute('popover','manual');indicator.hidden=false;if(!indicator.matches(':popover-open'))indicator.showPopover();indicator.dataset.state='visible';indicator.style.position='fixed';indicator.style.left=`${trigger.getBoundingClientRect().left}px`;indicator.style.top=`${b.bottom}px`;indicator.style.width=`${trigger.offsetWidth}px`}
   backdrop.style.width=`${width}px`;backdrop.style.height=`${panel.offsetHeight}px`;backdrop.style.left=`${x}px`;backdrop.style.top=`${y}px`
  }
  const open=(value,focus=false,notify=true)=>{
   clearTimeout(s.timer);const previous=s.value,all=panels(),next=all.find(el=>el.dataset.shellValue===value);s.value=next?value:null
   all.forEach(panel=>{panel.setAttribute('popover','manual');if(panel!==next&&panel.matches(':popover-open'))panel.hidePopover()})
   root.querySelectorAll('[data-nav-trigger]').forEach(trigger=>{const active=trigger.dataset.shellValue===s.value;trigger.setAttribute('aria-expanded',String(active));trigger.dataset.state=active?'open':'closed'})
   if(next){
    if(!backdrop.matches(':popover-open'))backdrop.showPopover()
    if(!next.matches(':popover-open'))next.showPopover()
    const order=triggers().map(el=>el.dataset.shellValue);next.dataset.motion=order.indexOf(value)>=order.indexOf(previous)?'from-end':'from-start'
    if(!previous)backdrop.style.transition='none';place();void backdrop.offsetWidth;backdrop.style.transition=''
    if(focus)(focus==='last'?focusable(next).at(-1):focusable(next)[0]??next)?.focus()
   }else {if(backdrop.matches(':popover-open'))backdrop.hidePopover();const indicator=root.querySelector('[data-nav-indicator]');if(indicator){if(indicator.matches(':popover-open'))indicator.hidePopover();indicator.hidden=true;indicator.dataset.state='hidden'}}
   if(previous!==s.value&&notify)s.receiver.invokeMethodAsync('SetValue',s.value)
  }
  s.open=open;s.place=place;s.refresh=()=>panels().forEach(panel=>{panel.setAttribute('popover','manual');s.resize?.observe(panel)});s.refresh()
  root.addEventListener('pointerover',e=>{const t=e.target.closest('[data-nav-trigger]:not(:disabled)');if(!t||e.pointerType==='touch')return;clearTimeout(s.timer);s.timer=setTimeout(()=>open(t.dataset.shellValue),s.value?0:s.options.delay)},{signal})
  root.addEventListener('pointerenter',()=>clearTimeout(s.timer),{signal})
  root.addEventListener('pointerleave',()=>{clearTimeout(s.timer);s.timer=setTimeout(()=>open(null),150)},{signal})
  root.addEventListener('click',e=>{const t=e.target.closest('[data-nav-trigger]:not(:disabled)');if(t){open(s.value===t.dataset.shellValue?null:t.dataset.shellValue);return}if(e.target.closest('a[href]'))open(null)},{signal})
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))open(null)},{signal})
  document.addEventListener('focusin',e=>{if(!root.contains(e.target))open(null)},{signal})
  root.addEventListener('keydown',e=>{
   const t=e.target.closest('[data-nav-trigger]'),panel=e.target.closest('[data-nav-content]'),all=triggers(),rtl=getComputedStyle(root).direction==='rtl'
   if(e.key==='Escape'&&s.value){e.preventDefault();const active=all.find(el=>el.dataset.shellValue===s.value);open(null);active?.focus();return}
   if(t){const index=all.indexOf(t);let next
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const d=(e.key==='ArrowRight'?1:-1)*(rtl?-1:1);next=s.options.loop?all[(index+d+all.length)%all.length]:all[index+d]}
    if(e.key==='Home')next=all[0];if(e.key==='End')next=all.at(-1)
    if(next){e.preventDefault();next.focus();if(s.value)open(next.dataset.shellValue)}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open(t.dataset.shellValue,e.key==='ArrowUp'?'last':true)}
   }else if(panel&&(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End')){const items=focusable(panel),i=items.indexOf(document.activeElement);const next=e.key==='Home'?items[0]:e.key==='End'?items.at(-1):items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length];if(next){e.preventDefault();next.focus()}}
  },{signal})
  s.resize=new ResizeObserver(place);s.resize.observe(root);window.addEventListener('resize',place,{signal});window.addEventListener('scroll',place,{signal,capture:true})
 }
 s.receiver=receiver;s.options=options;s.refresh();if(s.parameter!==options.value){s.parameter=options.value;s.open(options.value,false,false)}s.place()
}
export function dispose(root){const s=states.get(root);if(!s)return;clearTimeout(s.timer);s.open(null,false,false);s.controller.abort();s.resize.disconnect();states.delete(root)}
