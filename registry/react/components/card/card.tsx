"use client"

// SheenUI card. Source-owned: edit freely. Ported from boot-ui.
import { useSheenTheme, sheenThemeAttributes, SheenThemeBoundary, type SheenAppearance } from "@/lib/theme"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const cardVariantClasses = {
  default: null,
  tinted: "card-glass-tinted",
  outline: "card-glass-outline",
} as const

export type CardVariant = keyof typeof cardVariantClasses

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  appearance?: SheenAppearance
  variant?: CardVariant
  /** Hover lift, press feedback and focus ring — for cards that are links or buttons. */
  interactive?: boolean
  /** Render the card styles onto the child element, e.g. an `<a>` or router `<Link>`. */
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", interactive = false, asChild = false, appearance, ...props }, ref) => {
    const theme = useSheenTheme({ appearance })
    const Comp = asChild ? Slot : "div"
    return (
      <SheenThemeBoundary value={theme}>
        <Comp
          ref={ref}
          {...sheenThemeAttributes(theme)}
          className={cn("card sheen-card card-glass", cardVariantClasses[variant], interactive && "card-glass-interactive", className)}
          {...props}
        />
      </SheenThemeBoundary>
    )
  },
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-header", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-title", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-subtitle", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-glass-action", className)} {...props} />
))
CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-body", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-footer", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
