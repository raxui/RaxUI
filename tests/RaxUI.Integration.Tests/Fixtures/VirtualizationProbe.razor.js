const states=new WeakMap()
export function sync(root,dotnet,mode){
 if(states.has(root))return
 let busy=false,pending=null,last='',disposed=false
 const send=async()=>{if(busy||!pending||disposed)return;busy=true;const next=pending;pending=null;try{await dotnet.invokeMethodAsync('Range',...next)}finally{busy=false;if(pending)void send()}}
 const range=()=>{const first=Math.max(0,Math.floor(root.scrollTop/40)-12),end=Math.min(10000,Math.ceil((root.scrollTop+root.clientHeight)/40)+12),key=first+':'+end;if(key===last)return;last=key;pending=[first,end];void send()}
 if(mode==='manual')root.addEventListener('scroll',range,{passive:true})
 root.probePing=async()=>{const started=performance.now();await dotnet.invokeMethodAsync('Ping');return performance.now()-started}
 const observer=new ResizeObserver(()=>{if(mode==='manual')range()});observer.observe(root)
 states.set(root,()=>{disposed=true;observer.disconnect();root.removeEventListener('scroll',range);delete root.probePing})
 if(mode==='manual')range()
}
export function dispose(root){states.get(root)?.();states.delete(root)}
