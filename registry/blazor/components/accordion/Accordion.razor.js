const instances=new WeakMap()
export function sync(root,dotnet,values){
 if(!root?.isConnected)return

 let state=instances.get(root)
 const items=()=>[...root.querySelectorAll('details')].filter(e=>e.closest('.rax-accordion')===root)
 const paint=()=>{for(const item of items())item.querySelector('summary').dataset.state=item.open?'open':'closed'}
 if(!state){
  const controller=new AbortController();state={controller,dotnet,values,last:null};instances.set(root,state)
  root.addEventListener('click',e=>{if(e.target.closest('summary[aria-disabled="true"]'))e.preventDefault()},{signal:controller.signal})
  root.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;const summary=e.target.closest('summary');if(!summary||summary.closest('.rax-accordion')!==root)return;if(summary.hasAttribute('data-disabled')){e.preventDefault();return}const triggers=items().map(x=>x.querySelector('summary')).filter(x=>!x.hasAttribute('data-disabled'));const i=triggers.indexOf(summary);let next;if(e.key==='Home')next=0;else if(e.key==='End')next=triggers.length-1;else if(e.key==='ArrowDown')next=(i+1)%triggers.length;else if(e.key==='ArrowUp')next=(i+triggers.length-1)%triggers.length;if(next!==undefined){e.preventDefault();triggers[next]?.focus()}},{signal:controller.signal})
  root.addEventListener('toggle',()=>{paint();if(state.values===null)return;const open=items().filter(x=>x.open).map(x=>x.dataset.value);const key=JSON.stringify(open);if(key===state.last)return;state.last=key;void state.dotnet.invokeMethodAsync('SetValues',open).catch(console.error)},{capture:true,signal:controller.signal})
 }
 state.dotnet=dotnet;state.values=values
 if(values!==null){state.last=JSON.stringify(values);for(const item of items())item.open=values.includes(item.dataset.value)}
 paint()
}
export function dispose(root){instances.get(root)?.controller.abort();instances.delete(root)}
