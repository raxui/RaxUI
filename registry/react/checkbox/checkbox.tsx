"use client"

import * as React from "react"

// Built-in icon paths from Lucide (ISC).
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const checkboxSizeClasses = {
  sm: "sheen-checkbox-sm",
  default: null,
  lg: "sheen-checkbox-lg",
} as const

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  appearance?: import("@/lib/theme").SheenAppearance
  size?: keyof typeof checkboxSizeClasses
  /** `circle` gives the iOS Reminders look. */
  shape?: "square" | "circle"
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, appearance, size = "default", shape = "square", ...props }, forwardedRef) => {
    props = useFieldControlProps(props)
    const rootRef = React.useRef<HTMLButtonElement | null>(null)

    // Play the check animation whenever the box *becomes* checked — by click,
    // keyboard or a parent "select all" — but never on first render.
    React.useEffect(() => {
      const el = rootRef.current
      if (!el) return
      const observer = new MutationObserver(() => {
        el.removeAttribute("data-animate")
        if (el.dataset.state === "unchecked") return
        void el.offsetWidth // restart the keyframes if toggled quickly
        el.setAttribute("data-animate", "")
      })
      observer.observe(el, { attributes: true, attributeFilter: ["data-state"] })
      return () => observer.disconnect()
    }, [])

    return (
      <CheckboxPrimitive.Root
        ref={(node) => {
          rootRef.current = node
          assignRef(forwardedRef, node)
        }}
        data-sheen-appearance={appearance}
      className={cn("sheen-checkbox", checkboxSizeClasses[size], shape === "circle" && "sheen-checkbox-circle", className)}
        {...props}
      >
        {/* Always mounted so the check can animate out as well as in. */}
        <CheckboxPrimitive.Indicator forceMount className="sheen-checkbox-indicator">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="sheen-checkbox-check" d="M5.5 12.5 10 17l8.5-9.5" pathLength={1} />
            <path className="sheen-checkbox-dash" d="M7 12h10" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )
  },
)
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

// Local ref composition keeps copied controls independent of extra helpers.
function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}
