"use client"

import * as React from "react"

import { useFieldControlProps } from "@/components/ui/field"
import { useSheenTheme } from "@/lib/theme"

import { cn } from "@/lib/utils"


// -----------------------------------------------------------------------------
// Rating — stars to give a score, or to show one.
//
// Input: a single slider-like control (one Tab stop). Hover / drag previews,
// click commits, clicking the current value clears (`clearable`). Keys:
// ←/→ ↑/↓ step (mirrored in RTL), Home / End, digits 0–9. `allowHalf` steps
// by 0.5. Read-only shows any fraction (4.3 fills 30% of the 5th star).
// `labels` name each score ("Poor" … "Excellent") next to the stars.
// RatingBreakdown is the App Store style average + bars summary.
// -----------------------------------------------------------------------------

// Built-in star path from Lucide (ISC).
const StarIcon = () => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M11.05 2.93a1.06 1.06 0 0 1 1.9 0l2.33 4.73 5.22.76a1.06 1.06 0 0 1 .59 1.8l-3.78 3.69.89 5.2a1.06 1.06 0 0 1-1.54 1.11L12 17.77l-4.67 2.45a1.06 1.06 0 0 1-1.54-1.11l.9-5.2-3.79-3.69a1.06 1.06 0 0 1 .59-1.8l5.22-.76z" />
  </svg>
)

export type RatingColor = "warning" | "primary" | "danger" | "success"

export interface RatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onBlur" | "dir"> {
  appearance?: import("@/lib/theme").SheenAppearance
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Same as onValueChange — lets react-hook-form's {...field} plug straight in. */
  onChange?: (value: number) => void
  onBlur?: () => void
  /** Number of stars. Default 5. */
  max?: number
  /** Step by halves. */
  allowHalf?: boolean
  /** Clicking the current value resets to 0. Default true. */
  clearable?: boolean
  readOnly?: boolean
  disabled?: boolean
  invalid?: boolean
  size?: "sm" | "default" | "lg"
  color?: RatingColor
  /** Replace the star (rendered for the track and the fill). */
  icon?: React.ReactNode
  /** A word per whole score, lowest first: ["Poor", "Fair", "Good", "Great", "Excellent"]. */
  labels?: string[]
  /** Show the label (or the number, with `showValue`) after the stars. */
  showLabel?: boolean
  /** Show the number after the stars, e.g. 4.3. */
  showValue?: boolean
  /** Number of ratings, shown after the value: 4.3 (1,284). */
  count?: number
  /** For numbers, e.g. "ar". */
  locale?: string
  /** Hidden input with this name, for plain form posts. */
  name?: string
  dir?: "ltr" | "rtl"
  /** Accessible text for the value. Default: "4 out of 5 stars, Great". */
  getValueText?: (value: number, max: number, label?: string) => string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const defaultValueText = (value: number, max: number, label?: string) => `${value} out of ${max} stars${label ? `, ${label}` : ""}`

/** `ref` is the slider element (focusable), so form libraries can focus it on errors. */
const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      appearance,
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      onChange,
      onBlur,
      max = 5,
      allowHalf = false,
      clearable = true,
      readOnly = false,
      disabled = false,
      invalid,
      size = "default",
      color = "warning",
      icon,
      labels,
      showLabel = false,
      showValue = false,
      count,
      locale,
      name,
      dir,
      getValueText = defaultValueText,
      className,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      "aria-required": ariaRequired,
      ...props
    },
    ref,
  ) => {
    const wired = useFieldControlProps({ id, disabled, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, "aria-required": ariaRequired })
    disabled = wired.disabled ?? false
    const theme = useSheenTheme({ appearance, direction: dir })
    const getDirection = (element: HTMLElement) => theme.direction ?? getComputedStyle(element).direction
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
    const value = clamp(valueProp ?? uncontrolled, 0, max)
    const [hover, setHover] = React.useState<number | null>(null)
    // Replays the pop on stars that just filled: { n: replay counter, from: previous value }.
    const [pop, setPop] = React.useState({ n: 0, from: 0 })
    const dragging = React.useRef(false)
    const starsRef = React.useRef<HTMLSpanElement>(null)
    const step = allowHalf ? 0.5 : 1
    const interactive = !readOnly && !disabled
    const shown = hover ?? value
    const isInvalid = invalid || wired["aria-invalid"] === true || wired["aria-invalid"] === "true"
    const numberFormat = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale])

    const commit = (next: number) => {
      const v = clamp(Math.round(next / step) * step, 0, max)
      if (valueProp === undefined) setUncontrolled(v)
      if (v !== value) {
        onValueChange?.(v)
        onChange?.(v)
      }
      if (v > value) setPop((p) => ({ n: p.n + 1, from: Math.floor(value) }))
    }

    // Pointer x → score: which star it's over, and which half of it.
    const valueAt = (clientX: number) => {
      const stars = Array.from(starsRef.current?.children ?? []) as HTMLElement[]
      if (!stars.length) return 0
      const rtl = getDirection(starsRef.current!) === "rtl"
      for (let i = 0; i < stars.length; i++) {
        const r = stars[i].getBoundingClientRect()
        const past = rtl ? clientX >= r.left : clientX <= r.right
        if (past || i === stars.length - 1) {
          const fraction = clamp(rtl ? (r.right - clientX) / r.width : (clientX - r.left) / r.width, 0, 1)
          return allowHalf && fraction <= 0.5 ? i + 0.5 : i + 1
        }
      }
      return max
    }

    const label = labels?.[Math.ceil(shown) - 1]
    const valueText = getValueText(value, max, labels?.[Math.ceil(value) - 1])

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive) return
      const rtl = getDirection(event.currentTarget) === "rtl"
      const keys: Record<string, number | undefined> = {
        ArrowUp: value + step,
        ArrowDown: value - step,
        ArrowRight: rtl ? value - step : value + step,
        ArrowLeft: rtl ? value + step : value - step,
        PageUp: value + 1,
        PageDown: value - 1,
        Home: 0,
        End: max,
      }
      let next = keys[event.key]
      if (next === undefined && /^[0-9]$/.test(event.key) && Number(event.key) <= max) next = Number(event.key)
      if (next === undefined) return
      event.preventDefault()
      commit(next)
    }

    const fillOf = (i: number) => clamp(shown - i, 0, 1)

    return (
      <div
        className={cn("sheen-rating", className)}
        data-size={size}
        data-color={color}
        data-readonly={readOnly || undefined}
        data-disabled={disabled || undefined}
        data-invalid={isInvalid || undefined}
        data-hovering={hover !== null || undefined}
        data-sheen-appearance={appearance}
        dir={theme.direction}
        {...props}
      >
        <div
          ref={ref}
          {...wired}
          id={wired.id}
          className="sheen-rating-control"
          {...(readOnly
            ? { role: "img", "aria-label": ariaLabel ?? valueText }
            : {
                role: "slider",
                tabIndex: disabled ? -1 : 0,
                "aria-label": wired["aria-label"],
                "aria-labelledby": wired["aria-labelledby"],
                "aria-describedby": wired["aria-describedby"],
                "aria-valuemin": 0,
                "aria-valuemax": max,
                "aria-valuenow": value,
                "aria-valuetext": valueText,
                "aria-disabled": disabled || undefined,
                "aria-invalid": isInvalid || undefined,
                "aria-required": wired["aria-required"] === true || wired["aria-required"] === "true" || undefined,
              })}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onPointerDown={(event) => {
            if (!interactive || event.button !== 0) return
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            setHover(valueAt(event.clientX))
          }}
          onPointerMove={(event) => {
            if (!interactive || (event.pointerType !== "mouse" && !dragging.current)) return
            setHover(valueAt(event.clientX))
          }}
          onPointerUp={(event) => {
            if (!interactive || !dragging.current) return
            dragging.current = false
            const next = valueAt(event.clientX)
            commit(clearable && next === value ? 0 : next)
            if (event.pointerType !== "mouse") setHover(null)
          }}
          onPointerCancel={() => {
            dragging.current = false
            setHover(null)
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && !dragging.current) setHover(null)
          }}
        >
          <span ref={starsRef} className="sheen-rating-stars" aria-hidden="true">
            {Array.from({ length: max }, (_, i) => {
              const fill = fillOf(i)
              // Based on the committed value, so hovering afterwards doesn't replay it.
              const popping = pop.n > 0 && value - i > 0 && i >= pop.from
              return (
                <span
                  key={popping ? `${i}-${pop.n}` : i}
                  className="sheen-rating-star"
                  data-fill={fill === 1 ? "full" : fill > 0 ? "part" : undefined}
                  data-pointed={hover !== null && Math.ceil(hover) - 1 === i ? "" : undefined}
                  data-pop={popping ? "" : undefined}
                  style={{ "--sheen-rating-fill": fill, "--sheen-rating-i": Math.max(0, i - pop.from) } as React.CSSProperties}
                >
                  <span className="sheen-rating-track">{icon ?? <StarIcon />}</span>
                  <span className="sheen-rating-fill">{icon ?? <StarIcon />}</span>
                </span>
              )
            })}
          </span>
        </div>

        {(showValue || showLabel || count !== undefined) && (
          <span className="sheen-rating-meta" aria-hidden={readOnly ? undefined : true}>
            {showValue && <span className="sheen-rating-value">{numberFormat.format(shown)}</span>}
            {showLabel && label && <span className="sheen-rating-label">{label}</span>}
            {count !== undefined && <span className="sheen-rating-count">({new Intl.NumberFormat(locale).format(count)})</span>}
          </span>
        )}

        {name !== undefined && <input type="hidden" name={name} value={value} disabled={disabled} />}
      </div>
    )
  },
)
Rating.displayName = "Rating"

// ---- Breakdown ---------------------------------------------------------------------------

export interface RatingBreakdownProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ratings per score, lowest first: [1★ count, 2★ count, …]. */
  counts: number[]
  locale?: string
  color?: RatingColor
  /** "1,284 ratings" */
  formatTotal?: (total: number, formatted: string) => string
  /** Accessible text for a bar: "5 stars: 812 ratings, 63%". */
  formatBar?: (stars: number, count: number, percent: number) => string
}

/** Average, stars and a bar per score — App Store style. */
const RatingBreakdown = React.forwardRef<HTMLDivElement, RatingBreakdownProps>(
  (
    {
      counts,
      locale,
      color = "warning",
      formatTotal = (_, formatted) => `${formatted} ratings`,
      formatBar = (stars, count, percent) => `${stars} stars: ${count} ratings, ${percent}%`,
      className,
      ...props
    },
    ref,
  ) => {
    const total = counts.reduce((a, b) => a + b, 0)
    const average = total ? counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / total : 0
    const most = Math.max(...counts, 1)
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

    return (
      <div ref={ref} className={cn("sheen-rating-breakdown", className)} data-color={color} {...props}>
        <div className="sheen-rating-average">
          <span className="sheen-rating-average-value">{number.format(average)}</span>
          <Rating value={Math.round(average * 10) / 10} max={counts.length} readOnly size="sm" color={color} />
          <span className="sheen-rating-average-total">{formatTotal(total, new Intl.NumberFormat(locale).format(total))}</span>
        </div>
        <ul className="sheen-rating-bars">
          {counts
            .map((n, i) => ({ stars: i + 1, n }))
            .reverse()
            .map(({ stars, n }) => {
              const percent = total ? Math.round((n / total) * 100) : 0
              return (
                <li key={stars} aria-label={formatBar(stars, n, percent)}>
                  <span className="sheen-rating-bar-label" aria-hidden="true">
                    {new Intl.NumberFormat(locale).format(stars)}
                  </span>
                  <span className="sheen-rating-bar" aria-hidden="true">
                    <span style={{ "--sheen-rating-bar": n / most } as React.CSSProperties} />
                  </span>
                </li>
              )
            })}
        </ul>
      </div>
    )
  },
)
RatingBreakdown.displayName = "RatingBreakdown"

export { Rating, RatingBreakdown }
