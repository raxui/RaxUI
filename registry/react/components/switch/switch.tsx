"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { useFieldControlProps } from "@/components/ui/field"
import { cn } from "@/lib/utils"
const switchSizeClasses = {
  sm: "rax-switch-sm",
  default: null,
  lg: "rax-switch-lg",
} as const

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  appearance?: import("@/lib/theme").RaxAppearance
  size?: keyof typeof switchSizeClasses
  /** Shows a spinner in the thumb and blocks input, e.g. while a change saves. */
  loading?: boolean
  /** Icon in the thumb; it takes the "on" tint when checked. */
  icon?: React.ReactNode
  /** Icon in the thumb when checked; `icon` then shows only when unchecked. */
  checkedIcon?: React.ReactNode
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, appearance, size = "default", loading = false, icon, checkedIcon, disabled, ...props }, ref) => {
    const wired = useFieldControlProps({ ...props, disabled })
    return (
      <SwitchPrimitive.Root
        ref={ref}
        data-rax-appearance={appearance}
        className={cn("rax-switch", switchSizeClasses[size], className)}
        aria-busy={loading || undefined}
        data-loading={loading ? "" : undefined}
        {...wired}
        disabled={wired.disabled || loading}
      >
        <SwitchPrimitive.Thumb className="rax-switch-thumb">
          {loading ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <>
              {icon && <span className="rax-switch-icon" data-when={checkedIcon ? "unchecked" : undefined} aria-hidden="true">{icon}</span>}
              {checkedIcon && <span className="rax-switch-icon" data-when="checked" aria-hidden="true">{checkedIcon}</span>}
            </>
          )}
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
    )
  },
)
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
