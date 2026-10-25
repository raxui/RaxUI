"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { assignRef } from "@/lib/refs"
import { useClientNow } from "@/lib/client-now"
import { defaultRangePresets, type DateRangePreset } from "@/components/ui/date-range-presets"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { Button } from "@/components/ui/button"
import { Calendar, addMonths, isSameDay, startOfDay, startOfMonth, type DateRange } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const inputSizeClasses = { sm: "form-control-sm", default: null, lg: "form-control-lg" } as const
const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium" }

const toISODate = (d: Date) => `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function formatRange(range: DateRange, formatter: Intl.DateTimeFormat) {
  if (!range.from) return ""
  if (!range.to) return `${formatter.format(range.from)} – …`
  if (range.to < range.from) return `${formatter.format(range.from)} – ${formatter.format(range.to)}`
  const format = (formatter as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string }).formatRange
  return typeof format === "function"
    // Node and browsers can use different ICU whitespace around range separators.
    ? format.call(formatter, range.from, range.to).replace(/\s*–\s*/g, " – ")
    : `${formatter.format(range.from)} – ${formatter.format(range.to)}`
}

/** Open on the selected (or today's) day instead of the first button, so arrows work right away. */
const focusActiveDay = (event: Event) => {
  event.preventDefault()
  const content = event.currentTarget as HTMLElement
  requestAnimationFrame(() => content.querySelector<HTMLElement>(".sheen-calendar-day[tabindex='0']")?.focus())
}

/** The popover is portaled to <body>, so carry the field's text direction (RTL) over to it. */
function useFieldDirection() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [dir, setDir] = React.useState<"ltr" | "rtl">()
  const capture = () => {
    if (ref.current) setDir(getDirection(ref.current))
  }
  return { ref, dir, capture }
}

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

interface SharedPickerProps {
  appearance?: SheenAppearance
  dir?: "ltr" | "rtl"
  variant?: "glass" | "outline" | "filled"
  invalid?: boolean
  readOnly?: boolean
  onBlur?: () => void
  clearLabel?: string
  calendarLabel?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-required"?: boolean | "true" | "false"
  placeholder?: string
  /** BCP 47 locale, e.g. "en-GB" or "ar". */
  locale?: string
  min?: Date
  max?: Date
  isDateDisabled?: (date: Date) => boolean
  disabled?: boolean
  /** Show the clear (×) button when there is a value. */
  clearable?: boolean
  size?: keyof typeof inputSizeClasses
  id?: string
  /** Submits the value as YYYY-MM-DD (ranges: `${name}_from` / `${name}_to`). */
  name?: string
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  /** Display format for the field. Defaults to `{ dateStyle: "medium" }`. */
  formatOptions?: Intl.DateTimeFormatOptions
}

// ---- DatePicker ------------------------------------------------------------------

export interface DatePickerProps extends SharedPickerProps {
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (date: Date | null) => void
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker({
  appearance, dir, variant = "filled", invalid, readOnly, onBlur,
  clearLabel = "Clear date", calendarLabel = "Choose date",
  value: valueProp,
  defaultValue = null,
  onChange,
  placeholder = "Pick a date",
  locale,
  min,
  max,
  isDateDisabled,
  disabled,
  clearable = true,
  size = "default",
  id,
  name,
  className,
  formatOptions = DEFAULT_FORMAT,
  ...aria
}: DatePickerProps, forwardedRef) {
  const wired = useFieldControlProps({ ...aria, id, disabled })
  disabled = wired.disabled; id = wired.id; aria = wired
  const theme = useSheenTheme({ appearance, direction: dir })
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popupId = React.useId()
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const value = valueProp === undefined ? uncontrolled : valueProp
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => { if (disabled || readOnly) setOpen(false) }, [disabled, readOnly])
  const field = useFieldDirection()
  const formatter = React.useMemo(() => new Intl.DateTimeFormat(locale, formatOptions), [locale, formatOptions])

  const isInvalid = invalid || wired["aria-invalid"] || !!(value && ((min && startOfDay(value) < startOfDay(min)) || (max && startOfDay(value) > startOfDay(max)) || isDateDisabled?.(value)))
  const setValue = (next: Date | null) => {
    if (valueProp === undefined) setUncontrolled(next)
    onChange?.(next)
  }

  return (
    <div {...sheenThemeAttributes(theme)} dir={dir} ref={field.ref} className={cn("sheen-picker-field", className)} onBlur={event => { const next = event.relatedTarget as Node | null; if (!event.currentTarget.contains(next) && !document.getElementById(popupId)?.contains(next)) onBlur?.() }}>
      <Popover
        appearance={appearance}
        dir={dir}
        open={open}
        onOpenChange={(next) => {
          if (next) field.capture()
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            ref={node => { triggerRef.current = node; assignRef(forwardedRef, node) }}
            id={id}
            disabled={disabled}
            aria-disabled={readOnly || disabled || undefined}
            onClick={event => { if (readOnly) event.preventDefault() }}
            data-variant={variant}
            className={cn("form-control sheen-input sheen-picker-trigger", inputSizeClasses[size])}
            data-placeholder={value ? undefined : ""}
            {...aria}
            aria-invalid={isInvalid || undefined}
            aria-controls={open ? popupId : undefined}
          >
            <CalendarIcon />
            <span>{value ? formatter.format(value) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent id={popupId} aria-label={calendarLabel} align="start" className="sheen-picker-popover" onOpenAutoFocus={focusActiveDay} dir={field.dir}>
          <Calendar
            dir={field.dir}
            selected={value}
            onSelect={(date) => {
              if (disabled || readOnly) return
              setValue(date)
              setOpen(false)
            }}
            locale={locale}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled && !readOnly && (
        <button type="button" className="sheen-picker-clear" aria-label={clearLabel} onClick={() => { setValue(null); triggerRef.current?.focus() }}>
          <XIcon />
        </button>
      )}
      {name && <input type="hidden" name={name} disabled={disabled} value={value ? toISODate(value) : ""} />}
    </div>
  )
})
DatePicker.displayName = "DatePicker"

// ---- DateRangePicker ---------------------------------------------------------------

export interface DateRangePickerProps extends SharedPickerProps {
  applyLabel?: string
  cancelLabel?: string
  presetsLabel?: string
  startPrompt?: string
  value?: DateRange
  defaultValue?: DateRange
  onChange?: (range: DateRange) => void
  /** Quick ranges shown beside the calendar (hidden on phones). Pass `[]` to hide. */
  presets?: DateRangePreset[]
}

const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(function DateRangePicker({
  appearance, dir, variant = "filled", invalid, readOnly, onBlur,
  clearLabel = "Clear dates", calendarLabel = "Choose date range",
  applyLabel = "Apply", cancelLabel = "Cancel", presetsLabel = "Quick ranges", startPrompt = "Select a start date",
  value: valueProp,
  defaultValue = {},
  onChange,
  placeholder = "Pick a date range",
  locale,
  min,
  max,
  isDateDisabled,
  disabled,
  clearable = true,
  size = "default",
  id,
  name,
  className,
  formatOptions = DEFAULT_FORMAT,
  presets = defaultRangePresets,
  ...aria
}: DateRangePickerProps, forwardedRef) {
  const wired = useFieldControlProps({ ...aria, id, disabled })
  disabled = wired.disabled; id = wired.id; aria = wired
  const theme = useSheenTheme({ appearance, direction: dir })
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const popupId = React.useId()
  const now = useClientNow()
  const [uncontrolled, setUncontrolled] = React.useState<DateRange>(defaultValue)
  const value = valueProp ?? uncontrolled
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => { if (disabled || readOnly) setOpen(false) }, [disabled, readOnly])
  // Edits happen on a draft; Apply commits it, Cancel / Escape discard it.
  const [draft, setDraft] = React.useState<DateRange>(value)
  const [calendarMonth, setCalendarMonth] = React.useState(() => startOfMonth(value.from ?? now))
  const twoMonths = useMediaQuery("(min-width: 640px)")
  const field = useFieldDirection()
  const formatter = React.useMemo(() => new Intl.DateTimeFormat(locale, formatOptions), [locale, formatOptions])

  const commit = (next: DateRange) => {
    if (disabled || readOnly) return
    if (valueProp === undefined) setUncontrolled(next)
    onChange?.(next)
  }

  const onOpenChange = (next: boolean) => {
    if (next) {
      field.capture()
      setDraft(value)
      setCalendarMonth(startOfMonth(value.from ?? new Date()))
    }
    setOpen(next)
  }

  const outside = (date: Date) => !!((min && startOfDay(date) < startOfDay(min)) || (max && startOfDay(date) > startOfDay(max)) || isDateDisabled?.(date))
  const invalidRange = (range: DateRange) => !!((range.from && outside(range.from)) || (range.to && outside(range.to)) || (range.from && range.to && range.from > range.to))
  const isInvalid = invalid || wired["aria-invalid"] || invalidRange(value)
  const hasValue = !!value.from

  return (
    <div {...sheenThemeAttributes(theme)} dir={dir} ref={field.ref} className={cn("sheen-picker-field", className)} onBlur={event => { const next = event.relatedTarget as Node | null; if (!event.currentTarget.contains(next) && !document.getElementById(popupId)?.contains(next)) onBlur?.() }}>
      <Popover appearance={appearance} dir={dir} open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            ref={node => { triggerRef.current = node; assignRef(forwardedRef, node) }}
            id={id}
            disabled={disabled}
            aria-disabled={readOnly || disabled || undefined}
            onClick={event => { if (readOnly) event.preventDefault() }}
            data-variant={variant}
            className={cn("form-control sheen-input sheen-picker-trigger", inputSizeClasses[size])}
            data-placeholder={hasValue ? undefined : ""}
            {...aria}
            aria-invalid={isInvalid || undefined}
            aria-controls={open ? popupId : undefined}
          >
            <CalendarIcon />
            <span>{hasValue ? formatRange(value, formatter) : placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent id={popupId} aria-label={calendarLabel} align="start" className="sheen-picker-popover" onOpenAutoFocus={focusActiveDay} dir={field.dir}>
          <div className="sheen-picker-range-body">
            {open && presets.length > 0 && (
              <div className="sheen-picker-presets" role="group" aria-label={presetsLabel}>
                {presets.map((preset) => {
                  const range = preset.range()
                  const active = isSameDay(range.from, draft.from) && isSameDay(range.to, draft.to)
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className="sheen-picker-preset"
                      data-active={active ? "" : undefined}
                      onClick={() => {
                        setDraft(range)
                        if (range.from) setCalendarMonth(startOfMonth(twoMonths && range.to ? addMonths(range.to, -1) : range.from))
                      }}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            )}
            <Calendar
              dir={field.dir}
              mode="range"
              selected={draft}
              onSelect={setDraft}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              numberOfMonths={twoMonths ? 2 : 1}
              locale={locale}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
            />
          </div>
          <div className="sheen-picker-footer">
            <span aria-live="polite">{draft.from ? formatRange(draft, formatter) : startPrompt}</span>
            <div className="d-flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                disabled={!draft.from || !draft.to || invalidRange(draft)}
                onClick={() => {
                  commit(draft)
                  setOpen(false)
                }}
              >
                {applyLabel}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {clearable && hasValue && !disabled && !readOnly && (
        <button type="button" className="sheen-picker-clear" aria-label={clearLabel} onClick={() => { commit({}); triggerRef.current?.focus() }}>
          <XIcon />
        </button>
      )}
      {name && (
        <>
          <input type="hidden" name={`${name}_from`} disabled={disabled} value={value.from ? toISODate(value.from) : ""} />
          <input type="hidden" name={`${name}_to`} disabled={disabled} value={value.to ? toISODate(value.to) : ""} />
        </>
      )}
    </div>
  )
})
DateRangePicker.displayName = "DateRangePicker"

export { DatePicker, DateRangePicker }
export { defaultRangePresets, type DateRangePreset } from "@/components/ui/date-range-presets"
