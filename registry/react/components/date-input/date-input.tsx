"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { useFieldControlProps } from "@/components/ui/field"
import { useClientNow } from "@/lib/client-now"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"
import { assignRef } from "@/lib/refs"
import { Calendar, startOfDay } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/ui/time-picker"

// -----------------------------------------------------------------------------
// Typed date / time fields (iOS / React Aria style): every part is its own
// spinbutton segment. Type digits (auto-advances), ↑/↓ to step, ←/→ to move,
// Backspace to erase. Order, separators, numerals and AM/PM follow the locale.
// -----------------------------------------------------------------------------

type NumericType = "year" | "month" | "day" | "hour" | "minute"
type SegmentType = NumericType | "dayPeriod"
type Parts = Partial<Record<NumericType, number>> & { dayPeriod?: "am" | "pm" }
type Segment = { type: SegmentType } | { type: "literal"; text: string }

const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g
const DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
}
const toAsciiDigit = (ch: string) => DIGITS[ch] ?? ch

const daysInMonth = (year: number | undefined, month: number | undefined) => (month ? new Date(year ?? 2000, month, 0).getDate() : 31) // 2000 is a leap year: allow Feb 29 until the year is known

const pad = (n: number, length: number) => String(n).padStart(length, "0")

/** Locale-driven layout: which segments, in what order, with which separators. */
function useLayout(locale: string | undefined, date: boolean, time: boolean, hourCycle: 12 | 24 | undefined) {
  return React.useMemo(() => {
    const h12 = hourCycle
      ? hourCycle === 12
      : (new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions() as { hourCycle?: string }).hourCycle?.startsWith("h1")
    const options: Intl.DateTimeFormatOptions = {
      ...(date && { year: "numeric", month: "2-digit", day: "2-digit" }),
      ...(time && { hour: "2-digit", minute: "2-digit", hourCycle: h12 ? "h12" : "h23" }),
    }
    const formatter = new Intl.DateTimeFormat(locale, options)
    const segments: Segment[] = []
    for (const part of formatter.formatToParts(new Date(2026, 10, 22, 13, 45))) {
      if (part.type === "literal") {
        const text = part.value.replace(BIDI_MARKS, "")
        if (text) segments.push({ type: "literal", text })
      } else if (["year", "month", "day", "hour", "minute", "dayPeriod"].includes(part.type)) {
        segments.push({ type: part.type as SegmentType })
      }
    }
    const periodOf = (h: number) =>
      new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12" })
        .formatToParts(new Date(2026, 0, 1, h))
        .find((p) => p.type === "dayPeriod")?.value ?? (h < 12 ? "AM" : "PM")
    let names: Partial<Record<SegmentType, string>> = {}
    try {
      const display = new Intl.DisplayNames(locale, { type: "dateTimeField" })
      names = {
        year: display.of("year"),
        month: display.of("month"),
        day: display.of("day"),
        hour: display.of("hour"),
        minute: display.of("minute"),
        dayPeriod: display.of("dayPeriod"),
      }
    } catch {
      // Older engines: fall back to English names below.
    }
    return {
      segments,
      h12: !!h12,
      periods: { am: periodOf(9), pm: periodOf(21) },
      names,
      numbers: new Intl.NumberFormat(locale, { useGrouping: false }),
    }
  }, [locale, date, time, hourCycle])
}

function partsFromDate(date: Date | null | undefined, h12: boolean): Parts {
  if (!date) return {}
  const hour = date.getHours()
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: h12 ? hour % 12 || 12 : hour,
    minute: date.getMinutes(),
    dayPeriod: hour < 12 ? "am" : "pm",
  }
}

function hour24(parts: Parts, h12: boolean) {
  if (parts.hour === undefined) return undefined
  if (!h12) return parts.hour
  return (parts.hour % 12) + (parts.dayPeriod === "pm" ? 12 : 0)
}

function limits(type: NumericType, parts: Parts, h12: boolean): [number, number] {
  switch (type) {
    case "year":
      return [1, 9999]
    case "month":
      return [1, 12]
    case "day":
      return [1, daysInMonth(parts.year, parts.month)]
    case "hour":
      return h12 ? [1, 12] : [0, 23]
    case "minute":
      return [0, 59]
  }
}

// -----------------------------------------------------------------------------
// Shared field
// -----------------------------------------------------------------------------

interface FieldBaseProps {
  appearance?: SheenAppearance
  dir?: "ltr" | "rtl"
  clearLabel?: string
  pickerLabel?: string
  nowLabel?: string
  doneLabel?: string
  /** BCP 47 locale for order, numerals and AM/PM, e.g. "en-US", "en-GB", "ar". */
  locale?: string
  min?: Date
  max?: Date
  disabled?: boolean
  readOnly?: boolean
  /** Styles the field red (also set automatically when outside min/max). */
  invalid?: boolean
  size?: "sm" | "default" | "lg"
  variant?: "glass" | "filled"
  /** Show the clear (×) button when there is a value. */
  clearable?: boolean
  /** Submitted as an ISO string (YYYY-MM-DD, HH:mm or YYYY-MM-DDTHH:mm). */
  name?: string
  id?: string
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  /** Fires when focus leaves the whole field (not between segments). */
  onBlur?: () => void
}

interface DateFieldProps extends FieldBaseProps {
  value?: Date | null
  defaultValue?: Date | null
  onChange?: (value: Date | null) => void
}

interface InternalProps extends DateFieldProps {
  date: boolean
  time: boolean
  hourCycle?: 12 | 24
  minuteStep?: number
  isDateDisabled?: (date: Date) => boolean
  /** Shows the calendar button. */
  picker?: boolean
}

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
const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" />
  </svg>
)
const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const PLACEHOLDER: Record<SegmentType, string> = { year: "yyyy", month: "mm", day: "dd", hour: "––", minute: "––", dayPeriod: "AM" }

const DateTimeField = React.forwardRef<HTMLDivElement, InternalProps>(
  (
    {
      date,
      time,
      appearance,
      dir,
      clearLabel = "Clear",
      pickerLabel,
      nowLabel,
      doneLabel = "Done",
      hourCycle,
      minuteStep = 1,
      picker = true,
      locale,
      value: valueProp,
      defaultValue,
      onChange,
      min,
      max,
      isDateDisabled,
      disabled,
      readOnly,
      invalid,
      size = "default",
      variant = "glass",
      clearable = false,
      name,
      id,
      className,
      onBlur,
      ...aria
    },
    ref,
  ) => {
    const { disabled: fieldDisabled, ...fieldAria } = useFieldControlProps({ ...aria, id, disabled })
    aria = fieldAria
    disabled = fieldDisabled
    const theme = useSheenTheme({ appearance, direction: dir })
    minuteStep = Math.max(1, Math.min(60, Math.floor(minuteStep) || 1))
    const today = useClientNow()
    const layout = useLayout(locale, date, time, hourCycle)
    const required: SegmentType[] = layout.segments.filter((s) => s.type !== "literal").map((s) => s.type as SegmentType)

    const [parts, setParts] = React.useState<Parts>(() => partsFromDate(valueProp ?? defaultValue, layout.h12))
    const partsRef = React.useRef(parts)
    partsRef.current = parts
    const lastEmitted = React.useRef<number | null>((valueProp ?? defaultValue)?.getTime() ?? null)
    // Bumped per segment whenever its value changes, to re-key (and re-animate) just that one.
    const ticks = React.useRef<Partial<Record<SegmentType, number>>>({})
    const [open, setOpen] = React.useState(false)
    const [popoverDir, setPopoverDir] = React.useState<"ltr" | "rtl">()

    const groupRef = React.useRef<HTMLDivElement | null>(null)
    const segmentRefs = React.useRef(new Map<SegmentType, HTMLSpanElement>())
    const typed = React.useRef({ type: null as SegmentType | null, buffer: "" })

    const build = React.useCallback(
      (p: Parts): Date | null => {
        if (required.some((t) => p[t] === undefined)) return null
        const year = date ? p.year! : today.getFullYear()
        const month = date ? p.month! - 1 : today.getMonth()
        const day = date ? Math.min(p.day!, daysInMonth(p.year, p.month)) : today.getDate()
        const result = new Date(0)
        result.setFullYear(year, month, day)
        result.setHours(time ? hour24(p, layout.h12)! : 0, time ? p.minute! : 0, 0, 0)
        return result
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [date, time, layout.h12, required.join(), today],
    )

    const previousHourCycle = React.useRef(layout.h12)
    // Keep partial entry, but honor a controlled value the parent did not accept.
    React.useEffect(() => {
      const formatChanged = previousHourCycle.current !== layout.h12
      previousHourCycle.current = layout.h12
      if (valueProp === undefined && !formatChanged) return
      const nextValue = valueProp === undefined
        ? lastEmitted.current === null ? null : new Date(lastEmitted.current)
        : valueProp
      const t = nextValue?.getTime() ?? null
      if (t === lastEmitted.current && !formatChanged) return
      lastEmitted.current = t
      setParts(partsFromDate(nextValue, layout.h12))
    })

    const commit = (next: Parts) => {
      // Keep the day valid when month / year change (31 → 30, Feb 29 → 28).
      if (next.day !== undefined && next.day > daysInMonth(next.year, next.month))
        next = { ...next, day: daysInMonth(next.year, next.month) }
      for (const t of ["year", "month", "day", "hour", "minute", "dayPeriod"] as SegmentType[])
        if (next[t] !== partsRef.current[t] && next[t] !== undefined) ticks.current[t] = (ticks.current[t] ?? 0) + 1
      partsRef.current = next
      setParts(next)
      const built = build(next)
      const t = built?.getTime() ?? null
      if (t !== lastEmitted.current) {
        lastEmitted.current = t
        onChange?.(built)
      }
    }

    const value = build(parts)
    const outOfRange =
      !!value &&
      ((min && (date && !time ? startOfDay(value) < startOfDay(min) : value < min)) ||
        (max && (date && !time ? startOfDay(value) > startOfDay(max) : value > max)) ||
        !!isDateDisabled?.(value))
    const ariaInvalid = (aria as Record<string, unknown>)["aria-invalid"]
    // Not allowed on role="group"; each segment (a spinbutton) carries it instead.
    const ariaRequired = (aria as Record<string, unknown>)["aria-required"] as boolean | "true" | "false" | undefined
    const isInvalid = !!invalid || ariaInvalid === true || ariaInvalid === "true" || outOfRange
    const editable = !disabled && !readOnly
    const hasAny = required.some((t) => parts[t] !== undefined)

    // ---- Focus helpers ------------------------------------------------------
    const focusSegment = (type: SegmentType | undefined) => type && segmentRefs.current.get(type)?.focus()
    const nextOf = (type: SegmentType) => required[required.indexOf(type) + 1]
    const prevOf = (type: SegmentType) => required[required.indexOf(type) - 1]
    /** ←/→ move by what's visually there, so RTL and LTR time groups both feel right. */
    const moveVisual = (from: SegmentType, direction: "left" | "right") => {
      const current = segmentRefs.current.get(from)!.getBoundingClientRect()
      const cx = current.left + current.width / 2
      let best: SegmentType | undefined
      let bestDistance = Infinity
      for (const [type, el] of segmentRefs.current) {
        const r = el.getBoundingClientRect()
        const d = r.left + r.width / 2 - cx
        if ((direction === "right" ? d > 1 : d < -1) && Math.abs(d) < bestDistance) {
          bestDistance = Math.abs(d)
          best = type
        }
      }
      focusSegment(best)
    }

    // ---- Editing ------------------------------------------------------------
    const step = (type: SegmentType, delta: number) => {
      const p = partsRef.current
      if (type === "dayPeriod") return commit({ ...p, dayPeriod: p.dayPeriod === "am" ? "pm" : "am" })
      const [lo, hi] = limits(type, p, layout.h12)
      const now = partsFromDate(new Date(), layout.h12)
      const current = p[type]
      let next: number
      if (current === undefined) next = now[type]!
      else if (type === "minute" && minuteStep > 1) {
        const snapped =
          delta > 0 ? Math.floor(current / minuteStep) * minuteStep + minuteStep : Math.ceil(current / minuteStep) * minuteStep - minuteStep
        next = ((snapped % 60) + 60) % 60
      } else next = ((current - lo + delta + (hi - lo + 1)) % (hi - lo + 1)) + lo
      commit({ ...p, [type]: next, ...(type === "hour" && p.dayPeriod === undefined && { dayPeriod: now.dayPeriod }) })
    }

    const typeDigit = (type: NumericType, digit: string) => {
      const p = partsRef.current
      const [lo, hi] = limits(type, p, layout.h12)
      const maxLength = String(hi).length
      if (typed.current.type !== type) typed.current = { type, buffer: "" }
      let buffer = typed.current.buffer + digit
      let n = Number(buffer)
      if (n > hi || buffer.length > maxLength) {
        buffer = digit
        n = Number(digit)
      }
      typed.current.buffer = buffer
      // "0" in a 1-based field is a prefix, not a value: wait for the next digit.
      const done = buffer.length >= maxLength || n * 10 > hi
      if (n >= lo || (type === "year" && done)) commit({ ...p, [type]: Math.max(n, lo) })
      if (done) {
        typed.current = { type: null, buffer: "" }
        focusSegment(nextOf(type))
      }
    }

    const erase = (type: SegmentType) => {
      const p = partsRef.current
      if (p[type] === undefined) return focusSegment(prevOf(type))
      if (type === "dayPeriod") return commit({ ...p, dayPeriod: undefined })
      const shorter = String(p[type]).slice(0, -1)
      typed.current = { type, buffer: shorter }
      commit({ ...p, [type]: shorter === "" ? undefined : Number(shorter) })
    }

    const typePeriod = (text: string) => {
      const ch = text.toLocaleLowerCase(locale)
      const p = partsRef.current
      if (ch === "a" || layout.periods.am.toLocaleLowerCase(locale).startsWith(ch)) commit({ ...p, dayPeriod: "am" })
      else if (ch === "p" || layout.periods.pm.toLocaleLowerCase(locale).startsWith(ch)) commit({ ...p, dayPeriod: "pm" })
      else return
      typed.current = { type: null, buffer: "" }
    }

    const onKeyDown = (type: SegmentType) => (event: React.KeyboardEvent) => {
      if (!editable) return
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault()
          step(type, event.key === "ArrowUp" ? 1 : -1)
          break
        case "PageUp":
        case "PageDown":
          event.preventDefault()
          step(type, (event.key === "PageUp" ? 1 : -1) * (type === "year" ? 5 : type === "minute" ? 15 : 2))
          break
        case "ArrowLeft":
        case "ArrowRight":
          event.preventDefault()
          moveVisual(type, event.key === "ArrowLeft" ? "left" : "right")
          break
        case "Backspace":
        case "Delete":
          event.preventDefault()
          erase(type)
          break
        case "Enter":
          event.preventDefault()
          break
      }
    }

    // Typed characters arrive via `beforeinput` (desktop and mobile keyboards alike);
    // we apply them ourselves and never let the contenteditable change.
    React.useEffect(() => {
      const group = groupRef.current
      if (!group) return
      const handle = (event: InputEvent) => {
        const target = event.target as HTMLElement
        const type = target.dataset?.segment as SegmentType | undefined
        if (!type) return
        event.preventDefault()
        if (!editable) return
        if (event.inputType.startsWith("delete")) return erase(type)
        for (const raw of event.data ?? "") {
          const ch = toAsciiDigit(raw)
          if (type === "dayPeriod") typePeriod(raw)
          else if (/\d/.test(ch)) typeDigit(type, ch)
          else if (/[/.\-:\s،,]/.test(raw)) focusSegment(nextOf(type)) // typing a separator jumps ahead
        }
      }
      group.addEventListener("beforeinput", handle)
      return () => group.removeEventListener("beforeinput", handle)
    })

    // ---- Rendering ----------------------------------------------------------
    const display = (type: SegmentType) => {
      if (type === "dayPeriod") return parts.dayPeriod ? layout.periods[parts.dayPeriod] : layout.periods.am
      const n = parts[type]
      if (n === undefined) return PLACEHOLDER[type]
      const length = type === "year" ? 4 : type === "hour" && layout.h12 ? 1 : 2
      // While typing a year, show what's typed so far (no zero padding).
      const typing = typed.current.type === type && type === "year"
      return layout.numbers.format(n).padStart(typing ? 0 : length, layout.numbers.format(0))
    }

    const renderSegment = (seg: Segment, i: number) => {
      if (seg.type === "literal")
        return (
          <span key={`l${i}`} className="sheen-date-literal" aria-hidden="true">
            {seg.text}
          </span>
        )
      const type = seg.type
      const empty = type === "dayPeriod" ? parts.dayPeriod === undefined : parts[type] === undefined
      const [lo, hi] = type === "dayPeriod" ? [0, 1] : limits(type, parts, layout.h12)
      return (
        <span
          key={type}
          ref={(el) => {
            if (el) segmentRefs.current.set(type, el)
            else segmentRefs.current.delete(type)
          }}
          role="spinbutton"
          data-segment={type}
          data-placeholder={empty || undefined}
          tabIndex={disabled ? undefined : 0}
          contentEditable={editable}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          inputMode={type === "dayPeriod" ? "text" : "numeric"}
          enterKeyHint="next"
          aria-label={layout.names[type] ?? type}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuenow={type === "dayPeriod" ? (parts.dayPeriod ? (parts.dayPeriod === "am" ? 0 : 1) : undefined) : parts[type]}
          aria-valuetext={empty ? "Empty" : display(type)}
          aria-readonly={readOnly || undefined}
          aria-disabled={disabled || undefined}
          aria-required={ariaRequired}
          className="sheen-date-segment"
          onKeyDown={onKeyDown(type)}
          onFocus={() => (typed.current = { type: null, buffer: "" })}
          onBlur={() => (typed.current = { type: null, buffer: "" })}
          onPaste={(e) => e.preventDefault()}
        >
          {/* Keyed so a new value re-enters with a tick (not on first paint). */}
          <span key={ticks.current[type] ?? 0} className="sheen-date-segment-value" data-tick={ticks.current[type] ? "" : undefined}>
            {display(type)}
          </span>
        </span>
      )
    }

    // Hour : minute always read left-to-right (also in Arabic), so wrap that run in dir="ltr".
    const rendered: React.ReactNode[] = []
    for (let i = 0; i < layout.segments.length; i++) {
      const seg = layout.segments[i]
      if (seg.type === "hour") {
        const run: Segment[] = [seg]
        while (i + 2 < layout.segments.length && layout.segments[i + 1].type === "literal" && layout.segments[i + 2].type === "minute") {
          run.push(layout.segments[i + 1], layout.segments[i + 2])
          i += 2
        }
        rendered.push(
          <span key="time" dir="ltr" className="sheen-date-run">
            {run.map((s, j) => renderSegment(s, i * 10 + j))}
          </span>,
        )
      } else rendered.push(renderSegment(seg, i))
    }

    const isoValue = value
      ? date && time
        ? `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1, 2)}-${pad(value.getDate(), 2)}T${pad(value.getHours(), 2)}:${pad(value.getMinutes(), 2)}`
        : date
          ? `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1, 2)}-${pad(value.getDate(), 2)}`
          : `${pad(value.getHours(), 2)}:${pad(value.getMinutes(), 2)}`
      : ""

    const calendarDate =
      date && parts.year && parts.month && parts.day
        ? new Date(parts.year, parts.month - 1, Math.min(parts.day, daysInMonth(parts.year, parts.month)))
        : null

    const field = (
      <div
        {...sheenThemeAttributes(theme)}
        dir={dir}
        ref={(node) => {
          groupRef.current = node
          // Form libraries focus a field via ref.focus(): send that to the first empty segment.
          if (node)
            node.focus = (options?: FocusOptions) =>
              segmentRefs.current.get(required.find((t) => partsRef.current[t] === undefined) ?? required[0])?.focus(options)
          assignRef(ref, node)
        }}
        id={id}
        role="group"
        onBlur={(event) => {
          const next = event.relatedTarget as HTMLElement | null
          // Moving into our own calendar / wheels popover isn't leaving the field.
          if (!event.currentTarget.contains(next) && !next?.closest(".sheen-date-popover")) onBlur?.()
        }}
        className={cn("sheen-input-group sheen-date-field", className)}
        data-size={size}
        data-start={picker ? undefined : ""}
        data-end={picker || clearable ? "" : undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          // Clicking empty space focuses the first empty (or first) segment.
          const target = event.target as HTMLElement
          if (target.closest("[data-segment], button")) return
          event.preventDefault()
          focusSegment(required.find((t) => parts[t] === undefined) ?? required[0])
        }}
        {...aria}
        // After the spread: an injected aria-invalid={undefined} must not hide out-of-range.
        aria-invalid={isInvalid || undefined}
        aria-required={undefined}
      >
        {/* Decorative icon only when there's no picker button carrying the same icon. */}
        {!picker && (
          <span className="sheen-input-slot" data-side="start" aria-hidden="true">
            {date ? <CalendarIcon /> : <ClockIcon />}
          </span>
        )}
        {/* Carries the variant / invalid hooks the input surface styles look for. */}
        <div className="sheen-input sheen-date-segments" data-variant={variant} aria-invalid={isInvalid || undefined}>
          {rendered}
        </div>
        {(picker || clearable) && (
          <span className="sheen-input-slot" data-side="end">
            {clearable && hasAny && editable && (
              <button
                type="button"
                className="sheen-input-clear"
                aria-label={clearLabel}
                onClick={() => {
                  commit({})
                  focusSegment(required[0])
                }}
              >
                <ClearIcon />
              </button>
            )}
            {picker && (
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="sheen-input-action"
                  aria-label={pickerLabel ?? (date && time ? "Choose date and time" : date ? "Choose date" : "Choose time")}
                  disabled={!editable}
                >
                  {date ? <CalendarIcon /> : <ClockIcon />}
                </button>
              </PopoverTrigger>
            )}
          </span>
        )}
        {name && <input type="hidden" name={name} value={isoValue} disabled={disabled} />}
      </div>
    )

    if (!picker) return field

    return (
      <Popover
        appearance={appearance}
        dir={dir}
        open={open}
        onOpenChange={(next) => {
          if (next && groupRef.current) setPopoverDir(getDirection(groupRef.current))
          if (!next) onBlur?.()
          setOpen(next)
        }}
      >
        <PopoverAnchor asChild>{field}</PopoverAnchor>
        <PopoverContent
          align="start"
          className="sheen-date-popover"
          dir={popoverDir}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            const content = event.currentTarget as HTMLElement
            // Calendar: focus the active day. Time only: the hour wheel.
            requestAnimationFrame(() => content.querySelector<HTMLElement>(".sheen-calendar-day[tabindex='0'], .sheen-wheel-list")?.focus())
          }}
        >
          <div className="sheen-date-popover-body">
            {date && (
              <Calendar
                dir={popoverDir}
                selected={calendarDate}
                defaultMonth={calendarDate ?? undefined}
                onSelect={(d) => {
                  const p = partsRef.current
                  const next = { ...p, year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
                  commit(next)
                  if (time) return // date + time: stay open so the wheels can be set too
                  setOpen(false)
                  requestAnimationFrame(() => focusSegment(required[required.length - 1]))
                }}
                locale={locale}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
              />
            )}
            {time && (
              <TimePicker
                locale={locale}
                hourCycle={layout.h12 ? 12 : 24}
                minuteStep={minuteStep}
                value={
                  parts.hour !== undefined && parts.minute !== undefined
                    ? { hours: hour24(parts, layout.h12)!, minutes: parts.minute }
                    : null
                }
                onChange={({ hours, minutes }) =>
                  commit({
                    ...partsRef.current,
                    hour: layout.h12 ? hours % 12 || 12 : hours,
                    minute: minutes,
                    dayPeriod: hours < 12 ? "am" : "pm",
                  })
                }
              />
            )}
          </div>
          {time && (
            <div className="sheen-date-popover-footer">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const now = partsFromDate(new Date(), layout.h12)
                  const p = partsRef.current
                  commit({
                    ...p,
                    ...(date && { year: now.year, month: now.month, day: now.day }),
                    hour: now.hour,
                    minute: Math.floor(now.minute! / minuteStep) * minuteStep,
                    dayPeriod: now.dayPeriod,
                  })
                }}
              >
                {nowLabel ?? (date ? "Now" : "Current time")}
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                {doneLabel}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  },
)
DateTimeField.displayName = "DateTimeField"

// -----------------------------------------------------------------------------
// Public components
// -----------------------------------------------------------------------------

export interface DateInputProps extends DateFieldProps {
  isDateDisabled?: (date: Date) => boolean
  /** Show the calendar button (default true). */
  picker?: boolean
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>((props, ref) => <DateTimeField ref={ref} date time={false} {...props} />)
DateInput.displayName = "DateInput"

export interface TimeInputProps extends DateFieldProps {
  /** Show the clock button with the wheel picker (default true). */
  picker?: boolean
  /** Force 12- or 24-hour clock (defaults to the locale's). */
  hourCycle?: 12 | 24
  /** ↑/↓ on minutes jump in this step (e.g. 5, 15). */
  minuteStep?: number
}

/** Time only. The Date's day part is today. */
const TimeInput = React.forwardRef<HTMLDivElement, TimeInputProps>((props, ref) => <DateTimeField ref={ref} date={false} time {...props} />)
TimeInput.displayName = "TimeInput"

export interface DateTimeInputProps extends DateInputProps {
  hourCycle?: 12 | 24
  minuteStep?: number
}

const DateTimeInput = React.forwardRef<HTMLDivElement, DateTimeInputProps>((props, ref) => <DateTimeField ref={ref} date time {...props} />)
DateTimeInput.displayName = "DateTimeInput"

export { DateInput, TimeInput, DateTimeInput }

export { NativeDateInput, type NativeDateInputProps } from "./native-date-input"
