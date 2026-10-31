const states=new WeakMap(),memory=new Map()
export function sync(root,dotnet,saveId){
 const signature=[root.dataset.orientation,saveId,...[...root.children].map(x=>[x.id,x.dataset.default,x.dataset.min,x.dataset.max,x.dataset.collapsible,x.dataset.collapsed].join(':'))].join('|')
 if(states.get(root)?.signature===signature){states.get(root).apply();return}dispose(root)
 const panels=[...root.children].filter(x=>x.hasAttribute('data-resizable-panel')),handles=[...root.children].filter(x=>x.hasAttribute('data-resizable-handle'))
 if(!panels.length)return
 if(panels.some(p=>!p.id)||new Set(panels.map(p=>p.id)).size!==panels.length)throw new Error('Resizable panel IDs must be unique and nonempty.')
 if(handles.length!==panels.length-1)throw new Error('Resizable requires one handle between each pair of panels.')
 if(saveId&&panels.some(x=>!x.hasAttribute('data-explicit-id')))throw new Error('Persisted resizable panels require stable explicit IDs.')
 const vertical=()=>root.dataset.orientation==='vertical',extent=()=>Math.max(1,(vertical()?root.clientHeight:root.clientWidth)-handles.length)
 const percent=value=>{const number=Number.parseFloat(value);if(!Number.isFinite(number)||number<0)throw new Error('Invalid panel size.');return value.endsWith('px')?number/extent()*100:value.endsWith('rem')?number*parseFloat(getComputedStyle(document.documentElement).fontSize)/extent()*100:number}
 let sizes=[],drag=null,frame=0
 const bounds=()=>panels.map(panel=>({min:percent(panel.dataset.min),max:percent(panel.dataset.max),collapsed:percent(panel.dataset.collapsed),collapsible:panel.hasAttribute('data-collapsible')}))
 const valid=values=>{const limits=bounds();return values.length===panels.length&&values.every((n,i)=>Number.isFinite(n)&&n>=0&&n<=limits[i].max+.01&&(n>=limits[i].min-.01||(limits[i].collapsible&&Math.abs(n-limits[i].collapsed)<.01)))&&Math.abs(values.reduce((a,b)=>a+b,0)-100)<.1}
 const defaults=()=>{const values=panels.map(p=>percent(p.dataset.default)),sum=values.reduce((a,b)=>a+b,0);if(sum<=0)throw new Error('Panel sizes must have a positive total.');const result=values.map(n=>n/sum*100),limits=bounds()
  for(let pass=0;pass<panels.length*3;pass++){
   for(let i=0;i<result.length;i++)result[i]=Math.max(limits[i].min,Math.min(limits[i].max,result[i]))
   const delta=100-result.reduce((a,b)=>a+b,0);if(Math.abs(delta)<.001)break
   const available=result.map((n,i)=>i).filter(i=>delta>0?result[i]<limits[i].max-.001:result[i]>limits[i].min+.001)
   if(!available.length)break;for(const i of available)result[i]+=delta/available.length
  }
  return result}
 const read=()=>{if(!saveId)return null;let raw;try{raw=localStorage.getItem('rax-resizable:'+saveId)??memory.get(saveId)}catch{raw=memory.get(saveId)}try{const data=JSON.parse(raw);if(!data||Array.isArray(data)||Object.keys(data).length!==panels.length)return null;const values=panels.map(p=>data[p.id]);return valid(values)?values:null}catch{return null}}
 const layout=()=>Object.fromEntries(panels.map((p,i)=>[p.id,Number(sizes[i].toFixed(4))]))
 const apply=()=>{panels.forEach((p,i)=>{p.style.flex=`${sizes[i]} 1 0%`;p.style.minWidth='0';p.style.minHeight='0';p.style.visibility=sizes[i]<.01?'hidden':'';p.dataset.collapsedState=sizes[i]<.01?'true':'false'})
  for(const output of root.querySelectorAll('[data-resizable-size]')){if(output.closest('[data-resizable-group]')!==root)continue;const index=panels.findIndex(p=>p.id===output.dataset.resizableSize);if(index<0)continue;const value=Math.round(sizes[index])+'%';if(output.firstChild?.nodeType===Node.TEXT_NODE)output.firstChild.nodeValue=value;else output.textContent=value}
  const limits=bounds();handles.forEach((h,i)=>{h.setAttribute('aria-orientation',vertical()?'horizontal':'vertical');h.setAttribute('aria-controls',panels[i].id);h.setAttribute('aria-valuenow',String(Math.round(sizes[i])));h.setAttribute('aria-valuemin',String(Math.round(limits[i].collapsible?limits[i].collapsed:limits[i].min)));h.setAttribute('aria-valuemax',String(Math.round(Math.min(limits[i].max,sizes[i]+sizes[i+1]-(limits[i+1].collapsible?limits[i+1].collapsed:limits[i+1].min)))));h.tabIndex=h.hasAttribute('data-disabled')?-1:0})
 }
 const commit=()=>{const values=layout();if(saveId){const raw=JSON.stringify(values);memory.set(saveId,raw);try{localStorage.setItem('rax-resizable:'+saveId,raw)}catch{}}void dotnet.invokeMethodAsync('Changed',values).catch(console.error)}
 const adjust=(index,value)=>{const limits=bounds(),a=limits[index],b=limits[index+1],sum=sizes[index]+sizes[index+1]
  const low=Math.max(a.collapsible?a.collapsed:a.min,sum-b.max),high=Math.min(a.max,sum-(b.collapsible?b.collapsed:b.min))
  value=Math.max(low,Math.min(high,value))
  if(a.collapsible&&value<a.min)value=value<(a.min+a.collapsed)/2?a.collapsed:a.min
  if(b.collapsible&&sum-value<b.min)value=sum-((sum-value)<(b.min+b.collapsed)/2?b.collapsed:b.min)
  if(value<low-.01||value>high+.01)return;sizes[index]=value;sizes[index+1]=sum-value;apply()
 }
 sizes=read()??defaults();if(!valid(sizes))throw new Error('Initial resizable layout violates panel constraints.');apply()
 const indexFor=event=>{const h=event.target.closest('[data-resizable-handle]');return h&&h.parentElement===root&&!h.hasAttribute('data-disabled')?handles.indexOf(h):-1}
 const down=e=>{const index=indexFor(e);if(e.button!==0||index<0)return;e.preventDefault();e.target.setPointerCapture?.(e.pointerId);drag={index,pointer:e.pointerId,start:vertical()?e.clientY:e.clientX,size:sizes[index],original:sizes.slice()};handles[index].dataset.separator='active'}
 const move=e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const delta=(vertical()?e.clientY:e.clientX)-drag.start,sign=!vertical()&&getComputedStyle(root).direction==='rtl'?-1:1;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(drag)adjust(drag.index,drag.size+delta/extent()*100*sign)})}
 const end=e=>{if(!drag||drag.pointer!==e.pointerId)return;cancelAnimationFrame(frame);const d=drag;const delta=(vertical()?e.clientY:e.clientX)-d.start,sign=!vertical()&&getComputedStyle(root).direction==='rtl'?-1:1;adjust(d.index,d.size+delta/extent()*100*sign);handles[d.index].dataset.separator='';drag=null;commit()}
 const cancel=()=>{if(!drag)return;cancelAnimationFrame(frame);sizes=drag.original;handles[drag.index].dataset.separator='';drag=null;apply()}
 const key=e=>{const i=indexFor(e);if(e.key==='Escape'&&drag){e.preventDefault();cancel();return}if(i<0)return;let value=sizes[i],sign=!vertical()&&getComputedStyle(root).direction==='rtl'?-1:1;const step=e.shiftKey?10:2
  if(e.key==='Home')value=0;else if(e.key==='End')value=100;else if(e.key===(vertical()?'ArrowUp':'ArrowLeft'))value-=step*sign;else if(e.key===(vertical()?'ArrowDown':'ArrowRight'))value+=step*sign;else return;e.preventDefault();adjust(i,value);commit()
 }
 const reset=e=>{if(indexFor(e)<0)return;const values=defaults();if(valid(values)){sizes=values;apply();commit()}}
 const hover=e=>{const i=indexFor(e);if(i>=0&&!drag)handles[i].dataset.separator=e.type==='pointerover'?'hover':''}
 root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move,{passive:false});root.addEventListener('pointerup',end);root.addEventListener('pointercancel',cancel);root.addEventListener('keydown',key);root.addEventListener('dblclick',reset);root.addEventListener('pointerover',hover);root.addEventListener('pointerout',hover)
 const observer=new ResizeObserver(apply);observer.observe(root)
 states.set(root,{signature,apply,dispose(){cancel();cancelAnimationFrame(frame);observer.disconnect();root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',end);root.removeEventListener('pointercancel',cancel);root.removeEventListener('keydown',key);root.removeEventListener('dblclick',reset);root.removeEventListener('pointerover',hover);root.removeEventListener('pointerout',hover)}})
}
export function dispose(root){states.get(root)?.dispose();states.delete(root)}
