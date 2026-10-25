"use client"

import * as React from "react"

export type Direction = "ltr" | "rtl"

/**
 * The reading direction an element is laid out in: from `dir` on it or an
 * ancestor, `dir="auto"`, or CSS. Pass the parent when the element carries a
 * `dir` the component set itself.
 */
export function getDirection(element: EventTarget | null | undefined): Direction {
  return element instanceof Element && getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr"
}

/**
 * Radix roots render no element, and their content is portalled to <body>, so
 * neither can see the page direction. A trigger (or anchor) that renders
 * where the component lives calls this with the root's setter; attach the
 * returned ref to it.
 */
export function useReportDirection<T extends Element>(report: ((dir: Direction) => void) | null | undefined) {
  const ref = React.useRef<T | null>(null)
  React.useLayoutEffect(() => {
    if (report && ref.current) report(getDirection(ref.current))
  }, [report])
  return ref
}
