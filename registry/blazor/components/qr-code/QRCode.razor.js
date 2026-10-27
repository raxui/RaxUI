const instances=new Map()
async function raster(svg,pixels){
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}))
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=pixels;const context=canvas.getContext('2d');context.drawImage(image,0,0,pixels,pixels);return canvas}finally{URL.revokeObjectURL(url)}
}
export async function sync(root,options){
 if(!root?.isConnected)return
 let s=instances.get(options.id)
 if(!s){s={root,options,controller:new AbortController(),revision:0};instances.set(options.id,s)
 root.addEventListener('click',async e=>{const button=e.target.closest('[data-qr-download]'),svg=root.querySelector('[data-qr-svg] svg');if(!button||!svg||button.disabled)return
 const format=button.dataset.qrDownload;let href
 if(format==='png')href=(await raster(svg,s.options.resolution)).toDataURL('image/png')
 else href=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}))
 if(!root.isConnected){if(href.startsWith('blob:'))URL.revokeObjectURL(href);return}
 const link=document.createElement('a');link.download=`${s.options.filename}.${format}`;link.href=href;link.click();if(href.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(href),1000)
 },{signal:s.controller.signal})}
 s.options=options;const revision=++s.revision,svg=root.querySelector('[data-qr-svg] svg'),fallback=root.querySelector('[data-qr-svg]')
 if(!svg)return
 if(options.format==='svg'){fallback.style.display='';return}
 const canvas=await raster(svg,Math.round(Number(svg.getAttribute('width'))*(devicePixelRatio||1)))
 if(!root.isConnected||revision!==s.revision)return
 if(options.format==='canvas'){const target=root.querySelector('[data-qr-canvas]');target.width=canvas.width;target.height=canvas.height;target.getContext('2d').drawImage(canvas,0,0);target.style.display='block'}
 else{const target=root.querySelector('[data-qr-image]');target.src=canvas.toDataURL('image/png');await target.decode();if(revision!==s.revision)return;target.style.display='block'}
 fallback.style.display='none'
}
export function dispose(id){const s=instances.get(id);if(s){s.revision++;s.controller.abort();instances.delete(id)}}
