const instances=new WeakMap(),owners=new Map()
export function sync(root,generation,retained,released,id){
 if(!root?.isConnected)return

 let state=instances.get(root)
 if(!state){
  const controller=new AbortController();state={root,controller,urls:new Set(),files:new Map(),generation};instances.set(root,state);owners.set(id,state)
  const zone=root.querySelector('.rax-queue-upload-zone')
  const current=()=>root.querySelector(`[data-upload-batch="${state.generation}"] input`)
  const disabled=()=>root.hasAttribute('data-disabled')
  const feed=files=>{if(disabled()||!files.length)return;const input=current(),data=new DataTransfer();for(const file of files)data.items.add(file);input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}))}
  const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal})
  listen(zone,'keydown',e=>{if(!disabled()&&(e.key==='Enter'||e.key===' ')){e.preventDefault();current().click()}})
  listen(zone,'dragover',e=>{e.preventDefault();if(!disabled())zone.dataset.drag='accept'})
  listen(zone,'dragleave',e=>{if(!zone.contains(e.relatedTarget))delete zone.dataset.drag})
  listen(zone,'drop',e=>{e.preventDefault();delete zone.dataset.drag;feed([...e.dataTransfer.files])})
  listen(zone,'paste',e=>{const files=[...e.clipboardData.files];if(files.length){e.preventDefault();feed(files)}})
 }
 state.generation=generation
 for(const url of released){URL.revokeObjectURL(url);state.urls.delete(url)}
 for(const [batch,files] of state.files){const input=root.querySelector(`[data-upload-batch="${batch}"] input`);if(!input){state.files.delete(batch);continue}const data=new DataTransfer();files.forEach((file,index)=>{if(retained.some(x=>x.batch===batch&&x.index===index))data.items.add(file)});input.files=data.files}
}
export function capture(root,batch){
 const state=instances.get(root);if(!root?.isConnected||!state)return [];const input=root.querySelector(`[data-upload-batch="${batch}"] input`),files=[...input.files];state.files.set(batch,files)
 return files.map(file=>{if(!file.type.startsWith('image/'))return null;const url=URL.createObjectURL(file);state.urls.add(url);return url})
}
export function dispose(id){const state=owners.get(id);if(!state)return;state.controller.abort();for(const url of state.urls)URL.revokeObjectURL(url);state.files.clear();instances.delete(state.root);owners.delete(id)}
