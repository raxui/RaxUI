"use client"

// RaxUI badge. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import type { RaxAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

export type BadgeColor = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  appearance?: RaxAppearance
  /** `tinted` soft fill (default) · `solid` · `outline` · `glass` frosted, for use over photos. */
  variant?: "tinted" | "solid" | "outline" | "glass"
  color?: BadgeColor
  size?: "sm" | "default" | "lg"
  /** `pill` (default) or `rounded` (tag-like corners). */
  shape?: "pill" | "rounded"
  /** Leading status dot. `pulse` adds a soft ping (live, recording…). */
  dot?: boolean | "pulse"
  /** Shows a remove (×) button, for filter chips and tags. */
  onRemove?: () => void
  removeLabel?: string
  /** Render a link or button with badge styling. */
  asChild?: boolean
}

// Built-in X path from Lucide (ISC).
const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
    <path d="M7 7l10 10M17 7 7 17" />
  </svg>
)

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      appearance,
      className,
      variant = "tinted",
      color = "primary",
      size = "default",
      shape = "pill",
      dot,
      onRemove,
      removeLabel = "Remove",
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "span"
    const content = asChild ? (
      children
    ) : (
      <>
        {dot && <span className="rax-badge-dot" data-pulse={dot === "pulse" || undefined} aria-hidden="true" />}
        {children}
        {onRemove && (
          <button type="button" className="rax-badge-remove" aria-label={removeLabel} onClick={onRemove}>
            <RemoveIcon />
          </button>
        )}
      </>
    )
    return (
      <Comp
        ref={ref}
        data-rax-appearance={appearance}
        data-variant={variant}
        data-color={color}
        data-size={size}
        data-shape={shape}
        className={cn("rax-badge", className)}
        {...props}
      >
        {content}
      </Comp>
    )
  },
)
Badge.displayName = "Badge"

// -----------------------------------------------------------------------------
// Notification count pinned to the corner of an icon, button or avatar
// -----------------------------------------------------------------------------

export interface BadgeCountProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number
  /** Shows "99+" above this. */
  max?: number
  /** Show a plain dot instead of a number. */
  dot?: boolean
  /** Keep the badge visible at 0. */
  showZero?: boolean
  color?: BadgeColor
  /** Where it sits relative to the child. */
  placement?: "top-end" | "bottom-end"
  /** The element to decorate (icon button, avatar…). */
  children: React.ReactNode
  /** Accessible text, e.g. (n) => `${n} unread messages`. */
  getLabel?: (count: number) => string
}

const BadgeCount = React.forwardRef<HTMLSpanElement, BadgeCountProps>(
  (
    {
      count,
      max = 99,
      dot,
      showZero,
      color = "danger",
      placement = "top-end",
      children,
      getLabel = (n) => `${n} notifications`,
      className,
      ...props
    },
    ref,
  ) => {
    // Pop on change only (not on first paint).
    const [initial] = React.useState(count)
    const [hasChanged, setHasChanged] = React.useState(false)
    if (!hasChanged && count !== initial) setHasChanged(true)

    const visible = count > 0 || showZero
    const text = count > max ? `${max}+` : String(count)

    return (
      <span ref={ref} className={cn("rax-badge-anchor", className)} {...props}>
        {children}
        {visible && (
          <span
            key={dot ? "dot" : count}
            className="rax-badge-count"
            data-color={color}
            data-dot={dot || undefined}
            data-placement={placement}
            data-pop={hasChanged || undefined}
            role="status"
            aria-label={getLabel(count)}
          >
            {!dot && text}
          </span>
        )}
      </span>
    )
  },
)
BadgeCount.displayName = "BadgeCount"

export { Badge, BadgeCount }
