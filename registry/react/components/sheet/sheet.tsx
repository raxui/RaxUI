"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"

import { useRaxPortalContainer, useRaxTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
function assignRef<T>(ref: React.ForwardedRef<T>, node: T | null) { if (typeof ref === "function") ref(node); else if (ref) ref.current = node }


type SheetSide = "top" | "start" | "bottom" | "end"

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

/** Radix Dialog root, run controlled so SheetContent can close itself after a drag. */
function Sheet({ open: openProp, defaultOpen = false, onOpenChange, ...props }: SheetPrimitive.DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      <SheetPrimitive.Root open={open} onOpenChange={setOpen} {...props} />
    </SheetContext.Provider>
  )
}

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

function SheetPortal(props: React.ComponentProps<typeof SheetPrimitive.Portal>) { return <SheetPrimitive.Portal container={useRaxPortalContainer()} {...props} /> }

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => <SheetPrimitive.Overlay ref={ref} className={cn("rax-sheet-overlay", className)} {...props} />)
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

/** Elements a drag must not start from (they need their own pointer gestures). */
const NO_DRAG = "input, textarea, select, button, a, label, [contenteditable], [data-sheet-no-drag], .form-range"

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: SheetSide
  /** Drag toward the edge to dismiss. */
  draggable?: boolean
  showCloseButton?: boolean
  closeLabel?: string
  /** Grab handle at the top. Defaults to true for bottom sheets. */
  showHandle?: boolean
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  (
    {
      side: logicalSide = "end",
      draggable = true,
      showCloseButton = true,
      closeLabel = "Close",
      showHandle = logicalSide === "bottom",
      className,
      children,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      ...props
    },
    forwardedRef,
  ) => {
    const direction = useRaxTheme().direction
    const side = logicalSide === "start" ? (direction === "rtl" ? "right" : "left") : logicalSide === "end" ? (direction === "rtl" ? "left" : "right") : logicalSide
    const sheet = React.useContext(SheetContext)
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const drag = React.useRef<{
      pointerId: number
      start: number
      last: number
      lastTime: number
      velocity: number
      active: boolean
    } | null>(null)

    const axis = side === "left" || side === "right" ? "x" : "y"
    const sign = side === "right" || side === "bottom" ? 1 : -1 // direction that dismisses

    // ---- Drag to dismiss -----------------------------------------------------
    const setOffset = (offset: number) => {
      const el = contentRef.current
      if (!el) return
      el.style.setProperty(axis === "x" ? "--rax-sheet-drag-x" : "--rax-sheet-drag-y", `${offset * sign}px`)
      const size = axis === "x" ? el.offsetWidth : el.offsetHeight
      // Radix portals the overlay right before the content.
      const overlay = el.previousElementSibling as HTMLElement | null
      if (overlay?.classList.contains("rax-sheet-overlay")) overlay.style.opacity = String(1 - Math.min(1, Math.max(0, offset / size)))
    }

    const position = (event: React.PointerEvent) => (axis === "x" ? event.clientX : event.clientY)

    const isInsideScrolledArea = (target: HTMLElement) => {
      for (let el: HTMLElement | null = target; el && el !== contentRef.current; el = el.parentElement) {
        if (el.scrollTop > 0 || el.scrollLeft !== 0) return true
      }
      return false
    }

    const endDrag = (dismiss: boolean) => {
      contentRef.current?.removeAttribute("data-dragging")
      if (dismiss)
        sheet?.setOpen(false) // the exit animation starts from the current offset
      else setOffset(0) // the CSS transition springs it back
    }

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={(node) => {
            contentRef.current = node
            assignRef(forwardedRef, node)
          }}
          data-side={side}
          className={cn("rax-sheet-content", className)}
          onPointerDown={(event) => {
            onPointerDown?.(event)
            const target = event.target as HTMLElement
            if (!draggable || event.button !== 0 || target.closest(NO_DRAG) || isInsideScrolledArea(target)) return
            const start = position(event)
            drag.current = { pointerId: event.pointerId, start, last: start, lastTime: event.timeStamp, velocity: 0, active: false }
          }}
          onPointerMove={(event) => {
            onPointerMove?.(event)
            const state = drag.current
            if (!state || event.pointerId !== state.pointerId) return
            const delta = (position(event) - state.start) * sign // > 0 means toward the edge

            if (!state.active) {
              if (Math.abs(delta) < 6) return
              if (delta < 0) {
                drag.current = null // moving inward: leave it to scrolling / selection
                return
              }
              state.active = true
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                // pointer already released — the drag still works without capture
              }
              event.currentTarget.setAttribute("data-dragging", "")
            }

            const elapsed = Math.max(1, event.timeStamp - state.lastTime)
            state.velocity = ((position(event) - state.last) * sign) / elapsed
            state.last = position(event)
            state.lastTime = event.timeStamp
            // Rubber-band when pulled past the resting position.
            setOffset(delta > 0 ? delta : delta * 0.15)
          }}
          onPointerUp={(event) => {
            onPointerUp?.(event)
            const state = drag.current
            drag.current = null
            if (!state?.active) return
            const el = event.currentTarget
            const size = axis === "x" ? el.offsetWidth : el.offsetHeight
            const delta = (position(event) - state.start) * sign
            // A flick (fast, still moving at release) dismisses even when short.
            const velocity = event.timeStamp - state.lastTime > 100 ? 0 : state.velocity
            endDrag(delta > size * 0.3 || velocity > 0.4)
          }}
          onPointerCancel={(event) => {
            onPointerCancel?.(event)
            if (drag.current?.active) endDrag(false)
            drag.current = null
          }}
          {...props}
        >
          {showHandle && <div className="rax-sheet-handle" aria-hidden="true" />}
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close className="rax-sheet-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              <span className="visually-hidden">{closeLabel}</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    )
  },
)
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-sheet-header", className)} {...props} />
))
SheetHeader.displayName = "SheetHeader"

/** Scrollable middle section. */
const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-sheet-body", className)} {...props} />
))
SheetBody.displayName = "SheetBody"

const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-sheet-footer", className)} {...props} />
))
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => <SheetPrimitive.Title ref={ref} className={cn("rax-sheet-title", className)} {...props} />)
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => <SheetPrimitive.Description ref={ref} className={cn("rax-sheet-description", className)} {...props} />)
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  type SheetSide,
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
