const states = new WeakMap()
export function init(root, receiver) {
  dispose(root)
  const media=matchMedia('(min-width:768px)'),controller=new AbortController()
  media.addEventListener('change',()=>receiver.invokeMethodAsync('MediaChanged',media.matches),{signal:controller.signal})
  states.set(root,controller);return media.matches
}
export function dispose(root) { states.get(root)?.abort();states.delete(root) }
