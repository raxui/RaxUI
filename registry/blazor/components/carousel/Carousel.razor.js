// Vendored target names follow Razor collocation; see ADR 020.
import './CarouselCounter.razor.js'
import Embla from './CarouselContent.razor.js'
import Autoplay from './CarouselPlayPause.razor.js'
import Fade from './CarouselItem.razor.js'
const instances=new Map()
export function sync(root,dotnet,options){
 if(!root?.isConnected)return
 let s=instances.get(options.id)
 if(!s){
 const viewport=root.querySelector('.rax-carousel-viewport'),track=viewport?.querySelector('.rax-carousel-container');if(!track)return
 s={root,viewport,track,dotnet,options,controller:new AbortController(),paused:false,reduced:matchMedia('(prefers-reduced-motion: reduce)'),slides:[],key:'',pendingNotify:false};instances.set(options.id,s)
 const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:s.controller.signal})
 const notify=()=>{if(!root.isConnected)return;const index=s.api.selectedScrollSnap(),count=s.api.scrollSnapList().length;const key=`${index}/${count}`;if(s.notified===key)return;s.notified=key;s.dotnet.invokeMethodAsync('Settled',index,count)}
 s.notify=notify
 listen(root,'click',e=>{
 if(e.target.closest('.rax-carousel')!==root)return
 const target=e.target.closest('button');if(!target||target.disabled)return
 if(target.hasAttribute('data-carousel-prev'))s.api.scrollPrev()
 else if(target.hasAttribute('data-carousel-next'))s.api.scrollNext()
 else if(target.hasAttribute('data-carousel-index'))s.api.scrollTo(Number(target.dataset.carouselIndex))
 else if(target.matches('.rax-carousel-playpause')){s.paused=!s.paused;const ap=s.api.plugins().autoplay;if(s.paused)ap?.stop();else ap?.play();paint(s)}
 })
 listen(root,'keydown',e=>{
 if(e.target.closest('.rax-carousel')!==root||e.target.closest('input,textarea,select,[contenteditable="true"]')||e.altKey||e.ctrlKey||e.metaKey)return
 const vertical=s.options.orientation==='vertical',rtl=getComputedStyle(root).direction==='rtl';const back=vertical?'ArrowUp':rtl?'ArrowRight':'ArrowLeft',forward=vertical?'ArrowDown':rtl?'ArrowLeft':'ArrowRight'
 if(e.key===back||e.key===forward){e.preventDefault();if(e.key===back)s.api.scrollPrev();else s.api.scrollNext()}
 })
 listen(s.reduced,'change',()=>configure(s,true))
 s.mutation=new MutationObserver(()=>configure(s));s.mutation.observe(track,{childList:true})
 s.direction=new MutationObserver(()=>configure(s));for(let el=root;el;el=el.parentElement)s.direction.observe(el,{attributes:true,attributeFilter:['dir','data-rax-direction']})
 }
 s.dotnet=dotnet;s.options=options;configure(s);paint(s)
}
function configure(s,force=false){
 const o=s.options,slides=[...s.track.children],direction=o.direction??getComputedStyle(s.root).direction,key=JSON.stringify([o.orientation,o.effect,o.loop,o.align,o.autoplay,o.duration,o.startIndex,direction,s.reduced.matches])
 if(!force&&key===s.key&&slides.length===s.slides.length&&slides.every((el,i)=>el===s.slides[i]))return
 const selected=s.api?.selectedScrollSnap()??o.startIndex;s.slides=slides;s.key=key
 const opts={axis:o.orientation==='vertical'?'y':'x',direction,loop:o.loop,align:o.align,duration:s.reduced.matches?0:o.duration,startIndex:selected},plugins=[]
 if(o.effect==='fade')plugins.push(Fade())
 if(o.autoplay>0&&!s.reduced.matches)plugins.push(Autoplay({delay:o.autoplay,stopOnInteraction:false,stopOnMouseEnter:true,stopOnFocusIn:true,playOnInit:!s.paused}))
 if(s.api)s.api.reInit(opts,plugins)
 else{
 s.api=Embla(s.viewport,opts,plugins)
 s.api.on('select',()=>{paint(s);if(s.reduced.matches||s.options.duration===0)s.notify()}).on('scroll',()=>{if(s.options.effect==='scale')paintScale(s)}).on('settle',s.notify).on('reInit',()=>{paint(s);s.notify()})
 s.api.on('autoplay:play',()=>{if(s.paused||s.reduced.matches)s.api.plugins().autoplay?.stop();paint(s)}).on('autoplay:stop',()=>paint(s)).on('autoplay:timerset',()=>paint(s,true)).on('autoplay:timerstopped',()=>paint(s))
 }
 if(s.paused)s.api.plugins().autoplay?.stop();paint(s,true);s.notify()
}
function paintScale(s){
 const active=s.api.selectedScrollSnap();s.slides.forEach((slide,i)=>{const node=slide.firstElementChild;if(!node)return;if(s.options.effect!=='scale'){node.style.removeProperty('transform');node.style.removeProperty('opacity');return}const difference=Math.abs(i-active);node.style.transform=`scale(${difference===0?1:.9})`;node.style.opacity=difference===0?'1':'.55'})
}
function paint(s,restart=false){
 if(!s.api||!s.root.isConnected)return
 const {api,root}=s,o=s.options,selected=api.selectedScrollSnap(),count=api.scrollSnapList().length,ap=api.plugins().autoplay,playing=!!ap?.isPlaying()&&!s.paused&&!s.reduced.matches
 root.dataset.selected=selected;root.dataset.playing=String(playing)
 root.querySelectorAll('[data-carousel-prev]').forEach(e=>e.disabled=!api.canScrollPrev());root.querySelectorAll('[data-carousel-next]').forEach(e=>e.disabled=!api.canScrollNext())
 root.querySelectorAll('[data-carousel-index]').forEach(e=>{const active=Number(e.dataset.carouselIndex)===selected;e.toggleAttribute('data-active',active);if(active)e.setAttribute('aria-current','true');else e.removeAttribute('aria-current');e.disabled=false;const progress=e.querySelector('.rax-carousel-dot-progress');if(progress){progress.style.display=active&&playing?'block':'none';if(restart&&active&&playing){progress.style.animation='none';void progress.offsetWidth;progress.style.animation='';progress.style.animationDuration=`${ap.timeUntilNext()??o.autoplay}ms`}}})
 root.querySelectorAll('.rax-carousel-dots').forEach(e=>e.style.display=count<2?'none':'')
 root.querySelectorAll('.rax-carousel-counter').forEach(e=>e.textContent=`${selected+1} / ${count}`)
 s.slides.forEach((e,i)=>{e.toggleAttribute('data-active',i===selected);e.setAttribute('aria-label',o.labels.slideOf.replace('{0}',i+1).replace('{1}',s.slides.length))})
 s.track.setAttribute('aria-live',playing?'off':'polite')
 root.querySelectorAll('.rax-carousel-playpause').forEach(e=>{e.disabled=!ap;e.setAttribute('aria-label',playing?o.labels.pause:o.labels.play);e.setAttribute('aria-pressed',String(!playing));e.querySelector('path').setAttribute('d',playing?'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z':'M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z')})
 root.querySelectorAll('.rax-carousel-thumbs').forEach(strip=>{const thumb=strip.children[selected];if(thumb){const a=strip.getBoundingClientRect(),b=thumb.getBoundingClientRect();strip.scrollBy({left:b.left+b.width/2-a.left-a.width/2,behavior:s.reduced.matches?'auto':'smooth'})}})
 paintScale(s)
}
export function goTo(id,index){const s=instances.get(id);if(s?.root.isConnected)s.api.scrollTo(index)}
export function dispose(id){const s=instances.get(id);if(s){s.controller.abort();s.mutation.disconnect();s.direction.disconnect();s.api.destroy();instances.delete(id)}}
