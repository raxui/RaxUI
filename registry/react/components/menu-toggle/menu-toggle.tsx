"use client"

// RaxUI menu-toggle. Source-owned: edit freely. Ported from boot-ui.
// Built-in icon paths from Lucide (ISC).
import * as React from "react"

import { buttonVariants, type ButtonVariant } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// MenuToggle — the hamburger button that morphs into a close (×) or back (←)
// icon while its menu is open. The bars first meet in the middle, then turn,
// and spring back the same way on close.
//
//   <MenuToggle open={open} onOpenChange={setOpen} aria-controls="site-nav" />
//
// Announces itself with aria-expanded; give it an aria-label (default "Menu").
// Works as a Radix trigger too: <SheetTrigger asChild><MenuToggle /></SheetTrigger>.
// -----------------------------------------------------------------------------

export interface MenuToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  appearance?: import("@/lib/theme").RaxAppearance
  openLabel?: string
  closeLabel?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** What the bars become when open. The arrow points back (mirrors in RTL). */
  icon?: "close" | "arrow"
  variant?: ButtonVariant
  size?: "sm" | "default" | "lg"
}

const sizeClasses = { sm: "btn-sm", default: null, lg: "btn-lg" } as const

const MenuToggle = React.forwardRef<HTMLButtonElement, MenuToggleProps>(
  (
    {
      appearance,
      openLabel = "Open menu",
      closeLabel = "Close menu",
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      icon = "close",
      variant = "ghost",
      size = "default",
      className,
      children,
      onClick,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
    // A Radix menu/dialog trigger (asChild) passes aria-haspopup and data-state; follow
    // it when nothing else does. (A Tooltip's data-state is about the tooltip.)
    const fromTrigger = props["aria-haspopup"] ? (props as { "data-state"?: string })["data-state"] : undefined
    const open = openProp ?? (fromTrigger ? fromTrigger === "open" : uncontrolled)

    return (
      <button
        ref={ref}
        type="button"
        data-rax-appearance={appearance}
        aria-expanded={open}
        aria-label={children ? ariaLabel : (ariaLabel ?? (open ? closeLabel : openLabel))}
        className={buttonVariants({
          variant,
          className: cn("rax-menu-toggle", !children && "btn-glass-icon", sizeClasses[size], className),
        })}
        data-icon={icon}
        {...props}
        data-open={open ? "" : undefined}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          if (openProp === undefined) setUncontrolled(!open)
          onOpenChange?.(!open)
        }}
      >
        <span className="rax-menu-toggle-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {children}
      </button>
    )
  },
)
MenuToggle.displayName = "MenuToggle"

export { MenuToggle }
