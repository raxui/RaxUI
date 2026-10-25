import * as React from "react"

/** Keep hidden panels out of the tab order in React 18 and 19. */
export const inert = (on: boolean) => on ? ({ inert: Number.parseInt(React.version) >= 19 ? true : "" } as unknown as React.HTMLAttributes<HTMLElement>) : {}
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** First placement is instant; subsequent highlight positions can glide. */
export function withoutTransition(element: HTMLElement | null | undefined, apply: () => void) {
  if (!element) return apply()
  element.style.transition = "none"
  apply()
  void element.getBoundingClientRect()
  element.style.transition = ""
}
