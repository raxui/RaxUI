"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
const switchSizeClasses = {
  sm: "sheen-switch-sm",
  default: null,
  lg: "sheen-switch-lg",
} as const

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  appearance?: import("@/lib/theme").SheenAppearance
  size?: keyof typeof switchSizeClasses
  /** Shows a spinner in the thumb and blocks input, e.g. while a change saves. */
  loading?: boolean
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, appearance, size = "default", loading = false, disabled, ...props }, ref) => {
    const wired = useFieldControlProps({ ...props, disabled })
    return (
      <SwitchPrimitive.Root
        ref={ref}
        data-sheen-appearance={appearance}
        className={cn("sheen-switch", switchSizeClasses[size], className)}
        aria-busy={loading || undefined}
        data-loading={loading ? "" : undefined}
        {...wired}
        disabled={wired.disabled || loading}
      >
        <SwitchPrimitive.Thumb className="sheen-switch-thumb">{loading && <span className="spinner-border spinner-border-sm" aria-hidden="true" />}</SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
    )
  },
)
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
