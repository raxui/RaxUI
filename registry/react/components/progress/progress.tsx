"use client"

// SheenUI progress. Source-owned: edit freely. Ported from boot-ui.
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import type { SheenAppearance } from "@/lib/theme"

import { cn } from "@/lib/utils"

export type ProgressColor = "primary" | "success" | "warning" | "danger" | "info" | "neutral"

type RootProps = Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "children" | "color">

const percentOf = (value: number | null | undefined, max: number) =>
  value == null ? null : Math.min(Math.max((value / max) * 100, 0), 100)

// -----------------------------------------------------------------------------
// Linear
// -----------------------------------------------------------------------------

export interface ProgressProps extends RootProps {
  accessibleLabel?: string
  appearance?: SheenAppearance
  color?: ProgressColor
  size?: "sm" | "default" | "lg"
  /** Text above the bar (also the accessible name). */
  label?: React.ReactNode
  /** Show the percentage at the end of the label row. */
  showValue?: boolean
  /** Custom value text, e.g. (v, max) => `${v} of ${max} files`. */
  formatValue?: (value: number, max: number) => string
  /** Split the bar into N segments (steps, stories, onboarding). */
  segments?: number
  /** Turn green once the value reaches max. */
  successOnComplete?: boolean
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  (
    {
      accessibleLabel = "Progress",
      appearance,
      className,
      value,
      max = 100,
      color = "primary",
      size = "default",
      label,
      showValue,
      formatValue = (v, m) => `${Math.round((v / m) * 100)}%`,
      segments,
      successOnComplete,
      getValueLabel,
      ...props
    },
    ref,
  ) => {
    max = Number.isFinite(max) && max > 0 ? max : 100
    value = value == null || !Number.isFinite(value) ? null : Math.min(max, Math.max(0, value))
    const labelId = React.useId()
    const pct = percentOf(value, max)
    const complete = pct === 100
    const tone = successOnComplete && complete ? "success" : color

    const bar = (
      <ProgressPrimitive.Root
        ref={ref}
        data-sheen-appearance={appearance}
        value={value}
        max={max}
        data-value={value ?? undefined}
        data-color={tone}
        data-size={size}
        data-segmented={segments && pct != null ? "" : undefined}
        aria-label={label ? undefined : accessibleLabel}
        aria-labelledby={label ? labelId : undefined}
        getValueLabel={getValueLabel ?? ((v, m) => formatValue(v, m))}
        className={cn("sheen-progress", !label && !showValue && className)}
        {...props}
      >
        {segments && pct != null ? (
          // Each segment fills in turn; the active one animates.
          Array.from({ length: segments }, (_, i) => {
            const fill = pct == null ? 0 : Math.min(Math.max((pct / 100) * segments - i, 0), 1)
            return (
              <span key={i} className="sheen-progress-segment">
                <span
                  className="sheen-progress-indicator"
                  data-empty={fill === 0 || undefined}
                  style={{ transform: `translateX(${(fill - 1) * 100}%)` }}
                />
              </span>
            )
          })
        ) : (
          <ProgressPrimitive.Indicator
            className="sheen-progress-indicator"
            style={pct == null ? undefined : { transform: `translateX(${pct - 100}%)` }}
          />
        )}
      </ProgressPrimitive.Root>
    )

    if (!label && !showValue) return bar

    return (
      <div className={cn("sheen-progress-field", className)} data-complete={complete || undefined}>
        <div className="sheen-progress-label-row">
          {label && (
            <span id={labelId} className="sheen-progress-label">
              {label}
            </span>
          )}
          {showValue && value != null && (
            <span className="sheen-progress-value" aria-hidden="true">
              {formatValue(value, max)}
            </span>
          )}
        </div>
        {bar}
      </div>
    )
  },
)
Progress.displayName = "Progress"

// -----------------------------------------------------------------------------
// Circular
// -----------------------------------------------------------------------------

export interface ProgressCircleProps extends RootProps {
  appearance?: SheenAppearance
  color?: ProgressColor
  /** Diameter in px. */
  size?: number
  /** Ring thickness in px. */
  formatValue?: (value: number, max: number) => string
  thickness?: number
  /** Centre content. Defaults to the percentage (hidden below 40px). */
  children?: React.ReactNode
  showValue?: boolean
  successOnComplete?: boolean
}

const ProgressCircle = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressCircleProps>(
  (
    {
      className,
      value,
      max = 100,
      color = "primary",
      appearance,
      size = 56,
      thickness,
      formatValue = (v, m) => `${Math.round(v / m * 100)}%`,
      children,
      showValue = size >= 40,
      successOnComplete,
      style,
      ...props
    },
    ref,
  ) => {
    max = Number.isFinite(max) && max > 0 ? max : 100
    value = value == null || !Number.isFinite(value) ? null : Math.min(max, Math.max(0, value))
    const pct = percentOf(value, max)
    const stroke = thickness ?? Math.max(3, Math.round(size / 11))
    const radius = (size - stroke) / 2
    const tone = successOnComplete && pct === 100 ? "success" : color

    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        max={max}
        getValueLabel={formatValue}
        data-color={tone}
        data-sheen-appearance={appearance}
        data-value={value ?? undefined}
        className={cn("sheen-progress-circle", className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle className="sheen-progress-circle-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
          <circle
            className="sheen-progress-circle-bar"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            pathLength={100}
            style={{ strokeDashoffset: pct == null ? 72 : 100 - pct }}
          />
        </svg>
        {(children ?? (showValue && pct != null)) && (
          <span className="sheen-progress-circle-content" style={{ fontSize: Math.max(10, size * 0.24) }}>
            {children ?? formatValue(value!, max)}
          </span>
        )}
      </ProgressPrimitive.Root>
    )
  },
)
ProgressCircle.displayName = "ProgressCircle"

export { Progress, ProgressCircle }
