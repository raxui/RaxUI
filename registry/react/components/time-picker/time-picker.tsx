"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { useClientNow } from "@/lib/client-now"
import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// TimePicker — iOS-style wheels (hours · minutes · AM/PM). Each wheel is a
// scroll-snapping listbox: flick or drag to spin, click an item, or use
// ↑/↓ PageUp/PageDown Home/End. The centred item is the value.
// -----------------------------------------------------------------------------

export interface TimeValue {
  /** 0–23 */
  hours: number
  minutes: number
}

const ITEM_HEIGHT = 36 // px — keep in sync with --rax-wheel-item in _time-picker.scss

interface WheelOption {
  value: number
  label: string
}

interface WheelProps {
  options: WheelOption[]
  /** Where the wheel rests. */
  value: number
  /** False until the user picks something: the wheel shows a suggestion (now) but nothing is selected. */
  committed: boolean
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  autoFocus?: boolean
}

function Wheel({ options, value, committed, onChange, label, disabled, autoFocus }: WheelProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const settle = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const wheelId = React.useId()
  const programmatic = React.useRef<number | null>(null)
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  const scrollToIndex = React.useCallback((i: number, smooth: boolean) => {
    const el = ref.current
    if (!el) return
    smooth = smooth && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const target = i * ITEM_HEIGHT
    if (programmatic.current === target) return
    clearTimeout(settle.current)
    programmatic.current = target
    el.scrollTo({ top: target, behavior: smooth ? "smooth" : "instant" })
  }, [])

  // Follow the value (initial position is instant, later changes glide).
  const mounted = React.useRef(false)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (Math.round(el.scrollTop / ITEM_HEIGHT) !== index) scrollToIndex(index, mounted.current)
    mounted.current = true
  }, [index, scrollToIndex])

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])

  // When a user scroll comes to rest, the centred option becomes the value.
  const startUserScroll = () => {
    programmatic.current = null
    clearTimeout(settle.current)
  }
  const onScroll = () => {
    if (disabled) return
    // A long smooth scroll must reach its target before intermediate frames can commit.
    if (programmatic.current !== null) {
      if (Math.abs((ref.current?.scrollTop ?? 0) - programmatic.current) <= 1) programmatic.current = null
      return
    }
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)))
      if (!committed || options[i].value !== value) onChange(options[i].value)
    }, 90)
  }
  React.useEffect(() => () => clearTimeout(settle.current), [])

  const select = (i: number) => {
    const clamped = Math.min(options.length - 1, Math.max(0, i))
    scrollToIndex(clamped, true)
    if (!committed || options[clamped].value !== value) onChange(options[clamped].value)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || event.nativeEvent.isComposing) return
    const keys: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      PageUp: index - 5,
      PageDown: index + 5,
      Home: 0,
      End: options.length - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    select(keys[event.key])
  }

  return (
    <div className="rax-wheel">
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={committed ? `${wheelId}-${value}` : undefined}
        data-committed={committed || undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className="rax-wheel-list"
        onWheel={startUserScroll}
        onPointerDown={startUserScroll}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        {options.map((option, i) => (
          <div
            key={option.value}
            id={`${wheelId}-${option.value}`}
            role="option"
            aria-selected={committed && option.value === value}
            className="rax-wheel-item"
            onClick={() => !disabled && select(i)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export interface TimePickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  appearance?: RaxAppearance
  value?: TimeValue | null
  defaultValue?: TimeValue | null
  onChange?: (value: TimeValue) => void
  /** BCP 47 locale for numerals and AM/PM labels. */
  locale?: string
  /** Force a 12- or 24-hour clock (defaults to the locale's). */
  hourCycle?: 12 | 24
  /** Minutes offered: 1, 5, 15… */
  minuteStep?: number
  disabled?: boolean
  /** Focus the hour wheel on mount (used inside popovers). */
  autoFocus?: boolean
}

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  ({ appearance, value: valueProp, defaultValue, onChange, locale, hourCycle, minuteStep = 1, disabled, autoFocus, className, ...props }, ref) => {
    const wired = useFieldControlProps({ ...props, disabled })
    disabled = wired.disabled
    props = wired
    const theme = useRaxTheme({ appearance })
    minuteStep = Math.max(1, Math.min(60, Math.floor(minuteStep) || 1))
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? null)
    const value = valueProp === undefined ? uncontrolled : valueProp

    const { h12, numbers, plain, am, pm, names } = React.useMemo(() => {
      const resolved = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions() as { hourCycle?: string }
      const period = (h: number) =>
        new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12" })
          .formatToParts(new Date(2026, 0, 1, h))
          .find((p) => p.type === "dayPeriod")?.value ?? (h < 12 ? "AM" : "PM")
      let labels = { hour: "Hour", minute: "Minute", dayPeriod: "AM/PM" }
      try {
        const display = new Intl.DisplayNames(locale, { type: "dateTimeField" })
        labels = {
          hour: display.of("hour") ?? labels.hour,
          minute: display.of("minute") ?? labels.minute,
          dayPeriod: display.of("dayPeriod") ?? labels.dayPeriod,
        }
      } catch {
        // keep English labels
      }
      return {
        h12: hourCycle ? hourCycle === 12 : !!resolved.hourCycle?.startsWith("h1"),
        numbers: new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 2 }),
        plain: new Intl.NumberFormat(locale, { useGrouping: false }),
        am: period(9),
        pm: period(21),
        names: labels,
      }
    }, [locale, hourCycle])

    // Before anything is picked, the wheels rest on "now" (rounded to the step) without committing it.
    const now = useClientNow()
    const fallback = { hours: now.getHours(), minutes: Math.floor(now.getMinutes() / minuteStep) * minuteStep }
    const shown = value ?? fallback

    const set = (next: TimeValue) => {
      if (valueProp === undefined) setUncontrolled(next)
      onChange?.(next)
    }

    const hourOptions = h12
      ? Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: plain.format(i + 1) })) // 12-hour: "5", like iOS
      : Array.from({ length: 24 }, (_, i) => ({ value: i, label: numbers.format(i) }))
    const minuteOptions = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => ({
      value: i * minuteStep,
      label: numbers.format(i * minuteStep),
    }))
    const isPm = shown.hours >= 12
    const displayHour = h12 ? shown.hours % 12 || 12 : shown.hours

    return (
      <div
        {...raxThemeAttributes(theme)}
        ref={ref}
        role="group"
        aria-label="Time"
        data-disabled={disabled || undefined}
        className={cn("rax-time-wheel", className)}
        // Wheels read top-to-bottom; keep hour → minute order left-to-right in every script.
        dir="ltr"
        {...props}
      >
        <span className="rax-wheel-band" aria-hidden="true" />
        <Wheel
          label={names.hour}
          options={hourOptions}
          value={displayHour}
          committed={!!value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(h) => set({ ...shown, hours: h12 ? (h % 12) + (isPm ? 12 : 0) : h })}
        />
        <span className="rax-wheel-colon" aria-hidden="true">
          :
        </span>
        <Wheel
          label={names.minute}
          options={minuteOptions}
          value={(Math.round(shown.minutes / minuteStep) * minuteStep) % 60}
          committed={!!value}
          disabled={disabled}
          onChange={(m) => set({ ...shown, minutes: m })}
        />
        {h12 && (
          <Wheel
            label={names.dayPeriod}
            options={[
              { value: 0, label: am },
              { value: 1, label: pm },
            ]}
            value={isPm ? 1 : 0}
            committed={!!value}
            disabled={disabled}
            onChange={(p) => set({ ...shown, hours: (shown.hours % 12) + (p ? 12 : 0) })}
          />
        )}
      </div>
    )
  },
)
TimePicker.displayName = "TimePicker"

export { TimePicker }

export { NativeTimePicker, type NativeTimePickerProps } from "./native-time-picker"
