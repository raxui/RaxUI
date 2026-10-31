"use client"

import { useRaxTheme, raxThemeAttributes, RaxThemeBoundary, useRaxPortalContainer, type RaxAppearance } from "@/lib/theme"
import * as React from "react"

// Built-in icon paths from Lucide (ISC).
import * as SelectPrimitive from "@radix-ui/react-select"

import { cn } from "@/lib/utils"
import { useFieldControlProps } from "@/components/ui/field"
import { ChoiceHighlight } from "@/lib/choice-highlight"

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const ChevronIcon = ({ direction }: { direction: "up" | "down" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={direction === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
  </svg>
)

function Select({ appearance, dir, ...props }: React.ComponentProps<typeof SelectPrimitive.Root> & { appearance?: RaxAppearance }) {
  const theme = useRaxTheme({ appearance, direction: dir })
  return (
    <RaxThemeBoundary value={theme}>
      <SelectPrimitive.Root dir={theme.direction} {...props} />
    </RaxThemeBoundary>
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const selectSizeClasses = {
  sm: "form-select-sm",
  default: null,
  lg: "form-select-lg",
} as const

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    appearance?: RaxAppearance
    size?: keyof typeof selectSizeClasses
  }
>(({ className, size = "default", children, appearance, ...props }, ref) => {
  // Select's Root renders no element, so the trigger wires itself to a surrounding Field.
  const theme = useRaxTheme({ appearance })
  const wired = useFieldControlProps(props)
  return (
    // `.form-select` draws the chevron, so no SelectPrimitive.Icon is needed.
    <SelectPrimitive.Trigger
      {...raxThemeAttributes(theme)}
      ref={ref}
      className={cn("form-select rax-select-trigger", selectSizeClasses[size], className)}
      {...wired}
    >
      {children}
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton ref={ref} className={cn("rax-select-scroll-button", className)} {...props}>
    <ChevronIcon direction="up" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton ref={ref} className={cn("rax-select-scroll-button", className)} {...props}>
    <ChevronIcon direction="down" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { appearance?: RaxAppearance }
>(({ className, children, position = "popper", sideOffset = 6, collisionPadding = 8, appearance, ...props }, ref) => {
  const theme = useRaxTheme({ appearance })
  const container = useRaxPortalContainer()
  return (
    <RaxThemeBoundary value={theme}>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          ref={ref}
          {...raxThemeAttributes(theme)}
          position={position}
          // Offsets only apply to the popper; item-aligned overlays the trigger.
          sideOffset={position === "popper" ? sideOffset : undefined}
          collisionPadding={collisionPadding}
          className={cn("rax-select-content", position === "popper" && "rax-select-content-popper", className)}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport className="rax-select-viewport rax-choice-list"><ChoiceHighlight />{children}</SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </RaxThemeBoundary>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => <SelectPrimitive.Label ref={ref} className={cn("rax-select-label", className)} {...props} />)
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn("rax-select-item", className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="rax-select-indicator">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => <SelectPrimitive.Separator ref={ref} className={cn("rax-select-separator", className)} {...props} />)
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
