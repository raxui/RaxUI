"use client"

// SheenUI tabs. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).

import * as TabsPrimitive from "@radix-ui/react-tabs"

import { useSheenTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import * as React from "react"

type PossibleRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined

/** Sets a ref of either kind: calls a callback ref, or fills an object ref. */
function assignRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node
}

/** One callback ref that sets every ref it's given (callback or object). */
function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) assignRef(ref, node)
  }
}

/**
 * `mergeRefs`, kept stable between renders. A new callback ref on every render
 * makes React detach and reattach it, which re-measures drag-and-drop nodes
 * and restarts observers.
 */
function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs)
}

type TabsMotion = "from-start" | "from-end"

const TabsMotionContext = React.createContext<TabsMotion | undefined>(undefined)

/** Triggers that belong to this Tabs root (ignores nested Tabs). */
function ownTriggers(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[role=tab][data-value]")).filter((tab) => tab.closest(".sheen-tabs") === root)
}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & { appearance?: import("@/lib/theme").SheenAppearance }>(
  ({ className, appearance, dir, value: valueProp, defaultValue, onValueChange, ...props }, ref) => {
    const rootRef = React.useRef<HTMLDivElement>(null)
    const composedRef = useMergedRef(ref, rootRef)

    const theme = useSheenTheme()
    const [pageDir, setPageDir] = React.useState<"ltr" | "rtl">()
    React.useLayoutEffect(() => { setPageDir(rootRef.current && getComputedStyle(rootRef.current).direction === "rtl" ? "rtl" : "ltr") }, [])

    // Radix runs controlled, so we always know the previous and next value.
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
    const value = valueProp ?? uncontrolledValue

    // Derive the direction of travel during render (works for clicks, keyboard
    // and external value changes), so the incoming panel mounts already knowing
    // which side to slide in from.
    const [previousValue, setPreviousValue] = React.useState(value)
    const [motion, setMotion] = React.useState<TabsMotion>()
    if (value !== previousValue) {
      setPreviousValue(value)
      const tabs = rootRef.current ? ownTriggers(rootRef.current).map((tab) => tab.dataset.value) : []
      const from = tabs.indexOf(previousValue)
      const to = tabs.indexOf(value)
      setMotion(from < 0 || to < 0 ? undefined : to > from ? "from-end" : "from-start")
    }

    return (
      <TabsMotionContext.Provider value={motion}>
        <TabsPrimitive.Root
          data-sheen-appearance={appearance}
          dir={dir ?? theme.direction ?? pageDir}
          ref={composedRef}
          className={cn("sheen-tabs", className)}
          value={value}
          onValueChange={(next) => {
            if (valueProp === undefined) setUncontrolledValue(next)
            onValueChange?.(next)
          }}
          {...props}
        />
      </TabsMotionContext.Provider>
    )
  },
)
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "segmented" | "underline" | "pills"
  }
>(({ className, variant = "segmented", children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null)
  const composedRef = useMergedRef(ref, listRef)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    let frame = 0

    const measure = () => {
      const active = Array.from(list.querySelectorAll<HTMLElement>("[role=tab][data-state=active]")).find(
        (tab) => tab.closest(".sheen-tabs-list") === list,
      )
      if (!active) {
        list.removeAttribute("data-ready")
        return
      }

      const place = () => {
        list.style.setProperty("--sheen-tabs-indicator-x", `${active.offsetLeft}px`)
        list.style.setProperty("--sheen-tabs-indicator-y", `${active.offsetTop}px`)
        list.style.setProperty("--sheen-tabs-indicator-width", `${active.offsetWidth}px`)
        list.style.setProperty("--sheen-tabs-indicator-height", `${active.offsetHeight}px`)
      }
      if (!list.hasAttribute("data-ready")) withoutTransition(list.querySelector(".sheen-tabs-indicator"), place)
      else place()

      // First placement is instant; glide from the next frame on. Checked separately from
      // data-ready: StrictMode runs this effect twice and the cleanup cancels the first frame.
      if (!list.hasAttribute("data-ready")) list.setAttribute("data-ready", "")
      if (!list.hasAttribute("data-animate") && !frame) frame = requestAnimationFrame(() => list.setAttribute("data-animate", ""))

      // Scrollable lists: keep the active tab in view without scrolling the page.
      if (list.scrollWidth > list.clientWidth) {
        const start = active.offsetLeft - 16
        const end = active.offsetLeft + active.offsetWidth + 16
        if (start < list.scrollLeft) list.scrollTo({ left: start, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
        else if (end > list.scrollLeft + list.clientWidth) list.scrollTo({ left: end - list.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
      }
    }

    measure()
    // Follows the active tab whether Tabs is controlled or not.
    const mutations = new MutationObserver(measure)
    mutations.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] })
    // Re-measure when fonts load, the layout reflows or labels change length.
    const resizes = new ResizeObserver(measure)
    resizes.observe(list)
    list.querySelectorAll("[role=tab]").forEach((tab) => resizes.observe(tab))

    return () => {
      mutations.disconnect()
      resizes.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <TabsPrimitive.List ref={composedRef} data-variant={variant} className={cn("sheen-tabs-list", className)} {...props}>
      <span className="sheen-tabs-indicator" aria-hidden="true" />
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} value={value} data-value={value} className={cn("sheen-tabs-trigger", className)} {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const motion = React.useContext(TabsMotionContext)
  return <TabsPrimitive.Content ref={ref} data-motion={motion} className={cn("sheen-tabs-content", className)} {...props} />
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

// First placement must commit before restoring the gliding transition.
function withoutTransition(el: HTMLElement | null, apply: () => void) {
  if (!el) return apply()
  el.style.transition = "none"
  apply()
  void el.getBoundingClientRect()
  el.style.transition = ""
}
