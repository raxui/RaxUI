"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { inert } from "@/lib/app-shell-utils"
import { assignRef } from "@/lib/refs"

export type SpeedDialSide = "top" | "bottom" | "left" | "right"

type SpeedDialContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  side: SpeedDialSide
  disabled?: boolean
  hover: boolean
  contentId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  /** Set by the content: Escape and outside-click handlers that may cancel closing. */
  handlers: React.MutableRefObject<{ onEscapeKeyDown?: (event: KeyboardEvent) => void; onInteractOutside?: (event: PointerEvent) => void }>
}

const SpeedDialContext = React.createContext<SpeedDialContextValue | null>(null)

function useSpeedDial(name: string) {
  const context = React.useContext(SpeedDialContext)
  if (!context) throw new Error(`\`${name}\` must be used within \`SpeedDial\``)
  return context
}

/** Arrow key that moves away from the trigger, i.e. to the next action. */
const AWAY_KEY: Record<SpeedDialSide, string> = { top: "ArrowUp", bottom: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }
const TOWARD_KEY: Record<SpeedDialSide, string> = { top: "ArrowDown", bottom: "ArrowUp", left: "ArrowRight", right: "ArrowLeft" }

const actionsOf = (content: HTMLElement | null) =>
  Array.from(content?.querySelectorAll<HTMLButtonElement>(".sheen-speed-dial-action:not(:disabled)") ?? [])

// ---- Root ------------------------------------------------------------------------------------

export interface SpeedDialProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Where the actions fan out. */
  side?: SpeedDialSide
  disabled?: boolean
  /** `hover` opens while the pointer is over the dial (click still toggles, for touch). */
  activationMode?: "click" | "hover"
  /** Milliseconds before a hover opens it. */
  delay?: number
}

/**
 * A floating action button that fans out a few related actions. For a corner
 * button, put the position on the root (`position-fixed bottom-0 end-0 m-4`)
 * so the actions stay lined up with the trigger.
 */
const SpeedDial = React.forwardRef<HTMLDivElement, SpeedDialProps>(
  (
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      side = "top",
      disabled,
      activationMode = "click",
      delay = 250,
      className,
      onPointerEnter,
      onPointerLeave,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
    const open = (openProp ?? uncontrolled) && !disabled
    const onOpenChangeRef = React.useRef(onOpenChange)
    onOpenChangeRef.current = onOpenChange
    const openRef = React.useRef(open)
    openRef.current = open
    const setOpen = React.useCallback(
      (next: boolean) => {
        if (next === openRef.current) return
        if (openProp === undefined) setUncontrolled(next)
        onOpenChangeRef.current?.(next)
      },
      [openProp],
    )

    const contentId = React.useId()
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const handlers = React.useRef<SpeedDialContextValue["handlers"]["current"]>({})
    const hoverTimer = React.useRef<number | undefined>(undefined)
    const hover = activationMode === "hover"

    React.useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

    // Escape and clicks outside close it.
    React.useEffect(() => {
      if (!open) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return
        handlers.current.onEscapeKeyDown?.(event)
        if (event.defaultPrevented) return
        const hadFocus = rootRef.current?.contains(document.activeElement)
        setOpen(false)
        if (hadFocus) triggerRef.current?.focus()
      }
      const onPointerDown = (event: PointerEvent) => {
        if (rootRef.current?.contains(event.target as Node)) return
        handlers.current.onInteractOutside?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }
      document.addEventListener("keydown", onKeyDown)
      document.addEventListener("pointerdown", onPointerDown)
      return () => {
        document.removeEventListener("keydown", onKeyDown)
        document.removeEventListener("pointerdown", onPointerDown)
      }
    }, [open, setOpen])

    const contextValue = React.useMemo<SpeedDialContextValue>(
      () => ({ open, setOpen, side, disabled, hover, contentId, triggerRef, contentRef, handlers }),
      [open, setOpen, side, disabled, hover, contentId],
    )

    return (
      <SpeedDialContext.Provider value={contextValue}>
        <div
          ref={(node) => {
            rootRef.current = node
            assignRef(ref, node)
          }}
          data-state={open ? "open" : "closed"}
          data-side={side}
          data-disabled={disabled ? "" : undefined}
          className={cn("sheen-speed-dial", className)}
          onPointerEnter={(event) => {
            onPointerEnter?.(event)
            if (!hover || event.pointerType !== "mouse" || disabled) return
            window.clearTimeout(hoverTimer.current)
            hoverTimer.current = window.setTimeout(() => setOpen(true), delay)
          }}
          onPointerLeave={(event) => {
            onPointerLeave?.(event)
            if (!hover || event.pointerType !== "mouse") return
            window.clearTimeout(hoverTimer.current)
            // A short grace period, so crossing the gap to an action doesn't close it.
            hoverTimer.current = window.setTimeout(() => setOpen(false), 200)
          }}
          onBlur={(event) => {
            onBlur?.(event)
            // Tabbing out closes it.
            if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
          }}
          {...props}
        />
      </SpeedDialContext.Provider>
    )
  },
)
SpeedDial.displayName = "SpeedDial"

// ---- Trigger ---------------------------------------------------------------------------------

const PlusIcon = () => (
  <svg
    data-speed-dial-icon=""
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export type SpeedDialTriggerProps = ButtonProps

/**
 * The round button. Without children it shows a plus that turns into a
 * close cross; give your own icon `data-speed-dial-icon` to make it turn too.
 */
const SpeedDialTrigger = React.forwardRef<HTMLButtonElement, SpeedDialTriggerProps>(
  (
    { className, variant = "default", size = "icon-lg", children, onClick, onKeyDown, "aria-label": ariaLabel = "Actions", ...props },
    ref,
  ) => {
    const { open, setOpen, side, disabled, contentId, triggerRef, contentRef } = useSpeedDial("SpeedDialTrigger")
    return (
      <Button
        ref={(node) => {
          ;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
          assignRef(ref, node)
        }}
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={contentId}
        data-state={open ? "open" : "closed"}
        disabled={disabled}
        className={cn("sheen-speed-dial-trigger", className)}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setOpen(!open)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || event.key !== AWAY_KEY[side]) return
          // The arrow toward the actions opens them and focuses the nearest.
          event.preventDefault()
          setOpen(true)
          requestAnimationFrame(() => actionsOf(contentRef.current)[0]?.focus())
        }}
        {...props}
      >
        {children ?? <PlusIcon />}
      </Button>
    )
  },
)
SpeedDialTrigger.displayName = "SpeedDialTrigger"

// ---- Content ---------------------------------------------------------------------------------

export interface SpeedDialContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Distance from the trigger in pixels. */
  offset?: number
  /** Space between actions in pixels. */
  gap?: number
  /** Return `event.preventDefault()` to keep it open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  /** Return `event.preventDefault()` to keep it open. */
  onInteractOutside?: (event: PointerEvent) => void
}

/** The actions. They spring out one after another, nearest first, and fold back in reverse. */
const SpeedDialContent = React.forwardRef<HTMLDivElement, SpeedDialContentProps>(
  ({ offset = 12, gap = 10, onEscapeKeyDown, onInteractOutside, className, style, children, onKeyDown, ...props }, ref) => {
    const { open, setOpen, side, contentId, contentRef, triggerRef, handlers } = useSpeedDial("SpeedDialContent")
    handlers.current = { onEscapeKeyDown, onInteractOutside }
    const items = React.Children.toArray(children).filter(React.isValidElement)
    return (
      <div
        ref={(node) => {
          ;(contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          assignRef(ref, node)
        }}
        id={contentId}
        role="menu"
        aria-orientation={side === "top" || side === "bottom" ? "vertical" : "horizontal"}
        data-state={open ? "open" : "closed"}
        data-side={side}
        className={cn("sheen-speed-dial-content", className)}
        style={
          {
            "--sheen-speed-dial-offset": `${offset}px`,
            "--sheen-speed-dial-gap": `${gap}px`,
            "--sheen-speed-dial-count": items.length,
            ...style,
          } as React.CSSProperties
        }
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const actions = actionsOf(event.currentTarget)
          const index = actions.indexOf(document.activeElement as HTMLButtonElement)
          if (index < 0) return
          let next: HTMLElement | null | undefined
          if (event.key === AWAY_KEY[side]) next = actions[index + 1] ?? actions[0]
          else if (event.key === TOWARD_KEY[side]) next = index === 0 ? triggerRef.current : actions[index - 1]
          else if (event.key === "Home") next = actions[0]
          else if (event.key === "End") next = actions[actions.length - 1]
          if (!next) return
          event.preventDefault()
          next.focus()
          if (next === triggerRef.current) setOpen(false)
        }}
        {...inert(!open)}
        {...props}
      >
        {items.map((child, index) => (
          <SpeedDialIndexContext.Provider key={child.key ?? index} value={index}>
            {child}
          </SpeedDialIndexContext.Provider>
        ))}
      </div>
    )
  },
)
SpeedDialContent.displayName = "SpeedDialContent"

const SpeedDialIndexContext = React.createContext(0)

// ---- Item, action, label -------------------------------------------------------------------

const SpeedDialItemContext = React.createContext<{ labelId: string; hasLabel: boolean; setHasLabel: (has: boolean) => void } | null>(null)

/** One action with its label. */
const SpeedDialItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, style, ...props }, ref) => {
  const { open } = useSpeedDial("SpeedDialItem")
  const index = React.useContext(SpeedDialIndexContext)
  const labelId = React.useId()
  const [hasLabel, setHasLabel] = React.useState(false)
  const value = React.useMemo(() => ({ labelId, hasLabel, setHasLabel }), [labelId, hasLabel])
  return (
    <SpeedDialItemContext.Provider value={value}>
      <div
        ref={ref}
        role="none"
        data-state={open ? "open" : "closed"}
        className={cn("sheen-speed-dial-item", className)}
        style={{ "--sheen-speed-dial-index": index, ...style } as React.CSSProperties}
        {...props}
      />
    </SpeedDialItemContext.Provider>
  )
})
SpeedDialItem.displayName = "SpeedDialItem"

export interface SpeedDialActionProps extends ButtonProps {
  /** Runs on click; the dial then closes unless you call `event.preventDefault()`. */
  onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

/** A round action button. Give it an `aria-label` when its item has no label. */
const SpeedDialAction = React.forwardRef<HTMLButtonElement, SpeedDialActionProps>(
  ({ className, variant = "outline", size = "icon", onSelect, onClick, ...props }, ref) => {
    const { setOpen } = useSpeedDial("SpeedDialAction")
    const item = React.useContext(SpeedDialItemContext)
    return (
      <Button
        ref={ref}
        role="menuitem"
        variant={variant}
        size={size}
        aria-labelledby={item?.hasLabel && !props["aria-label"] ? item.labelId : undefined}
        className={cn("sheen-speed-dial-action", className)}
        onClick={(event) => {
          onClick?.(event)
          onSelect?.(event)
          if (!event.defaultPrevented) setOpen(false)
        }}
        {...props}
      />
    )
  },
)
SpeedDialAction.displayName = "SpeedDialAction"

/** The text next to an action. It also names the action for screen readers. */
const SpeedDialLabel = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => {
  const item = React.useContext(SpeedDialItemContext)
  const setHasLabel = item?.setHasLabel
  React.useEffect(() => {
    setHasLabel?.(true)
    return () => setHasLabel?.(false)
  }, [setHasLabel])
  return <span ref={ref} id={item?.labelId} className={cn("sheen-speed-dial-label", className)} {...props} />
})
SpeedDialLabel.displayName = "SpeedDialLabel"

export { SpeedDial, SpeedDialTrigger, SpeedDialContent, SpeedDialItem, SpeedDialAction, SpeedDialLabel }
