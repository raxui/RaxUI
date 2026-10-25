"use client"

import { useLayoutEffect, useRef } from "react"

/** One sliding highlight follows the list's existing pointer/keyboard active state. */
export function ChoiceHighlight() {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const highlight = ref.current
    const list = highlight?.parentElement
    if (!highlight || !list) return
    let observed: HTMLElement | null = null
    const update = () => {
      const active = list.querySelector<HTMLElement>('.sheen-autocomplete-option[data-highlighted]:not([data-disabled]), .sheen-select-item[data-highlighted]:not([data-disabled]), .sheen-choice-option[data-active]:not([aria-disabled="true"])')
      if (active !== observed) {
        if (observed) resize?.unobserve(observed)
        if (active) resize?.observe(active)
        observed = active
      }
      highlight.hidden = !active
      if (!active) return
      let x = 0, y = 0
      for (let node: HTMLElement | null = active; node && node !== list; node = node.offsetParent as HTMLElement | null) {
        x += node.offsetLeft
        y += node.offsetTop
      }
      highlight.style.transform = `translate(${x}px, ${y}px)`
      highlight.style.width = `${active.offsetWidth}px`
      highlight.style.height = `${active.offsetHeight}px`
    }
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    const mutations = new MutationObserver(update)
    resize?.observe(list)
    mutations.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-active", "data-highlighted", "data-disabled", "aria-disabled"] })
    update()
    return () => { resize?.disconnect(); mutations.disconnect() }
  }, [])
  return <span ref={ref} className="sheen-choice-highlight" aria-hidden="true" hidden />
}
