"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { useRaxTheme, type RaxAppearance } from "@/lib/theme"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & { appearance?: RaxAppearance }
>(({ className, appearance, dir, ...props }, ref) => {
  const theme = useRaxTheme({ appearance, direction: dir })
  const wired = useFieldControlProps(props)
  return <RadioGroupPrimitive.Root ref={ref} dir={theme.direction} data-rax-appearance={appearance} className={cn("rax-radio-group", className)} {...wired} />
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const radioSizeClasses = {
  sm: "rax-radio-sm",
  default: null,
  lg: "rax-radio-lg",
} as const

export interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  appearance?: import("@/lib/theme").RaxAppearance
  size?: keyof typeof radioSizeClasses
}

const RadioGroupItem = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioGroupItemProps>(
  ({ className, appearance, size = "default", ...props }, forwardedRef) => {
    const itemRef = React.useRef<HTMLButtonElement | null>(null)

    // Pop + ring only when this item *becomes* selected — never on first render.
    React.useEffect(() => {
      const el = itemRef.current
      if (!el) return
      const observer = new MutationObserver(() => {
        el.removeAttribute("data-animate")
        if (el.dataset.state !== "checked") return
        void el.offsetWidth // restart the keyframes on quick re-selection
        el.setAttribute("data-animate", "")
      })
      observer.observe(el, { attributes: true, attributeFilter: ["data-state"] })
      return () => observer.disconnect()
    }, [])

    return (
      <RadioGroupPrimitive.Item
        ref={(node) => {
          itemRef.current = node
          assignRef(forwardedRef, node)
        }}
        data-rax-appearance={appearance}
        className={cn("rax-radio", radioSizeClasses[size], className)}
        {...props}
      >
        {/* Always mounted so the dot can shrink away when another option is picked. */}
        <RadioGroupPrimitive.Indicator forceMount className="rax-radio-indicator" />
      </RadioGroupPrimitive.Item>
    )
  },
)
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }

// Local ref composition keeps copied controls independent of extra helpers.
function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}
