const states=new WeakMap()
export function sync(root,dotnet,options){
 if(states.has(root)){const state=states.get(root);const changed=state.options.version!==options.version||state.options.rowHeight!==options.rowHeight;state.options=options;if(changed)state.last='';state.measure();focus(root,options);return}
 const state={options,busy:false,pending:null,last:'',disposed:false,drag:null,frame:0}
 const send=async()=>{if(state.busy||!state.pending||state.disposed)return;state.busy=true;const next=state.pending;state.pending=null;try{await dotnet.invokeMethodAsync('Window',...next)}catch(error){if(!state.disposed)console.error(error)}finally{state.busy=false;if(state.pending)void send()}}
 state.measure=()=>{const o=state.options,body=root.querySelector('.sheen-grid-body');if(!body)return;const offset=Math.max(0,root.scrollTop-o.rowHeight),first=Math.max(0,Math.floor(offset/o.rowHeight)-24),last=Math.min(o.count,Math.ceil((offset+root.clientHeight)/o.rowHeight)+24),key=`${o.version}:${first}:${last}`;if(key!==state.last){state.last=key;state.pending=[first,last];void send()}root.toggleAttribute('data-scrolled-x',Math.abs(root.scrollLeft)>0)}
 const key=event=>{const o=state.options;if(event.defaultPrevented||event.isComposing||event.target.closest('[role="listbox"],[role="menu"]'))return
  const mod=event.metaKey||event.ctrlKey
  if(event.shiftKey&&event.key==='F10'){event.preventDefault();const header=[...root.querySelectorAll('[role="columnheader"]')].find(el=>el.dataset.col===o.activeColumn);header?.querySelector('.sheen-grid-hmenu')?.click();return}
  if(!o.editing&&mod&&event.key.toLowerCase()==='c'){event.preventDefault();void navigator.clipboard?.writeText(o.copy).catch(()=>{});return}
  const navigation=['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End','PageDown','PageUp','Enter','F2','Delete','Backspace',' ']
  if(o.editing){if(!['Escape','Enter','Tab'].includes(event.key))return}else if(!navigation.includes(event.key)&&!(event.key.length===1&&!mod))return
  event.preventDefault();const type=!o.editing&&event.key.length===1&&event.key!==' ',key=type?'type':event.key
  void dotnet.invokeMethodAsync('Key',key,event.shiftKey,mod,type?event.key:null,Math.max(1,Math.floor(root.clientHeight/o.rowHeight)-2),getComputedStyle(root).direction==='rtl').catch(console.error)
 }
 const paste=event=>{if(state.options.editing)return;event.preventDefault();void dotnet.invokeMethodAsync('Paste',event.clipboardData.getData('text/plain').split(/\r?\n/)[0]).catch(console.error)}
 const resizeStart=event=>{const handle=event.target.closest('[data-grid-resize]');if(event.button!==0||!handle)return;event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);state.drag={id:handle.dataset.gridResize,start:event.clientX,width:Number(handle.getAttribute('aria-valuenow')),min:Number(handle.getAttribute('aria-valuemin')),max:Number(handle.getAttribute('aria-valuemax')),handle,pointer:event.pointerId}}
 const resizeMove=event=>{const d=state.drag;if(!d||event.pointerId!==d.pointer)return;event.preventDefault();const sign=getComputedStyle(root).direction==='rtl'?-1:1;d.value=Math.max(d.min,Math.min(d.max,d.width+(event.clientX-d.start)*sign));for(const cell of root.querySelectorAll('[data-col]'))if(cell.dataset.col===d.id)cell.style.width=d.value+'px';d.handle.setAttribute('aria-valuenow',String(Math.round(d.value)))}
 const resizeEnd=event=>{const d=state.drag;if(!d||event.pointerId!==d.pointer)return;state.drag=null;void dotnet.invokeMethodAsync('Resize',d.id,d.value??d.width).catch(console.error)}
 const cancel=()=>{const d=state.drag;if(!d)return;for(const cell of root.querySelectorAll('[data-col]'))if(cell.dataset.col===d.id)cell.style.width=d.width+'px';d.handle.setAttribute('aria-valuenow',String(d.width));state.drag=null}
 root.addEventListener('scroll',state.measure,{passive:true});root.addEventListener('keydown',key);root.addEventListener('paste',paste);root.addEventListener('pointerdown',resizeStart);root.addEventListener('pointermove',resizeMove);root.addEventListener('pointerup',resizeEnd);root.addEventListener('pointercancel',cancel)
 const observer=new ResizeObserver(state.measure);observer.observe(root)
 root.querySelectorAll('.sheen-grid-hmenu').forEach(x=>x.tabIndex=-1)
 state.dispose=()=>{state.disposed=true;observer.disconnect();root.removeEventListener('scroll',state.measure);root.removeEventListener('keydown',key);root.removeEventListener('paste',paste);root.removeEventListener('pointerdown',resizeStart);root.removeEventListener('pointermove',resizeMove);root.removeEventListener('pointerup',resizeEnd);root.removeEventListener('pointercancel',cancel);cancel()}
 states.set(root,state);state.measure();focus(root,options)
}
function focus(root,options){
 root.querySelectorAll('.sheen-grid-hmenu').forEach(x=>x.tabIndex=-1)
 if(options.focusEditor){const cell=root.querySelector('[data-editing].sheen-grid-cell'),editor=cell?.querySelector('input:not([type="hidden"]),select,button');if(editor){editor.focus({preventScroll:true});if(options.selectText&&typeof editor.select==='function'&&editor.type!=='date')editor.select()}}
 else if(options.focusGrid)root.focus({preventScroll:true})
}
export function scrollTo(root,index,column){
 const state=states.get(root);if(!state)return;const h=state.options.rowHeight,top=index*h,bottom=top+h
 if(index>=0){if(top<root.scrollTop)root.scrollTop=top;else if(bottom>root.scrollTop+root.clientHeight-2*h)root.scrollTop=bottom-root.clientHeight+2*h}
 const cell=[...root.querySelectorAll('[role="columnheader"]')].find(el=>el.dataset.col===column);if(cell&&!cell.hasAttribute('data-pinned')){const r=cell.getBoundingClientRect(),box=root.getBoundingClientRect(),delta=r.left<box.left?r.left-box.left:r.right>box.right?r.right-box.right:0;root.scrollLeft+=delta}
 state.measure()
}
export function dispose(root){states.get(root)?.dispose();states.delete(root)}
