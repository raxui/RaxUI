"use client"

// SheenUI alert. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"

import type { SheenAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

// -----------------------------------------------------------------------------
// Alert — an inline message in the page flow (Alert, AlertTitle,
// AlertDescription, plus AlertActions). Tones tint the surface and the icon;
// dismissing collapses the alert smoothly instead of making content jump.
// Danger / warning alerts are announced assertively (role="alert"), the rest
// politely (role="status").
// -----------------------------------------------------------------------------

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral"

// Built-in icon paths from Lucide (ISC).
const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

/** Default glyph per tone (shared with Banner). */
export const TONE_ICON: Record<AlertTone, React.ReactNode> = {
  info: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01" />,
  success: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.5 2.5L16 9.5" />,
  warning: <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  danger: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15 9l-6 6M9 9l6 6" />,
  neutral: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4l2.5 2.5" />,
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

/** Collapse-then-unmount for dismissible messages (no layout jump). */
export function useDismiss(open: boolean | undefined, defaultOpen: boolean, onOpenChange?: (open: boolean) => void) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const isOpen = open ?? uncontrolled
  // Stay mounted while the exit animation runs.
  const [present, setPresent] = React.useState(isOpen)
  if (isOpen && !present) setPresent(true)

  const dismiss = () => {
    if (open === undefined) setUncontrolled(false)
    onOpenChange?.(false)
  }
  const onAnimationEnd = (event: React.AnimationEvent) => {
    if (!isOpen && event.target === event.currentTarget) setPresent(false)
  }
  // Without motion there's no animationend: unmount right away.
  React.useEffect(() => {
    if (isOpen) return
    if (prefersReducedMotion()) { setPresent(false); return }
    const timer = window.setTimeout(() => setPresent(false), 350)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  return { isOpen, present, dismiss, onAnimationEnd }
}

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  appearance?: SheenAppearance
  tone?: AlertTone
  /** `tinted` soft fill (default) · `outline` · `solid` strong fill · `glass` frosted, for use over media. */
  variant?: "tinted" | "outline" | "solid" | "glass"
  /** `true` = the tone's icon (default), `false` = none, or your own node. */
  icon?: boolean | React.ReactNode
  /** Shorthand for <AlertTitle>. */
  title?: React.ReactNode
  /** Shows a close button; the alert collapses away when pressed. */
  dismissible?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  dismissLabel?: string
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      tone = "info",
      variant = "tinted",
      icon = true,
      title,
      dismissible,
      open,
      defaultOpen = true,
      onOpenChange,
      dismissLabel = "Dismiss",
      appearance,
      className,
      children,
      role,
      ...props
    },
    ref,
  ) => {
    const { isOpen, present, dismiss, onAnimationEnd } = useDismiss(open, defaultOpen, onOpenChange)
    if (!present) return null

    return (
      <div
        ref={ref}
        data-sheen-appearance={appearance}
        role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")}
        data-tone={tone}
        data-variant={variant}
        data-state={isOpen ? "open" : "closed"}
        className={cn("sheen-alert-box", className)}
        onAnimationEnd={onAnimationEnd}
        {...props}
      >
        {/* The inner wrapper lets the box collapse its height to 0 smoothly. */}
        <div className="sheen-alert-box-inner">
          {icon !== false && <span className="sheen-alert-box-icon">{icon === true ? TONE_ICON[tone] : icon}</span>}
          <div className="sheen-alert-box-body">
            {title && <AlertTitle>{title}</AlertTitle>}
            {children}
          </div>
          {dismissible && (
            <button type="button" className="sheen-alert-box-close" aria-label={dismissLabel} onClick={dismiss}>
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    )
  },
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("sheen-alert-box-title", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-alert-box-description", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

/** Buttons / links under the description. */
const AlertActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("sheen-alert-box-actions", className)} {...props} />
))
AlertActions.displayName = "AlertActions"

export { Alert, AlertTitle, AlertDescription, AlertActions }
