// One instance per options.id; several may share a root (Kanban columns and cards). Lists are [data-sortable-content="<id>"].
const instances=new Map()
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches
const center=box=>({x:box.left+box.width/2,y:box.top+box.height/2})
export function sync(root,dotnet,options){
 if(!root?.isConnected)return
 const existing=instances.get(options.id)
 if(existing?.root===root){const s=existing;s.options=options;if(s.drag){if(s.drag.committing)s.reset();else s.cancel();}s.restoreFocus();return}
 if(existing)dispose(options.id)
 const live=root.querySelector(`[data-sortable-live="${options.live??options.id}"]`)
 const lists=()=>[...root.querySelectorAll(`[data-sortable-content="${options.id}"]`)]
 const items=list=>[...list.children].filter(el=>el.hasAttribute('data-sortable-id'))
 const axisOf=list=>list.dataset.orientation??root.dataset.orientation
 const state={options,drag:null,focus:null,restoreFocus(){if(!state.focus)return;const item=lists().flatMap(items).find(x=>x.dataset.sortableId===state.focus);(item?.querySelector('[data-sortable-handle]')??item)?.focus({preventScroll:true});state.focus=null}}
 const say=kind=>{const d=state.drag;if(!d||!live)return;const o=state.options,t=d.to.list,total=t.nodes.length+(t===d.from.list?0:1)
  live.textContent=o[kind].replaceAll('{item}',o.labels[d.id]??d.id).replaceAll('{column}',o.lists?.[t.key]??t.key).replaceAll('{position}',String(kind==='cancelled'?d.from.index+1:d.to.index+1)).replaceAll('{total}',String(kind==='cancelled'?d.from.list.nodes.length:total))}
 const reset=()=>{const d=state.drag;if(!d)return;clearTimeout(d.timer);d.copy?.remove();for(const list of d.lists){list.el.style.removeProperty('padding-bottom');list.el.style.removeProperty('padding-inline-end');list.zone?.removeAttribute('data-over');for(const el of list.nodes){el.style.removeProperty('transform');el.style.removeProperty('transition')}}d.element.removeAttribute('data-placeholder');d.element.removeAttribute('data-dragging');root.removeAttribute('data-sorting');state.drag=null}
 state.reset=reset
 state.cancel=()=>{if(state.drag?.started)say('cancelled');reset()}
 const start=()=>{const d=state.drag;if(!d||d.started)return;d.started=true;root.dataset.sorting='';if(d.lists.length>1)d.from.list.zone?.setAttribute('data-over','');if(d.keyboard){d.element.dataset.dragging='';say('grabbed');return}d.element.dataset.placeholder='';d.copy=d.element.cloneNode(true);d.copy.removeAttribute('id');d.copy.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));d.copy.removeAttribute('data-placeholder');d.copy.dataset.overlay='';d.copy.setAttribute('aria-hidden','true');d.copy.inert=true
 Object.assign(d.copy.style,{position:'fixed',top:d.rect.top+'px',left:d.rect.left+'px',width:d.rect.width+'px',height:d.rect.height+'px',margin:'0',zIndex:'2000',pointerEvents:'none',boxSizing:'border-box'});// Glass/transform ancestors establish a containing block for fixed elements.
 const theme=getComputedStyle(d.element);for(const name of theme)if(name.startsWith('--'))d.copy.style.setProperty(name,theme.getPropertyValue(name));d.copy.style.direction=theme.direction;d.copy.style.font=theme.font;d.copy.style.color=d.color;document.body.append(d.copy);say('grabbed')}
 // Where the dragged element lands: a neighbor's slot in its own list, otherwise the insertion point in another list.
 const slot=(list,index)=>{const d=state.drag,others=list.nodes.filter(x=>x!==d.element),rtl=getComputedStyle(list.el).direction==='rtl'
  if(list===d.from.list)return list.boxes[index]
  if(index<others.length)return list.boxes[list.nodes.indexOf(others[index])]
  if(others.length){const last=list.boxes[list.nodes.indexOf(others.at(-1))];return list.axis==='horizontal'?{left:rtl?last.left-list.gap-d.rect.width:last.right+list.gap,top:last.top}:{left:last.left,top:last.bottom+list.gap}}
  const box=list.el.getBoundingClientRect(),css=getComputedStyle(list.el);return{left:rtl?box.right-parseFloat(css.paddingRight)-d.rect.width:box.left+parseFloat(css.paddingLeft),top:box.top+parseFloat(css.paddingTop)}}
 const move=(list,index)=>{const d=state.drag;if(!d||(list===d.to.list&&index===d.to.index))return
  if(list===d.from.list&&list.nodes[index]?.hasAttribute('data-disabled'))return
  if(list!==d.to.list){d.to.list.zone?.removeAttribute('data-over');list.zone?.setAttribute('data-over','');for(const other of d.lists){other.el.style.removeProperty('padding-bottom');other.el.style.removeProperty('padding-inline-end')}
   // The target list makes room for the incoming element.
   if(list!==d.from.list){const pad=parseFloat(getComputedStyle(list.el)[list.axis==='horizontal'?'paddingInlineEnd':'paddingBottom']);list.el.style.setProperty(list.axis==='horizontal'?'padding-inline-end':'padding-bottom',pad+list.gap+(list.axis==='horizontal'?d.rect.width:d.rect.height)+'px')}}
  d.to={list,index}
  const transition=reduced()?'none':'transform 320ms cubic-bezier(0.22,1,0.36,1)'
  for(const other of d.lists){
   if(other===d.from.list&&other===list){const order=other.nodes.slice();order.splice(d.from.index,1);order.splice(index,0,d.element)
    for(let pos=0;pos<order.length;pos++){const el=order[pos];if(el===d.element&&!el.hasAttribute('data-placeholder'))continue;const old=other.boxes[other.nodes.indexOf(el)],next=other.boxes[pos];el.style.transition=transition;el.style.transform=`translate(${next.left-old.left}px,${next.top-old.top}px)`}
    continue}
   const size=other.axis==='horizontal'?d.rect.width+other.gap:d.rect.height+other.gap,sign=other.axis==='horizontal'&&getComputedStyle(other.el).direction==='rtl'?-1:1
   other.nodes.forEach((el,i)=>{if(el===d.element)return;const shift=other===d.from.list?(i>d.from.index?-size:0):other===list&&i>=index?size:0;el.style.transition=transition;el.style.transform=shift?(other.axis==='horizontal'?`translate(${shift*sign}px,0)`:`translate(0,${shift}px)`):''})}
  if(list!==d.from.list){const box=slot(list,index);d.element.style.transition=transition;d.element.style.transform=`translate(${box.left-d.rect.left}px,${box.top-d.rect.top}px)`}
  else if(d.keyboard){const box=list.boxes[index];d.element.style.transform=`translate(${box.left-d.rect.left}px,${box.top-d.rect.top}px)`}
  say('moved')
 }
 const measure=list=>{const nodes=items(list),boxes=nodes.map(x=>x.getBoundingClientRect()),zone=list.closest('[data-sortable-zone]'),css=getComputedStyle(list),axis=axisOf(list);return{el:list,key:list.dataset.sortableKey??'',nodes,boxes,zone,area:(zone??list).getBoundingClientRect(),axis,disabled:zone?.hasAttribute('data-disabled')??false,gap:parseFloat(axis==='horizontal'?css.columnGap:css.rowGap)||0}}
 const create=(el,keyboard,event)=>{const all=lists().map(measure),from=all.find(x=>x.el===el.parentElement),rect=el.getBoundingClientRect(),index=from.nodes.indexOf(el);state.drag={color:getComputedStyle(el).color,element:el,id:el.dataset.sortableId,lists:all,rect,from:{list:from,index},to:{list:from,index},keyboard,started:false,x:event?.clientX??0,y:event?.clientY??0};return state.drag}
 const finish=async()=>{const d=state.drag;if(!d)return;if(!d.started){reset();return}say('dropped')
  if(d.copy&&!reduced()){const box=slot(d.to.list,d.to.index);try{await d.copy.animate([{transform:d.copy.style.transform||'none'},{transform:`translate(${box.left-d.rect.left}px,${box.top-d.rect.top}px)`}],{duration:260,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'}).finished}catch{}}
  if(state.drag!==d)return;state.focus=d.id;d.committing=true;if(d.from.list!==d.to.list||d.from.index!==d.to.index){try{await dotnet.invokeMethodAsync(state.options.method??'Move',d.id,d.to.list.key,d.to.index)}catch(error){console.error(error)}}if(state.drag===d)reset();state.restoreFocus()
 }
 const find=event=>{const el=event.target.closest('[data-sortable-id]');if(!el||el.parentElement?.dataset.sortableContent!==state.options.id||el.hasAttribute('data-disabled'))return null
  if(!event.target.closest('[data-sortable-handle]')&&(!el.hasAttribute('data-handle')||event.target.closest('input,select,textarea,a,button')))return null;return el}
 const down=event=>{if(event.button!==0||state.drag)return;const el=find(event);if(!el)return;const d=create(el,false,event);d.pointer=event.pointerId
  event.target.setPointerCapture?.(event.pointerId)
  if(event.pointerType==='touch')d.timer=setTimeout(start,180)
 }
 const pointermove=event=>{const d=state.drag;if(!d||d.keyboard||event.pointerId!==d.pointer)return;const dx=event.clientX-d.x,dy=event.clientY-d.y
  if(!d.started){if(event.pointerType==='touch'){if(Math.hypot(dx,dy)>6)state.cancel();return}if(Math.hypot(dx,dy)<4)return;start()}
  event.preventDefault();const single=d.lists.length===1,axis=single?d.from.list.axis:'mixed',bounds=(single?d.from.list.el:root).getBoundingClientRect()
  const x=axis==='vertical'?0:Math.max(bounds.left-d.rect.left,Math.min(bounds.right-d.rect.right,dx)),y=axis==='horizontal'?0:Math.max(bounds.top-d.rect.top,Math.min(bounds.bottom-d.rect.bottom,dy))
  d.copy.style.transform=`translate(${x}px,${y}px)`
  const list=d.lists.find(l=>!l.disabled&&event.clientX>=l.area.left&&event.clientX<=l.area.right&&event.clientY>=l.area.top&&event.clientY<=l.area.bottom)??d.to.list
  if(list===d.from.list){let best=d.to.list===list?d.to.index:d.from.index,distance=Infinity;list.boxes.forEach((box,i)=>{if(list.nodes[i].hasAttribute('data-disabled'))return;const c=center(box),px=list.axis==='vertical'?0:event.clientX-c.x,py=list.axis==='horizontal'?0:event.clientY-c.y,dist=px*px+py*py;if(dist<distance){distance=dist;best=i}});move(list,best);return}
  // Another list: insert before the first card whose center is past the pointer.
  const rtl=getComputedStyle(list.el).direction==='rtl',index=list.boxes.filter(box=>{const c=center(box);return list.axis==='horizontal'?(rtl?c.x>event.clientX:c.x<event.clientX):c.y<event.clientY}).length;move(list,index)
 }
 const up=event=>{if(state.drag&&!state.drag.keyboard&&state.drag.pointer===event.pointerId)void finish()}
 const key=event=>{const el=find(event);if(!el)return
  if(event.key==='Escape'&&state.drag){event.preventDefault();state.cancel();return}
  if(event.key===' '||event.key==='Enter'){event.preventDefault();if(state.drag?.keyboard)void finish();else if(!state.drag){create(el,true);start()}return}
  const d=state.drag;if(!d?.keyboard||!event.key.startsWith('Arrow'))return;event.preventDefault()
  const list=d.to.list,current=slot(list,d.to.index),here={left:current.left,top:current.top,width:d.rect.width,height:d.rect.height},horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',positive=event.key==='ArrowDown'||event.key==='ArrowRight',along=list.axis==='mixed'||(list.axis==='horizontal')===horizontal
  if(!along){
   // Across lists: the nearest list in that visual direction keeps the position.
   const from=center(here);let best=null,distance=Infinity;for(const other of d.lists){if(other===list||other.disabled)continue;const c=center(other.area),delta=horizontal?c.x-from.x:c.y-from.y;if((positive&&delta<=1)||(!positive&&delta>=-1))continue;const dist=Math.abs(delta);if(dist<distance){distance=dist;best=other}}
   if(best)move(best,Math.min(d.to.index,best.nodes.filter(x=>x!==d.element).length));return}
  if(list!==d.from.list){const count=list.nodes.length,rtl=horizontal&&getComputedStyle(list.el).direction==='rtl',forward=positive!==rtl;move(list,Math.max(0,Math.min(count,d.to.index+(forward?1:-1))));return}
  let best=d.to.index,distance=Infinity;list.boxes.forEach((box,i)=>{if(i===d.to.index||list.nodes[i].hasAttribute('data-disabled'))return;const dx=(box.left+box.width/2)-(current.left+current.width/2),dy=(box.top+box.height/2)-(current.top+current.height/2),delta=horizontal?dx:dy;if((positive&&delta<=1)||(!positive&&delta>=-1))return;const dist=(horizontal?Math.abs(dx)+Math.abs(dy)*3:Math.abs(dy)+Math.abs(dx)*3);if(dist<distance){distance=dist;best=i}});move(list,best)
 }
 const cancel=()=>state.cancel()
 // Items without touch-action:none would start a pan and cancel the drag; block it only once a hold has started one.
 const touchmove=event=>{if(state.drag?.started&&!state.drag.keyboard)event.preventDefault()}
 root.addEventListener('touchmove',touchmove,{passive:false});root.addEventListener('pointerdown',down);root.addEventListener('keydown',key);root.addEventListener('pointermove',pointermove,{passive:false});root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel)
 state.dispose=()=>{reset();root.removeEventListener('touchmove',touchmove);root.removeEventListener('pointerdown',down);root.removeEventListener('keydown',key);root.removeEventListener('pointermove',pointermove);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel)}
 state.root=root;instances.set(options.id,state)
}
export function dispose(id){const state=instances.get(id);if(!state)return;state.dispose();instances.delete(id)}
