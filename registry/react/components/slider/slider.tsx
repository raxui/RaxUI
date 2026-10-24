"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { useFieldControlProps } from "@/components/ui/field"
import { useSheenTheme } from "@/lib/theme"

import { cn } from "@/lib/utils"

const sliderSizeClasses = {
  sm: "sheen-slider-sm",
  default: null,
  lg: "sheen-slider-lg",
} as const

export type SliderMark = number | { value: number; label?: React.ReactNode }

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  appearance?: import("@/lib/theme").SheenAppearance
  size?: keyof typeof sliderSizeClasses
  /** `bar` is the thick Control Center style. */
  variant?: "default" | "bar"
  /** Value bubble on the thumb: while interacting (true), always, or never. */
  showValue?: boolean | "always"
  formatValue?: (value: number) => React.ReactNode
  /** Tick marks (horizontal sliders), optionally with labels. */
  marks?: SliderMark[]
  /** Leading icon for the `bar` variant. */
  icon?: React.ReactNode
  /** Accessible names, one per thumb (e.g. ["Minimum price", "Maximum price"]). */
  thumbLabels?: string[]
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    {
      className,
      appearance,
      dir,
      size = "default",
      variant = "default",
      showValue = true,
      formatValue = (value) => value,
      marks,
      icon,
      thumbLabels,
      min = 0,
      step = 1,
      max = 100,
      value,
      defaultValue,
      onValueChange,
      onPointerDown,
      onLostPointerCapture,
      // The thumbs are the focusable sliders, so naming / description go to them.
      "aria-label": ariaLabel,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const wired = useFieldControlProps({ ...props, "aria-label": ariaLabel, "aria-labelledby": labelledBy, "aria-describedby": describedBy, "aria-invalid": ariaInvalid })
    const theme = useSheenTheme({ appearance, direction: dir })
    const rootRef = React.useRef<HTMLSpanElement | null>(null)
    const [computedDir, setComputedDir] = React.useState<"ltr" | "rtl">("ltr")
    React.useLayoutEffect(() => {
      const root = rootRef.current
      if (!root || theme.direction) return
      // Radix writes its default dir on the root. Read inheritance without that
      // generated attribute, otherwise it masks an app's surrounding RTL scope.
      const previous = root.getAttribute("dir")
      root.removeAttribute("dir")
      let element: HTMLElement | null = root
      let inherited = ""
      while (element && !inherited) {
        inherited = getComputedStyle(element).direction || element.dir
        element = element.parentElement
      }
      if (previous !== null) root.setAttribute("dir", previous)
      setComputedDir(inherited === "rtl" ? "rtl" : "ltr")
    })
    const direction = theme.direction ?? computedDir
    // Track values ourselves only to label thumbs and colour marks; Radix stays the source of truth.
    const [internal, setInternal] = React.useState(defaultValue ?? [min])
    const values = value ?? internal
    const [dragging, setDragging] = React.useState(false)

    const percent = (v: number) => ((v - min) / ((max - min || 1))) * 100
    const normalizedMarks = (marks ?? []).map((mark) => (typeof mark === "number" ? { value: mark } : mark))
    const hasLabels = normalizedMarks.some((mark) => mark.label !== undefined)
    const rangeStart = values.length > 1 ? Math.min(...values) : min
    const rangeEnd = Math.max(...values)

    const barIcon = variant === "bar" && icon ? <span className="sheen-slider-bar-icon">{icon}</span> : null

    return (
      <SliderPrimitive.Root
        ref={(node) => { rootRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node }}
        data-sheen-appearance={appearance}
        dir={direction}
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          if (value === undefined) setInternal(next)
          onValueChange?.(next)
        }}
        data-dragging={dragging ? "" : undefined}
        // Radix captures the pointer while dragging; losing it means the drag ended.
        onPointerDown={(event) => {
          onPointerDown?.(event)
          setDragging(true)
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event)
          setDragging(false)
        }}
        className={cn(
          "sheen-slider",
          sliderSizeClasses[size],
          variant === "bar" && "sheen-slider-bar",
          showValue === "always" && "sheen-slider-value-always",
          hasLabels && "sheen-slider-has-labels",
          className,
        )}
        {...wired}
        id={undefined}
      >
        <SliderPrimitive.Track className="sheen-slider-track">
          {barIcon}
          <SliderPrimitive.Range className="sheen-slider-range">{barIcon}</SliderPrimitive.Range>
        </SliderPrimitive.Track>

        {normalizedMarks.length > 0 && (
          <span className="sheen-slider-marks" aria-hidden="true">
            {normalizedMarks.map((mark) => {
              const p = percent(mark.value)
              // Same in-bounds offset Radix applies to thumbs, so marks sit under them exactly.
              const offset = `calc(${p}% + var(--sheen-slider-thumb) * ${0.5 - p / 100})`
              const inRange = mark.value >= rangeStart && mark.value <= rangeEnd
              return (
                <React.Fragment key={mark.value}>
                  <span className="sheen-slider-mark" style={{ [direction === "rtl" ? "right" : "left"]: offset }} data-in-range={inRange ? "" : undefined} />
                  {mark.label !== undefined && (
                    <span className="sheen-slider-mark-label" style={{ [direction === "rtl" ? "right" : "left"]: offset }} data-active={values.includes(mark.value) ? "" : undefined}>
                      {mark.label}
                    </span>
                  )}
                </React.Fragment>
              )
            })}
          </span>
        )}

        {values.map((v, i) => (
          <SliderPrimitive.Thumb
            key={i}
            id={i === 0 ? wired.id : undefined}
            aria-required={wired["aria-required"]}
            className="sheen-slider-thumb"
            aria-label={thumbLabels?.[i] ?? (wired["aria-labelledby"] ? undefined : wired["aria-label"])}
            aria-labelledby={thumbLabels?.[i] ? undefined : wired["aria-labelledby"]}
            aria-describedby={wired["aria-describedby"]}
            aria-invalid={wired["aria-invalid"]}
          >
            {showValue !== false && <span className="sheen-slider-value">{formatValue(v)}</span>}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>
    )
  },
)
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
