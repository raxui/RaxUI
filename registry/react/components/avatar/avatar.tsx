"use client"

// SheenUI avatar. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import type { SheenAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

const avatarSizeClasses = {
  xs: "sheen-avatar-xs",
  sm: "sheen-avatar-sm",
  default: null,
  lg: "sheen-avatar-lg",
  xl: "sheen-avatar-xl",
} as const

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  appearance?: SheenAppearance
  size?: keyof typeof avatarSizeClasses
  /** `rounded` = app-icon squircle. */
  shape?: "circle" | "rounded"
  /** Highlight ring around the avatar. */
  ring?: boolean
}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ appearance, className, size = "default", shape = "circle", ring = false, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
        data-sheen-appearance={appearance}
      className={cn(
        "sheen-avatar",
        avatarSizeClasses[size],
        shape === "rounded" && "sheen-avatar-rounded",
        ring && "sheen-avatar-ring",
        className,
      )}
      {...props}
    />
  ),
)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => <AvatarPrimitive.Image ref={ref} className={cn("sheen-avatar-image", className)} {...props} />)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

/** "Saad Alsaree" → "SA", "noura" → "N", "نورة القحطاني" → "نق" (skips the Arabic article "ال"). */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  const initial = (word: string) => Array.from(word.length > 3 && word.startsWith("ال") ? word.slice(2) : word)[0] ?? ""
  const first = initial(parts[0])
  const last = parts.length > 1 ? initial(parts[parts.length - 1]) : ""
  return (first + last).toLocaleUpperCase()
}

// Flat Bootstrap colours only — the same name always gets the same one.
const PALETTE = ["primary", "success", "danger", "warning", "info", "indigo", "purple", "pink", "orange", "teal"]
const CUSTOM_RGB: Record<string, string> = {
  indigo: "102, 16, 242",
  purple: "111, 66, 193",
  pink: "214, 51, 132",
  orange: "253, 126, 20",
  teal: "32, 201, 151",
}

function tintFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) | 0
  const color = PALETTE[Math.abs(hash) % PALETTE.length]
  return CUSTOM_RGB[color] ?? `var(--bs-${color}-rgb)`
}

// Built-in UserRound paths from Lucide (ISC).
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
)

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  /** Derives initials and a stable colour from a name when no children are given. */
  name?: string
  fallbackLabel?: string
}

const AvatarFallback = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Fallback>, AvatarFallbackProps>(
  ({ className, name, fallbackLabel = "Avatar", style, children, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn("sheen-avatar-fallback", className)}
      role="img" aria-label={name || fallbackLabel}
      style={name ? ({ "--sheen-avatar-tint-rgb": tintFor(name), ...style } as React.CSSProperties) : style}
      {...props}
    >
      {children ?? (name ? getInitials(name) : <PersonIcon />)}
    </AvatarPrimitive.Fallback>
  ),
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export type AvatarStatus = "online" | "away" | "busy" | "offline"

/** Presence dot in the corner. */
const AvatarBadge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { status: AvatarStatus; label?: string }>(({ status, label = status, className, ...props }, ref) => (
  <span ref={ref} role="img" aria-label={label} data-status={status} className={cn("sheen-avatar-badge", className)} {...props} />
))
AvatarBadge.displayName = "AvatarBadge"

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show at most this many avatars, then a "+N" counter. */
  getMoreLabel?: (count: number) => string
  max?: number
  /** Size of the "+N" counter (match your avatars). */
  size?: AvatarProps["size"]
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(({ className, max, getMoreLabel = (count) => `${count} more`, size = "default", children, ...props }, ref) => {
  const items = React.Children.toArray(children).filter(React.isValidElement)
  const visible = max !== undefined ? items.slice(0, max) : items
  const hidden = items.length - visible.length
  return (
    <div ref={ref} role="group" className={cn("sheen-avatar-group", className)} {...props}>
      {visible.map((child, i) =>
        React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
          style: { ...(child.props as { style?: React.CSSProperties }).style, "--sheen-avatar-i": i } as React.CSSProperties,
        }),
      )}
      {hidden > 0 && (
        <Avatar
          size={size}
          className="sheen-avatar-more"
          style={{ "--sheen-avatar-i": visible.length } as React.CSSProperties}
          aria-label={getMoreLabel(hidden)}
        >
          <AvatarFallback>+{hidden}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})
AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup }
