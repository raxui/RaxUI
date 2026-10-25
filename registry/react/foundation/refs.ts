"use client"

import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
export function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}

/** One callback ref that sets every ref it's given (callback or object). */
export function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) assignRef(ref, node)
  }
}

/**
 * `mergeRefs`, kept stable between renders. A new callback ref on every render
 * makes React detach and reattach it, which re-measures drag-and-drop nodes
 * and restarts observers.
 */
export function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs)
}
