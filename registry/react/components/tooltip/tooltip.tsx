"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { useRaxPortalContainer } from "@/lib/theme"
import { cn } from "@/lib/utils"
const getDirection = (node: HTMLElement | null) => node && getComputedStyle(node).direction === "rtl" ? "rtl" as const : "ltr" as const
const mergeRefs = <T,>(...refs: (React.Ref<T> | undefined)[]) => (node: T | null) => { refs.forEach(ref => { if (typeof ref === "function") ref(node); else if (ref) (ref as React.MutableRefObject<T | null>).current = node }) }

// -----------------------------------------------------------------------------
// Tooltip — a short label on Radix Tooltip. Two ways to write it:
//
//   <Tooltip content="Bold" shortcut="⌘B"><Button …/></Tooltip>     shorthand
//   <Tooltip><TooltipTrigger asChild>…</TooltipTrigger>
//            <TooltipContent>…</TooltipContent></Tooltip>          compound
//
// On top of Radix: disabled triggers are wrapped so they still get a tooltip,
// touch users open it with a long-press (Radix ignores touch), the portaled
// bubble inherits the trigger's text direction, and <TruncatedText> shows the
// full text only when it's actually cut off.
// -----------------------------------------------------------------------------

const HasProviderContext = React.createContext(false)

/**
 * Wrap a group of tooltips (or your whole app) so moving between them skips
 * the open delay. Tooltips outside a provider get their own automatically.
 */
function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <HasProviderContext.Provider value={true}>
      <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
    </HasProviderContext.Provider>
  )
}

type Dir = "ltr" | "rtl"

interface TooltipState {
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  dir?: Dir
}
const TooltipStateContext = React.createContext<TooltipState | null>(null)

type ContentOptions = Pick<TooltipContentProps, "side" | "align" | "variant" | "showArrow">

export interface TooltipProps extends React.ComponentProps<typeof TooltipPrimitive.Root>, ContentOptions {
  /** Shorthand: the tooltip text. `children` becomes the trigger. Empty → no tooltip. */
  content?: React.ReactNode
  /** Shorthand: bold first line for a two-line tooltip. */
  title?: React.ReactNode
  /** Shorthand: keyboard shortcut shown as a key cap, e.g. "⌘K". */
  shortcut?: React.ReactNode
  /** Shorthand: extra props for the content. */
  contentProps?: Omit<TooltipContentProps, keyof ContentOptions>
}

function Tooltip({
  content,
  title,
  shortcut,
  side,
  align,
  variant,
  showArrow,
  contentProps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...rootProps
}: TooltipProps) {
  const hasProvider = React.useContext(HasProviderContext)
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const [dir, setDir] = React.useState<Dir>()

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  // The bubble is portaled to <body>: carry the trigger's direction over to it.
  React.useLayoutEffect(() => {
    if (!open) return
    setDir(getDirection(triggerRef.current))
  }, [open])

  const state = React.useMemo(() => ({ setOpen, triggerRef, dir }), [setOpen, dir])

  // Shorthand with nothing to say: render the trigger alone.
  if (content !== undefined && (content === null || content === false || content === "")) return <>{children}</>

  const body =
    content === undefined ? (
      children
    ) : (
      <>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} variant={variant} showArrow={showArrow} {...contentProps}>
          {title && <TooltipTitle>{title}</TooltipTitle>}
          {content}
          {shortcut && <TooltipShortcut>{shortcut}</TooltipShortcut>}
        </TooltipContent>
      </>
    )

  const root = (
    <TooltipStateContext.Provider value={state}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen} {...rootProps}>
        {body}
      </TooltipPrimitive.Root>
    </TooltipStateContext.Provider>
  )
  return hasProvider ? root : <TooltipProvider>{root}</TooltipProvider>
}

const LONG_PRESS_MS = 450
const TOUCH_VISIBLE_MS = 1500

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ asChild, children, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu, ...props }, ref) => {
  const state = React.useContext(TooltipStateContext)
  const pressTimer = React.useRef<number | undefined>(undefined)
  const hideTimer = React.useRef<number | undefined>(undefined)
  const pressed = React.useRef<{ x: number; y: number } | null>(null)
  const longPressed = React.useRef(false)

  React.useEffect(
    () => () => {
      window.clearTimeout(pressTimer.current)
      window.clearTimeout(hideTimer.current)
    },
    [],
  )

  // Touch: long-press opens, the tooltip lingers briefly after the finger lifts.
  const touch = {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event)
      if (event.pointerType !== "touch" || !state) return
      window.clearTimeout(pressTimer.current)
      window.clearTimeout(hideTimer.current)
      longPressed.current = false
      pressed.current = { x: event.clientX, y: event.clientY }
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true
        state.setOpen(true)
      }, LONG_PRESS_MS)
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event)
      const start = pressed.current
      if (event.pointerType === "touch" && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
        window.clearTimeout(pressTimer.current) // it's a scroll, not a press
      }
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerUp?.(event)
      if (event.pointerType !== "touch") return
      window.clearTimeout(pressTimer.current)
      pressed.current = null
      if (longPressed.current && state) hideTimer.current = window.setTimeout(() => state.setOpen(false), TOUCH_VISIBLE_MS)
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerCancel?.(event)
      window.clearTimeout(pressTimer.current)
      pressed.current = null
    },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => {
      onContextMenu?.(event)
      if (longPressed.current) event.preventDefault() // no system menu over our tooltip
    },
  }

  // Disabled elements fire no pointer events and can't take focus: hang the
  // tooltip on a focusable wrapper instead.
  const disabled = asChild && React.isValidElement(children) && (children.props as { disabled?: boolean }).disabled
  const child = disabled ? (
    <span className="rax-tooltip-disabled" tabIndex={0}>
      {children}
    </span>
  ) : (
    children
  )

  return (
    <TooltipPrimitive.Trigger
      ref={mergeRefs(ref, state?.triggerRef as React.Ref<HTMLButtonElement>)}
      asChild={asChild}
      {...touch}
      {...props}
    >
      {child}
    </TooltipPrimitive.Trigger>
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

export interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  /** `dark` high-contrast pill (default) · `glass` frosted popover material. */
  variant?: "dark" | "glass"
  showArrow?: boolean
}

const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, TooltipContentProps>(
  ({ className, variant = "dark", showArrow = false, sideOffset = 6, collisionPadding = 8, dir, children, ...props }, ref) => {
    const state = React.useContext(TooltipStateContext)
    return (
      <TooltipPrimitive.Portal container={useRaxPortalContainer()}>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          dir={dir ?? state?.dir}
          className={cn("rax-tooltip-content", variant === "glass" && "rax-tooltip-glass", className)}
          {...props}
        >
          {children}
          {showArrow && <TooltipPrimitive.Arrow className="rax-tooltip-arrow" width={12} height={6} />}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    )
  },
)
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/** Bold first line of a two-line tooltip. */
const TooltipTitle = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("rax-tooltip-title", className)} {...props} />
))
TooltipTitle.displayName = "TooltipTitle"

/** Key cap for a keyboard shortcut. Shortcuts always read left-to-right. */
const TooltipShortcut = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <kbd ref={ref} dir="ltr" className={cn("rax-tooltip-kbd", className)} {...props} />
))
TooltipShortcut.displayName = "TooltipShortcut"

export interface TruncatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Clamp to this many lines (default 1, with an ellipsis). */
  lines?: number
  /** What the tooltip shows; defaults to `children`. */
  tooltip?: React.ReactNode
  side?: TooltipContentProps["side"]
  variant?: TooltipContentProps["variant"]
}

/** Text that ellipsizes, with a tooltip of the full text — only when it's actually cut off. */
const TruncatedText = React.forwardRef<HTMLSpanElement, TruncatedTextProps>(
  ({ lines = 1, tooltip, side = "top", variant, className, style, children, ...props }, ref) => {
    const textRef = React.useRef<HTMLSpanElement>(null)
    const [open, setOpen] = React.useState(false)

    const onOpenChange = (next: boolean) => {
      const el = textRef.current
      if (next && el && el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return
      setOpen(next)
    }

    return (
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild>
          <span
            ref={mergeRefs(ref, textRef)}
            className={cn("rax-truncate", className)}
            data-lines={lines > 1 ? "" : undefined}
            style={lines > 1 ? { ...style, WebkitLineClamp: lines } : style}
            {...props}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} variant={variant} className="rax-tooltip-wide">
          {tooltip ?? children}
        </TooltipContent>
      </Tooltip>
    )
  },
)
TruncatedText.displayName = "TruncatedText"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipTitle, TooltipShortcut, TruncatedText }
