"use client"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariantClasses = {
  default: "btn-glass-primary",
  solid: "btn-glass-primary",
  secondary: "btn-glass-secondary",
  tinted: "btn-glass-tinted",
  destructive: "btn-glass-destructive",
  outline: "btn-glass-outline",
  ghost: "btn-glass-ghost",
  link: "btn-glass-link",
} as const

const buttonSizeClasses = {
  default: null,
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-glass-icon",
  "icon-sm": "btn-glass-icon btn-sm",
  "icon-lg": "btn-glass-icon btn-lg",
} as const

export type ButtonVariant = keyof typeof buttonVariantClasses
export type ButtonSize = keyof typeof buttonSizeClasses

export interface ButtonVariantOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Class names for a button look — use on links or any element that should look like a Button. */
function buttonVariants({ variant = "default", size = "default", className }: ButtonVariantOptions = {}) {
  return cn("btn sheen-button btn-glass", buttonVariantClasses[variant], buttonSizeClasses[size], className)
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonVariantOptions, "className"> {
  appearance?: SheenAppearance
  color?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | (string & {})
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, appearance, color, style, ...props }, ref) => {
    const theme = useSheenTheme({ appearance })
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        {...sheenThemeAttributes(theme)}
        style={{ ...(color ? { "--sheen-btn-tint-rgb": `var(--bs-${color}-rgb)` } : {}), ...style } as React.CSSProperties}
        // Native buttons default to type="submit"; make that opt-in.
        type={asChild ? type : (type ?? "button")}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
