"use client"

// Built-in SVG paths from Lucide (ISC). Ported from boot-ui.
import * as React from "react"
import { createPortal } from "react-dom"

import { useRaxTheme, raxThemeAttributes, useRaxPortalContainer, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { TONE_ICON, useDismiss, type AlertTone } from "@/components/ui/alert"

// -----------------------------------------------------------------------------
// Banner — a full-width strip for page / app-level messages: announcements,
// connectivity, maintenance, cookies. Three placements:
//   inline  in the flow (rounded)
//   top     sticks to the top of its scroll container, slides down
//   bottom  floats above the page (portaled, glass), slides up
// Dismissible with an optional memory (persistKey → localStorage).
// -----------------------------------------------------------------------------

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const storageKey = (key: string) => `rax-banner:${key}`
const wasDismissed = (key?: string) => {
  if (!key) return false
  try {
    return localStorage.getItem(storageKey(key)) === "dismissed"
  } catch {
    return false
  }
}

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  appearance?: RaxAppearance
  tone?: AlertTone
  /** `tinted` (default) · `solid` strong brand / status colour · `glass` frosted. */
  variant?: "tinted" | "solid" | "glass"
  position?: "inline" | "top" | "bottom"
  /** `true` = the tone's icon (default), `false` = none, or your own node. */
  icon?: boolean | React.ReactNode
  /** Bold lead-in before the message. */
  title?: React.ReactNode
  /** Buttons / links at the end. */
  action?: React.ReactNode
  dismissible?: boolean
  dismissLabel?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Remember a dismissal across visits under this key. */
  persistKey?: string
  /** Accessible name for the banner region. */
  label?: string
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      appearance,
      tone = "info",
      variant = "tinted",
      position = "inline",
      icon = true,
      title,
      action,
      dismissible,
      dismissLabel = "Dismiss",
      open,
      defaultOpen = true,
      onOpenChange,
      persistKey,
      label,
      className,
      children,
      role,
      ...props
    },
    ref,
  ) => {
    const theme = useRaxTheme({ appearance })
    const container = useRaxPortalContainer()
    const [mounted, setMounted] = React.useState(false)
    const [remembered, setRemembered] = React.useState(false)
    React.useEffect(() => { setMounted(true); setRemembered(wasDismissed(persistKey)) }, [persistKey])
    const { isOpen, present, dismiss, onAnimationEnd } = useDismiss(open ?? (remembered ? false : undefined), defaultOpen, (next) => {
      if (!next && persistKey) {
        try {
          localStorage.setItem(storageKey(persistKey), "dismissed")
        } catch {
          // Storage unavailable (private mode): the banner just comes back next time.
        }
      }
      onOpenChange?.(next)
    })
    if (!present || (position === "bottom" && !mounted)) return null

    const banner = (
      <div
        ref={ref}
        {...raxThemeAttributes(theme)}
        dir={props.dir ?? (position === "bottom" ? theme.direction : undefined)}
        role={role ?? (tone === "danger" || tone === "warning" ? "alert" : "status")}
        aria-label={label}
        data-tone={tone}
        data-variant={variant}
        data-position={position}
        data-state={isOpen ? "open" : "closed"}
        className={cn("rax-banner", className)}
        onAnimationEnd={onAnimationEnd}
        {...props}
      >
        <div className="rax-banner-inner">
          {icon !== false && <span className="rax-banner-icon">{icon === true ? TONE_ICON[tone] : icon}</span>}
          <div className="rax-banner-text">
            {title && <strong className="rax-banner-title">{title}</strong>}
            {children && <span className="rax-banner-message">{children}</span>}
          </div>
          {action && <div className="rax-banner-actions">{action}</div>}
          {dismissible && (
            <button type="button" className="rax-banner-close" aria-label={dismissLabel} onClick={dismiss}>
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    )

    // Floating banners escape transformed / glass ancestors (which would trap position: fixed).
    return position === "bottom" && typeof document !== "undefined" ? createPortal(banner, container ?? document.body) : banner
  },
)
Banner.displayName = "Banner"

/**
 * Several top banners at once (offline + announcement…): one sticky container
 * stacks them instead of each sticking to top: 0 on top of the other.
 */
const BannerGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-banner-group", className)} {...props} />
))
BannerGroup.displayName = "BannerGroup"

/** Forget a remembered dismissal (e.g. from a "show tips again" setting). */
export function resetBanner(persistKey: string) {
  try {
    localStorage.removeItem(storageKey(persistKey))
  } catch {
    // ignore
  }
}

export { Banner, BannerGroup }
