"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { useClientNow } from "@/lib/client-now"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"
import { Button } from "@/components/ui/button"
import { Calendar, addMonths, isSameDay, startOfDay, startOfMonth, type DateRange } from "@/components/ui/calendar"
import { DateInput } from "@/components/ui/date-input"
import type { DateRangePreset } from "@/components/ui/date-range-presets"
export { defaultRangePresets, type DateRangePreset } from "@/components/ui/date-range-presets"
export type DateRangeValue = DateRange
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// -----------------------------------------------------------------------------
// DateRangeInput — start → end in one field (each half is a typed DateInput),
// with a two-month range calendar. Typing a complete start moves on to the end;
// in the calendar the half being chosen is highlighted. Supports min/max
// length (nights), blocked days, per-day content (prices) and presets.
// -----------------------------------------------------------------------------

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM16 2v4M8 2v4M3 10h18" />
  </svg>
)
const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)
  React.useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [query])
  return matches
}

export interface DateRangeInputProps {
  appearance?: RaxAppearance
  readOnly?: boolean
  clearLabel?: string
  pickerLabel?: string
  doneLabel?: string
  presetsLabel?: string
  value?: DateRange
  defaultValue?: DateRange
  onChange?: (range: DateRange) => void
  /** BCP 47 locale (order, numerals, month names). */
  locale?: string
  min?: Date
  max?: Date
  isDateDisabled?: (date: Date) => boolean
  /** Ranges can't span disabled days (bookings). */
  excludeDisabled?: boolean
  /** Shortest / longest range in days between start and end (nights). */
  minDays?: number
  maxDays?: number
  /** Content under each calendar day (e.g. a price). */
  renderDayContent?: (date: Date) => React.ReactNode
  presets?: DateRangePreset[]
  /** Calendar months side by side. Defaults to 2 on wider screens, 1 on phones. */
  numberOfMonths?: 1 | 2
  /** Footer count: "3 nights" (end − start) or "4 days" (inclusive). */
  unit?: "nights" | "days"
  formatSummary?: (range: Required<DateRange>, count: number) => React.ReactNode
  startLabel?: string
  endLabel?: string
  /** Close the calendar as soon as both ends are picked. */
  closeOnComplete?: boolean
  size?: "sm" | "default" | "lg"
  variant?: "glass" | "filled"
  disabled?: boolean
  invalid?: boolean
  clearable?: boolean
  /** Submitted as `${name}_from` / `${name}_to` (YYYY-MM-DD). */
  name?: string
  id?: string
  className?: string
  onBlur?: () => void
  dir?: "ltr" | "rtl"
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
}

const DateRangeInput = React.forwardRef<HTMLDivElement, DateRangeInputProps>(
  (
    {
      appearance,
      readOnly,
      clearLabel = "Clear dates",
      pickerLabel = "Choose dates",
      doneLabel = "Done",
      presetsLabel = "Quick ranges",
      value: valueProp,
      defaultValue = {},
      onChange,
      locale,
      min,
      max,
      isDateDisabled,
      excludeDisabled,
      minDays,
      maxDays,
      renderDayContent,
      presets = [],
      numberOfMonths,
      unit = "days",
      formatSummary,
      startLabel = "Start date",
      endLabel = "End date",
      closeOnComplete = false,
      size = "default",
      variant = "glass",
      disabled,
      invalid,
      clearable = true,
      name,
      id,
      className,
      onBlur,
      dir,
      ...aria
    },
    ref,
  ) => {
    const wired = useFieldControlProps({ ...aria, id, disabled })
    const { disabled: fieldDisabled, ...fieldAria } = wired
    aria = fieldAria
    disabled = fieldDisabled
    id = wired.id
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const theme = useRaxTheme({ appearance, direction: dir })
    const now = useClientNow()
    const [uncontrolled, setUncontrolled] = React.useState<DateRange>(defaultValue)
    const value = valueProp ?? uncontrolled
    const setValue = (next: DateRange) => {
      if (valueProp === undefined) setUncontrolled(next)
      onChange?.(next)
    }

    const [open, setOpen] = React.useState(false)
    const [popoverDir, setPopoverDir] = React.useState<"ltr" | "rtl">()
    const wide = useMediaQuery("(min-width: 640px)")
    const months = numberOfMonths ?? (wide ? 2 : 1)
    const [month, setMonth] = React.useState(() => startOfMonth(value.from ?? now))

    const groupRef = React.useRef<HTMLDivElement | null>(null)
    const endRef = React.useRef<HTMLDivElement | null>(null)

    // Validity of what's typed: end before start, or outside the allowed length.
    const span = value.from && value.to ? daysBetween(value.from, value.to) : undefined
    const reversed = span !== undefined && span < 0
    const badLength =
      span !== undefined && !reversed && ((minDays !== undefined && span < minDays) || (maxDays !== undefined && span > maxDays))
    const isInvalid = !!invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true" || reversed || badLength

    // Which end the next calendar click sets.
    const choosing: "from" | "to" = value.from && !value.to ? "to" : "from"

    const count = span !== undefined && !reversed ? (unit === "nights" ? span : span + 1) : undefined
    const summary =
      value.from && value.to && count !== undefined
        ? (formatSummary?.({ from: value.from, to: value.to }, count) ??
          `${count} ${unit === "nights" ? (count === 1 ? "night" : "nights") : count === 1 ? "day" : "days"}`)
        : value.from
          ? `Select ${endLabel.toLowerCase()}`
          : `Select ${startLabel.toLowerCase()}`

    const editable = !disabled && !readOnly

    return (
      <Popover
        appearance={appearance}
        dir={dir}
        open={open}
        onOpenChange={(next) => {
          if (next) {
            if (groupRef.current) setPopoverDir(dir ?? getDirection(groupRef.current))
            setMonth(startOfMonth(value.from ?? new Date()))
          } else onBlur?.()
          setOpen(next)
        }}
      >
        <PopoverAnchor asChild>
          <div
            {...raxThemeAttributes(theme)}
            ref={(node) => {
              groupRef.current = node
              if (node) node.focus = (options?: FocusOptions) => node.querySelector<HTMLElement>("[data-segment]")?.focus(options)
              assignRef(ref, node)
            }}
            id={fieldId}
            role="group"
            dir={dir}
            className={cn("rax-input-group rax-segmented-range", className)}
            data-size={size}
            data-open={open || undefined}
            data-choosing={open ? choosing : undefined}
            data-disabled={disabled || undefined}
            onBlur={(event) => {
              const next = event.relatedTarget as HTMLElement | null
              if (!event.currentTarget.contains(next) && !next?.closest(".rax-date-popover")) onBlur?.()
            }}
            {...aria}
            // After the spread: an injected aria-invalid={undefined} must not hide our own checks.
            aria-invalid={isInvalid || undefined}
            // Not allowed on role="group"; the halves' segments carry it.
            aria-required={undefined}
          >
            <div className="rax-input rax-date-range-halves" data-variant={variant} aria-invalid={isInvalid || undefined}>
              <div className="rax-date-range-half" data-half="from">
                <DateInput
                  id={`${fieldId}-from`}
                  readOnly={readOnly}
                  aria-label={startLabel}
                  aria-required={aria["aria-required"]}
                  locale={locale}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  picker={false}
                  disabled={disabled}
                  value={value.from ?? null}
                  onChange={(d) => {
                    const wasEmpty = !value.from
                    setValue({ from: d ?? undefined, to: value.to })
                    // A complete start was just typed: carry on with the end.
                    if (d && wasEmpty && !value.to) requestAnimationFrame(() => endRef.current?.focus())
                  }}
                />
              </div>
              <span className="rax-date-range-arrow" aria-hidden="true">
                <ArrowIcon />
              </span>
              <div className="rax-date-range-half" data-half="to">
                <DateInput
                  id={`${fieldId}-to`}
                  readOnly={readOnly}
                  ref={endRef}
                  aria-label={endLabel}
                  aria-required={aria["aria-required"]}
                  locale={locale}
                  min={value.from ?? min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  picker={false}
                  disabled={disabled}
                  value={value.to ?? null}
                  onChange={(d) => setValue({ from: value.from, to: d ?? undefined })}
                />
              </div>
            </div>
            <span className="rax-input-slot" data-side="end">
              {clearable && (value.from || value.to) && editable && (
                <button
                  type="button"
                  className="rax-input-clear"
                  aria-label={clearLabel}
                  onClick={() => {
                    setValue({})
                    groupRef.current?.querySelector<HTMLElement>("[data-segment]")?.focus()
                  }}
                >
                  <ClearIcon />
                </button>
              )}
              <PopoverTrigger asChild>
                <button type="button" className="rax-input-action" aria-label={pickerLabel} disabled={!editable}>
                  <CalendarIcon />
                </button>
              </PopoverTrigger>
            </span>
            {name && (
              <>
                <input type="hidden" name={`${name}_from`} disabled={disabled} value={value.from ? toISODate(value.from) : ""} />
                <input type="hidden" name={`${name}_to`} disabled={disabled} value={value.to ? toISODate(value.to) : ""} />
              </>
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="rax-date-popover rax-date-range-popover"
          dir={popoverDir}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            const content = event.currentTarget as HTMLElement
            requestAnimationFrame(() => content.querySelector<HTMLElement>(".rax-calendar-day[tabindex='0']")?.focus())
          }}
        >
          {open && presets.length > 0 && (
            <div className="rax-date-range-presets" role="group" aria-label={presetsLabel}>
              {presets.map((preset) => {
                const range = preset.range()
                const active = isSameDay(range.from, value.from) && isSameDay(range.to, value.to)
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className="rax-date-range-preset"
                    data-active={active || undefined}
                    onClick={() => {
                      setValue(range)
                      if (range.from) setMonth(startOfMonth(months === 2 && range.to ? addMonths(range.to, -1) : range.from))
                    }}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          )}
          <Calendar
            dir={popoverDir}
            mode="range"
            selected={value}
            onSelect={(next) => {
              setValue(next)
              if (next.from && next.to && closeOnComplete) setOpen(false)
            }}
            month={month}
            onMonthChange={setMonth}
            numberOfMonths={months}
            locale={locale}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            excludeDisabled={excludeDisabled}
            minDays={minDays}
            maxDays={maxDays}
            renderDayContent={renderDayContent}
          />
          <div className="rax-date-footer">
            <span className="rax-date-range-summary" aria-live="polite" data-complete={(value.from && value.to) || undefined}>
              {summary}
            </span>
            <div className="d-flex gap-2">
              <Button variant="ghost" size="sm" disabled={!value.from} onClick={() => setValue({})}>
                {clearLabel}
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                {doneLabel}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)
DateRangeInput.displayName = "DateRangeInput"

export { DateRangeInput }

export { NativeDateRangeInput, type NativeDateRangeInputProps, type NativeDateRangeValue } from "./native-date-range-input"
