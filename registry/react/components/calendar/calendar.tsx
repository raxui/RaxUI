"use client"

// Built-in SVG paths from Lucide, licensed under ISC.
import * as React from "react"

import { useSheenTheme, sheenThemeAttributes, type SheenAppearance } from "@/lib/theme"
import { useClientNow } from "@/lib/client-now"
import { cn } from "@/lib/utils"
import { getDirection } from "@/lib/direction"

// ---- Date helpers (local, date-only) ------------------------------------------
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay))
}
export const isSameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.toDateString() === b.toDateString()
const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()
const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** First day of the week for a locale (0 = Sunday), from Intl when available. */
function getWeekStart(locale?: string) {
  try {
    const loc = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const info = loc.getWeekInfo?.() ?? loc.weekInfo
    if (info) return info.firstDay % 7
  } catch {
    // fall through
  }
  return 0
}

export interface DateRange {
  from?: Date
  to?: Date
}

interface CalendarBaseProps {
  appearance?: SheenAppearance
  dir?: "ltr" | "rtl"
  /** Month shown first (controlled). */
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  numberOfMonths?: 1 | 2
  min?: Date
  max?: Date
  /** Return true to disable a day. */
  isDateDisabled?: (date: Date) => boolean
  /** BCP 47 locale for names and numerals, e.g. "en-GB", "ar". */
  locale?: string
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's convention. */
  weekStartsOn?: number
  showOutsideDays?: boolean
  /** Small content under each day number — prices, dots, counts. */
  renderDayContent?: (date: Date) => React.ReactNode
  className?: string
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single"
  selected?: Date | null
  onSelect?: (date: Date) => void
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range"
  selected?: DateRange
  onSelect?: (range: DateRange) => void
  /** A range may not span disabled days (bookings): picking across one starts a new range. */
  excludeDisabled?: boolean
  /** Shortest / longest range, counted as days between start and end (nights, for stays). */
  minDays?: number
  maxDays?: number
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)
const ChevronLeft = () => <Icon d="m15 18-6-6 6-6" />
const ChevronRight = () => <Icon d="m9 18 6-6-6-6" />
const ChevronDown = () => <Icon d="m6 9 6 6 6-6" />

type View = "days" | "months" | "years"

function Calendar(props: CalendarProps) {
  const {
    numberOfMonths = 1,
    min,
    max,
    isDateDisabled,
    locale,
    weekStartsOn: weekStartsOnProp,
    showOutsideDays = true,
    renderDayContent,
    className,
  } = props
  const theme = useSheenTheme({ appearance: props.appearance, direction: props.dir })
  const now = useClientNow()
  const today = startOfDay(now)
  const single = props.mode === "range" ? undefined : (props.selected ?? undefined)
  const range = props.mode === "range" ? (props.selected ?? {}) : undefined

  // ---- Visible month(s) --------------------------------------------------------
  const [uncontrolledMonth, setUncontrolledMonth] = React.useState(() => startOfMonth(props.defaultMonth ?? single ?? range?.from ?? today))
  const month = props.month ? startOfMonth(props.month) : uncontrolledMonth
  const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(month, i))
  const [direction, setDirection] = React.useState<"next" | "prev">()
  const [view, setView] = React.useState<View>("days")
  const [fromPicker, setFromPicker] = React.useState(false)
  const [pickerYear, setPickerYear] = React.useState(month.getFullYear())

  const goToMonth = (next: Date) => {
    const target = startOfMonth(next)
    if (monthIndex(target) === monthIndex(month)) return
    setDirection(monthIndex(target) > monthIndex(month) ? "next" : "prev")
    if (!props.month) setUncontrolledMonth(target)
    props.onMonthChange?.(target)
  }

  const isVisible = (d: Date) => months.some((m) => isSameMonth(m, d))

  // ---- Focus (roving tabindex) -------------------------------------------------
  const [focused, setFocused] = React.useState<Date>(() => single ?? range?.from ?? today)
  // An empty static calendar adopts the current month once wall time is available.
  React.useEffect(() => {
    if (!props.month && !props.defaultMonth && !single && !range?.from) {
      setUncontrolledMonth(startOfMonth(now))
      setFocused(startOfDay(now))
    }
    // Only the hydrated clock changes this fallback, never a selection or navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])
  const shouldFocus = React.useRef(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const tabbable = isVisible(focused) ? focused : single && isVisible(single) ? single : isVisible(today) ? today : month

  React.useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toKey(focused)}"]`)?.focus()
  }, [focused, month])

  const moveFocus = (next: Date) => {
    if (min && next < startOfDay(min)) next = startOfDay(min)
    if (max && next > startOfDay(max)) next = startOfDay(max)
    shouldFocus.current = true
    setFocused(next)
    if (!isVisible(next)) {
      goToMonth(monthIndex(next) > monthIndex(month) ? addMonths(startOfMonth(next), -(numberOfMonths - 1)) : next)
    }
  }

  // ---- Selection ---------------------------------------------------------------
  const [hovered, setHovered] = React.useState<Date>()
  const isDisabled = (d: Date) => (!!min && d < startOfDay(min)) || (!!max && d > startOfDay(max)) || !!isDateDisabled?.(d)
  const excludeDisabled = props.mode === "range" && !!props.excludeDisabled
  const spansDisabled = (a: Date, b: Date) => {
    for (let d = addDays(a < b ? a : b, 1); d < (a < b ? b : a); d = addDays(d, 1)) if (isDisabled(d)) return true
    return false
  }

  // While choosing an end: days that would make the range too short or too long.
  const daysBetween = (a: Date, b: Date) => Math.round(Math.abs(startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
  const pendingFrom = props.mode === "range" && range?.from && !range.to ? range.from : undefined
  const outOfSpan = (d: Date) => {
    if (!pendingFrom || props.mode !== "range" || isSameDay(d, pendingFrom)) return false
    const n = daysBetween(pendingFrom, d)
    return (props.minDays !== undefined && n < props.minDays) || (props.maxDays !== undefined && n > props.maxDays)
  }

  const select = (day: Date) => {
    if (isDisabled(day)) return
    setFocused(day)
    if (props.mode === "range") {
      const { from, to } = props.selected ?? {}
      const next: DateRange =
        // Picking a day that can't end this range starts a new one instead of being blocked.
        !from || to || (excludeDisabled && spansDisabled(from, day)) || outOfSpan(day)
          ? { from: day }
          : day < from
            ? { from: day, to: from }
            : { from, to: day }
      props.onSelect?.(next)
    } else {
      props.onSelect?.(day)
    }
    if (!isVisible(day)) goToMonth(day)
  }

  // Range being drawn: the committed range, or a preview while choosing its end.
  const [rangeStart, rangeEnd, isPreview] = (() => {
    if (!range?.from) return [undefined, undefined, false] as const
    if (range.to) return [range.from, range.to, false] as const
    if (hovered && !isSameDay(hovered, range.from) && !(excludeDisabled && spansDisabled(range.from, hovered)) && !outOfSpan(hovered)) {
      return hovered < range.from ? ([hovered, range.from, true] as const) : ([range.from, hovered, true] as const)
    }
    return [range.from, undefined, false] as const
  })()

  // ---- Formatting ----------------------------------------------------------------
  const weekStartsOn = weekStartsOnProp ?? getWeekStart(locale)
  const fmt = React.useMemo(
    () => ({
      caption: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
      weekday: (() => {
        // Short names that are whole words (Arabic, Hebrew…) don't fit a 2.5rem column; use narrow ones.
        const short = new Intl.DateTimeFormat(locale, { weekday: "short" })
        const sample = Array.from({ length: 7 }, (_, i) => short.format(new Date(2023, 0, 1 + i)))
        return sample.some((name) => name.length > 4) ? new Intl.DateTimeFormat(locale, { weekday: "narrow" }) : short
      })(),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
      monthShort: new Intl.DateTimeFormat(locale, { month: "short" }),
      year: new Intl.DateTimeFormat(locale, { year: "numeric" }),
    }),
    [locale],
  )
  // Any week works for weekday names; 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((weekStartsOn + i) % 7)))

  const weeksOf = (m: Date) => {
    const first = startOfMonth(m)
    const gridStart = addDays(first, -((first.getDay() - weekStartsOn + 7) % 7))
    // Always six weeks, so the height never jumps between months.
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)))
  }

  // ---- Keyboard (WAI-ARIA date grid) -------------------------------------------
  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getDirection(event.currentTarget) === "rtl"
    const offsetInWeek = (focused.getDay() - weekStartsOn + 7) % 7
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, rtl ? 1 : -1),
      ArrowRight: () => addDays(focused, rtl ? -1 : 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -offsetInWeek),
      End: () => addDays(focused, 6 - offsetInWeek),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    moveFocus(move())
  }

  // ---- Month / year pickers ------------------------------------------------------
  const openPicker = (m: Date) => {
    setPickerYear(m.getFullYear())
    setView("months")
  }
  const backToDays = (target: Date) => {
    setFromPicker(true)
    setDirection(undefined)
    if (!props.month) setUncontrolledMonth(startOfMonth(target))
    props.onMonthChange?.(startOfMonth(target))
    setView("days")
  }
  const monthDisabled = (y: number, m: number) =>
    (!!min && monthIndex(new Date(y, m, 1)) < monthIndex(min)) || (!!max && monthIndex(new Date(y, m, 1)) > monthIndex(max))
  const yearDisabled = (y: number) => (!!min && y < min.getFullYear()) || (!!max && y > max.getFullYear())
  const decadeStart = Math.floor(pickerYear / 12) * 12

  const navButton = (dir: "prev" | "next", onClick: () => void, label: string, disabled = false) => (
    <button type="button" className="sheen-calendar-nav" data-dir={dir} onClick={onClick} aria-label={label} disabled={disabled}>
      {dir === "prev" ? <ChevronLeft /> : <ChevronRight />}
    </button>
  )

  if (view !== "days") {
    const isYears = view === "years"
    return (
      <div {...sheenThemeAttributes(theme)} ref={rootRef} className={cn("sheen-calendar", className)}>
        <div className="sheen-calendar-view" data-view={view} key={view}>
          <div className="sheen-calendar-header">
            {navButton(
              "prev",
              () => setPickerYear((y) => y - (isYears ? 12 : 1)),
              isYears ? "Previous years" : "Previous year",
              isYears ? yearDisabled(decadeStart - 1) : yearDisabled(pickerYear - 1),
            )}
            <button
              type="button"
              className="sheen-calendar-caption"
              onClick={() => setView(isYears ? "months" : "years")}
              aria-label={isYears ? "Back to months" : "Choose year"}
            >
              {isYears
                ? `${fmt.year.format(new Date(decadeStart, 0))} – ${fmt.year.format(new Date(decadeStart + 11, 0))}`
                : fmt.year.format(new Date(pickerYear, 0))}
              <ChevronDown />
            </button>
            {navButton(
              "next",
              () => setPickerYear((y) => y + (isYears ? 12 : 1)),
              isYears ? "Next years" : "Next year",
              isYears ? yearDisabled(decadeStart + 12) : yearDisabled(pickerYear + 1),
            )}
          </div>
          <div className="sheen-calendar-picker">
            {Array.from({ length: 12 }, (_, i) => {
              const y = isYears ? decadeStart + i : pickerYear
              const m = isYears ? 0 : i
              const current = isYears ? y === month.getFullYear() : y === month.getFullYear() && m === month.getMonth()
              const isNow = isYears ? y === today.getFullYear() : y === today.getFullYear() && m === today.getMonth()
              return (
                <button
                  key={i}
                  type="button"
                  className="sheen-calendar-picker-item"
                  data-current={current ? "" : undefined}
                  data-today={isNow ? "" : undefined}
                  disabled={isYears ? yearDisabled(y) : monthDisabled(y, m)}
                  onClick={() => {
                    if (isYears) {
                      setPickerYear(y)
                      setView("months")
                    } else backToDays(new Date(y, m, 1))
                  }}
                >
                  {isYears ? fmt.year.format(new Date(y, 0)) : fmt.monthShort.format(new Date(y, m, 1))}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      {...sheenThemeAttributes(theme)}
      ref={rootRef}
      className={cn("sheen-calendar", className)}
      data-day-content={renderDayContent ? "" : undefined}
      onKeyDown={onGridKeyDown}
      onMouseLeave={() => setHovered(undefined)}
    >
      <div className="sheen-calendar-view" data-view="days" data-from-picker={fromPicker ? "" : undefined} key="days">
        <div className="sheen-calendar-months">
          {months.map((m, index) => (
            <div className="sheen-calendar-month" key={index}>
              <div className="sheen-calendar-header">
                {index === 0 ? (
                  navButton("prev", () => goToMonth(addMonths(month, -1)), "Previous month", !!min && monthIndex(month) <= monthIndex(min))
                ) : (
                  <span className="sheen-calendar-nav-spacer" />
                )}
                <button
                  type="button"
                  className="sheen-calendar-caption"
                  onClick={() => openPicker(m)}
                  aria-label={`${fmt.caption.format(m)}, choose month and year`}
                  aria-live="polite"
                >
                  {fmt.caption.format(m)}
                  <ChevronDown />
                </button>
                {index === numberOfMonths - 1 ? (
                  navButton(
                    "next",
                    () => goToMonth(addMonths(month, 1)),
                    "Next month",
                    !!max && monthIndex(months[numberOfMonths - 1]) >= monthIndex(max),
                  )
                ) : (
                  <span className="sheen-calendar-nav-spacer" />
                )}
              </div>

              <table role="grid" aria-label={fmt.caption.format(m)} className="sheen-calendar-grid" key={toKey(m)} data-direction={direction}>
                <thead>
                  <tr>
                    {weekdays.map((d) => (
                      <th key={d.getDay()} scope="col" abbr={fmt.weekdayLong.format(d)}>
                        {fmt.weekday.format(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeksOf(m).map((week, w) => (
                    <tr key={w}>
                      {week.map((day) => {
                        const outside = !isSameMonth(day, m)
                        if (outside && (!showOutsideDays || numberOfMonths > 1)) return <td key={toKey(day)} role="presentation" />

                        const disabled = isDisabled(day)
                        const isStart = isSameDay(day, rangeStart)
                        const isEnd = isSameDay(day, rangeEnd)
                        const inRange = !!rangeStart && !!rangeEnd && day > rangeStart && day < rangeEnd
                        const selected = props.mode === "range" ? isStart || isEnd : isSameDay(day, single)
                        const isToday = isSameDay(day, today)

                        return (
                          <td
                            key={toKey(day)}
                            role="gridcell"
                            aria-selected={selected || inRange || undefined}
                            data-range-start={isStart && rangeEnd ? "" : undefined}
                            data-range-end={isEnd ? "" : undefined}
                            data-in-range={inRange ? "" : undefined}
                            data-preview={isPreview && (inRange || isStart || isEnd) ? "" : undefined}
                          >
                            <button
                              type="button"
                              className="sheen-calendar-day"
                              data-date={toKey(day)}
                              data-today={isToday ? "" : undefined}
                              data-outside={outside ? "" : undefined}
                              data-selected={selected && !(isPreview && isSameDay(day, hovered)) ? "" : undefined}
                              data-preview-end={isPreview && isSameDay(day, hovered) ? "" : undefined}
                              aria-disabled={disabled || undefined}
                              data-out-of-span={outOfSpan(day) ? "" : undefined}
                              aria-label={`${fmt.full.format(day)}${isToday ? ", today" : ""}`}
                              aria-current={isToday ? "date" : undefined}
                              tabIndex={isSameDay(day, tabbable) ? 0 : -1}
                              onClick={() => select(day)}
                              onFocus={() => setFocused(day)}
                              onMouseEnter={() => props.mode === "range" && setHovered(day)}
                            >
                              {renderDayContent ? (
                                <>
                                  <span className="sheen-calendar-day-number">{fmt.day.format(day)}</span>
                                  <span className="sheen-calendar-day-content">{renderDayContent(day)}</span>
                                </>
                              ) : (
                                fmt.day.format(day)
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
