const states=new WeakMap()
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches
export function sync(root,dotnet,options){
 if(states.has(root)){const s=states.get(root);s.options=options;if(s.drag){if(s.drag.committing)s.reset();else s.cancel();}s.restoreFocus();return}
 const content=root.querySelector('[data-sortable-content]'),live=root.querySelector('[data-sortable-live]')
 const items=()=>[...content.children].filter(el=>el.hasAttribute('data-sortable-id'))
 const state={options,drag:null,focus:null,restoreFocus(){if(!state.focus)return;const item=items().find(x=>x.dataset.sortableId===state.focus);(item?.querySelector('[data-sortable-handle]')??item)?.focus({preventScroll:true});state.focus=null}}
 const say=(kind,index)=>{const d=state.drag;if(!d)return;live.textContent=state.options[kind].replaceAll('{item}',state.options.labels[d.id]??d.id).replaceAll('{position}',String(index+1)).replaceAll('{total}',String(d.nodes.length))}
 const reset=()=>{const d=state.drag;if(!d)return;clearTimeout(d.timer);d.copy?.remove();for(const el of d.nodes){el.style.removeProperty('transform');el.style.removeProperty('transition');el.removeAttribute('data-placeholder');el.removeAttribute('data-dragging')}state.drag=null}
 state.reset=reset
 state.cancel=()=>{if(state.drag?.started)say('cancelled',state.drag.from);reset()}
 const start=()=>{const d=state.drag;if(!d||d.started)return;d.started=true;if(d.keyboard){d.element.dataset.dragging='';say('grabbed',d.from);return}d.element.dataset.placeholder='';d.copy=d.element.cloneNode(true);d.copy.removeAttribute('id');d.copy.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));d.copy.removeAttribute('data-placeholder');d.copy.dataset.overlay='';d.copy.setAttribute('aria-hidden','true');d.copy.inert=true
 Object.assign(d.copy.style,{position:'fixed',top:d.rect.top+'px',left:d.rect.left+'px',width:d.rect.width+'px',height:d.rect.height+'px',margin:'0',zIndex:'2000',pointerEvents:'none',boxSizing:'border-box'});root.append(d.copy);say('grabbed',d.from)}
 const move=index=>{const d=state.drag;if(!d||index===d.to||d.nodes[index]?.hasAttribute('data-disabled'))return;d.to=index
  const order=d.nodes.slice();order.splice(d.from,1);order.splice(index,0,d.element)
  for(let pos=0;pos<order.length;pos++){const el=order[pos];if(el===d.element)continue;const old=d.boxes[d.nodes.indexOf(el)],next=d.boxes[pos];el.style.transition=reduced()?'none':'transform 320ms cubic-bezier(0.22,1,0.36,1)';el.style.transform=`translate(${next.left-old.left}px,${next.top-old.top}px)`}
  if(d.keyboard){const box=d.boxes[index];d.element.style.transform=`translate(${box.left-d.rect.left}px,${box.top-d.rect.top}px)`}
  say('moved',index)
 }
 const create=(el,keyboard,event)=>{const nodes=items(),rect=el.getBoundingClientRect();state.drag={element:el,id:el.dataset.sortableId,nodes,boxes:nodes.map(x=>x.getBoundingClientRect()),rect,from:nodes.indexOf(el),to:nodes.indexOf(el),keyboard,started:false,x:event?.clientX??0,y:event?.clientY??0};return state.drag}
 const finish=async()=>{const d=state.drag;if(!d)return;if(!d.started){reset();return}say('dropped',d.to)
  if(d.copy&&!reduced()){const box=d.boxes[d.to];try{await d.copy.animate([{transform:d.copy.style.transform||'none'},{transform:`translate(${box.left-d.rect.left}px,${box.top-d.rect.top}px)`}],{duration:260,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'}).finished}catch{}}
  if(state.drag!==d)return;state.focus=d.id;d.committing=true;if(d.from!==d.to){try{await dotnet.invokeMethodAsync('Move',d.id,d.nodes[d.to].dataset.sortableId)}catch(error){console.error(error)}}if(state.drag===d)reset();state.restoreFocus()
 }
 const find=event=>{const el=event.target.closest('[data-sortable-id]');if(!el||el.parentElement!==content||el.hasAttribute('data-disabled'))return null
  if(!event.target.closest('[data-sortable-handle]')&&(!el.hasAttribute('data-handle')||event.target.closest('input,select,textarea,a,button')))return null;return el}
 const down=event=>{if(event.button!==0||state.drag)return;const el=find(event);if(!el)return;const d=create(el,false,event);d.pointer=event.pointerId
  event.target.setPointerCapture?.(event.pointerId)
  if(event.pointerType==='touch')d.timer=setTimeout(start,180)
 }
 const pointermove=event=>{const d=state.drag;if(!d||d.keyboard||event.pointerId!==d.pointer)return;const dx=event.clientX-d.x,dy=event.clientY-d.y
  if(!d.started){if(event.pointerType==='touch'){if(Math.hypot(dx,dy)>6)state.cancel();return}if(Math.hypot(dx,dy)<4)return;start()}
  event.preventDefault();const axis=root.dataset.orientation,container=content.getBoundingClientRect()
  const x=axis==='vertical'?0:Math.max(container.left-d.rect.left,Math.min(container.right-d.rect.right,dx)),y=axis==='horizontal'?0:Math.max(container.top-d.rect.top,Math.min(container.bottom-d.rect.bottom,dy))
  d.copy.style.transform=`translate(${x}px,${y}px)`
  let best=d.to,distance=Infinity;d.boxes.forEach((box,i)=>{if(d.nodes[i].hasAttribute('data-disabled'))return;const px=axis==='vertical'?0:event.clientX-(box.left+box.width/2),py=axis==='horizontal'?0:event.clientY-(box.top+box.height/2),dist=px*px+py*py;if(dist<distance){distance=dist;best=i}});move(best)
 }
 const up=event=>{if(state.drag&&!state.drag.keyboard&&state.drag.pointer===event.pointerId)void finish()}
 const key=event=>{const el=find(event);if(!el)return
  if(event.key==='Escape'&&state.drag){event.preventDefault();state.cancel();return}
  if(event.key===' '||event.key==='Enter'){event.preventDefault();if(state.drag?.keyboard)void finish();else if(!state.drag){create(el,true);start()}return}
  const d=state.drag;if(!d?.keyboard||!event.key.startsWith('Arrow'))return;event.preventDefault()
  const current=d.boxes[d.to],horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',positive=event.key==='ArrowDown'||event.key==='ArrowRight'
  if((root.dataset.orientation==='vertical'&&horizontal)||(root.dataset.orientation==='horizontal'&&!horizontal))return
  let best=d.to,distance=Infinity;d.boxes.forEach((box,i)=>{if(i===d.to||d.nodes[i].hasAttribute('data-disabled'))return;const dx=(box.left+box.width/2)-(current.left+current.width/2),dy=(box.top+box.height/2)-(current.top+current.height/2),delta=horizontal?dx:dy;if((positive&&delta<=1)||(!positive&&delta>=-1))return;const dist=(horizontal?Math.abs(dx)+Math.abs(dy)*3:Math.abs(dy)+Math.abs(dx)*3);if(dist<distance){distance=dist;best=i}});move(best)
 }
 const cancel=()=>state.cancel()
 root.addEventListener('pointerdown',down);root.addEventListener('keydown',key);root.addEventListener('pointermove',pointermove,{passive:false});root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel)
 state.dispose=()=>{reset();root.removeEventListener('pointerdown',down);root.removeEventListener('keydown',key);root.removeEventListener('pointermove',pointermove);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel)}
 states.set(root,state)
}
export function dispose(root){states.get(root)?.dispose();states.delete(root)}
