"use client"

// RaxUI spinner. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"

import type { RaxAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  appearance?: RaxAppearance
  /** Accessible label. Pass `aria-hidden` instead when another element already announces loading. */
  size?: "sm" | "default" | "lg"
  color?: "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral"
  label?: string
}

const SPOKES = Array.from({ length: 8 }, (_, i) => i)

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(({ appearance, className, label = "Loading", size = "default", color = "primary", ...props }, ref) => (
  <svg
    ref={ref}
        data-rax-appearance={appearance}
    data-size={size} data-color={color}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    role="status"
    aria-label={label}
    className={cn("rax-spinner", className)}
    {...props}
  >
    {SPOKES.map((i) => (
      <line key={i} x1="12" y1="2.75" x2="12" y2="6.75" transform={`rotate(${i * 45} 12 12)`} opacity={(i + 1) / 8} />
    ))}
  </svg>
))
Spinner.displayName = "Spinner"

export { Spinner }
