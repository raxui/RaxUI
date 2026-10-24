"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { useSheenTheme, type SheenAppearance } from "@/lib/theme"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & { appearance?: SheenAppearance }
>(({ className, appearance, dir, ...props }, ref) => {
  const theme = useSheenTheme({ appearance, direction: dir })
  const wired = useFieldControlProps(props)
  return <RadioGroupPrimitive.Root ref={ref} dir={theme.direction} data-sheen-appearance={appearance} className={cn("sheen-radio-group", className)} {...wired} />
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const radioSizeClasses = {
  sm: "sheen-radio-sm",
  default: null,
  lg: "sheen-radio-lg",
} as const

export interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  appearance?: import("@/lib/theme").SheenAppearance
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
        data-sheen-appearance={appearance}
        className={cn("sheen-radio", radioSizeClasses[size], className)}
        {...props}
      >
        {/* Always mounted so the dot can shrink away when another option is picked. */}
        <RadioGroupPrimitive.Indicator forceMount className="sheen-radio-indicator" />
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
